import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WebhooksService {
  constructor(private audit: AuditService) {}

  async setPostCallWebhook(tenantId: string, agentId: string, url: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE auth_policies SET post_call_webhook_url = $1
       WHERE agent_id = $2 AND tenant_id = $3 RETURNING *`,
      [url, agentId, tenantId],
    );
    if (!rows.length) {
      // Create if not exists
      await pool.query(
        `INSERT INTO auth_policies (agent_id, tenant_id, post_call_webhook_url)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [agentId, tenantId, url],
      );
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook.post_call.set', resource_type: 'auth_policy', resource_id: agentId,
      diff_json: { post_call_webhook_url: url },
    });
    return { success: true, post_call_webhook_url: url };
  }

  async deletePostCallWebhook(tenantId: string, agentId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE auth_policies SET post_call_webhook_url = NULL
       WHERE agent_id = $1 AND tenant_id = $2`,
      [agentId, tenantId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook.post_call.delete', resource_type: 'auth_policy', resource_id: agentId,
    });
    return { success: true };
  }

  async setInitiationWebhook(tenantId: string, agentId: string, url: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE auth_policies SET conversation_initiation_webhook_url = $1
       WHERE agent_id = $2 AND tenant_id = $3`,
      [url, agentId, tenantId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'webhook.initiation.set', resource_type: 'auth_policy', resource_id: agentId,
      diff_json: { conversation_initiation_webhook_url: url },
    });
    return { success: true, conversation_initiation_webhook_url: url };
  }
}
