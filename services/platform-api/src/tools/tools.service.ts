import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ToolsService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM tools WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
    );
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

  // MCP (Model Context Protocol) server management
  async getMcpServers(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM tools WHERE tenant_id = $1 AND type = 'mcp' ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows;
  }

  async createMcpServer(tenantId: string, dto: any, actorId: string) {
    return this.create(tenantId, { ...dto, type: 'mcp' }, actorId);
  }
}
