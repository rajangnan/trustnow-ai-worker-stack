-- ============================================================
-- TRUSTNOW Platform — Migration 002 — Task 6 Support Tables
-- Creates: agent_templates, agent_tests, agent_test_folders
-- Run via: psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform -f migrate-002-task6-tables.sql
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- agent_templates — Powers the "+New Agent" wizard (§6.2D/E)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_templates (
    template_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type              TEXT NOT NULL CHECK (agent_type IN ('conversational','tools_assisted','autonomous')),
    industry                TEXT NOT NULL,
    use_case                TEXT NOT NULL,
    display_name            TEXT NOT NULL,
    description             TEXT,
    system_prompt_template  TEXT NOT NULL,
    first_message_template  TEXT NOT NULL,
    default_config_json     JSONB NOT NULL DEFAULT '{}',
    is_featured             BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_type, industry, use_case)
);

-- ─────────────────────────────────────────────────────────────
-- agent_tests — Tab 7 test management (§6.2)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_tests (
    test_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    folder_id       UUID,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'next_reply' CHECK (type IN ('next_reply','tool_invocation')),
    prompt          TEXT NOT NULL,
    expected_json   JSONB NOT NULL DEFAULT '{}',
    last_result     TEXT,
    last_run_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_test_folders (
    folder_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from agent_tests to agent_test_folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agent_tests_folder_id_fkey'
  ) THEN
    ALTER TABLE agent_tests ADD CONSTRAINT agent_tests_folder_id_fkey
      FOREIGN KEY (folder_id) REFERENCES agent_test_folders(folder_id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
