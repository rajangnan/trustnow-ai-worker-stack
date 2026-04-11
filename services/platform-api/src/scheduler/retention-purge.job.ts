import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

function getS3Client(): S3Client {
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

function recordingKeyFromUrl(url: string): string | null {
  // Extract S3/MinIO key from a CDN or direct URL
  // e.g. https://cdn.trustnow.ai/recordings/tenant/conv.wav → recordings/tenant/conv.wav
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

@Injectable()
export class RetentionPurgeJob {
  private readonly logger = new Logger(RetentionPurgeJob.name);

  constructor(private readonly audit: AuditService) {}

  // Daily at 03:00 UTC
  @Cron('0 3 * * *')
  async purgeExpiredConversations() {
    const pool = getPool();
    const s3 = getS3Client();
    const bucket = process.env.MINIO_RECORDINGS_BUCKET || 'trustnow-recordings';

    // Find all agents with a positive retention window
    const { rows: agents } = await pool.query(`
      SELECT DISTINCT ac.agent_id, ac.conversations_retention_days, a.tenant_id
      FROM agent_configs ac
      JOIN agents a ON a.agent_id = ac.agent_id
      WHERE ac.conversations_retention_days > 0
        AND a.status != 'archived'
    `);

    let totalPurged = 0;
    for (const agent of agents) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - agent.conversations_retention_days);

      const { rows: expired } = await pool.query(
        `SELECT conversation_id, recording_url FROM conversations
         WHERE agent_id = $1 AND started_at < $2`,
        [agent.agent_id, cutoff],
      );

      if (!expired.length) continue;

      for (const conv of expired) {
        // Delete MinIO recording if present
        if (conv.recording_url) {
          const key = recordingKeyFromUrl(conv.recording_url);
          if (key) {
            try {
              await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
            } catch (err) {
              this.logger.warn(`MinIO delete failed for ${key}: ${(err as Error).message}`);
            }
          }
        }
        // Delete conversation (cascades to transcript, feedback, turns via FK)
        await pool.query('DELETE FROM conversations WHERE conversation_id = $1', [conv.conversation_id]);
      }

      this.logger.log(
        `Retention purge: agent=${agent.agent_id} deleted=${expired.length} conversations cutoff=${cutoff.toISOString()}`,
      );
      totalPurged += expired.length;

      // Audit log per agent batch
      await this.audit.log({
        tenant_id: agent.tenant_id,
        actor_id: 'system',
        action: 'retention_purge',
        resource_type: 'agent',
        resource_id: agent.agent_id,
        diff_json: {
          count: expired.length,
          cutoff_date: cutoff.toISOString(),
          purged_at: new Date().toISOString(),
        },
      });
    }

    this.logger.log(`Retention purge complete: total=${totalPurged} conversations across ${agents.length} agents`);
  }
}
