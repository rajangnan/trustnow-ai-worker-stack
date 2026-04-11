import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ConversationsService {
  // Full conversation list with 15 query filters (§6.2L)
  async findAll(tenantId: string, filters?: {
    agent_id?: string;
    branch_id?: string;
    date_after?: string;
    date_before?: string;
    call_status?: string;
    duration_min?: number;
    duration_max?: number;
    rating_min?: number;
    rating_max?: number;
    has_comments?: boolean;
    language?: string;
    user_id?: string;
    channel?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    // legacy
    status?: string;
    from?: string;
    to?: string;
  }) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let i = 2;
    let query = `
      SELECT c.*,
             a.name AS agent_name,
             a.type AS agent_type,
             av.version AS branch_name
      FROM conversations c
      JOIN agents a ON a.agent_id = c.agent_id
      LEFT JOIN agent_versions av ON av.version_id = c.branch_id
      WHERE c.tenant_id = $1`;
    if (filters?.agent_id)   { query += ` AND c.agent_id = $${i++}`;   params.push(filters.agent_id); }
    if (filters?.branch_id)  { query += ` AND c.branch_id = $${i++}`;  params.push(filters.branch_id); }
    if (filters?.date_after || filters?.from) { query += ` AND c.started_at >= $${i++}`; params.push(filters.date_after || filters.from); }
    if (filters?.date_before || filters?.to)  { query += ` AND c.started_at <= $${i++}`; params.push(filters.date_before || filters.to); }
    if (filters?.call_status || filters?.status) {
      query += ` AND c.call_successful = $${i++}`;
      params.push((filters.call_status === 'successful' || filters.status === 'successful'));
    }
    if (filters?.channel)      { query += ` AND c.channel = $${i++}`;                params.push(filters.channel); }
    if (filters?.language)     { query += ` AND c.language_detected = $${i++}`;      params.push(filters.language); }
    if (filters?.user_id)      { query += ` AND c.user_id = $${i++}`;                params.push(filters.user_id); }
    if (filters?.duration_min) { query += ` AND c.duration_s >= $${i++}`;            params.push(filters.duration_min); }
    if (filters?.duration_max) { query += ` AND c.duration_s <= $${i++}`;            params.push(filters.duration_max); }
    if (filters?.rating_min)   { query += ` AND c.rating >= $${i++}`;                params.push(filters.rating_min); }
    if (filters?.rating_max)   { query += ` AND c.rating <= $${i++}`;                params.push(filters.rating_max); }
    if (filters?.has_comments === true)  { query += ` AND c.feedback_text IS NOT NULL AND c.feedback_text != ''`; }
    if (filters?.search)       { query += ` AND c.transcript_json::text ILIKE $${i++}`; params.push(`%${filters.search}%`); }
    const sort = filters?.sort === 'date_asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY c.started_at ${sort}`;
    const pageLimit = Math.min(filters?.limit || 20, 100);
    const pageOffset = ((filters?.page || 1) - 1) * pageLimit;
    query += ` LIMIT $${i++} OFFSET $${i++}`;
    params.push(pageLimit, pageOffset);
    const { rows } = await pool.query(query, params);
    return {
      conversations: rows,
      total: rows.length,
      page: filters?.page || 1,
      limit: pageLimit,
      has_more: rows.length === pageLimit,
    };
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

  async getTurns(tenantId: string, conversationId: string) {
    const pool = getPool();
    const { rows: check } = await pool.query(
      `SELECT conversation_id FROM conversations WHERE tenant_id = $1 AND conversation_id = $2`,
      [tenantId, conversationId],
    );
    if (!check.length) throw new NotFoundException('Conversation not found');
    const { rows } = await pool.query(
      `SELECT * FROM conversation_turns WHERE conversation_id = $1 ORDER BY turn_index`,
      [conversationId],
    );
    return rows;
  }

  async getShareLink(tenantId: string, conversationId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT conversation_id FROM conversations WHERE tenant_id = $1 AND conversation_id = $2`,
      [tenantId, conversationId],
    );
    if (!rows.length) throw new NotFoundException('Conversation not found');
    const secret = process.env.JWT_SECRET || 'trustnow-secret';
    const token = jwt.sign(
      { conversation_id: conversationId, tenant_id: tenantId, type: 'share' },
      secret,
      { expiresIn: '24h' },
    );
    const appBase = process.env.APP_BASE_URL || 'https://app.trustnow.ai';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
      share_url: `${appBase}/conversations/${conversationId}?token=${token}`,
      expires_at: expiresAt,
    };
  }
}
