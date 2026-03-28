/**
 * §6.2C — Analytics API: 8 sub-tabs observed on live ElevenLabs platform
 * GET /analytics/agents/:id?tab=general|evaluation|data_collection|audio|tools|llms|knowledge_base|advanced
 */
import { Injectable } from '@nestjs/common';
import { getPool } from '../database/db.provider';

@Injectable()
export class AnalyticsService {

  // Global summary across all agents for a tenant
  async getSummary(tenantId: string, from?: string, to?: string) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let dateFilter = '';
    if (from) { dateFilter += ` AND c.started_at >= $${params.push(from)}`; }
    if (to)   { dateFilter += ` AND c.started_at <= $${params.push(to)}`; }

    const { rows } = await pool.query(
      `SELECT
         COUNT(*) AS total_conversations,
         COUNT(*) FILTER (WHERE c.status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE c.status = 'abandoned') AS abandoned,
         COUNT(*) FILTER (WHERE c.handoff_occurred = true) AS handoffs,
         COUNT(*) FILTER (WHERE c.call_successful = true) AS successful,
         AVG(c.duration_s) AS avg_duration_s,
         SUM(c.total_cost) AS total_cost,
         SUM(c.llm_cost_usd) AS total_llm_cost_usd,
         SUM(c.call_cost_credits) AS total_credits_used,
         AVG(c.tts_latency_ms_avg) AS avg_tts_latency_ms,
         AVG(c.asr_latency_ms_avg) AS avg_asr_latency_ms,
         AVG(c.turn_count) AS avg_turn_count
       FROM conversations c
       WHERE c.tenant_id = $1 ${dateFilter}`,
      params,
    );
    return rows[0];
  }

  // Per-agent analytics with tab routing
  async getAgentAnalytics(
    tenantId: string,
    agentId: string,
    tab: string,
    from?: string,
    to?: string,
  ) {
    const pool = getPool();
    const params: any[] = [tenantId, agentId];
    let dateFilter = '';
    if (from) { dateFilter += ` AND c.started_at >= $${params.push(from)}`; }
    if (to)   { dateFilter += ` AND c.started_at <= $${params.push(to)}`; }

    switch (tab) {
      case 'general':
        return this.getGeneralTab(pool, params, dateFilter, agentId);
      case 'evaluation':
        return this.getEvaluationTab(pool, params, dateFilter);
      case 'data_collection':
        return this.getDataCollectionTab(pool, params, dateFilter);
      case 'audio':
        return this.getAudioTab(pool, params, dateFilter);
      case 'tools':
        return this.getToolsTab(pool, params, dateFilter);
      case 'llms':
        return this.getLlmsTab(pool, params, dateFilter);
      case 'knowledge_base':
        return this.getKnowledgeBaseTab(pool, params, dateFilter);
      case 'advanced':
        return this.getAdvancedTab(pool, params, dateFilter);
      default:
        return this.getGeneralTab(pool, params, dateFilter, agentId);
    }
  }

  // Tab 1 — General: calls, duration, cost KPIs
  private async getGeneralTab(pool: any, params: any[], dateFilter: string, agentId: string) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) AS total_calls,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_calls,
         COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned_calls,
         COUNT(*) FILTER (WHERE call_successful = true) AS successful_calls,
         ROUND(AVG(duration_s)::numeric, 1) AS avg_duration_s,
         ROUND(AVG(handle_time_s)::numeric, 1) AS avg_handle_time_s,
         SUM(total_cost) AS total_cost_usd,
         SUM(call_cost_credits) AS total_credits,
         AVG(rating) AS avg_rating,
         COUNT(*) FILTER (WHERE rating IS NOT NULL) AS rated_count,
         SUM(llm_turns) AS total_llm_turns,
         COUNT(DISTINCT user_id) AS unique_users
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}`,
      params,
    );

    // Daily trend for last 30 days
    const { rows: trend } = await pool.query(
      `SELECT
         DATE_TRUNC('day', started_at) AS day,
         COUNT(*) AS calls,
         AVG(duration_s) AS avg_duration_s,
         SUM(total_cost) AS cost
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}
       GROUP BY day ORDER BY day ASC`,
      params,
    );

    return { summary: rows[0], daily_trend: trend };
  }

  // Tab 2 — Evaluation criteria results
  private async getEvaluationTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         evaluation_results,
         started_at,
         call_successful,
         conversation_id
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2
         AND evaluation_results IS NOT NULL
         ${dateFilter}
       ORDER BY started_at DESC LIMIT 100`,
      params,
    );

    // Aggregate pass/fail per criterion
    const criteriaStats: Record<string, { pass: number; fail: number; total: number }> = {};
    for (const row of rows) {
      const results = row.evaluation_results;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (!criteriaStats[r.name]) criteriaStats[r.name] = { pass: 0, fail: 0, total: 0 };
          criteriaStats[r.name].total++;
          if (r.passed) criteriaStats[r.name].pass++;
          else criteriaStats[r.name].fail++;
        }
      }
    }
    return { criteria_stats: criteriaStats, recent: rows };
  }

  // Tab 3 — Data collection results
  private async getDataCollectionTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         data_collection_results,
         user_id,
         started_at,
         conversation_id
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2
         AND data_collection_results IS NOT NULL
         ${dateFilter}
       ORDER BY started_at DESC LIMIT 100`,
      params,
    );

    const fieldStats: Record<string, { collected: number; missing: number }> = {};
    for (const row of rows) {
      const results = row.data_collection_results;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (!fieldStats[r.name]) fieldStats[r.name] = { collected: 0, missing: 0 };
          if (r.value !== null && r.value !== undefined) fieldStats[r.name].collected++;
          else fieldStats[r.name].missing++;
        }
      }
    }
    return { field_stats: fieldStats, recent: rows };
  }

  // Tab 4 — Audio: TTS/ASR latency trends
  private async getAudioTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         DATE_TRUNC('day', started_at) AS day,
         AVG(tts_latency_ms_avg) AS avg_tts_latency_ms,
         AVG(asr_latency_ms_avg) AS avg_asr_latency_ms,
         MIN(tts_latency_ms_avg) AS min_tts_latency_ms,
         MAX(tts_latency_ms_avg) AS max_tts_latency_ms,
         MIN(asr_latency_ms_avg) AS min_asr_latency_ms,
         MAX(asr_latency_ms_avg) AS max_asr_latency_ms,
         COUNT(*) AS call_count
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}
       GROUP BY day ORDER BY day ASC`,
      params,
    );
    const { rows: overall } = await pool.query(
      `SELECT
         ROUND(AVG(tts_latency_ms_avg)::numeric, 1) AS avg_tts_latency_ms,
         ROUND(AVG(asr_latency_ms_avg)::numeric, 1) AS avg_asr_latency_ms,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tts_latency_ms_avg) AS p95_tts_latency_ms,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY asr_latency_ms_avg) AS p95_asr_latency_ms
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}`,
      params,
    );
    return { trend: rows, overall: overall[0] };
  }

  // Tab 5 — Tools: invocation stats
  private async getToolsTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         transcript_json,
         conversation_id,
         started_at
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}
       ORDER BY started_at DESC LIMIT 50`,
      params,
    );
    // Parse tool invocations from transcript
    const toolStats: Record<string, { invocations: number; success: number; failure: number }> = {};
    for (const row of rows) {
      const transcript = row.transcript_json || [];
      for (const turn of (Array.isArray(transcript) ? transcript : [])) {
        if (turn.tool_calls) {
          for (const tc of turn.tool_calls) {
            if (!toolStats[tc.name]) toolStats[tc.name] = { invocations: 0, success: 0, failure: 0 };
            toolStats[tc.name].invocations++;
            if (tc.success) toolStats[tc.name].success++;
            else toolStats[tc.name].failure++;
          }
        }
      }
    }
    return { tool_stats: toolStats };
  }

  // Tab 6 — LLMs: cost breakdown per model
  private async getLlmsTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         metadata_json->>'llm_model' AS llm_model,
         COUNT(*) AS call_count,
         SUM(llm_cost_usd) AS total_cost_usd,
         SUM(llm_credits) AS total_credits,
         SUM(llm_turns) AS total_turns,
         AVG(llm_cost_usd) AS avg_cost_per_call_usd
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}
       GROUP BY llm_model ORDER BY total_cost_usd DESC NULLS LAST`,
      params,
    );
    return { model_breakdown: rows };
  }

  // Tab 7 — Knowledge Base: retrieval stats
  private async getKnowledgeBaseTab(pool: any, params: any[], dateFilter: string) {
    const { rows: ragConfig } = await pool.query(
      `SELECT rag_enabled, rag_embedding_model, rag_character_limit,
              rag_chunk_limit, rag_vector_distance_limit
       FROM agent_configs WHERE agent_id = $2`,
      params,
    );
    const { rows: kbDocs } = await pool.query(
      `SELECT kd.doc_id, kd.title, kd.status, kd.created_at
       FROM knowledge_base_docs kd
       JOIN agent_configs ac ON kd.doc_id = ANY(ac.kb_docs_attached)
       WHERE ac.agent_id = $2`,
      params,
    );
    return {
      rag_config: ragConfig[0] || null,
      attached_docs: kbDocs,
      retrieval_stats: { note: 'Per-query retrieval stats tracked in Qdrant metadata' },
    };
  }

  // Tab 8 — Advanced: detailed technical metrics
  private async getAdvancedTab(pool: any, params: any[], dateFilter: string) {
    const { rows } = await pool.query(
      `SELECT
         channel,
         environment,
         how_call_ended,
         COUNT(*) AS count,
         AVG(duration_s) AS avg_duration_s,
         AVG(turn_count) AS avg_turns,
         AVG(total_cost) AS avg_cost_usd
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}
       GROUP BY channel, environment, how_call_ended
       ORDER BY count DESC`,
      params,
    );
    const { rows: timeouts } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE how_call_ended = 'max_duration_reached') AS max_duration_hits,
         COUNT(*) FILTER (WHERE how_call_ended = 'silence_timeout') AS silence_timeouts,
         COUNT(*) FILTER (WHERE how_call_ended = 'user_hangup') AS user_hangups,
         COUNT(*) FILTER (WHERE how_call_ended = 'agent_hangup') AS agent_hangups,
         COUNT(*) FILTER (WHERE how_call_ended = 'transfer') AS transfers,
         COUNT(*) AS total
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.agent_id = $2 ${dateFilter}`,
      params,
    );
    return { breakdown: rows, call_endings: timeouts[0] };
  }

  // Global conversation listing for analytics page
  async getConversationsAnalytics(tenantId: string, from?: string, to?: string) {
    const pool = getPool();
    const params: any[] = [tenantId];
    let dateFilter = '';
    if (from) { dateFilter += ` AND c.started_at >= $${params.push(from)}`; }
    if (to)   { dateFilter += ` AND c.started_at <= $${params.push(to)}`; }
    const { rows } = await pool.query(
      `SELECT
         a.name AS agent_name,
         c.channel,
         c.status,
         c.call_successful,
         c.duration_s,
         c.total_cost,
         c.call_cost_credits,
         c.tts_latency_ms_avg,
         c.asr_latency_ms_avg,
         c.turn_count,
         c.started_at
       FROM conversations c
       JOIN agents a ON a.agent_id = c.agent_id
       WHERE c.tenant_id = $1 ${dateFilter}
       ORDER BY c.started_at DESC LIMIT 200`,
      params,
    );
    return rows;
  }
}
