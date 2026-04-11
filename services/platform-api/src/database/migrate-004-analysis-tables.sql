-- ============================================================
-- Migration 004 — Analysis tables (§6.2L)
-- evaluation_criteria, data_collection_specs, conversation_turns
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  criteria_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  agent_id     UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  name         VARCHAR(300) NOT NULL,
  description  TEXT,
  llm_prompt   TEXT NOT NULL,
  created_by   UUID REFERENCES users(user_id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_collection_specs (
  spec_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  agent_id           UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  field_name         VARCHAR(100) NOT NULL,
  field_type         VARCHAR(20) DEFAULT 'string',
  extraction_prompt  TEXT NOT NULL,
  is_required        BOOLEAN DEFAULT false,
  created_by         UUID REFERENCES users(user_id),
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  turn_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  turn_index       INTEGER NOT NULL,
  speaker          VARCHAR(10) NOT NULL,   -- 'user' | 'agent'
  text             TEXT,
  tts_latency_ms   INTEGER,
  asr_latency_ms   INTEGER,
  llm_latency_ms   INTEGER,
  tool_calls       JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Add analysis_language to agents if not present
ALTER TABLE agents ADD COLUMN IF NOT EXISTS analysis_language VARCHAR(10) DEFAULT 'auto';

-- RLS
ALTER TABLE evaluation_criteria   ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collection_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON evaluation_criteria
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON data_collection_specs
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON conversation_turns
  USING (conversation_id IN (SELECT conversation_id FROM conversations WHERE tenant_id = current_setting('app.current_tenant', TRUE)::uuid));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eval_criteria_agent ON evaluation_criteria(agent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_specs_agent    ON data_collection_specs(agent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_turns_conv     ON conversation_turns(conversation_id, turn_index);

COMMIT;
