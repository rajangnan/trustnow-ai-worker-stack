import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

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
