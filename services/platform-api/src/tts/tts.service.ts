import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const TTS_BUCKET = 'trustnow-tts-generations';

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

@Injectable()
export class TtsService {
  constructor(private audit: AuditService) {}

  async generate(tenantId: string, dto: {
    text: string;
    voice_id: string;
    model_id?: string;
    stability?: number;
    similarity_boost?: number;
    style_exaggeration?: number;
    speed?: number;
    use_speaker_boost?: boolean;
    language_override?: string | null;
    output_format?: string;
  }, actorId: string) {
    if (!dto.text?.length) throw new BadRequestException('text is required');
    if (dto.text.length > 5000) throw new BadRequestException('text exceeds 5,000 char limit');

    const generationId = uuidv4();
    const storagePath = `tts-generations/${tenantId}/${generationId}.mp3`;
    const s3 = getS3Client();

    // Call ElevenLabs TTS API
    const resp = await axios.post(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${dto.voice_id}`,
      {
        text: dto.text,
        model_id: dto.model_id || 'eleven_multilingual_v2',
        voice_settings: {
          stability: dto.stability ?? 0.5,
          similarity_boost: dto.similarity_boost ?? 0.75,
          style: dto.style_exaggeration ?? 0.0,
          use_speaker_boost: dto.use_speaker_boost ?? true,
          speed: dto.speed ?? 1.0,
        },
        language_code: dto.language_override || undefined,
        output_format: dto.output_format || 'mp3_44100_128',
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      },
    );

    const audioBuffer = Buffer.from(resp.data);
    // Upload to MinIO
    await s3.send(new PutObjectCommand({
      Bucket: TTS_BUCKET,
      Key: storagePath,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    }));

    // Estimate duration (rough: ~10 chars/sec for TTS)
    const duration_s = Math.max(1, Math.round(dto.text.length / 15));
    const credits_used = Math.ceil(dto.text.length / 1000); // ~1 credit per 1000 chars

    const pool = getPool();
    await pool.query(
      `INSERT INTO tts_generations
         (generation_id, tenant_id, voice_id, model_id, text_input, storage_path,
          duration_s, credits_used, output_format, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        generationId, tenantId, dto.voice_id,
        dto.model_id || 'eleven_multilingual_v2',
        dto.text, storagePath, duration_s, credits_used,
        dto.output_format || 'mp3_44100_128', actorId,
      ],
    );

    // Generate pre-signed download URL (1h)
    const download_url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: TTS_BUCKET, Key: storagePath }),
      { expiresIn: 3600 },
    );

    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tts.generate', resource_type: 'tts_generation', resource_id: generationId,
      diff_json: { voice_id: dto.voice_id, text_length: dto.text.length },
    });

    return { generation_id: generationId, download_url, duration_s, credits_used };
  }

  async getHistory(tenantId: string, page = 1, limit = 20) {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT tg.generation_id, LEFT(tg.text_input, 100) AS text,
              v.name AS voice_name, tg.model_id, tg.duration_s, tg.credits_used, tg.created_at
       FROM tts_generations tg
       LEFT JOIN voices v ON v.voice_id = tg.voice_id
       WHERE tg.tenant_id = $1
       ORDER BY tg.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM tts_generations WHERE tenant_id = $1`,
      [tenantId],
    );
    return { generations: rows, total: countRows[0].total };
  }

  async getDownloadUrl(tenantId: string, generationId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT storage_path FROM tts_generations WHERE tenant_id = $1 AND generation_id = $2`,
      [tenantId, generationId],
    );
    if (!rows.length) throw new NotFoundException('Generation not found');
    const s3 = getS3Client();
    const download_url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: TTS_BUCKET, Key: rows[0].storage_path }),
      { expiresIn: 3600 },
    );
    return { download_url };
  }

  async deleteGeneration(tenantId: string, generationId: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT storage_path FROM tts_generations WHERE tenant_id = $1 AND generation_id = $2`,
      [tenantId, generationId],
    );
    if (!rows.length) throw new NotFoundException('Generation not found');
    const s3 = getS3Client();
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: TTS_BUCKET, Key: rows[0].storage_path }));
    } catch { /* non-fatal if already deleted */ }
    await pool.query(`DELETE FROM tts_generations WHERE tenant_id = $1 AND generation_id = $2`, [tenantId, generationId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tts.delete', resource_type: 'tts_generation', resource_id: generationId, diff_json: {},
    });
    return { deleted: true };
  }
}
