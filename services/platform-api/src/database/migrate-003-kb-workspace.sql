-- ============================================================
-- Migration 003 — KB workspace-level architecture (§6.2K)
-- Makes knowledge_base_docs workspace-level (tenant_id only)
-- Adds agent_knowledge_base junction table
-- Adds missing columns for new KB features
-- ============================================================

BEGIN;

-- ── Step 1: Add missing columns to knowledge_base_docs ─────────────────────
ALTER TABLE knowledge_base_docs
  ADD COLUMN IF NOT EXISTS name         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS type         VARCHAR(10),
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS visibility   VARCHAR(20) DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS chunk_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ;

-- Backfill name/type from existing columns where possible
UPDATE knowledge_base_docs SET name = title WHERE name IS NULL AND title IS NOT NULL;
UPDATE knowledge_base_docs SET type = file_type WHERE type IS NULL AND file_type IS NOT NULL;

-- Make agent_id nullable (was NOT NULL — KB docs are now workspace-level)
ALTER TABLE knowledge_base_docs ALTER COLUMN agent_id DROP NOT NULL;

-- ── Step 2: Create agent_knowledge_base junction table ──────────────────────
CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  agent_id    UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  kb_doc_id   UUID NOT NULL REFERENCES knowledge_base_docs(doc_id) ON DELETE CASCADE,
  branch_id   UUID,             -- NULL = all branches; FK to agent_versions would be added post-migration
  attached_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, kb_doc_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_akb_agent   ON agent_knowledge_base(agent_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_akb_kb_doc  ON agent_knowledge_base(kb_doc_id);

-- ── Step 3: Migrate existing agent_configs.kb_docs_attached[] to junction ───
-- For each agent_config that has kb_docs_attached, insert junction rows
DO $$
DECLARE
  r RECORD;
  doc_id TEXT;
BEGIN
  FOR r IN
    SELECT ac.agent_id, unnest(ac.kb_docs_attached) AS doc_id
    FROM agent_configs ac
    WHERE ac.kb_docs_attached IS NOT NULL AND array_length(ac.kb_docs_attached, 1) > 0
  LOOP
    BEGIN
      INSERT INTO agent_knowledge_base (agent_id, kb_doc_id)
      VALUES (r.agent_id, r.doc_id::uuid)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Skip invalid UUIDs or missing docs
    END;
  END LOOP;
END;
$$;

-- ── Step 4: Add temp_files table for staged uploads ─────────────────────────
CREATE TABLE IF NOT EXISTS temp_files (
  temp_file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  filename     VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  mime_type    VARCHAR(100) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_files            ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON agent_knowledge_base
  USING (agent_id IN (SELECT agent_id FROM agents WHERE tenant_id = current_setting('app.current_tenant', TRUE)::uuid));
CREATE POLICY tenant_isolation ON temp_files
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);

COMMIT;
