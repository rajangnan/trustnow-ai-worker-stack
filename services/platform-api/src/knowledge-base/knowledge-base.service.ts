import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string, agentId?: string) {
    const pool = getPool();
    let query = `SELECT * FROM knowledge_base_docs WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (agentId) { query += ` AND (agent_id = $2 OR agent_id IS NULL)`; params.push(agentId); }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async findOne(tenantId: string, docId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM knowledge_base_docs WHERE tenant_id = $1 AND doc_id = $2',
      [tenantId, docId],
    );
    if (!rows.length) throw new NotFoundException('Document not found');
    return rows[0];
  }

  async create(tenantId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO knowledge_base_docs
         (tenant_id, agent_id, title, content_text, source_url, file_type, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'ready', $7) RETURNING *`,
      [tenantId, dto.agent_id || null, dto.title, dto.content_text || null,
       dto.source_url || null, dto.file_type || 'text', actorId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.doc.create', resource_type: 'knowledge_base_doc',
      resource_id: rows[0].doc_id, diff_json: { title: dto.title },
    });
    return rows[0];
  }

  async delete(tenantId: string, docId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      'DELETE FROM knowledge_base_docs WHERE tenant_id = $1 AND doc_id = $2',
      [tenantId, docId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.doc.delete', resource_type: 'knowledge_base_doc', resource_id: docId,
    });
    return { success: true };
  }

  async attachToAgent(tenantId: string, agentId: string, docIds: string[], actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE agent_configs SET kb_docs_attached = $1
       WHERE agent_id = $2`,
      [docIds, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.attach', resource_type: 'agent', resource_id: agentId,
      diff_json: { doc_ids: docIds },
    });
    return { success: true, attached: docIds.length };
  }

  async updateRagConfig(tenantId: string, agentId: string, config: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE agent_configs SET
         rag_enabled = $1,
         rag_embedding_model = $2,
         rag_character_limit = $3,
         rag_chunk_limit = $4,
         rag_vector_distance_limit = $5,
         rag_num_candidates_enabled = $6,
         rag_num_candidates = $7,
         rag_query_rewrite_enabled = $8
       WHERE agent_id = $9 RETURNING *`,
      [
        config.rag_enabled ?? false,
        config.rag_embedding_model ?? 'multilingual',
        config.rag_character_limit ?? 50000,
        config.rag_chunk_limit ?? 20,
        config.rag_vector_distance_limit ?? 0.5,
        config.rag_num_candidates_enabled ?? false,
        config.rag_num_candidates ?? 100,
        config.rag_query_rewrite_enabled ?? false,
        agentId,
      ],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.rag_config.update', resource_type: 'agent_config', resource_id: agentId,
      diff_json: config,
    });
    return rows[0];
  }
}
