import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const WIDGET_BUCKET = 'trustnow-widget-assets';

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

@Injectable()
export class WidgetService {
  constructor(private audit: AuditService) {}

  async getWidget(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT wc.* FROM widget_configs wc
       JOIN agents a ON a.agent_id = wc.agent_id
       WHERE a.tenant_id = $1 AND wc.agent_id = $2`,
      [tenantId, agentId],
    );
    if (!rows.length) {
      // Auto-create default widget config if missing
      return this.createDefault(tenantId, agentId);
    }
    return rows[0];
  }

  private async createDefault(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO widget_configs (agent_id, expanded_behavior, avatar_type, include_www_variants, allow_http_links)
       VALUES ($1, 'starts_expanded', 'orb', true, false)
       ON CONFLICT DO NOTHING RETURNING *`,
      [agentId],
    );
    return rows[0] || null;
  }

  async updateWidget(tenantId: string, agentId: string, dto: any, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const fieldMappings: Record<string, any> = {
      feedback_enabled: dto.feedback_enabled,
      interface_settings_json: dto.interface_settings_json != null ? JSON.stringify(dto.interface_settings_json) : undefined,
      avatar_config_json: dto.avatar_config_json != null ? JSON.stringify(dto.avatar_config_json) : undefined,
      styling_config_json: dto.styling_config_json != null ? JSON.stringify(dto.styling_config_json) : undefined,
      terms_config_json: dto.terms_config_json != null ? JSON.stringify(dto.terms_config_json) : undefined,
      allowed_domains: dto.allowed_domains,
      expanded_behavior: dto.expanded_behavior,
      avatar_type: dto.avatar_type,
      include_www_variants: dto.include_www_variants,
      allow_http_links: dto.allow_http_links,
    };
    for (const [col, val] of Object.entries(fieldMappings)) {
      if (val !== undefined) { fields.push(`${col} = $${i++}`); vals.push(val); }
    }
    if (!fields.length) return this.getWidget(tenantId, agentId);
    vals.push(agentId);
    const { rows } = await pool.query(
      `UPDATE widget_configs SET ${fields.join(', ')} WHERE agent_id = $${i} RETURNING *`,
      vals,
    );
    if (!rows.length) {
      // Create if not exists then update
      await this.createDefault(tenantId, agentId);
      return this.updateWidget(tenantId, agentId, dto, actorId);
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'widget.update', resource_type: 'widget_config',
      resource_id: rows[0].widget_id, diff_json: dto,
    });
    return rows[0];
  }

  async uploadAvatar(tenantId: string, agentId: string, file: Express.Multer.File, actorId: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image.');
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('File exceeds 2MB limit.');
    }
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `widget-avatars/${tenantId}/${agentId}/${uuidv4()}${ext}`;
    const s3 = getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: WIDGET_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    const cdnBase = process.env.CDN_BASE_URL || 'https://cdn.trustnow.ai/widget-assets';
    const avatarUrl = `${cdnBase}/${key}`;
    const pool = getPool();
    await pool.query(
      `UPDATE widget_configs SET avatar_image_url = $1, avatar_type = 'image' WHERE agent_id = $2`,
      [avatarUrl, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'widget.avatar.upload', resource_type: 'widget_config', resource_id: agentId,
      diff_json: { avatar_url: avatarUrl },
    });
    return { avatar_url: avatarUrl };
  }

  async getShareableUrl(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT a.status, av.is_live
       FROM agents a
       LEFT JOIN agent_versions av ON av.agent_id = a.agent_id AND av.is_live = true
       WHERE a.tenant_id = $1 AND a.agent_id = $2 AND a.status != 'archived'`,
      [tenantId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
    const appBase = process.env.APP_BASE_URL || 'https://app.trustnow.ai';
    return {
      shareable_url: `${appBase}/agent/${agentId}`,
      is_live: rows.some((r: any) => r.is_live === true),
    };
  }

  async getEmbedCode(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT wc.embed_code, wc.widget_id, a.name AS agent_name
       FROM widget_configs wc
       JOIN agents a ON a.agent_id = wc.agent_id
       WHERE a.tenant_id = $1 AND wc.agent_id = $2`,
      [tenantId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Widget config not found');
    const embedCode = `<script src="https://widget.trustnow.ai/embed.js"
  data-widget-id="${rows[0].widget_id}"
  data-agent-id="${agentId}"
  async></script>`;
    return { embed_code: embedCode, widget_id: rows[0].widget_id };
  }
}
