import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ToolsService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string, agentId?: string) {
    const pool = getPool();
    let query = `SELECT * FROM tools WHERE tenant_id = $1 AND type != 'mcp'`;
    const params: any[] = [tenantId];
    if (agentId) { query += ` AND agent_id = $2`; params.push(agentId); }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async findOne(tenantId: string, toolId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM tools WHERE tenant_id = $1 AND tool_id = $2',
      [tenantId, toolId],
    );
    if (!rows.length) throw new NotFoundException('Tool not found');
    return rows[0];
  }

  async create(tenantId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO tools (tenant_id, name, type, description, config_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, dto.name, dto.type || 'webhook', dto.description || '',
       JSON.stringify(dto.config_json || {}), actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tool.create', resource_type: 'tool', resource_id: rows[0].tool_id,
      diff_json: dto,
    });
    return rows[0];
  }

  async update(tenantId: string, toolId: string, dto: any, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (dto.name !== undefined) { fields.push(`name = $${i++}`); vals.push(dto.name); }
    if (dto.description !== undefined) { fields.push(`description = $${i++}`); vals.push(dto.description); }
    if (dto.config_json !== undefined) { fields.push(`config_json = $${i++}`); vals.push(JSON.stringify(dto.config_json)); }
    if (!fields.length) return this.findOne(tenantId, toolId);
    vals.push(tenantId, toolId);
    const { rows } = await pool.query(
      `UPDATE tools SET ${fields.join(', ')} WHERE tenant_id = $${i} AND tool_id = $${i + 1} RETURNING *`,
      vals,
    );
    if (!rows.length) throw new NotFoundException('Tool not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tool.update', resource_type: 'tool', resource_id: toolId, diff_json: dto,
    });
    return rows[0];
  }

  async delete(tenantId: string, toolId: string, actorId: string) {
    const pool = getPool();
    await pool.query('DELETE FROM tools WHERE tenant_id = $1 AND tool_id = $2', [tenantId, toolId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tool.delete', resource_type: 'tool', resource_id: toolId,
    });
    return { success: true };
  }

  // System tools for an agent (includes "Play keypad touch tone" per UI-SPEC Tab 6)
  async getSystemTools() {
    return [
      { id: 'dtmf_tone', name: 'Play keypad touch tone', type: 'system', description: 'Plays a DTMF keypad touch tone during a call' },
      { id: 'end_call', name: 'End call', type: 'system', description: 'Gracefully ends the current call' },
      { id: 'transfer_call', name: 'Transfer call', type: 'system', description: 'Transfer call to a human agent or external number' },
      { id: 'send_sms', name: 'Send SMS', type: 'system', description: 'Send an SMS to the caller\'s number' },
    ];
  }

  async updateAgentSystemTools(tenantId: string, agentId: string, toolIds: string[], actorId: string) {
    const pool = getPool();
    const existing = await pool.query(
      'SELECT tools_config_json FROM agent_configs WHERE agent_id = $1',
      [agentId],
    );
    const current = existing.rows[0]?.tools_config_json || [];
    const systemTools = toolIds.map((id) => ({ id, type: 'system' }));
    const nonSystem = (Array.isArray(current) ? current : []).filter((t: any) => t.type !== 'system');
    const updated = [...nonSystem, ...systemTools];
    await pool.query(
      'UPDATE agent_configs SET tools_config_json = $1 WHERE agent_id = $2',
      [JSON.stringify(updated), agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tool.system.update', resource_type: 'agent_config', resource_id: agentId,
      diff_json: { system_tool_ids: toolIds },
    });
    return { success: true };
  }

  // System tools — PATCH semantics (§6.2J)
  async patchAgentSystemTools(tenantId: string, agentId: string, dto: Record<string, boolean>, actorId: string) {
    const pool = getPool();
    const { rows: existing } = await pool.query(
      'SELECT tools_config_json FROM agent_configs WHERE agent_id = $1',
      [agentId],
    );
    const current = existing[0]?.tools_config_json || {};
    const currentSystemTools = (current as any).system_tools || {};
    const merged = { ...currentSystemTools, ...dto };
    const updated = { ...(current as any), system_tools: merged };
    await pool.query(
      'UPDATE agent_configs SET tools_config_json = $1 WHERE agent_id = $2',
      [JSON.stringify(updated), agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'tool.system.patch', resource_type: 'agent_config', resource_id: agentId,
      diff_json: dto,
    });
    const activeCount = Object.values(merged).filter(Boolean).length;
    return { system_tools: merged, active_count: activeCount };
  }

  // MCP (Model Context Protocol) server management
  async getMcpServers(tenantId: string, agentId?: string) {
    const pool = getPool();
    let query = `SELECT * FROM tools WHERE tenant_id = $1 AND type = 'mcp'`;
    const params: any[] = [tenantId];
    if (agentId) {
      query += ` AND (agent_id = $2 OR agent_id IS NULL)`;
      params.push(agentId);
    }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async createMcpServer(tenantId: string, dto: any, actorId: string) {
    return this.create(tenantId, { ...dto, type: 'mcp' }, actorId);
  }

  async deleteMcpServer(tenantId: string, serverId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM tools WHERE tenant_id = $1 AND tool_id = $2 AND type = 'mcp'`,
      [tenantId, serverId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'mcp.server.delete', resource_type: 'tool', resource_id: serverId,
    });
    return { deleted: true };
  }

  async acceptMcpTerms(tenantId: string, actorId: string) {
    const pool = getPool();
    // Check if already accepted
    const { rows } = await pool.query(
      `SELECT settings_json FROM tenants WHERE tenant_id = $1`,
      [tenantId],
    );
    const settings = rows[0]?.settings_json || {};
    if (settings.mcp_terms_accepted) {
      throw new Error('Terms already accepted by this workspace');
    }
    const acceptedAt = new Date().toISOString();
    await pool.query(
      `UPDATE tenants SET settings_json = settings_json ||
       $1::jsonb WHERE tenant_id = $2`,
      [JSON.stringify({ mcp_terms_accepted: true, mcp_terms_accepted_at: acceptedAt, mcp_terms_accepted_by: actorId }), tenantId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'mcp.terms.accept', resource_type: 'tenant', resource_id: tenantId,
    });
    return { accepted: true, accepted_at: acceptedAt };
  }

  async testTool(tenantId: string, dto: any) {
    const axios = (await import('axios')).default;
    const method = (dto.method || 'POST').toLowerCase();
    const start = Date.now();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(dto.headers || {}) };
      const response = await axios({
        method,
        url: dto.url,
        headers,
        data: dto.test_payload || {},
        timeout: (dto.response_timeout_s || 20) * 1000,
      });
      return { status: response.status, body: response.data, latency_ms: Date.now() - start };
    } catch (err: any) {
      return {
        status: err.response?.status || 0,
        body: err.response?.data || err.message,
        latency_ms: Date.now() - start,
      };
    }
  }

  async getToolHistory(tenantId: string, toolId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT al.created_at, al.actor_id, al.diff_json, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.user_id::text = al.actor_id
       WHERE al.resource_type = 'tool' AND al.resource_id = $1 AND al.tenant_id = $2
       ORDER BY al.created_at DESC LIMIT 50`,
      [toolId, tenantId],
    );
    return rows;
  }
}
