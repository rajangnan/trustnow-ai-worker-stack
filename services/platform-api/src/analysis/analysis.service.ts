import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AnalysisService {
  constructor(
    private audit: AuditService,
    @InjectQueue('post-call-summary')     private summaryQueue: Queue,
    @InjectQueue('post-call-criteria')    private criteriaQueue: Queue,
    @InjectQueue('post-call-data-extract') private dataQueue: Queue,
  ) {}

  // ── Evaluation Criteria CRUD ───────────────────────────────────────────────

  async listCriteria(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM evaluation_criteria WHERE tenant_id = $1 AND agent_id = $2 ORDER BY created_at`,
      [tenantId, agentId],
    );
    return rows;
  }

  async createCriterion(tenantId: string, agentId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO evaluation_criteria (tenant_id, agent_id, name, description, llm_prompt, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, agentId, dto.name, dto.description || null, dto.llm_prompt, actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'criteria.create', resource_type: 'evaluation_criteria',
      resource_id: rows[0].criteria_id, diff_json: dto,
    });
    return rows[0];
  }

  async updateCriterion(tenantId: string, agentId: string, criteriaId: string, dto: any, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (dto.name)        { fields.push(`name = $${i++}`);        vals.push(dto.name); }
    if (dto.description) { fields.push(`description = $${i++}`); vals.push(dto.description); }
    if (dto.llm_prompt)  { fields.push(`llm_prompt = $${i++}`);  vals.push(dto.llm_prompt); }
    if (!fields.length) return this.listCriteria(tenantId, agentId);
    fields.push(`updated_at = now()`);
    vals.push(tenantId, agentId, criteriaId);
    await pool.query(
      `UPDATE evaluation_criteria SET ${fields.join(', ')}
       WHERE tenant_id = $${i} AND agent_id = $${i+1} AND criteria_id = $${i+2}`,
      vals,
    );
    return { updated: true };
  }

  async deleteCriterion(tenantId: string, agentId: string, criteriaId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM evaluation_criteria WHERE tenant_id = $1 AND agent_id = $2 AND criteria_id = $3`,
      [tenantId, agentId, criteriaId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'criteria.delete', resource_type: 'evaluation_criteria', resource_id: criteriaId,
    });
    return { deleted: true };
  }

  // ── Data Collection Specs CRUD ─────────────────────────────────────────────

  async listDataSpecs(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM data_collection_specs WHERE tenant_id = $1 AND agent_id = $2 ORDER BY created_at`,
      [tenantId, agentId],
    );
    return rows;
  }

  async createDataSpec(tenantId: string, agentId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO data_collection_specs (tenant_id, agent_id, field_name, field_type, extraction_prompt, is_required, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenantId, agentId, dto.field_name, dto.field_type || 'string', dto.extraction_prompt, dto.is_required || false, actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'data_spec.create', resource_type: 'data_collection_spec',
      resource_id: rows[0].spec_id, diff_json: dto,
    });
    return rows[0];
  }

  async updateDataSpec(tenantId: string, agentId: string, specId: string, dto: any, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (dto.field_name !== undefined)        { fields.push(`field_name = $${i++}`);        vals.push(dto.field_name); }
    if (dto.field_type !== undefined)        { fields.push(`field_type = $${i++}`);        vals.push(dto.field_type); }
    if (dto.extraction_prompt !== undefined) { fields.push(`extraction_prompt = $${i++}`); vals.push(dto.extraction_prompt); }
    if (dto.is_required !== undefined)       { fields.push(`is_required = $${i++}`);       vals.push(dto.is_required); }
    if (!fields.length) return { updated: true };
    fields.push(`updated_at = now()`);
    vals.push(tenantId, agentId, specId);
    await pool.query(
      `UPDATE data_collection_specs SET ${fields.join(', ')}
       WHERE tenant_id = $${i} AND agent_id = $${i+1} AND spec_id = $${i+2}`,
      vals,
    );
    return { updated: true };
  }

  async deleteDataSpec(tenantId: string, agentId: string, specId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM data_collection_specs WHERE tenant_id = $1 AND agent_id = $2 AND spec_id = $3`,
      [tenantId, agentId, specId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'data_spec.delete', resource_type: 'data_collection_spec', resource_id: specId,
    });
    return { deleted: true };
  }

  // ── Analysis Language ──────────────────────────────────────────────────────

  async updateAnalysisLanguage(tenantId: string, agentId: string, language: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE agents SET analysis_language = $1 WHERE tenant_id = $2 AND agent_id = $3`,
      [language, tenantId, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.analysis_language.update', resource_type: 'agent', resource_id: agentId,
      diff_json: { analysis_language: language },
    });
    return { analysis_language: language };
  }

  // ── Post-Call Job Enqueue ──────────────────────────────────────────────────

  async enqueuePostCallJobs(conversationId: string, agentId: string) {
    await Promise.all([
      this.summaryQueue.add({ conversation_id: conversationId }, { attempts: 3, backoff: 5000 }),
      this.criteriaQueue.add({ conversation_id: conversationId, agent_id: agentId }, { attempts: 3, backoff: 5000 }),
      this.dataQueue.add({ conversation_id: conversationId, agent_id: agentId }, { attempts: 3, backoff: 5000 }),
    ]);
  }

  // ── Batch re-evaluation (EXCEED) ──────────────────────────────────────────

  async batchReEvaluate(tenantId: string, agentId: string, limit = 100, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT conversation_id FROM conversations WHERE tenant_id = $1 AND agent_id = $2
       ORDER BY started_at DESC LIMIT $3`,
      [tenantId, agentId, limit],
    );
    for (const row of rows) {
      await this.criteriaQueue.add({ conversation_id: row.conversation_id, agent_id: agentId }, { attempts: 3 });
      await this.dataQueue.add({ conversation_id: row.conversation_id, agent_id: agentId }, { attempts: 3 });
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'analysis.batch_re_evaluate', resource_type: 'agent', resource_id: agentId,
      diff_json: { count: rows.length },
    });
    return { queued: rows.length };
  }
}
