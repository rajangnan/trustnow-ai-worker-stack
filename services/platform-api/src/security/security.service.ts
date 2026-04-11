import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { UpdateAgentSecurityDto, CreateSessionTokenDto, CreatePostCallWebhookDto } from './dto/security.dto';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

@Injectable()
export class SecurityService {
  constructor(private audit: AuditService) {}

  async getAgentSecurity(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows: agentRows } = await pool.query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!agentRows.length) throw new NotFoundException('Agent not found');

    const [authRows, cfgRows] = await Promise.all([
      pool.query('SELECT * FROM auth_policies WHERE agent_id = $1', [agentId]),
      pool.query('SELECT guardrails_focus_enabled, guardrails_manipulation_enabled, guardrails_content_enabled, guardrails_custom_prompt FROM agent_configs WHERE agent_id = $1', [agentId]),
    ]);
    return {
      ...(authRows.rows[0] || {}),
      ...(cfgRows.rows[0] || {}),
      post_call_webhook_secret: authRows.rows[0]?.post_call_webhook_secret ? '••••••••' : null,
    };
  }

  async updateAgentSecurity(tenantId: string, agentId: string, dto: UpdateAgentSecurityDto, actorId: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows: agentRows } = await client.query(
        'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
        [agentId, tenantId],
      );
      if (!agentRows.length) throw new NotFoundException('Agent not found');

      // Update auth_policies
      const authFields: string[] = [];
      const authVals: any[] = [];
      let ai = 1;
      const authMap: Record<string, any> = {
        authentication_enabled: dto.authentication_enabled,
        allowed_hosts: dto.allowed_hosts,
        allowed_overrides: dto.allowed_overrides,
        conversation_initiation_webhook_url: dto.conversation_initiation_webhook_url,
        post_call_webhook_url: dto.post_call_webhook_url,
        post_call_webhook_secret: dto.post_call_webhook_secret,
      };
      for (const [col, val] of Object.entries(authMap)) {
        if (val !== undefined) { authFields.push(`${col} = $${ai++}`); authVals.push(val); }
      }
      if (authFields.length) {
        authVals.push(agentId);
        await client.query(
          `INSERT INTO auth_policies (agent_id, ${authFields.map((f, _) => f.split(' =')[0]).join(', ')})
           VALUES ($${authVals.length}, ${authVals.slice(0, -1).map((_, idx) => `$${idx + 1}`).join(', ')})
           ON CONFLICT (agent_id) DO UPDATE SET ${authFields.join(', ')}`,
          authVals,
        );
      }

      // Update agent_configs for guardrail fields
      const cfgFields: string[] = [];
      const cfgVals: any[] = [];
      let ci = 1;
      const cfgMap: Record<string, any> = {
        guardrails_focus_enabled: dto.guardrails_focus_enabled,
        guardrails_manipulation_enabled: dto.guardrails_manipulation_enabled,
        guardrails_content_enabled: dto.guardrails_content_enabled,
        guardrails_custom_prompt: dto.guardrails_custom_prompt,
      };
      for (const [col, val] of Object.entries(cfgMap)) {
        if (val !== undefined) { cfgFields.push(`${col} = $${ci++}`); cfgVals.push(val); }
      }
      if (cfgFields.length) {
        cfgVals.push(agentId);
        await client.query(
          `UPDATE agent_configs SET ${cfgFields.join(', ')} WHERE agent_id = $${ci}`,
          cfgVals,
        );
      }

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'agent.security.update', resource_type: 'agent', resource_id: agentId,
        diff_json: dto as any,
      });
      return { updated_at: new Date().toISOString() };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createSessionToken(tenantId: string, dto: CreateSessionTokenDto, apiKeyContext?: any) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT a.agent_id, ac.authentication_enabled FROM agents a LEFT JOIN auth_policies ac ON ac.agent_id = a.agent_id WHERE a.agent_id = $1 AND a.tenant_id = $2',
      [dto.agent_id, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
    if (rows[0].authentication_enabled === false) {
      throw new UnprocessableEntityException('authentication_enabled is false for this agent — token not needed');
    }

    const ttl = Math.min(dto.ttl_seconds || 300, 3600);
    const secret = process.env.JWT_SECRET || 'trustnow-jwt-secret';
    const token = jwt.sign(
      {
        sub: dto.user_id || 'anonymous',
        agent_id: dto.agent_id,
        tenant_id: tenantId,
        metadata: dto.user_metadata || {},
      },
      secret,
      { expiresIn: ttl },
    );

    const expires_at = new Date(Date.now() + ttl * 1000).toISOString();
    return { token, expires_at, agent_id: dto.agent_id };
  }

  async testOrSavePostCallWebhook(tenantId: string, agentId: string, dto: CreatePostCallWebhookDto) {
    const { rows } = await getPool().query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');

    const testPayload = {
      type: 'post_call_webhook_test',
      agent_id: agentId,
      conversation_id: 'test_conv_000',
      duration_s: 0,
      call_successful: true,
      transcript: [],
      timestamp: new Date().toISOString(),
    };

    if (dto.test) {
      const start = Date.now();
      try {
        const res = await axios.post(dto.url, testPayload, { timeout: 10000 });
        return { success: res.status >= 200 && res.status < 300, http_status: res.status, response_time_ms: Date.now() - start };
      } catch (err: any) {
        return { success: false, http_status: err.response?.status || null, response_time_ms: Date.now() - start };
      }
    }

    await getPool().query(
      `INSERT INTO auth_policies (agent_id, post_call_webhook_url, post_call_webhook_secret)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id) DO UPDATE SET post_call_webhook_url = $2, post_call_webhook_secret = $3`,
      [agentId, dto.url, dto.secret || null],
    );
    return { saved: true, url: dto.url };
  }

  async deletePostCallWebhook(tenantId: string, agentId: string) {
    const { rows } = await getPool().query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
    await getPool().query(
      `UPDATE auth_policies SET post_call_webhook_url = NULL, post_call_webhook_secret = NULL WHERE agent_id = $1`,
      [agentId],
    );
    return { deleted: true };
  }
}
