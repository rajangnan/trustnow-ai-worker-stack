import { Injectable, Logger } from '@nestjs/common';
import { getPool } from '../database/db.provider';

export interface AuditEntry {
  tenant_id: string;
  actor_id: string;
  action: string;  // e.g. 'agent.config.update', 'agent.publish'
  resource_type: string;
  resource_id: string;
  diff_json?: object;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async log(entry: AuditEntry): Promise<void> {
    const pool = getPool();
    try {
      await pool.query(
        `INSERT INTO audit_logs
           (tenant_id, actor_id, action, resource_type, resource_id, diff_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          entry.tenant_id,
          entry.actor_id,
          entry.action,
          entry.resource_type,
          entry.resource_id,
          JSON.stringify(entry.diff_json || {}),
        ],
      );
    } catch (err) {
      this.logger.error('Audit log write failed', err);
    }
  }
}
