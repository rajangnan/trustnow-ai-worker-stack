import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import axios from 'axios';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const VALID_EVENTS = [
  'voice.removal', 'transcription.completed',
  'agent.published', 'agent.error',
  'batch_call.completed', 'batch_call.failed',
  'knowledge_base.indexed',
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

@Injectable()
export class WebhookEndpointsService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT endpoint_id, url, description, events, is_active, created_at
       FROM webhook_endpoints WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return { endpoints: rows };
  }

  async create(tenantId: string, dto: {
    url: string;
    description?: string;
    events: string[];
  }, actorId: string) {
    if (!dto.url.startsWith('https://')) throw new BadRequestException('URL must use HTTPS');
    if (!dto.events?.length) throw new BadRequestException('At least one event required');
    for (const e of dto.events) {
      if (!VALID_EVENTS.includes(e)) throw new BadRequestException(`Unknown event: ${e}`);
    }
    const pool = getPool();
    const secret = randomBytes(32).toString('hex');
    // In production: encrypt via Vault; store vault path
    const { rows } = await pool.query(
      `INSERT INTO webhook_endpoints
         (tenant_id, url, description, events, secret_enc, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING endpoint_id, url, events`,
      [tenantId, dto.url, dto.description || null, JSON.stringify(dto.events), secret, actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook_endpoint.create', resource_type: 'webhook_endpoint',
      resource_id: rows[0].endpoint_id, diff_json: { url: dto.url, events: dto.events },
    });
    return { ...rows[0], secret };
  }

  async update(tenantId: string, endpointId: string, dto: {
    url?: string;
    description?: string;
    events?: string[];
    is_active?: boolean;
  }, actorId: string) {
    if (dto.url && !dto.url.startsWith('https://')) throw new BadRequestException('URL must use HTTPS');
    const pool = getPool();
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    if (dto.url !== undefined)         { sets.push(`url = $${i++}`);         params.push(dto.url); }
    if (dto.description !== undefined) { sets.push(`description = $${i++}`); params.push(dto.description); }
    if (dto.events !== undefined)      { sets.push(`events = $${i++}`);      params.push(JSON.stringify(dto.events)); }
    if (dto.is_active !== undefined)   { sets.push(`is_active = $${i++}`);   params.push(dto.is_active); }
    if (!sets.length) return { updated_at: new Date().toISOString() };
    sets.push(`updated_at = NOW()`);
    params.push(tenantId, endpointId);
    const { rowCount } = await pool.query(
      `UPDATE webhook_endpoints SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND endpoint_id = $${i++}`,
      params,
    );
    if (!rowCount) throw new NotFoundException('Webhook endpoint not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook_endpoint.update', resource_type: 'webhook_endpoint',
      resource_id: endpointId, diff_json: dto,
    });
    return { updated_at: new Date().toISOString() };
  }

  async delete(tenantId: string, endpointId: string, actorId: string) {
    const pool = getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM webhook_endpoints WHERE tenant_id = $1 AND endpoint_id = $2`,
      [tenantId, endpointId],
    );
    if (!rowCount) throw new NotFoundException('Webhook endpoint not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook_endpoint.delete', resource_type: 'webhook_endpoint',
      resource_id: endpointId, diff_json: {},
    });
    return { deleted: true };
  }

  async rotateSecret(tenantId: string, endpointId: string, actorId: string) {
    const pool = getPool();
    const newSecret = randomBytes(32).toString('hex');
    const { rowCount } = await pool.query(
      `UPDATE webhook_endpoints SET secret_enc = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND endpoint_id = $3`,
      [newSecret, tenantId, endpointId],
    );
    if (!rowCount) throw new NotFoundException('Webhook endpoint not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook_endpoint.rotate_secret', resource_type: 'webhook_endpoint',
      resource_id: endpointId, diff_json: {},
    });
    return { new_secret: newSecret };
  }

  // ── Background delivery service (called by platform events) ──────────────

  async deliverWebhookEvent(eventType: string, tenantId: string, data: object) {
    const pool = getPool();
    const { rows: endpoints } = await pool.query(
      `SELECT * FROM webhook_endpoints
       WHERE tenant_id = $1 AND is_active = true AND $2 = ANY(events)`,
      [tenantId, eventType],
    );

    for (const endpoint of endpoints) {
      const payload = { event: eventType, timestamp: new Date().toISOString(), data };
      const secret = endpoint.secret_enc; // In production: decrypt from Vault
      const signature = 'sha256=' + createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      for (let attempt = 1; attempt <= 3; attempt++) {
        const startMs = Date.now();
        try {
          const res = await axios.post(endpoint.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-TRUSTNOW-Signature': signature,
            },
            timeout: 10000,
          });
          await pool.query(
            `INSERT INTO webhook_delivery_log
               (endpoint_id, tenant_id, event_type, payload, http_status, success, duration_ms, attempt_number)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              endpoint.endpoint_id, tenantId, eventType, JSON.stringify(payload),
              res.status, res.status >= 200 && res.status < 300,
              Date.now() - startMs, attempt,
            ],
          );
          if (res.status >= 200 && res.status < 300) break;
        } catch (err: any) {
          await pool.query(
            `INSERT INTO webhook_delivery_log
               (endpoint_id, tenant_id, event_type, payload, http_status, success, duration_ms, attempt_number)
             VALUES ($1,$2,$3,$4,$5,false,$6,$7)`,
            [
              endpoint.endpoint_id, tenantId, eventType, JSON.stringify(payload),
              err?.response?.status || null,
              Date.now() - startMs, attempt,
            ],
          );
          if (attempt < 3) await sleep(Math.pow(5, attempt) * 1000); // 5s, 25s
        }
      }
    }
  }
}
