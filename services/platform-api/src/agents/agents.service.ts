import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { CreateBranchDto, UpdateBranchTrafficDto } from './dto/create-branch.dto';
import { CreateAgentWizardDto } from './dto/create-agent-wizard.dto';
import axios from 'axios';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private audit: AuditService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT a.*,
              ac.version AS config_version,
              ac.primary_language, ac.voice_id, ac.llm_model_id,
              ac.system_prompt, ac.first_message
       FROM agents a
       LEFT JOIN agent_configs ac ON ac.agent_id = a.agent_id
                                  AND ac.version = (
                                    SELECT MAX(version) FROM agent_configs
                                    WHERE agent_id = a.agent_id
                                  )
       WHERE a.tenant_id = $1
       ORDER BY a.created_at DESC`,
      [tenantId],
    );
    return rows;
  }

  async findOne(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT a.*,
              ac.*,
              ac.config_id,
              ac.version AS config_version
       FROM agents a
       LEFT JOIN agent_configs ac ON ac.agent_id = a.agent_id
                                  AND ac.version = (
                                    SELECT MAX(version) FROM agent_configs
                                    WHERE agent_id = a.agent_id
                                  )
       WHERE a.tenant_id = $1 AND a.agent_id = $2`,
      [tenantId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
    return rows[0];
  }

  async create(tenantId: string, dto: CreateAgentDto, actorId: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows: agentRows } = await client.query(
        `INSERT INTO agents (tenant_id, name, type, partition, environment, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tenantId, dto.name, dto.type, dto.partition || 'cloud', dto.environment || 'production', actorId],
      );
      const agent = agentRows[0];

      // Create initial config (version 1)
      await client.query(
        `INSERT INTO agent_configs (agent_id, version) VALUES ($1, 1)`,
        [agent.agent_id],
      );

      // Create initial agent_version entry
      const { rows: vRows } = await client.query(
        `INSERT INTO agent_versions (agent_id, version, published_by, is_live, traffic_split_pct)
         VALUES ($1, 1, $2, false, 100) RETURNING *`,
        [agent.agent_id, actorId],
      );

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.create', resource_type: 'agent', resource_id: agent.agent_id,
        diff_json: dto as any,
      });
      return { ...agent, version_id: vRows[0].version_id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(tenantId: string, agentId: string, updates: Partial<CreateAgentDto>, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.partition !== undefined) { fields.push(`partition = $${i++}`); values.push(updates.partition); }
    if (updates.environment !== undefined) { fields.push(`environment = $${i++}`); values.push(updates.environment); }
    if (!fields.length) return this.findOne(tenantId, agentId);
    fields.push(`updated_at = NOW()`);
    values.push(tenantId, agentId);
    const { rows } = await pool.query(
      `UPDATE agents SET ${fields.join(', ')} WHERE tenant_id = $${i} AND agent_id = $${i + 1} RETURNING *`,
      values,
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.update', resource_type: 'agent', resource_id: agentId,
      diff_json: updates as any,
    });
    return rows[0];
  }

  async archive(tenantId: string, agentId: string, actorId: string) {
    const pool = getPool();
    await pool.query(
      `UPDATE agents SET status = 'archived', updated_at = NOW()
       WHERE tenant_id = $1 AND agent_id = $2`,
      [tenantId, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.archive', resource_type: 'agent', resource_id: agentId,
    });
    return { success: true };
  }

  // ── Config Update (§6.2A — full 40+ field DTO) ──────────────────────────

  async updateConfig(tenantId: string, agentId: string, dto: UpdateAgentConfigDto, actorId: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      // Verify agent belongs to tenant
      const { rows: agentCheck } = await client.query(
        'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
        [agentId, tenantId],
      );
      if (!agentCheck.length) throw new NotFoundException('Agent not found');

      // Get latest config version
      const { rows: cfgRows } = await client.query(
        `SELECT config_id, version FROM agent_configs
         WHERE agent_id = $1 ORDER BY version DESC LIMIT 1`,
        [agentId],
      );
      if (!cfgRows.length) throw new NotFoundException('Agent config not found');

      // Build SET clause dynamically from provided fields
      const fieldMap: Record<string, any> = {
        system_prompt: dto.system_prompt,
        default_personality_enabled: dto.default_personality_enabled,
        timezone_override: dto.timezone_override,
        first_message: dto.first_message,
        first_message_interruptible: dto.first_message_interruptible,
        voice_id: dto.voice_id,
        expressive_mode_enabled: dto.expressive_mode_enabled,
        additional_voices: dto.additional_voices != null ? JSON.stringify(dto.additional_voices) : undefined,
        primary_language: dto.primary_language,
        additional_languages: dto.additional_languages,
        hinglish_mode_enabled: dto.hinglish_mode_enabled,
        language_groups: dto.language_groups != null ? JSON.stringify(dto.language_groups) : undefined,
        llm_model_id: dto.llm_model_id,
        backup_llm_policy: dto.backup_llm_policy,
        backup_llm_model_id: dto.backup_llm_model_id,
        llm_temperature: dto.llm_temperature,
        llm_thinking_budget_enabled: dto.llm_thinking_budget_enabled,
        llm_max_tokens: dto.llm_max_tokens,
        stt_provider_id: dto.stt_provider_id,
        tts_provider_id: dto.tts_provider_id,
        eagerness: dto.eagerness,
        speculative_turn_enabled: dto.speculative_turn_enabled,
        take_turn_after_silence_ms: dto.take_turn_after_silence_ms,
        end_conversation_after_silence_s: dto.end_conversation_after_silence_s,
        max_conversation_duration_s: dto.max_conversation_duration_s,
        max_conversation_duration_message: dto.max_conversation_duration_message,
        soft_timeout_s: dto.soft_timeout_s,
        filter_background_speech_enabled: dto.filter_background_speech_enabled,
        asr_model: dto.asr_model,
        user_input_audio_format: dto.user_input_audio_format,
        guardrails_focus_enabled: dto.guardrails_focus_enabled,
        guardrails_focus_config: dto.guardrails_focus_config != null ? JSON.stringify(dto.guardrails_focus_config) : undefined,
        guardrails_manipulation_enabled: dto.guardrails_manipulation_enabled,
        allowed_overrides: dto.allowed_overrides,
        rag_enabled: dto.rag_enabled,
        rag_embedding_model: dto.rag_embedding_model,
        rag_character_limit: dto.rag_character_limit,
        rag_chunk_limit: dto.rag_chunk_limit,
        rag_vector_distance_limit: dto.rag_vector_distance_limit,
        rag_num_candidates_enabled: dto.rag_num_candidates_enabled,
        rag_num_candidates: dto.rag_num_candidates,
        rag_query_rewrite_enabled: dto.rag_query_rewrite_enabled,
        tools_config_json: dto.tools_config_json != null ? JSON.stringify(dto.tools_config_json) : undefined,
        kb_docs_attached: dto.kb_docs_attached,
        widget_config_id: dto.widget_config_id,
        auth_policy_id: dto.auth_policy_id,
        handoff_policy_id: dto.handoff_policy_id,
      };

      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [col, val] of Object.entries(fieldMap)) {
        if (val !== undefined) {
          setClauses.push(`${col} = $${idx++}`);
          values.push(val);
        }
      }
      if (!setClauses.length) {
        await client.query('ROLLBACK');
        return cfgRows[0];
      }
      values.push(cfgRows[0].config_id);
      const { rows: updatedCfg } = await client.query(
        `UPDATE agent_configs SET ${setClauses.join(', ')} WHERE config_id = $${idx} RETURNING *`,
        values,
      );

      // Update webhooks on auth_policy if provided
      if (dto.post_call_webhook_url !== undefined || dto.conversation_initiation_webhook_url !== undefined) {
        const wFields: string[] = [];
        const wVals: any[] = [];
        let wi = 1;
        if (dto.post_call_webhook_url !== undefined) {
          wFields.push(`post_call_webhook_url = $${wi++}`);
          wVals.push(dto.post_call_webhook_url);
        }
        if (dto.conversation_initiation_webhook_url !== undefined) {
          wFields.push(`conversation_initiation_webhook_url = $${wi++}`);
          wVals.push(dto.conversation_initiation_webhook_url);
        }
        wVals.push(agentId);
        await client.query(
          `UPDATE auth_policies SET ${wFields.join(', ')} WHERE agent_id = $${wi}`,
          wVals,
        );
      }

      // Update allowed_overrides on auth_policy if provided
      if (dto.allowed_overrides !== undefined) {
        await client.query(
          `UPDATE auth_policies SET allowed_overrides = $1 WHERE agent_id = $2`,
          [dto.allowed_overrides, agentId],
        );
      }

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.config.update', resource_type: 'agent_config',
        resource_id: cfgRows[0].config_id, diff_json: dto as any,
      });
      return updatedCfg[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────

  async publish(tenantId: string, agentId: string, actorId: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows: agentRows } = await client.query(
        'SELECT * FROM agents WHERE agent_id = $1 AND tenant_id = $2',
        [agentId, tenantId],
      );
      if (!agentRows.length) throw new NotFoundException('Agent not found');

      const { rows: cfgRows } = await client.query(
        `SELECT * FROM agent_configs WHERE agent_id = $1 ORDER BY version DESC LIMIT 1`,
        [agentId],
      );

      // Snapshot config into agent_versions
      const nextVersion = (await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM agent_versions WHERE agent_id = $1',
        [agentId],
      )).rows[0].v;

      const { rows: vRows } = await client.query(
        `INSERT INTO agent_versions (agent_id, version, config_snapshot_json, published_by, is_live, traffic_split_pct)
         VALUES ($1, $2, $3, $4, true, 100) RETURNING *`,
        [agentId, nextVersion, JSON.stringify(cfgRows[0] || {}), actorId],
      );

      await client.query(
        `UPDATE agents SET status = 'published', current_version_id = $1, updated_at = NOW()
         WHERE agent_id = $2`,
        [vRows[0].version_id, agentId],
      );

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.publish', resource_type: 'agent', resource_id: agentId,
        diff_json: { version: nextVersion },
      });
      return vRows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Branches (§6.2B — A/B testing) ──────────────────────────────────────

  async getBranches(tenantId: string, agentId: string) {
    const pool = getPool();
    await this.verifyAgentOwnership(pool, tenantId, agentId);
    const { rows } = await pool.query(
      `SELECT av.*, u.name AS published_by_name
       FROM agent_versions av
       LEFT JOIN users u ON u.user_id = av.published_by
       WHERE av.agent_id = $1
       ORDER BY av.published_at DESC`,
      [agentId],
    );
    return rows;
  }

  async createBranch(tenantId: string, agentId: string, dto: CreateBranchDto, actorId: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);
      await this.verifyAgentOwnership(client, tenantId, agentId);

      // Copy current main config as new branch
      const { rows: cfgRows } = await client.query(
        `SELECT * FROM agent_configs WHERE agent_id = $1 ORDER BY version DESC LIMIT 1`,
        [agentId],
      );
      const nextVersion = (await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM agent_versions WHERE agent_id = $1',
        [agentId],
      )).rows[0].v;

      const { rows: vRows } = await client.query(
        `INSERT INTO agent_versions
           (agent_id, version, config_snapshot_json, published_by, is_live, traffic_split_pct)
         VALUES ($1, $2, $3, $4, false, 0) RETURNING *`,
        [agentId, nextVersion, JSON.stringify({ ...cfgRows[0], branch_name: dto.name }), actorId],
      );

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.branch.create', resource_type: 'agent_version',
        resource_id: vRows[0].version_id, diff_json: { name: dto.name },
      });
      return vRows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBranchConfig(
    tenantId: string, agentId: string, branchId: string,
    dto: UpdateAgentConfigDto, actorId: string,
  ) {
    const pool = getPool();
    await this.verifyAgentOwnership(pool, tenantId, agentId);
    const { rows } = await pool.query(
      `SELECT * FROM agent_versions WHERE version_id = $1 AND agent_id = $2`,
      [branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');

    // Merge dto into config_snapshot_json
    const snapshot = { ...rows[0].config_snapshot_json, ...dto };
    const { rows: updated } = await pool.query(
      `UPDATE agent_versions SET config_snapshot_json = $1 WHERE version_id = $2 RETURNING *`,
      [JSON.stringify(snapshot), branchId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.branch.update', resource_type: 'agent_version',
      resource_id: branchId, diff_json: dto as any,
    });
    return updated[0];
  }

  async updateBranchTraffic(
    tenantId: string, agentId: string, branchId: string,
    dto: UpdateBranchTrafficDto, actorId: string,
  ) {
    const pool = getPool();
    await this.verifyAgentOwnership(pool, tenantId, agentId);
    const { rows } = await pool.query(
      `UPDATE agent_versions SET traffic_split_pct = $1
       WHERE version_id = $2 AND agent_id = $3 RETURNING *`,
      [dto.traffic_split_pct, branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.branch.traffic', resource_type: 'agent_version',
      resource_id: branchId, diff_json: { traffic_split_pct: dto.traffic_split_pct },
    });
    return rows[0];
  }

  async publishBranch(tenantId: string, agentId: string, branchId: string, actorId: string) {
    const pool = getPool();
    await this.verifyAgentOwnership(pool, tenantId, agentId);
    const { rows } = await pool.query(
      `UPDATE agent_versions SET is_live = true
       WHERE version_id = $1 AND agent_id = $2 RETURNING *`,
      [branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.branch.publish', resource_type: 'agent_version',
      resource_id: branchId, diff_json: { is_live: true },
    });
    return rows[0];
  }

  async deleteBranch(tenantId: string, agentId: string, branchId: string, actorId: string) {
    const pool = getPool();
    await this.verifyAgentOwnership(pool, tenantId, agentId);
    const { rows: branchRows } = await pool.query(
      'SELECT is_live FROM agent_versions WHERE version_id = $1 AND agent_id = $2',
      [branchId, agentId],
    );
    if (!branchRows.length) throw new NotFoundException('Branch not found');
    if (branchRows[0].is_live) throw new BadRequestException('Cannot delete a live branch — take it offline first');

    await pool.query(
      'DELETE FROM agent_versions WHERE version_id = $1 AND agent_id = $2',
      [branchId, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'agent.branch.delete', resource_type: 'agent_version',
      resource_id: branchId,
    });
    return { success: true };
  }

  // ── Wizard (§6.2D) ──────────────────────────────────────────────────────

  async createViaWizard(tenantId: string, dto: CreateAgentWizardDto, actorId: string) {
    const pool = getPool();

    // 1. Look up matching template
    const { rows: templates } = await pool.query(
      `SELECT * FROM agent_templates
       WHERE agent_type = $1 AND industry = $2 AND use_case = $3
       LIMIT 1`,
      [dto.agent_type, dto.industry, dto.use_case],
    );

    let systemPromptTemplate = templates[0]?.system_prompt_template ||
      `You are {{agent_name}}, a professional AI assistant. Your goal: {{main_goal}}.`;
    let firstMessageTemplate = templates[0]?.first_message_template ||
      `Hello! I am {{agent_name}}. How may I help you today?`;

    // 2. Substitute {{placeholders}} with wizard inputs
    const replacePlaceholders = (tpl: string) =>
      tpl
        .replace(/\{\{agent_name\}\}/g, dto.agent_name)
        .replace(/\{\{main_goal\}\}/g, dto.main_goal)
        .replace(/\{\{industry\}\}/g, dto.industry)
        .replace(/\{\{use_case\}\}/g, dto.use_case);

    let systemPrompt = replacePlaceholders(systemPromptTemplate);
    let firstMessage = replacePlaceholders(firstMessageTemplate);

    // 3. If LLM enhancement desired — call Ollama/Claude to enrich the prompt
    //    (best-effort, non-blocking, falls back to template if LLM fails)
    try {
      const llmUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
      const llmResp = await axios.post(
        `${llmUrl}/api/generate`,
        {
          model: process.env.WIZARD_LLM_MODEL || 'llama3.1:8b',
          prompt: `You are a professional AI agent designer. Given the following template, enhance it with specific, professional content for a ${dto.industry} ${dto.use_case} agent named "${dto.agent_name}". Goal: ${dto.main_goal}.\n\nTemplate:\n${systemPromptTemplate}\n\nReturn ONLY the enhanced system prompt, no preamble.`,
          stream: false,
        },
        { timeout: 30000 },
      );
      if (llmResp.data?.response) systemPrompt = llmResp.data.response;
    } catch (err) {
      this.logger.warn(`Wizard LLM enhancement failed (using template): ${err.message}`);
    }

    // 4. Create agent + config in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows: agentRows } = await client.query(
        `INSERT INTO agents (tenant_id, name, type, partition, environment, created_by)
         VALUES ($1, $2, $3, 'cloud', 'production', $4) RETURNING *`,
        [tenantId, dto.agent_name, dto.agent_type, actorId],
      );
      const agent = agentRows[0];

      // Apply template defaults
      const templateDefaults = templates[0]?.default_config_json || {};

      const { rows: cfgRows } = await client.query(
        `INSERT INTO agent_configs
           (agent_id, version, system_prompt, first_message,
            rag_enabled, rag_embedding_model,
            eagerness, take_turn_after_silence_ms,
            max_conversation_duration_s, tools_config_json, kb_docs_attached)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          agent.agent_id,
          systemPrompt,
          firstMessage,
          templateDefaults.rag_enabled ?? false,
          templateDefaults.rag_embedding_model ?? 'multilingual',
          templateDefaults.eagerness ?? 'normal',
          templateDefaults.take_turn_after_silence_ms ?? 7000,
          templateDefaults.max_conversation_duration_s ?? 600,
          JSON.stringify(templateDefaults.tools_config_json ?? []),
          dto.kb_doc_ids || [],
        ],
      );

      await client.query(
        `INSERT INTO agent_versions (agent_id, version, config_snapshot_json, published_by, is_live, traffic_split_pct)
         VALUES ($1, 1, $2, $3, false, 100)`,
        [agent.agent_id, JSON.stringify(cfgRows[0]), actorId],
      );

      await client.query('COMMIT');

      // 5. If website_url provided — spawn async crawl (non-blocking)
      if (dto.website_url) {
        this.spawnWebsiteCrawl(agent.agent_id, dto.website_url, actorId).catch((e) =>
          this.logger.warn(`Website crawl failed for agent ${agent.agent_id}: ${e.message}`),
        );
      }

      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.wizard.create', resource_type: 'agent', resource_id: agent.agent_id,
        diff_json: dto as any,
      });

      return {
        agent_id: agent.agent_id,
        config: cfgRows[0],
        redirect_url: `/app/agents/${agent.agent_id}?tab=agent`,
        website_personalisation_pending: !!dto.website_url,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Async website crawl — fetches text content, creates KB doc, attaches to agent
  private async spawnWebsiteCrawl(agentId: string, url: string, actorId: string) {
    const pool = getPool();
    this.logger.log(`Starting website crawl for agent ${agentId}: ${url}`);
    const resp = await axios.get(url, { timeout: 30000, responseType: 'text' });
    // Strip HTML tags to get plain text
    const text = (resp.data as string)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000); // cap at 50K chars

    const { rows: kbRows } = await pool.query(
      `INSERT INTO knowledge_base_docs
         (tenant_id, agent_id, title, content_text, source_url, status, created_by)
       VALUES (
         (SELECT tenant_id FROM agents WHERE agent_id = $1),
         $1, $2, $3, $4, 'ready', $5
       ) RETURNING doc_id`,
      [agentId, `Website: ${url}`, text, url, actorId],
    );

    await pool.query(
      `UPDATE agent_configs SET kb_docs_attached = array_append(kb_docs_attached, $1)
       WHERE agent_id = $2`,
      [kbRows[0].doc_id, agentId],
    );
    this.logger.log(`Website crawl complete for agent ${agentId} — doc ${kbRows[0].doc_id}`);
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  private async verifyAgentOwnership(pool: any, tenantId: string, agentId: string) {
    const { rows } = await pool.query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
  }
}
