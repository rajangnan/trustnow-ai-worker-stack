import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios from 'axios';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getPool } from '../database/db.provider';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const STT_BUCKET = 'trustnow-stt-transcripts';

function getS3Client() {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'trustnow',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'trustnow123',
    },
    forcePathStyle: true,
  });
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@Processor('stt-transcribe')
export class SttTranscribeProcessor {
  private readonly logger = new Logger(SttTranscribeProcessor.name);

  @Process()
  async handle(job: Job<{ transcript_id: string }>) {
    const pool = getPool();
    const { transcript_id } = job.data;

    await pool.query(
      `UPDATE stt_transcripts SET status = 'processing' WHERE transcript_id = $1`,
      [transcript_id],
    );

    try {
      const { rows } = await pool.query(
        `SELECT * FROM stt_transcripts WHERE transcript_id = $1`,
        [transcript_id],
      );
      if (!rows.length) throw new Error('Transcript record not found');
      const tx = rows[0];

      let audioData: Buffer | null = null;
      if (tx.source_type === 'upload' && tx.storage_path) {
        const s3 = getS3Client();
        const obj = await s3.send(new GetObjectCommand({ Bucket: STT_BUCKET, Key: tx.storage_path }));
        audioData = await streamToBuffer(obj.Body);
      }

      // Build FormData for ElevenLabs Scribe v2
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      if (audioData) {
        formData.append('audio', audioData, { filename: 'audio.mp3', contentType: 'audio/mpeg' });
      } else if (tx.source_type === 'youtube') {
        formData.append('youtube_url', tx.source_url);
      } else {
        formData.append('url', tx.source_url);
      }
      formData.append('model_id', 'scribe_v2');
      formData.append('diarize', 'true');
      formData.append('timestamps_granularity', 'word');
      if (tx.language_override) formData.append('language_code', tx.language_override);
      if (tx.tag_audio_events) formData.append('tag_audio_events', 'true');
      if (tx.include_subtitles) formData.append('additional_formats', JSON.stringify(['srt']));
      const keyterms = Array.isArray(tx.keyterms) ? tx.keyterms : (tx.keyterms ? JSON.parse(tx.keyterms) : []);
      if (keyterms.length) formData.append('biased_keywords', JSON.stringify(keyterms));

      const resp = await axios.post(
        'https://api.elevenlabs.io/v1/speech-to-text',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          timeout: 300000, // 5 min for large files
        },
      );

      const result = resp.data;
      await pool.query(
        `UPDATE stt_transcripts SET
           status = 'completed',
           transcript_json = $1,
           plain_text = $2,
           srt_content = $3,
           language_detected = $4,
           duration_seconds = $5,
           credits_used = $6,
           updated_at = NOW()
         WHERE transcript_id = $7`,
        [
          JSON.stringify(result.transcript || result.words || []),
          result.text || '',
          result.additional_formats?.srt || null,
          result.language_code || null,
          result.duration || null,
          result.credits_consumed || null,
          transcript_id,
        ],
      );

      this.logger.log(`STT completed: transcript_id=${transcript_id}`);

    } catch (err: any) {
      await pool.query(
        `UPDATE stt_transcripts SET status = 'failed', updated_at = NOW() WHERE transcript_id = $1`,
        [transcript_id],
      );
      this.logger.error(`STT failed: transcript_id=${transcript_id}`, (err as Error).stack);
      throw err;
    }
  }
}
