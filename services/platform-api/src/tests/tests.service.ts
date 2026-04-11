import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TestsService {
  constructor(
    private audit: AuditService,
    @InjectQueue('test-execution') private testQueue: Queue,
  ) {}

  // ── Workspace Tests CRUD ──────────────────────────────────────────────────

  async findAllWorkspace(tenantId: string, filters?: { type?: string; folder_id?: string; search?: string }) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let i = 2;
    let query = `SELECT t.*, tf.name AS folder_name
                 FROM agent_tests t
                 LEFT JOIN test_folders tf ON tf.folder_id = t.folder_id
                 WHERE t.tenant_id = $1 AND (t.is_template = false OR t.is_template IS NULL)`;
    if (filters?.type)      { query += ` AND t.test_type = $${i++}`;                    params.push(filters.type); }
    if (filters?.folder_id) { query += ` AND t.folder_id = $${i++}`;                   params.push(filters.folder_id); }
    if (filters?.search)    { query += ` AND t.name ILIKE $${i++}`;                    params.push(`%${filters.search}%`); }
    query += ` ORDER BY t.created_at DESC`;
    const { rows } = await pool.query(query, params);
    return { tests: rows, total: rows.length };
  }

  async findOne(tenantId: string, testId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT t.*, tf.name AS folder_name
       FROM agent_tests t
       LEFT JOIN test_folders tf ON tf.folder_id = t.folder_id
       WHERE t.tenant_id = $1 AND t.test_id = $2`,
      [tenantId, testId],
    );
    if (!rows.length) throw new NotFoundException('Test not found');
    return rows[0];
  }

  async createWorkspace(tenantId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO agent_tests
         (tenant_id, name, test_type, folder_id, agent_id,
          conversation_json, expected_criteria, success_examples, failure_examples,
          tool_type, target_agent_id, target_node_id, should_invoke,
          user_scenario, success_criteria, max_turns, mock_all_tools,
          dynamic_variables, is_template, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,false,$19)
       RETURNING test_id, name, test_type`,
      [
        tenantId, dto.name, dto.test_type || 'next_reply',
        dto.folder_id || null,
        dto.agent_id || null,
        JSON.stringify(dto.conversation || []),
        dto.expected_criteria || null,
        dto.success_examples ? JSON.stringify(dto.success_examples) : null,
        dto.failure_examples ? JSON.stringify(dto.failure_examples) : null,
        dto.tool_type || null,
        dto.target_agent_id || null,
        dto.target_node_id || null,
        dto.should_invoke ?? null,
        dto.user_scenario || null,
        dto.success_criteria || null,
        dto.max_turns || 5,
        dto.mock_all_tools ?? false,
        JSON.stringify(dto.dynamic_variables || {}),
        actorId,
      ],
    );
    const test = rows[0];
    // Auto-attach if agent_id + attach_to_agent
    if (dto.agent_id && dto.attach_to_agent !== false) {
      await pool.query(
        `INSERT INTO agent_test_attachments (tenant_id, agent_id, test_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [tenantId, dto.agent_id, test.test_id],
      );
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test.create', resource_type: 'agent_test', resource_id: test.test_id, diff_json: dto,
    });
    return test;
  }

  async update(tenantId: string, testId: string, dto: any, actorId: string) {
    const pool = getPool();
    await this.findOne(tenantId, testId);
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    const fields: Record<string, any> = {
      name: dto.name, test_type: dto.test_type, folder_id: dto.folder_id,
      expected_criteria: dto.expected_criteria, user_scenario: dto.user_scenario,
      success_criteria: dto.success_criteria, max_turns: dto.max_turns,
      mock_all_tools: dto.mock_all_tools, tool_type: dto.tool_type,
      target_agent_id: dto.target_agent_id, target_node_id: dto.target_node_id,
      should_invoke: dto.should_invoke,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { sets.push(`${k} = $${i++}`); params.push(v); }
    }
    if (dto.conversation)        { sets.push(`conversation_json = $${i++}`);    params.push(JSON.stringify(dto.conversation)); }
    if (dto.success_examples)    { sets.push(`success_examples = $${i++}`);     params.push(JSON.stringify(dto.success_examples)); }
    if (dto.failure_examples)    { sets.push(`failure_examples = $${i++}`);     params.push(JSON.stringify(dto.failure_examples)); }
    if (dto.dynamic_variables)   { sets.push(`dynamic_variables = $${i++}`);    params.push(JSON.stringify(dto.dynamic_variables)); }
    if (!sets.length) return { updated_at: new Date().toISOString() };
    sets.push(`updated_at = NOW()`);
    params.push(tenantId, testId);
    await pool.query(
      `UPDATE agent_tests SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND test_id = $${i++}`,
      params,
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test.update', resource_type: 'agent_test', resource_id: testId, diff_json: dto,
    });
    return { updated_at: new Date().toISOString() };
  }

  async delete(tenantId: string, testId: string, actorId: string) {
    const pool = getPool();
    await this.findOne(tenantId, testId);
    await pool.query(`DELETE FROM agent_test_attachments WHERE test_id = $1`, [testId]);
    await pool.query(`DELETE FROM agent_tests WHERE tenant_id = $1 AND test_id = $2`, [tenantId, testId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test.delete', resource_type: 'agent_test', resource_id: testId, diff_json: {},
    });
    return { deleted: true };
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async getTemplates(tenantId: string) {
    const pool = getPool();
    // Return system templates (tenant_id IS NULL) + tenant-created templates
    const { rows } = await pool.query(
      `SELECT * FROM agent_tests WHERE is_template = true AND (tenant_id IS NULL OR tenant_id = $1) ORDER BY created_at`,
      [tenantId],
    );
    return { templates: rows };
  }

  async cloneTemplate(tenantId: string, templateId: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM agent_tests WHERE test_id = $1 AND is_template = true`,
      [templateId],
    );
    if (!rows.length) throw new NotFoundException('Template not found');
    const tpl = rows[0];
    const { rows: created } = await pool.query(
      `INSERT INTO agent_tests
         (tenant_id, name, test_type, folder_id,
          conversation_json, expected_criteria, success_examples, failure_examples,
          tool_type, target_agent_id, target_node_id, should_invoke,
          user_scenario, success_criteria, max_turns, mock_all_tools,
          dynamic_variables, is_template, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,false,$18)
       RETURNING test_id`,
      [
        tenantId, tpl.name + ' (copy)', tpl.test_type, null,
        tpl.conversation_json, tpl.expected_criteria, tpl.success_examples, tpl.failure_examples,
        tpl.tool_type, tpl.target_agent_id, tpl.target_node_id, tpl.should_invoke,
        tpl.user_scenario, tpl.success_criteria, tpl.max_turns, tpl.mock_all_tools,
        tpl.dynamic_variables, actorId,
      ],
    );
    return { test_id: created[0].test_id };
  }

  // ── Agent Attachments ─────────────────────────────────────────────────────

  async findAgentTests(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows: tests } = await pool.query(
      `SELECT t.* FROM agent_tests t
       JOIN agent_test_attachments a ON a.test_id = t.test_id
       WHERE a.tenant_id = $1 AND a.agent_id = $2
       ORDER BY a.attached_at DESC`,
      [tenantId, agentId],
    );
    const { rows: past_runs } = await pool.query(
      `SELECT tr.* FROM test_runs tr
       JOIN agent_test_attachments a ON a.test_id = tr.test_id
       WHERE a.tenant_id = $1 AND a.agent_id = $2
       ORDER BY tr.started_at DESC LIMIT 10`,
      [tenantId, agentId],
    );
    return { tests, past_runs };
  }

  async attachToAgent(tenantId: string, agentId: string, testId: string, actorId: string) {
    const pool = getPool();
    await this.findOne(tenantId, testId);
    await pool.query(
      `INSERT INTO agent_test_attachments (tenant_id, agent_id, test_id, attached_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [tenantId, agentId, testId, actorId],
    );
    return { attached: true };
  }

  async detachFromAgent(tenantId: string, agentId: string, testId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM agent_test_attachments WHERE tenant_id = $1 AND agent_id = $2 AND test_id = $3`,
      [tenantId, agentId, testId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test.detach', resource_type: 'agent_test', resource_id: testId,
      diff_json: { agent_id: agentId },
    });
    return { detached: true };
  }

  // ── Test Execution ─────────────────────────────────────────────────────────

  async runTest(tenantId: string, testId: string, dto: { agent_id: string; branch_id?: string }, actorId: string) {
    const pool = getPool();
    const test = await this.findOne(tenantId, testId);
    // Validate agent exists
    const { rows: agentRows } = await pool.query(
      `SELECT agent_id FROM agents WHERE tenant_id = $1 AND agent_id = $2`,
      [tenantId, dto.agent_id],
    );
    if (!agentRows.length) throw new NotFoundException('Agent not found');
    // Create test_runs row
    const { rows } = await pool.query(
      `INSERT INTO test_runs (tenant_id, test_id, agent_id, branch_id, status, started_by)
       VALUES ($1,$2,$3,$4,'pending',$5) RETURNING run_id`,
      [tenantId, testId, dto.agent_id, dto.branch_id || null, actorId],
    );
    const { run_id } = rows[0];
    // Queue async job
    await this.testQueue.add({ run_id, test_id: testId, agent_id: dto.agent_id, tenant_id: tenantId }, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    });
    return { run_id };
  }

  async getTestRun(tenantId: string, runId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM test_runs WHERE tenant_id = $1 AND run_id = $2`,
      [tenantId, runId],
    );
    if (!rows.length) throw new NotFoundException('Test run not found');
    return rows[0];
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  async createFolder(tenantId: string, name: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO test_folders (tenant_id, name, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [tenantId, name, actorId],
    );
    return rows[0];
  }

  async renameFolder(tenantId: string, folderId: string, name: string, actorId: string) {
    const pool = getPool();
    const { rowCount } = await pool.query(
      `UPDATE test_folders SET name = $1, updated_at = NOW() WHERE tenant_id = $2 AND folder_id = $3`,
      [name, tenantId, folderId],
    );
    if (!rowCount) throw new NotFoundException('Folder not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test_folder.rename', resource_type: 'test_folder', resource_id: folderId,
      diff_json: { name },
    });
    return { updated_at: new Date().toISOString() };
  }

  async deleteFolder(tenantId: string, folderId: string, actorId: string) {
    const pool = getPool();
    // Move contents to root
    await pool.query(
      `UPDATE agent_tests SET folder_id = NULL WHERE tenant_id = $1 AND folder_id = $2`,
      [tenantId, folderId],
    );
    await pool.query(
      `DELETE FROM test_folders WHERE tenant_id = $1 AND folder_id = $2`,
      [tenantId, folderId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test_folder.delete', resource_type: 'test_folder', resource_id: folderId, diff_json: {},
    });
    return { deleted: true };
  }
}
