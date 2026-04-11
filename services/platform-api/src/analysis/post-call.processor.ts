import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios from 'axios';
import { getPool } from '../database/db.provider';

const LITELLM_URL = process.env.LITELLM_URL || 'http://127.0.0.1:4000';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || 'trustnow-internal';

async function llmComplete(prompt: string, maxTokens = 300): Promise<string> {
  const resp = await axios.post(
    `${LITELLM_URL}/v1/chat/completions`,
    {
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    },
    { headers: { Authorization: `Bearer ${LITELLM_API_KEY}` }, timeout: 30000 },
  );
  return resp.data.choices?.[0]?.message?.content?.trim() || '';
}

// ── Job 1: AI Summary ─────────────────────────────────────────────────────────

@Processor('post-call-summary')
export class PostCallSummaryProcessor {
  private readonly logger = new Logger(PostCallSummaryProcessor.name);

  @Process()
  async handle(job: Job<{ conversation_id: string }>) {
    const pool = getPool();
    const { conversation_id } = job.data;
    const { rows } = await pool.query(
      `SELECT transcript_json FROM conversations WHERE conversation_id = $1`,
      [conversation_id],
    );
    if (!rows.length || !rows[0].transcript_json) return;
    const transcript = Array.isArray(rows[0].transcript_json)
      ? rows[0].transcript_json.map((t: any) => `${t.speaker}: ${t.text}`).join('\n')
      : JSON.stringify(rows[0].transcript_json);
    const summary = await llmComplete(
      `Summarise this customer service conversation in 2-3 sentences. Be neutral and factual.\n\n${transcript}`,
      300,
    );
    await pool.query(
      'UPDATE conversations SET ai_summary = $1 WHERE conversation_id = $2',
      [summary, conversation_id],
    );
    this.logger.log(`Summary generated: conversation=${conversation_id}`);
  }
}

// ── Job 2: Evaluation Criteria Scoring ───────────────────────────────────────

@Processor('post-call-criteria')
export class PostCallCriteriaProcessor {
  private readonly logger = new Logger(PostCallCriteriaProcessor.name);

  @Process()
  async handle(job: Job<{ conversation_id: string; agent_id: string }>) {
    const pool = getPool();
    const { conversation_id, agent_id } = job.data;
    const [criteriaResult, transcriptResult] = await Promise.all([
      pool.query(`SELECT * FROM evaluation_criteria WHERE agent_id = $1`, [agent_id]),
      pool.query(`SELECT transcript_json FROM conversations WHERE conversation_id = $1`, [conversation_id]),
    ]);
    if (!criteriaResult.rows.length) return;
    if (!transcriptResult.rows.length) return;
    const transcriptText = JSON.stringify(transcriptResult.rows[0].transcript_json || []);
    const results: Record<string, boolean> = {};
    for (const criterion of criteriaResult.rows) {
      const response = await llmComplete(
        `${criterion.llm_prompt}\n\nTranscript:\n${transcriptText}\n\nAnswer YES or NO only.`,
        5,
      );
      results[criterion.criteria_id] = response.toUpperCase().startsWith('YES');
    }
    const allPass = Object.values(results).every((v) => v === true);
    await pool.query(
      `UPDATE conversations SET evaluation_results = $1, call_successful = $2 WHERE conversation_id = $3`,
      [JSON.stringify(results), allPass, conversation_id],
    );
    this.logger.log(`Criteria evaluated: conversation=${conversation_id} pass=${allPass}`);
  }
}

// ── Job 3: Data Extraction ────────────────────────────────────────────────────

@Processor('post-call-data-extract')
export class PostCallDataExtractProcessor {
  private readonly logger = new Logger(PostCallDataExtractProcessor.name);

  @Process()
  async handle(job: Job<{ conversation_id: string; agent_id: string }>) {
    const pool = getPool();
    const { conversation_id, agent_id } = job.data;
    const [specsResult, transcriptResult] = await Promise.all([
      pool.query(`SELECT * FROM data_collection_specs WHERE agent_id = $1`, [agent_id]),
      pool.query(`SELECT transcript_json FROM conversations WHERE conversation_id = $1`, [conversation_id]),
    ]);
    if (!specsResult.rows.length) return;
    if (!transcriptResult.rows.length) return;
    const transcriptText = JSON.stringify(transcriptResult.rows[0].transcript_json || []);
    const extracted: Record<string, unknown> = {};
    for (const spec of specsResult.rows) {
      const response = await llmComplete(
        `${spec.extraction_prompt}\n\nTranscript:\n${transcriptText}\n\nExtract the value only. If not found, return "NOT_FOUND".`,
        100,
      );
      extracted[spec.field_name] = response === 'NOT_FOUND' ? null : response;
    }
    await pool.query(
      `UPDATE conversations SET data_collection_results = $1 WHERE conversation_id = $2`,
      [JSON.stringify(extracted), conversation_id],
    );
    this.logger.log(`Data extracted: conversation=${conversation_id} fields=${Object.keys(extracted).length}`);
  }
}
