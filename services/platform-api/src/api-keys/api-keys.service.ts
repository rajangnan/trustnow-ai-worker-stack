import {
  Injectable, NotFoundException, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const ADJECTIVES = ['happy', 'swift', 'bold', 'calm', 'keen', 'bright', 'wise', 'pure'];
const ANIMALS = ['fox', 'hawk', 'bear', 'wolf', 'lion', 'eagle', 'deer', 'otter'];

function generateKeyName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const ani = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}-${ani}`;
}

@Injectable()
export class ApiKeysService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT ak.key_id, ak.name, ak.key_prefix, ak.restrict_key,
              ak.monthly_credit_limit, ak.permissions, ak.last_used_at,
              u.email AS created_by, ak.created_at, ak.is_active
       FROM api_keys ak
       LEFT JOIN users u ON u.user_id = ak.created_by
       WHERE ak.tenant_id = $1
       ORDER BY ak.created_at DESC`,
      [tenantId],
    );
    return { api_keys: rows };
  }

  async create(tenantId: string, dto: {
    name?: string;
    restrict_key?: boolean;
    monthly_credit_limit?: number | null;
    permissions?: Record<string, string | null>;
  }, actorId: string) {
    const pool = getPool();
    // Generate key: sk-tn_ + 32 base64url chars (crypto.randomBytes(24) = 32 base64url chars)
    const rawKey = 'sk-tn_' + randomBytes(24).toString('base64url');
    const keyPrefix = rawKey.substring(0, 8); // first 8 chars: 'sk-tn_ab'
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const name = dto.name || generateKeyName();

    const { rows } = await pool.query(
      `INSERT INTO api_keys
         (tenant_id, name, key_prefix, key_hash, restrict_key,
          monthly_credit_limit, permissions, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
       RETURNING key_id, name, key_prefix, created_at`,
      [
        tenantId, name, keyPrefix, keyHash,
        dto.restrict_key ?? true,
        dto.monthly_credit_limit ?? null,
        JSON.stringify(dto.permissions || {}),
        actorId,
      ],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'api_key.create', resource_type: 'api_key', resource_id: rows[0].key_id,
      diff_json: { name, restrict_key: dto.restrict_key },
    });
    // Return full key ONCE — never stored, only hash kept
    return { ...rows[0], key: rawKey };
  }

  async update(tenantId: string, keyId: string, dto: {
    name?: string;
    restrict_key?: boolean;
    monthly_credit_limit?: number | null;
    permissions?: Record<string, string | null>;
  }, actorId: string) {
    const pool = getPool();
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    if (dto.name !== undefined)                 { sets.push(`name = $${i++}`);                 params.push(dto.name); }
    if (dto.restrict_key !== undefined)         { sets.push(`restrict_key = $${i++}`);         params.push(dto.restrict_key); }
    if (dto.monthly_credit_limit !== undefined) { sets.push(`monthly_credit_limit = $${i++}`); params.push(dto.monthly_credit_limit); }
    if (dto.permissions !== undefined)          { sets.push(`permissions = $${i++}`);          params.push(JSON.stringify(dto.permissions)); }
    if (!sets.length) return { updated_at: new Date().toISOString() };
    sets.push(`updated_at = NOW()`);
    params.push(tenantId, keyId);
    const { rowCount } = await pool.query(
      `UPDATE api_keys SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND key_id = $${i++} AND is_active = true`,
      params,
    );
    if (!rowCount) throw new NotFoundException('API key not found or already revoked');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'api_key.update', resource_type: 'api_key', resource_id: keyId, diff_json: dto,
    });
    return { updated_at: new Date().toISOString() };
  }

  async revoke(tenantId: string, keyId: string, actorId: string) {
    const pool = getPool();
    const { rowCount } = await pool.query(
      `UPDATE api_keys SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND key_id = $2`,
      [tenantId, keyId],
    );
    if (!rowCount) throw new NotFoundException('API key not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'api_key.revoke', resource_type: 'api_key', resource_id: keyId, diff_json: {},
    });
    return { revoked: true };
  }

  // Called by ApiKeyMiddleware
  async validateApiKey(rawKey: string): Promise<{ tenant_id: string; key_id: string }> {
    const pool = getPool();
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const { rows } = await pool.query(
      `SELECT key_id, tenant_id, restrict_key, monthly_credit_limit, permissions
       FROM api_keys WHERE key_hash = $1 AND is_active = true`,
      [hash],
    );
    if (!rows.length) throw new UnauthorizedException('Invalid or revoked API key');
    const key = rows[0];

    // Check monthly credit limit
    if (key.monthly_credit_limit !== null) {
      const { rows: usage } = await pool.query(
        `SELECT COALESCE(SUM(credits_used), 0)::float AS used
         FROM conversations
         WHERE tenant_id = $1
           AND started_at >= date_trunc('month', NOW())
           AND (metadata_json->>'api_key_id') = $2`,
        [key.tenant_id, key.key_id],
      );
      if (usage[0].used >= key.monthly_credit_limit) {
        throw new ForbiddenException('Monthly credit limit exceeded');
      }
    }

    // Update last_used_at fire-and-forget
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1', [key.key_id]).catch(() => {});

    return { tenant_id: key.tenant_id, key_id: key.key_id };
  }
}
