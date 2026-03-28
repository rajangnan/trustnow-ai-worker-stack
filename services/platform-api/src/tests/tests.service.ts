/**
 * TestsModule — Agent test management (Tab 7)
 * Test types: Next Reply and Tool Invocation only (per UI-SPEC)
 * 5 ElevenLabs default templates pre-seeded
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const DEFAULT_TEST_TEMPLATES = [
  {
    id: 'tpl_greeting',
    name: 'Greeting check',
    type: 'next_reply',
    description: 'Verify agent greets the user correctly',
    prompt: 'Hi, I need help',
    expected_contains: ['hello', 'hi', 'welcome', 'assist'],
  },
  {
    id: 'tpl_handoff',
    name: 'Handoff trigger',
    type: 'tool_invocation',
    description: 'Verify agent triggers human handoff on complex request',
    prompt: 'I want to speak to a human agent',
    expected_tool: 'transfer_call',
  },
  {
    id: 'tpl_topic_focus',
    name: 'Off-topic guardrail',
    type: 'next_reply',
    description: 'Verify agent stays on topic when asked irrelevant questions',
    prompt: 'Can you help me write a poem?',
    expected_not_contains: ['poem', 'verse'],
  },
  {
    id: 'tpl_data_collection',
    name: 'Data collection',
    type: 'next_reply',
    description: 'Verify agent collects required customer data',
    prompt: 'I want to make a booking',
    expected_contains: ['name', 'date', 'time'],
  },
  {
    id: 'tpl_farewell',
    name: 'Farewell check',
    type: 'next_reply',
    description: 'Verify agent closes call politely',
    prompt: 'Goodbye, thanks for your help',
    expected_contains: ['goodbye', 'thank', 'pleasure', 'welcome'],
  },
];

@Injectable()
export class TestsService {
  constructor(private audit: AuditService) {}

  async getTemplates() {
    return DEFAULT_TEST_TEMPLATES;
  }

  async findAll(tenantId: string, agentId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM agent_tests WHERE tenant_id = $1 AND agent_id = $2 ORDER BY created_at DESC`,
      [tenantId, agentId],
    );
    return rows;
  }

  async create(tenantId: string, agentId: string, dto: any, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO agent_tests
         (tenant_id, agent_id, name, type, folder_id, prompt, expected_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        tenantId, agentId,
        dto.name, dto.type || 'next_reply',
        dto.folder_id || null,
        dto.prompt,
        JSON.stringify(dto.expected || {}),
        actorId,
      ],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'test.create', resource_type: 'agent_test', resource_id: rows[0].test_id,
      diff_json: dto,
    });
    return rows[0];
  }

  async runTest(tenantId: string, agentId: string, testId: string) {
    // In production: invoke AI pipeline to simulate the test scenario
    // For now: return pending status (async)
    return {
      test_id: testId,
      status: 'pending',
      message: 'Test queued — results available in ~30s',
    };
  }

  async createFolder(tenantId: string, agentId: string, name: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO agent_test_folders (tenant_id, agent_id, name, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenantId, agentId, name, actorId],
    );
    return rows[0];
  }
}
