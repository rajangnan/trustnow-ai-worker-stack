import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

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

@Injectable()
export class SttService {
  constructor(
    private audit: AuditService,
    @InjectQueue('stt-transcribe') private sttQueue: Queue,
  ) {}

  async createTranscription(
    tenantId: string,
    dto: {
      source_type: 'upload' | 'youtube' | 'url';
      source_url?: string;
      title?: string;
      language_override?: string;
      tag_audio_events?: boolean;
      include_subtitles?: boolean;
      no_verbatim?: boolean;
      keyterms?: string[];
    },
    file: Express.Multer.File | undefined,
    actorId: string,
  ) {
    const pool = getPool();
    const transcriptId = uuidv4();
    let storagePath: string | null = null;

    if (dto.source_type === 'upload') {
      if (!file) throw new BadRequestException('File required for source_type=upload');
      if (file.size > 1000 * 1024 * 1024) throw new BadRequestException('File exceeds 1,000 MB limit');
      const ext = file.originalname.split('.').pop() || 'bin';
      storagePath = `stt-transcripts/${tenantId}/${transcriptId}.${ext}`;
      const s3 = getS3Client();
      await s3.send(new PutObjectCommand({
        Bucket: STT_BUCKET,
        Key: storagePath,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
    } else if (!dto.source_url) {
      throw new BadRequestException('source_url required for youtube/url types');
    }

    const title = dto.title || (file?.originalname ?? dto.source_url ?? 'Untitled');
    await pool.query(
      `INSERT INTO stt_transcripts
         (transcript_id, tenant_id, title, source_type, source_url, storage_path,
          language_override, tag_audio_events, include_subtitles, no_verbatim,
          keyterms, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12)`,
      [
        transcriptId, tenantId, title, dto.source_type, dto.source_url || null, storagePath,
        dto.language_override || null,
        dto.tag_audio_events ?? true,
        dto.include_subtitles ?? false,
        dto.no_verbatim ?? false,
        JSON.stringify(dto.keyterms || []),
        actorId,
      ],
    );

    await this.sttQueue.add({ transcript_id: transcriptId }, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
    });

    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'stt.transcribe', resource_type: 'stt_transcript', resource_id: transcriptId,
      diff_json: { source_type: dto.source_type, title },
    });

    return { transcript_id: transcriptId, status: 'pending' };
  }

  async findAll(tenantId: string, search?: string, status?: string, page = 1, limit = 20) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let i = 2;
    let query = `SELECT transcript_id, title, source_type, status, language_detected,
                        duration_seconds, created_at
                 FROM stt_transcripts WHERE tenant_id = $1`;
    if (search)  { query += ` AND to_tsvector('english', COALESCE(plain_text,'')) @@ plainto_tsquery($${i++})`; params.push(search); }
    if (status)  { query += ` AND status = $${i++}`; params.push(status); }
    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, (page - 1) * limit);
    const { rows } = await pool.query(query, params);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM stt_transcripts WHERE tenant_id = $1`,
      [tenantId],
    );
    return { transcripts: rows, total: countRows[0].total };
  }

  async findOne(tenantId: string, transcriptId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM stt_transcripts WHERE tenant_id = $1 AND transcript_id = $2`,
      [tenantId, transcriptId],
    );
    if (!rows.length) throw new NotFoundException('Transcript not found');
    return rows[0];
  }

  async exportTranscript(tenantId: string, transcriptId: string, format: string) {
    const tx = await this.findOne(tenantId, transcriptId);
    if (tx.status !== 'completed') throw new BadRequestException('Transcript not yet completed');
    switch (format) {
      case 'txt':
        return { content: tx.plain_text || '', filename: `${tx.title}.txt`, mime: 'text/plain' };
      case 'json':
        return {
          content: JSON.stringify(tx.transcript_json, null, 2),
          filename: `${tx.title}.json`,
          mime: 'application/json',
        };
      case 'srt':
        if (!tx.srt_content) throw new BadRequestException('SRT not available — re-transcribe with include_subtitles=true');
        return { content: tx.srt_content, filename: `${tx.title}.srt`, mime: 'text/plain' };
      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  async update(tenantId: string, transcriptId: string, dto: { title: string }, actorId: string) {
    const pool = getPool();
    const { rowCount } = await pool.query(
      `UPDATE stt_transcripts SET title = $1, updated_at = NOW() WHERE tenant_id = $2 AND transcript_id = $3`,
      [dto.title, tenantId, transcriptId],
    );
    if (!rowCount) throw new NotFoundException('Transcript not found');
    return { updated_at: new Date().toISOString() };
  }

  async delete(tenantId: string, transcriptId: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT source_type, storage_path FROM stt_transcripts WHERE tenant_id = $1 AND transcript_id = $2`,
      [tenantId, transcriptId],
    );
    if (!rows.length) throw new NotFoundException('Transcript not found');
    if (rows[0].source_type === 'upload' && rows[0].storage_path) {
      const s3 = getS3Client();
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: STT_BUCKET, Key: rows[0].storage_path }));
      } catch { /* non-fatal */ }
    }
    await pool.query(`DELETE FROM stt_transcripts WHERE tenant_id = $1 AND transcript_id = $2`, [tenantId, transcriptId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'stt.delete', resource_type: 'stt_transcript', resource_id: transcriptId, diff_json: {},
    });
    return { deleted: true };
  }
}
