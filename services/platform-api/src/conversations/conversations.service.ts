import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';

@Injectable()
export class ConversationsService {
  // Full conversation shape including all co-browsing metadata fields (§6.2C)
  async findAll(tenantId: string, filters?: {
    agent_id?: string;
    status?: string;
    channel?: string;
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let i = 2;
    let query = `
      SELECT c.*,
             a.name AS agent_name,
             a.type AS agent_type
      FROM conversations c
      JOIN agents a ON a.agent_id = c.agent_id
      WHERE c.tenant_id = $1`;
    if (filters?.agent_id) { query += ` AND c.agent_id = $${i++}`; params.push(filters.agent_id); }
    if (filters?.status) { query += ` AND c.status = $${i++}`; params.push(filters.status); }
    if (filters?.channel) { query += ` AND c.channel = $${i++}`; params.push(filters.channel); }
    if (filters?.from) { query += ` AND c.started_at >= $${i++}`; params.push(filters.from); }
    if (filters?.to) { query += ` AND c.started_at <= $${i++}`; params.push(filters.to); }
    query += ` ORDER BY c.started_at DESC`;
    query += ` LIMIT $${i++}`; params.push(filters?.limit || 50);
    query += ` OFFSET $${i++}`; params.push(filters?.offset || 0);
    const { rows } = await pool.query(query, params);
    return rows;
  }

  // Full conversation detail — all co-browsing metadata (§6.2C)
  async findOne(tenantId: string, conversationId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         c.*,
         -- Core
         c.conversation_id, c.agent_id, c.tenant_id, c.channel, c.status,
         c.started_at, c.ended_at, c.duration_s,
         -- Cost
         c.llm_cost, c.tts_cost, c.stt_cost, c.total_cost,
         c.call_cost_credits, c.llm_credits, c.llm_cost_usd, c.llm_turns,
         -- Operational
         c.environment, c.how_call_ended, c.user_id, c.branch_id,
         c.call_successful, c.turn_count, c.handle_time_s,
         -- Latency
         c.tts_latency_ms_avg, c.asr_latency_ms_avg,
         -- Evaluation
         c.evaluation_results, c.data_collection_results,
         -- Meta
         c.language_detected, c.handoff_occurred,
         c.rating, c.feedback_text, c.metadata_json,
         -- Agent info
         a.name AS agent_name, a.type AS agent_type,
         -- Branch info
         av.version AS branch_version,
         av.config_snapshot_json AS branch_config
       FROM conversations c
       JOIN agents a ON a.agent_id = c.agent_id
       LEFT JOIN agent_versions av ON av.version_id = c.branch_id
       WHERE c.tenant_id = $1 AND c.conversation_id = $2`,
      [tenantId, conversationId],
    );
    if (!rows.length) throw new NotFoundException('Conversation not found');
    return rows[0];
  }

  async getTranscript(tenantId: string, conversationId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT conversation_id, transcript_json, started_at, ended_at
       FROM conversations
       WHERE tenant_id = $1 AND conversation_id = $2`,
      [tenantId, conversationId],
    );
    if (!rows.length) throw new NotFoundException('Conversation not found');
    return { conversation_id: conversationId, transcript: rows[0].transcript_json };
  }

  async getRecording(tenantId: string, conversationId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT c.recording_url, r.file_path, r.duration_s, r.file_size_bytes
       FROM conversations c
       LEFT JOIN recordings r ON r.conversation_id = c.conversation_id
       WHERE c.tenant_id = $1 AND c.conversation_id = $2`,
      [tenantId, conversationId],
    );
    if (!rows.length) throw new NotFoundException('Conversation not found');
    return { conversation_id: conversationId, recording_url: rows[0].recording_url, metadata: rows[0] };
  }
}
