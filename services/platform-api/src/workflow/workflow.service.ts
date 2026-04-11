import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { SaveWorkflowDto, LoadWorkflowTemplateDto } from './dto/workflow.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowService {
  constructor(private audit: AuditService) {}

  async getWorkflow(tenantId: string, agentId: string, branchId?: string) {
    const pool = getPool();
    await this.verifyAgent(tenantId, agentId);
    const bid = branchId || await this.getLiveBranchId(agentId);

    const [nodesResult, edgesResult] = await Promise.all([
      pool.query(
        'SELECT * FROM workflow_nodes WHERE agent_id = $1 AND branch_id = $2 ORDER BY created_at',
        [agentId, bid],
      ),
      pool.query(
        'SELECT * FROM workflow_edges WHERE agent_id = $1 AND branch_id = $2 ORDER BY priority',
        [agentId, bid],
      ),
    ]);

    return {
      nodes: nodesResult.rows,
      edges: edgesResult.rows,
      global_settings: { prevent_infinite_loops: true },
      validation_errors: this.validateWorkflow(nodesResult.rows, edgesResult.rows),
    };
  }

  async saveWorkflow(tenantId: string, agentId: string, dto: SaveWorkflowDto, actorId: string, branchId?: string) {
    const pool = getPool();
    await this.verifyAgent(tenantId, agentId);
    const bid = branchId || await this.getLiveBranchId(agentId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      // Delete existing workflow for this agent+branch
      await client.query('DELETE FROM workflow_edges WHERE agent_id = $1 AND branch_id = $2', [agentId, bid]);
      await client.query('DELETE FROM workflow_nodes WHERE agent_id = $1 AND branch_id = $2', [agentId, bid]);

      // Insert nodes
      const nodeIdMap: Record<string, string> = {};
      for (const node of dto.nodes) {
        const newId = node.node_id || uuidv4();
        nodeIdMap[node.node_id || newId] = newId;
        await client.query(
          `INSERT INTO workflow_nodes
             (node_id, agent_id, branch_id, tenant_id, node_type, label, position_x, position_y,
              conversation_goal, override_prompt, voice_id, llm_model, eagerness,
              spelling_patience, speculative_turn_enabled, config)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            newId, agentId, bid, tenantId, node.node_type, node.label || null,
            node.position_x, node.position_y, node.conversation_goal || null,
            node.override_prompt ?? false, node.voice_id || null, node.llm_model || null,
            node.eagerness || null, node.spelling_patience || null,
            node.speculative_turn_enabled ?? null, JSON.stringify(node.config || {}),
          ],
        );
      }

      // Insert edges
      for (const edge of dto.edges) {
        await client.query(
          `INSERT INTO workflow_edges
             (agent_id, branch_id, tenant_id, source_node_id, target_node_id,
              condition_label, condition_type, priority)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            agentId, bid, tenantId,
            nodeIdMap[edge.source_node_id] || edge.source_node_id,
            nodeIdMap[edge.target_node_id] || edge.target_node_id,
            edge.condition_label || null, edge.condition_type || 'llm_evaluated',
            edge.priority || 0,
          ],
        );
      }

      // Snapshot workflow version
      await client.query(
        `INSERT INTO workflow_versions (agent_id, branch_id, tenant_id, nodes_json, edges_json, saved_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [agentId, bid, tenantId, JSON.stringify(dto.nodes), JSON.stringify(dto.edges), actorId],
      );

      await client.query('COMMIT');
      const validationErrors = this.validateWorkflow(dto.nodes as any[], dto.edges as any[]);
      return { saved: true, validation_errors: validationErrors };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getTemplates() {
    const { rows } = await getPool().query(
      `SELECT * FROM workflow_templates ORDER BY created_at`,
    );
    return { templates: rows };
  }

  async loadTemplate(tenantId: string, agentId: string, dto: LoadWorkflowTemplateDto, actorId: string, branchId?: string) {
    const { rows } = await getPool().query(
      'SELECT * FROM workflow_templates WHERE template_id = $1',
      [dto.template_id],
    );
    if (!rows.length) throw new NotFoundException('Workflow template not found');
    const tpl = rows[0];
    const saveDto: SaveWorkflowDto = {
      nodes: tpl.nodes_json,
      edges: tpl.edges_json,
      global_settings: { prevent_infinite_loops: true },
    };
    await this.saveWorkflow(tenantId, agentId, saveDto, actorId, branchId);
    return this.getWorkflow(tenantId, agentId, branchId);
  }

  private validateWorkflow(nodes: any[], edges: any[]): Array<{ node_id: string; message: string }> {
    const errors: Array<{ node_id: string; message: string }> = [];
    const nodeIds = new Set(nodes.map(n => n.node_id || n.node_id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source_node_id)) {
        errors.push({ node_id: edge.source_node_id, message: 'Source node not found' });
      }
      if (!nodeIds.has(edge.target_node_id)) {
        errors.push({ node_id: edge.target_node_id, message: 'Target node not found' });
      }
    }
    return errors;
  }

  private async getLiveBranchId(agentId: string): Promise<string> {
    const { rows } = await getPool().query(
      `SELECT branch_id FROM agent_branches WHERE agent_id = $1 AND status = 'live' LIMIT 1`,
      [agentId],
    );
    if (rows.length) return rows[0].branch_id;
    // Fall back to first branch
    const { rows: any } = await getPool().query(
      'SELECT branch_id FROM agent_branches WHERE agent_id = $1 LIMIT 1',
      [agentId],
    );
    return any?.[0]?.branch_id || uuidv4();
  }

  private async verifyAgent(tenantId: string, agentId: string) {
    const { rows } = await getPool().query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
  }
}
