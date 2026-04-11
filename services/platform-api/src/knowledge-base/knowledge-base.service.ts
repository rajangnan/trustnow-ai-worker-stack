import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'text/markdown', 'application/octet-stream'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const KB_BUCKET = 'trustnow-kb-docs';

function getS3(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'trustnow',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'trustnow123',
    },
    forcePathStyle: true,
  });
}

@Injectable()
export class KnowledgeBaseService {
  constructor(private audit: AuditService) {}

  // ── Workspace-level KB documents ─────────────────────────────────────────

  async findAll(tenantId: string, search?: string, type?: string) {
    const pool = getPool();
    let query = `
      SELECT
        d.*,
        COUNT(DISTINCT akb.agent_id) AS dependent_agent_count
      FROM knowledge_base_docs d
      LEFT JOIN agent_knowledge_base akb ON akb.kb_doc_id = d.doc_id
      WHERE d.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let i = 2;
    if (search) { query += ` AND (d.name ILIKE $${i} OR d.title ILIKE $${i})`; params.push(`%${search}%`); i++; }
    if (type)   { query += ` AND d.type = $${i}`; params.push(type); i++; }
    query += ` GROUP BY d.doc_id ORDER BY d.created_at DESC`;
    const { rows } = await pool.query(query, params);
    return { docs: rows, total: rows.length };
  }

  async findOne(tenantId: string, docId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT d.*,
         (SELECT json_agg(json_build_object('agent_id', a.agent_id, 'agent_name', a.name))
          FROM agent_knowledge_base akb
          JOIN agents a ON a.agent_id = akb.agent_id
          WHERE akb.kb_doc_id = d.doc_id) AS dependent_agents
       FROM knowledge_base_docs d
       WHERE d.tenant_id = $1 AND d.doc_id = $2`,
      [tenantId, docId],
    );
    if (!rows.length) throw new NotFoundException('Document not found');
    const doc = rows[0];
    doc.dependent_agents = doc.dependent_agents || [];
    return doc;
  }

  async create(tenantId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO knowledge_base_docs
         (tenant_id, name, title, type, file_type, source_url, content_text, status, created_by, visibility)
       VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        tenantId,
        dto.name,
        dto.type || 'text',
        dto.source_url || null,
        dto.content || null,
        dto.type === 'url' ? 'indexing' : 'ready',
        actorId,
        dto.visibility || 'workspace',
      ],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.doc.create', resource_type: 'knowledge_base_doc',
      resource_id: rows[0].doc_id, diff_json: { name: dto.name, type: dto.type },
    });
    return rows[0];
  }

  async uploadFile(tenantId: string, file: Express.Multer.File, actorId: string) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('File exceeds 50MB limit');
    const ext = extname(file.originalname).toLowerCase();
    const key = `kb-uploads/${tenantId}/${uuidv4()}${ext}`;
    const s3 = getS3();
    await s3.send(new PutObjectCommand({
      Bucket: KB_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    const pool = getPool();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const { rows } = await pool.query(
      `INSERT INTO temp_files (tenant_id, filename, storage_path, size_bytes, mime_type, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, file.originalname, key, file.size, file.mimetype, expiresAt],
    );
    return {
      temp_file_id: rows[0].temp_file_id,
      filename: file.originalname,
      size_bytes: file.size,
      mime_type: file.mimetype,
      expires_at: expiresAt.toISOString(),
    };
  }

  async delete(tenantId: string, docId: string, actorId: string) {
    const pool = getPool();
    // EXCEED: Block deletion if used by agents
    const { rows: agents } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM agent_knowledge_base akb
       JOIN agents a ON a.agent_id = akb.agent_id
       WHERE akb.kb_doc_id = $1 AND a.tenant_id = $2`,
      [docId, tenantId],
    );
    if (parseInt(agents[0].cnt) > 0) {
      throw new ConflictException(`KB document is attached to ${agents[0].cnt} agent(s). Detach before deleting.`);
    }
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

  async reindex(tenantId: string, docId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE knowledge_base_docs SET status = 'indexing', last_indexed_at = now()
       WHERE tenant_id = $1 AND doc_id = $2`,
      [tenantId, docId],
    );
    // In production: enqueue BullMQ job for RAG indexing pipeline
    const jobId = uuidv4();
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.doc.reindex', resource_type: 'knowledge_base_doc', resource_id: docId,
      diff_json: { job_id: jobId },
    });
    return { job_id: jobId, status: 'queued' };
  }

  // ── Agent KB attachment (junction table) ─────────────────────────────────

  async attachToAgent(tenantId: string, agentId: string, dto: { kb_doc_id: string; branch_id?: string }, actorId: string) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO agent_knowledge_base (agent_id, kb_doc_id, branch_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [agentId, dto.kb_doc_id, dto.branch_id || null],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.attach', resource_type: 'agent', resource_id: agentId,
      diff_json: { kb_doc_id: dto.kb_doc_id },
    });
    return { attached: true, kb_doc_id: dto.kb_doc_id, agent_id: agentId };
  }

  async detachFromAgent(tenantId: string, agentId: string, kbDocId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      'DELETE FROM agent_knowledge_base WHERE agent_id = $1 AND kb_doc_id = $2',
      [agentId, kbDocId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.detach', resource_type: 'agent', resource_id: agentId,
      diff_json: { kb_doc_id: kbDocId },
    });
    return { detached: true };
  }

  async updateRagConfig(tenantId: string, agentId: string, config: any, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const mapping: Record<string, any> = {
      rag_enabled: config.rag_enabled,
      rag_embedding_model: config.rag_embedding_model,
      rag_character_limit: config.rag_character_limit,
      rag_chunk_limit: config.rag_chunk_limit,
      rag_vector_distance_limit: config.rag_vector_distance_limit,
      rag_num_candidates_enabled: config.rag_num_candidates_enabled,
      rag_num_candidates: config.rag_num_candidates_value ?? config.rag_num_candidates,
      rag_query_rewrite_enabled: config.rag_query_rewrite_enabled,
    };
    for (const [col, val] of Object.entries(mapping)) {
      if (val !== undefined) { fields.push(`${col} = $${i++}`); vals.push(val); }
    }
    if (!fields.length) return { updated_at: new Date().toISOString() };
    vals.push(agentId);
    await pool.query(
      `UPDATE agent_configs SET ${fields.join(', ')} WHERE agent_id = $${i}`,
      vals,
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'kb.rag_config.update', resource_type: 'agent_config', resource_id: agentId,
      diff_json: config,
    });
    return { updated_at: new Date().toISOString() };
  }
}
