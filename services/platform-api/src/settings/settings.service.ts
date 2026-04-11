import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  constructor(private audit: AuditService) {}

  // ── Workspace Settings ────────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT conversation_initiation_webhook_url,
              conversation_initiation_webhook_auth,
              post_call_webhook_url,
              CASE WHEN post_call_webhook_secret IS NOT NULL THEN '••••••••' ELSE NULL END AS post_call_webhook_secret,
              post_call_webhook_auth
       FROM workspace_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    if (!rows.length) {
      return {
        conversation_initiation_webhook_url: null,
        conversation_initiation_webhook_auth: null,
        post_call_webhook_url: null,
        post_call_webhook_secret: null,
        post_call_webhook_auth: null,
      };
    }
    return rows[0];
  }

  async updateSettings(tenantId: string, dto: {
    conversation_initiation_webhook_url?: string | null;
    conversation_initiation_webhook_auth?: object;
    post_call_webhook_url?: string | null;
    post_call_webhook_secret?: string | null;
    post_call_webhook_auth?: object;
  }, actorId: string) {
    const pool = getPool();
    const fields = [
      'conversation_initiation_webhook_url',
      'conversation_initiation_webhook_auth',
      'post_call_webhook_url',
      'post_call_webhook_secret',
      'post_call_webhook_auth',
    ];
    const sets: string[] = [];
    const params: any[] = [tenantId];
    let i = 2;
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) {
        const val = (dto as any)[f];
        sets.push(`${f} = $${i++}`);
        params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }
    if (!sets.length) return { updated_at: new Date().toISOString() };
    await pool.query(
      `INSERT INTO workspace_settings (tenant_id, ${sets.map(s => s.split(' = ')[0]).join(', ')})
       VALUES ($1, ${sets.map((_, idx) => `$${idx + 2}`).join(', ')})
       ON CONFLICT (tenant_id) DO UPDATE SET ${sets.join(', ')}, updated_at = NOW()`,
      params,
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'workspace_settings.update', resource_type: 'workspace_settings', resource_id: tenantId,
      diff_json: { ...dto, post_call_webhook_secret: dto.post_call_webhook_secret ? '[REDACTED]' : undefined },
    });
    return { updated_at: new Date().toISOString() };
  }

  async testWebhook(tenantId: string, dto: { webhook_type: 'initiation' | 'post_call'; url: string }) {
    const payload = {
      type: 'test',
      webhook_type: dto.webhook_type,
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
    };
    const start = Date.now();
    try {
      const resp = await axios.post(dto.url, payload, { timeout: 10000 });
      return { success: true, http_status: resp.status, response_time_ms: Date.now() - start };
    } catch (err: any) {
      const status = err?.response?.status || null;
      return { success: false, http_status: status, response_time_ms: Date.now() - start };
    }
  }

  // ── Workspace Secrets ─────────────────────────────────────────────────────

  async listSecrets(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT ws.secret_id, ws.name, u.email AS created_by, ws.created_at
       FROM workspace_secrets ws
       LEFT JOIN users u ON u.user_id = ws.created_by
       WHERE ws.tenant_id = $1
       ORDER BY ws.created_at DESC`,
      [tenantId],
    );
    return { secrets: rows };
  }

  async createSecret(tenantId: string, dto: { name: string; value: string }, actorId: string) {
    const pool = getPool();
    // Validate name format: uppercase alphanumeric + underscores
    if (!/^[A-Z0-9_]+$/.test(dto.name)) {
      throw new BadRequestException('Secret name must match /^[A-Z0-9_]+$/ (uppercase convention)');
    }
    // Check uniqueness
    const { rows: existing } = await pool.query(
      `SELECT secret_id FROM workspace_secrets WHERE tenant_id = $1 AND name = $2`,
      [tenantId, dto.name],
    );
    if (existing.length) throw new ConflictException(`Secret '${dto.name}' already exists`);

    // In production: encrypt via Vault and store vault_path
    // For now: store as encrypted reference string
    const vaultPath = `trustnow/${tenantId}/secrets/${dto.name}`;
    const { rows } = await pool.query(
      `INSERT INTO workspace_secrets (tenant_id, name, value_enc, vault_path, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING secret_id, name`,
      [tenantId, dto.name, `vault:${vaultPath}`, vaultPath, actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'workspace_secret.create', resource_type: 'workspace_secret', resource_id: rows[0].secret_id,
      diff_json: { name: dto.name },
    });
    return rows[0];
  }

  async deleteSecret(tenantId: string, secretId: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT name, vault_path FROM workspace_secrets WHERE tenant_id = $1 AND secret_id = $2`,
      [tenantId, secretId],
    );
    if (!rows.length) throw new NotFoundException('Secret not found');
    // In production: delete from Vault
    await pool.query(`DELETE FROM workspace_secrets WHERE tenant_id = $1 AND secret_id = $2`, [tenantId, secretId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'workspace_secret.delete', resource_type: 'workspace_secret', resource_id: secretId,
      diff_json: { name: rows[0].name },
    });
    return { deleted: true };
  }

  // ── Auth Connections ──────────────────────────────────────────────────────

  async listAuthConnections(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT auth_id, name, auth_type, created_at
       FROM workspace_auth_connections
       WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return { connections: rows };
  }

  async createAuthConnection(tenantId: string, dto: {
    name: string;
    auth_type: 'oauth2' | 'api_key' | 'bearer' | 'basic';
    config: object;
  }, actorId: string) {
    const pool = getPool();
    // In production: encrypt config via Vault
    const configJson = JSON.stringify(dto.config);
    const { rows } = await pool.query(
      `INSERT INTO workspace_auth_connections (tenant_id, name, auth_type, config_enc, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING auth_id, name, auth_type`,
      [tenantId, dto.name, dto.auth_type, configJson, actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'auth_connection.create', resource_type: 'workspace_auth_connection',
      resource_id: rows[0].auth_id, diff_json: { name: dto.name, auth_type: dto.auth_type },
    });
    return rows[0];
  }

  async deleteAuthConnection(tenantId: string, authId: string, actorId: string) {
    const pool = getPool();
    // Check if any tools reference this auth connection
    const { rows: toolRefs } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM tools
       WHERE tenant_id = $1 AND config_json->>'auth_connection_id' = $2`,
      [tenantId, authId],
    );
    if (toolRefs[0]?.cnt > 0) {
      throw new ConflictException(
        `Cannot delete: ${toolRefs[0].cnt} tools use this auth connection. Update tools first.`,
      );
    }
    const { rowCount } = await pool.query(
      `DELETE FROM workspace_auth_connections WHERE tenant_id = $1 AND auth_id = $2`,
      [tenantId, authId],
    );
    if (!rowCount) throw new NotFoundException('Auth connection not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'auth_connection.delete', resource_type: 'workspace_auth_connection',
      resource_id: authId, diff_json: {},
    });
    return { deleted: true };
  }
}
