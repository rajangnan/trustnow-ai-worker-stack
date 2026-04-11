-- TRUSTNOW Migration 002: Co-browsing translation additions
-- Run ONLY for tables that are confirmed missing from Step 4A.1 audit.
-- Each CREATE TABLE is wrapped in IF NOT EXISTS to be idempotent.

-- ── PHONE NUMBERS (must be created before batch_calls FK) ────────────────────
CREATE TABLE IF NOT EXISTS phone_numbers (
  phone_number_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(tenant_id),
  label                 VARCHAR(100) NOT NULL,
  phone_number          VARCHAR(20) NOT NULL,
  agent_id              UUID REFERENCES agents(agent_id),
  sip_transport         VARCHAR(5) DEFAULT 'tls',
  media_encryption      VARCHAR(10) DEFAULT 'required',
  outbound_address      VARCHAR(255),
  outbound_transport    VARCHAR(5) DEFAULT 'tls',
  outbound_encryption   VARCHAR(10) DEFAULT 'required',
  sip_username          VARCHAR(100),
  sip_password_enc      TEXT,
  custom_sip_headers    JSONB DEFAULT '[]',
  status                VARCHAR(20) DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, phone_number)
);
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY phone_numbers_tenant ON phone_numbers USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── AGENT BRANCHES & VERSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_branches (
  branch_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id          UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id),
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  traffic_split     DECIMAL(5,2) DEFAULT 0.00,
  status            VARCHAR(20) DEFAULT 'draft',
  is_protected      BOOLEAN DEFAULT false,
  parent_branch_id  UUID REFERENCES agent_branches(branch_id),
  created_by        UUID REFERENCES users(user_id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE agent_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_branches_tenant ON agent_branches USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_agent_branches_agent ON agent_branches(agent_id);

CREATE TABLE IF NOT EXISTS branch_versions (
  version_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id        UUID NOT NULL REFERENCES agent_branches(branch_id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id),
  version_number   INTEGER NOT NULL,
  snapshot         JSONB NOT NULL,
  published_by     UUID REFERENCES users(user_id),
  published_at     TIMESTAMPTZ DEFAULT now(),
  notes            TEXT
);
ALTER TABLE branch_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY branch_versions_tenant ON branch_versions USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── WORKFLOW TABLES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_nodes (
  node_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id                  UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  branch_id                 UUID NOT NULL,
  tenant_id                 UUID NOT NULL REFERENCES tenants(tenant_id),
  node_type                 VARCHAR(30) NOT NULL,
  label                     VARCHAR(100),
  conversation_goal         TEXT,
  override_prompt           BOOLEAN DEFAULT false,
  voice_id                  UUID,
  llm_model                 VARCHAR(50),
  eagerness                 VARCHAR(20),
  spelling_patience         VARCHAR(10),
  speculative_turn_enabled  BOOLEAN,
  position_x                FLOAT NOT NULL DEFAULT 0,
  position_y                FLOAT NOT NULL DEFAULT 0,
  config                    JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_nodes_tenant ON workflow_nodes USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_agent_branch ON workflow_nodes(agent_id, branch_id);

CREATE TABLE IF NOT EXISTS workflow_edges (
  edge_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id         UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL,
  tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id),
  source_node_id   UUID NOT NULL REFERENCES workflow_nodes(node_id) ON DELETE CASCADE,
  target_node_id   UUID NOT NULL REFERENCES workflow_nodes(node_id) ON DELETE CASCADE,
  condition_label  VARCHAR(200),
  condition_type   VARCHAR(20) DEFAULT 'llm_evaluated',
  priority         INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_edges_tenant ON workflow_edges USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS workflow_versions (
  version_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id     UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL,
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
  nodes_json   JSONB NOT NULL,
  edges_json   JSONB NOT NULL,
  saved_by     UUID REFERENCES users(user_id),
  saved_at     TIMESTAMPTZ DEFAULT now(),
  notes        TEXT
);
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_versions_tenant ON workflow_versions USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── KNOWLEDGE BASE JUNCTION ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  agent_id     UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  kb_doc_id    UUID NOT NULL REFERENCES knowledge_base_docs(doc_id) ON DELETE CASCADE,
  branch_id    UUID,
  attached_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, kb_doc_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::UUID))
);
CREATE INDEX IF NOT EXISTS idx_akb_agent ON agent_knowledge_base(agent_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_akb_doc ON agent_knowledge_base(kb_doc_id);

-- ── TESTS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_folders (
  folder_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id),
  name       VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE test_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_folders_tenant ON test_folders USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS agent_tests (
  test_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  folder_id          UUID REFERENCES test_folders(folder_id),
  name               VARCHAR(200) NOT NULL,
  test_type          VARCHAR(20) NOT NULL,
  is_template        BOOLEAN DEFAULT false,
  created_by         UUID REFERENCES users(user_id),
  conversation       JSONB DEFAULT '[]',
  expected_criteria  TEXT,
  success_examples   JSONB DEFAULT '[]',
  failure_examples   JSONB DEFAULT '[]',
  tool_type          VARCHAR(30),
  target_agent_id    UUID REFERENCES agents(agent_id),
  target_node_id     UUID,
  should_invoke      BOOLEAN DEFAULT true,
  user_scenario      TEXT,
  success_criteria   TEXT,
  max_turns          INTEGER DEFAULT 5,
  mock_all_tools     BOOLEAN DEFAULT false,
  dynamic_variables  JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE agent_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_tests_tenant ON agent_tests USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS agent_test_attachments (
  agent_id    UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  test_id     UUID NOT NULL REFERENCES agent_tests(test_id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, test_id)
);

CREATE TABLE IF NOT EXISTS test_runs (
  run_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id        UUID NOT NULL REFERENCES agent_tests(test_id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(tenant_id),
  agent_id       UUID NOT NULL REFERENCES agents(agent_id),
  branch_id      UUID NOT NULL,
  status         VARCHAR(20) DEFAULT 'running',
  result_detail  JSONB,
  duration_ms    INTEGER,
  run_by         UUID REFERENCES users(user_id),
  created_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_runs_tenant ON test_runs USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── BATCH CALLING ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_calls (
  batch_call_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                UUID NOT NULL REFERENCES tenants(tenant_id),
  name                     VARCHAR(100) NOT NULL DEFAULT 'Untitled Batch',
  agent_id                 UUID NOT NULL REFERENCES agents(agent_id),
  phone_number_id          UUID NOT NULL REFERENCES phone_numbers(phone_number_id),
  status                   VARCHAR(20) DEFAULT 'pending',
  ringing_timeout_s        INTEGER DEFAULT 60,
  concurrency_limit        INTEGER,
  total_recipients         INTEGER DEFAULT 0,
  calls_completed          INTEGER DEFAULT 0,
  calls_failed             INTEGER DEFAULT 0,
  calls_pending            INTEGER DEFAULT 0,
  scheduled_at             TIMESTAMPTZ,
  timezone                 VARCHAR(60),
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  compliance_acknowledged  BOOLEAN DEFAULT false,
  created_by               UUID REFERENCES users(user_id),
  created_at               TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE batch_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_calls_tenant ON batch_calls USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS batch_call_recipients (
  recipient_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_call_id     UUID NOT NULL REFERENCES batch_calls(batch_call_id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id),
  phone_number      VARCHAR(20) NOT NULL,
  dynamic_variables JSONB DEFAULT '{}',
  overrides         JSONB DEFAULT '{}',
  status            VARCHAR(20) DEFAULT 'pending',
  conversation_id   UUID REFERENCES conversations(conversation_id),
  attempted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE batch_call_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_call_recipients_tenant ON batch_call_recipients USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_bcr_batch ON batch_call_recipients(batch_call_id, status);

-- ── WHATSAPP ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  wa_account_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  meta_waba_id       VARCHAR(100) NOT NULL,
  phone_number_id    VARCHAR(100) NOT NULL,
  phone_number       VARCHAR(20),
  display_name       VARCHAR(100),
  agent_id           UUID REFERENCES agents(agent_id),
  access_token_enc   TEXT,
  respond_with_audio BOOLEAN DEFAULT true,
  status             VARCHAR(20) DEFAULT 'active',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_accounts_tenant ON whatsapp_accounts USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── WORKSPACE SETTINGS, SECRETS, AUTH CONNECTIONS ────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_settings (
  tenant_id                              UUID PRIMARY KEY REFERENCES tenants(tenant_id),
  conversation_initiation_webhook_url    TEXT,
  conversation_initiation_webhook_auth   JSONB DEFAULT '{}',
  post_call_webhook_url                  TEXT,
  post_call_webhook_secret               TEXT,
  post_call_webhook_auth                 JSONB DEFAULT '{}',
  updated_at                             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_secrets (
  secret_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id),
  name        VARCHAR(100) NOT NULL,
  value_enc   TEXT NOT NULL,
  created_by  UUID REFERENCES users(user_id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);
ALTER TABLE workspace_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_secrets_tenant ON workspace_secrets USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS workspace_auth_connections (
  auth_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id),
  name        VARCHAR(100) NOT NULL,
  auth_type   VARCHAR(20) NOT NULL,
  config_enc  JSONB NOT NULL,
  created_by  UUID REFERENCES users(user_id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE workspace_auth_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_auth_connections_tenant ON workspace_auth_connections USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── API KEYS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  key_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(tenant_id),
  name                 VARCHAR(100) NOT NULL,
  key_hash             VARCHAR(64) NOT NULL UNIQUE,
  key_prefix           VARCHAR(12) NOT NULL,
  restrict_key         BOOLEAN DEFAULT true,
  monthly_credit_limit INTEGER,
  permissions          JSONB DEFAULT '{}',
  last_used_at         TIMESTAMPTZ,
  created_by           UUID REFERENCES users(user_id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  is_active            BOOLEAN DEFAULT true
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant ON api_keys USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── PLATFORM WEBHOOKS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  endpoint_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
  url          VARCHAR(500) NOT NULL,
  description  TEXT,
  secret_enc   TEXT NOT NULL,
  events       TEXT[] NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES users(user_id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_endpoints_tenant ON webhook_endpoints USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  delivery_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id     UUID REFERENCES webhook_endpoints(endpoint_id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  event_type      VARCHAR(50) NOT NULL,
  payload         JSONB NOT NULL,
  http_status     INTEGER,
  response_body   TEXT,
  duration_ms     INTEGER,
  success         BOOLEAN,
  attempt_number  INTEGER DEFAULT 1,
  attempted_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_delivery_log_tenant ON webhook_delivery_log USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_wdl_endpoint ON webhook_delivery_log(endpoint_id, attempted_at DESC);

-- ── ENVIRONMENT VARIABLES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS environment_variables (
  var_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id),
  name        VARCHAR(100) NOT NULL,
  var_type    VARCHAR(20) DEFAULT 'string',
  created_by  UUID REFERENCES users(user_id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);
ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY environment_variables_tenant ON environment_variables USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS environment_variable_values (
  value_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  var_id      UUID NOT NULL REFERENCES environment_variables(var_id) ON DELETE CASCADE,
  environment VARCHAR(30) NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (var_id, environment)
);

-- ── STANDALONE TTS GENERATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tts_generations (
  generation_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(tenant_id),
  input_text           TEXT NOT NULL,
  voice_id             UUID,
  model_id             VARCHAR(50) NOT NULL,
  stability            NUMERIC(3,2),
  similarity_boost     NUMERIC(3,2),
  style_exaggeration   NUMERIC(3,2),
  speed                NUMERIC(3,2),
  use_speaker_boost    BOOLEAN DEFAULT true,
  language_override    VARCHAR(10),
  output_format        VARCHAR(30) DEFAULT 'mp3_128000',
  storage_path         TEXT,
  duration_s           NUMERIC(8,2),
  credits_used         INTEGER,
  created_by           UUID REFERENCES users(user_id),
  created_at           TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tts_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tts_generations_tenant ON tts_generations USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ── ASYNC STT TRANSCRIPTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stt_transcripts (
  transcript_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id),
  title              VARCHAR(200),
  source_type        VARCHAR(10) NOT NULL,
  source_url         TEXT,
  storage_path       TEXT,
  file_size_mb       DECIMAL(8,2),
  duration_seconds   INTEGER,
  language_detected  VARCHAR(10),
  language_override  VARCHAR(10),
  tag_audio_events   BOOLEAN DEFAULT true,
  include_subtitles  BOOLEAN DEFAULT false,
  no_verbatim        BOOLEAN DEFAULT false,
  keyterms           TEXT[] DEFAULT '{}',
  status             VARCHAR(20) DEFAULT 'pending',
  transcript_json    JSONB,
  srt_content        TEXT,
  plain_text         TEXT,
  credits_used       INTEGER,
  error_message      TEXT,
  created_by         UUID REFERENCES users(user_id),
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE stt_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY stt_transcripts_tenant ON stt_transcripts USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_stt_plain_text ON stt_transcripts USING gin(to_tsvector('english', COALESCE(plain_text, '')));

-- ── ANALYSIS / POST-CALL TABLES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_turns (
  turn_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  turn_index      INTEGER NOT NULL,
  speaker         VARCHAR(10) NOT NULL,
  text            TEXT,
  tts_latency_ms  INTEGER,
  stt_latency_ms  INTEGER,
  llm_latency_ms  INTEGER,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ
);
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_turns_tenant ON conversation_turns USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE INDEX IF NOT EXISTS idx_ct_conversation ON conversation_turns(conversation_id, turn_index);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  criteria_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id     UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
  name         VARCHAR(200) NOT NULL,
  prompt       TEXT NOT NULL,
  result_type  VARCHAR(20) DEFAULT 'boolean',
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY evaluation_criteria_tenant ON evaluation_criteria USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE TABLE IF NOT EXISTS data_collection_specs (
  spec_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id     UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
  field_name   VARCHAR(100) NOT NULL,
  description  TEXT NOT NULL,
  data_type    VARCHAR(20) DEFAULT 'string',
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE data_collection_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_collection_specs_tenant ON data_collection_specs USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
