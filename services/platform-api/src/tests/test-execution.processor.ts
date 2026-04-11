import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios from 'axios';
import { getPool } from '../database/db.provider';

const LITELLM_URL = process.env.LITELLM_URL || 'http://127.0.0.1:4000';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || 'trustnow-internal';

async function llmChat(messages: any[], maxTokens = 200): Promise<string> {
  const resp = await axios.post(
    `${LITELLM_URL}/v1/chat/completions`,
    { model: 'claude-haiku-4-5-20251001', messages, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${LITELLM_API_KEY}` }, timeout: 60000 },
  );
  return resp.data.choices?.[0]?.message?.content?.trim() || '';
}

@Processor('test-execution')
export class TestExecutionProcessor {
  private readonly logger = new Logger(TestExecutionProcessor.name);

  @Process()
  async handle(job: Job<{ run_id: string; test_id: string; agent_id: string; tenant_id: string }>) {
    const pool = getPool();
    const { run_id, test_id, agent_id, tenant_id } = job.data;
    const startedAt = Date.now();

    await pool.query(`UPDATE test_runs SET status = 'running' WHERE run_id = $1`, [run_id]);

    try {
      const [testResult, agentResult] = await Promise.all([
        pool.query(`SELECT * FROM agent_tests WHERE test_id = $1`, [test_id]),
        pool.query(`SELECT ac.* FROM agent_configs ac WHERE ac.agent_id = $1`, [agent_id]),
      ]);
      if (!testResult.rows.length) throw new Error('Test not found');
      const test = testResult.rows[0];
      const agentConfig = agentResult.rows[0] || {};
      const systemPrompt = agentConfig.system_prompt || 'You are a helpful AI agent.';

      let status: string;
      let result_detail: any = {};

      if (test.test_type === 'next_reply') {
        const conversation = Array.isArray(test.conversation_json) ? test.conversation_json : [];
        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversation.map((m: any) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })),
        ];
        const actualResponse = await llmChat(messages, 300);
        const evalPrompt = `Given this expected criteria: ${test.expected_criteria || 'respond helpfully'}\n` +
          `Success examples: ${JSON.stringify(test.success_examples || [])}\n` +
          `Failure examples: ${JSON.stringify(test.failure_examples || [])}\n` +
          `Actual response: ${actualResponse}\n` +
          `Did the actual response pass? Answer PASS or FAIL only.`;
        const evalResponse = await llmChat([{ role: 'user', content: evalPrompt }], 5);
        status = evalResponse.toUpperCase().startsWith('PASS') ? 'passed' : 'failed';
        result_detail = { actual_response: actualResponse, evaluation: evalResponse };

      } else if (test.test_type === 'tool_invocation') {
        const conversation = Array.isArray(test.conversation_json) ? test.conversation_json : [];
        const messages = [
          { role: 'system', content: systemPrompt + '\nRespond with JSON: {"tool_called": "tool_name_or_null"}' },
          ...conversation.map((m: any) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })),
        ];
        const response = await llmChat(messages, 100);
        let toolInvoked = false;
        try {
          const parsed = JSON.parse(response);
          toolInvoked = parsed.tool_called === test.target_node_id || parsed.tool_called !== null;
        } catch {
          toolInvoked = response.toLowerCase().includes(test.target_node_id || '');
        }
        status = (toolInvoked === (test.should_invoke ?? true)) ? 'passed' : 'failed';
        result_detail = { tool_invoked: toolInvoked, should_invoke: test.should_invoke };

      } else if (test.test_type === 'simulation') {
        const maxTurns = test.max_turns || 5;
        const userPersona = test.user_scenario || 'You are a customer needing help.';
        const turns: any[] = [];
        let agentMessages: any[] = [{ role: 'system', content: systemPrompt }];
        let userMessages: any[] = [{ role: 'system', content: userPersona }];
        for (let t = 0; t < maxTurns; t++) {
          const lastAgentTurn = turns.length > 0 ? turns[turns.length - 1].agent : null;
          if (lastAgentTurn) userMessages.push({ role: 'user', content: lastAgentTurn });
          const userTurn = await llmChat(userMessages, 150);
          agentMessages.push({ role: 'user', content: userTurn });
          const agentTurn = await llmChat(agentMessages, 200);
          agentMessages.push({ role: 'assistant', content: agentTurn });
          userMessages.push({ role: 'assistant', content: userTurn });
          turns.push({ user: userTurn, agent: agentTurn });
        }
        const evalPrompt = `Success criteria: ${test.success_criteria || 'conversation resolved successfully'}\n` +
          `Transcript:\n${turns.map((t, i) => `Turn ${i + 1} — User: ${t.user}\nAgent: ${t.agent}`).join('\n')}\n` +
          `Did this simulation PASS or FAIL the success criteria? Answer PASS or FAIL only.`;
        const evalResponse = await llmChat([{ role: 'user', content: evalPrompt }], 5);
        status = evalResponse.toUpperCase().startsWith('PASS') ? 'passed' : 'failed';
        result_detail = { turns, evaluation: evalResponse };
      } else {
        status = 'failed';
        result_detail = { error: 'Unknown test type' };
      }

      const duration_ms = Date.now() - startedAt;
      await pool.query(
        `UPDATE test_runs SET status = $1, result_detail = $2, duration_ms = $3, completed_at = NOW()
         WHERE run_id = $4`,
        [status, JSON.stringify(result_detail), duration_ms, run_id],
      );
      this.logger.log(`Test run completed: run_id=${run_id} status=${status} duration=${duration_ms}ms`);

    } catch (err) {
      await pool.query(
        `UPDATE test_runs SET status = 'error', result_detail = $1, completed_at = NOW() WHERE run_id = $2`,
        [JSON.stringify({ error: (err as Error).message }), run_id],
      );
      this.logger.error(`Test run failed: run_id=${run_id}`, (err as Error).stack);
      throw err;
    }
  }
}
