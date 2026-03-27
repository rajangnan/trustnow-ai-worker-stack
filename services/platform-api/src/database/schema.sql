-- =============================================================================
-- TRUSTNOW Platform — PostgreSQL Schema v2
-- BRD-L5-MT-003 (Multi-Tenancy RLS), BRD-CC-001 (Concurrent Sessions)
-- Task 4.1 — 19 tables + TimescaleDB hypertables + RLS + indexes
--
-- TimescaleDB notes:
--   • Hypertable unique indexes MUST include the partition column
--   • FKs FROM regular tables TO hypertables are not supported
--     (referential integrity on conversation_id enforced at app layer)
--   • Rules are not supported on hypertables — use triggers for INSERT-ONLY
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- CORE TENANT & IDENTITY
-- =============================================================================

CREATE TABLE tenants (
    tenant_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    plan_tier       TEXT NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter','professional','enterprise')),
    default_partition TEXT NOT NULL DEFAULT 'cloud' CHECK (default_partition IN ('cloud','onprem','hybrid')),
    settings_json   JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    role_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name            TEXT NOT NULL CHECK (name IN ('platform_admin','tenant_admin','supervisor','agent_builder','agent_operator','readonly')),
    permissions_json JSONB NOT NULL DEFAULT '{}',
    UNIQUE (tenant_id, name)
);

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    name            TEXT NOT NULL,
    role_id         UUID REFERENCES roles(role_id),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','locked')),
    last_login      TIMESTAMPTZ,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- =============================================================================
-- AI PROVIDER REGISTRY (global — no tenant RLS)
-- =============================================================================

CREATE TABLE llm_providers (
    provider_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL CHECK (type IN ('cloud','onprem')),
    base_url        TEXT NOT NULL,
    auth_type       TEXT NOT NULL CHECK (auth_type IN ('api_key','none','oauth2'))
);

CREATE TABLE llm_models (
    model_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id           UUID NOT NULL REFERENCES llm_providers(provider_id) ON DELETE CASCADE,
    model_name            TEXT NOT NULL,
    display_name          TEXT NOT NULL,
    latency_p50_ms        INTEGER,
    cost_per_min          NUMERIC(10,4) NOT NULL DEFAULT 0,
    context_window_tokens INTEGER,
    supported_languages   TEXT[] NOT NULL DEFAULT ARRAY['en'],
    status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','unavailable')),
    UNIQUE (provider_id, model_name)
);

CREATE TABLE stt_providers (
    provider_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL UNIQUE,
    type                TEXT NOT NULL CHECK (type IN ('cloud','onprem')),
    base_url            TEXT NOT NULL,
    supported_languages TEXT[] NOT NULL DEFAULT ARRAY['en']
);

CREATE TABLE tts_providers (
    provider_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL UNIQUE,
    type                TEXT NOT NULL CHECK (type IN ('cloud','onprem')),
    base_url            TEXT NOT NULL,
    supported_languages TEXT[] NOT NULL DEFAULT ARRAY['en']
);

-- =============================================================================
-- VOICES (global + tenant-scoped)
-- =============================================================================

CREATE TABLE voices (
    voice_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    gender          TEXT CHECK (gender IN ('male','female','neutral')),
    language_tags   TEXT[] NOT NULL DEFAULT ARRAY['en'],
    trait_tags      TEXT[] NOT NULL DEFAULT '{}',
    provider        TEXT NOT NULL,
    sample_audio_url TEXT,
    is_global       BOOLEAN NOT NULL DEFAULT FALSE
);

-- =============================================================================
-- AGENT DEFINITIONS
-- =============================================================================

CREATE TABLE agents (
    agent_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('conversational','tools_assisted','autonomous')),
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    partition           TEXT NOT NULL DEFAULT 'cloud' CHECK (partition IN ('cloud','onprem','hybrid')),
    created_by          UUID REFERENCES users(user_id),
    current_version_id  UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_versions (
    version_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id            UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    version             INTEGER NOT NULL,
    config_snapshot_json JSONB NOT NULL DEFAULT '{}',
    published_by        UUID REFERENCES users(user_id),
    published_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, version)
);

ALTER TABLE agents ADD CONSTRAINT fk_agents_current_version
    FOREIGN KEY (current_version_id) REFERENCES agent_versions(version_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE agent_configs (
    config_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id                UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    version                 INTEGER NOT NULL DEFAULT 1,
    system_prompt           TEXT,
    first_message           TEXT,
    voice_id                UUID REFERENCES voices(voice_id),
    primary_language        TEXT NOT NULL DEFAULT 'en',
    additional_languages    TEXT[] NOT NULL DEFAULT '{}',
    llm_model_id            UUID REFERENCES llm_models(model_id),
    stt_provider_id         UUID REFERENCES stt_providers(provider_id),
    tts_provider_id         UUID REFERENCES tts_providers(provider_id),
    tools_config_json       JSONB NOT NULL DEFAULT '[]',
    kb_docs_attached        UUID[] NOT NULL DEFAULT '{}',
    widget_config_id        UUID,
    auth_policy_id          UUID,
    handoff_policy_id       UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, version)
);

-- =============================================================================
-- KNOWLEDGE BASE
-- =============================================================================

CREATE TABLE knowledge_base_docs (
    doc_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id            UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('url','pdf','docx','txt','csv')),
    source_url          TEXT,
    storage_path        TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','indexing','ready','error')),
    chunk_count         INTEGER DEFAULT 0,
    vector_collection_ref TEXT,
    last_indexed_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TOOLS
-- =============================================================================

CREATE TABLE tools (
    tool_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('webhook','client','integration','mcp','system')),
    description     TEXT,
    config_json     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- =============================================================================
-- WIDGET, AUTH, HANDOFF POLICIES
-- =============================================================================

CREATE TABLE widget_configs (
    widget_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id                UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    embed_code              TEXT,
    feedback_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    interface_settings_json JSONB NOT NULL DEFAULT '{}',
    avatar_config_json      JSONB NOT NULL DEFAULT '{}',
    terms_config_json       JSONB NOT NULL DEFAULT '{}',
    styling_config_json     JSONB NOT NULL DEFAULT '{}',
    allowed_domains         TEXT[] NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_policies (
    policy_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id            UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    methods_enabled     TEXT[] NOT NULL DEFAULT ARRAY['open'],
    allowed_numbers     TEXT[] NOT NULL DEFAULT '{}',
    ip_allowlist        TEXT[] NOT NULL DEFAULT '{}',
    jwt_config_json     JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE handoff_policies (
    policy_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id                UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    tenant_id               UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    handoff_type            TEXT NOT NULL CHECK (handoff_type IN ('transfer','warm_transfer','queue','voicemail','callback')),
    transfer_target         TEXT,
    escalation_triggers     TEXT[] NOT NULL DEFAULT '{}',
    pre_handoff_tts_message TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- CONVERSATIONS (TimescaleDB hypertable on started_at)
-- Note: No standalone PK — TimescaleDB requires partition col in all unique indexes
--       conversation_id uniqueness enforced via UNIQUE (conversation_id, started_at)
--       FK references FROM recordings use app-level integrity (not DB FK)
-- =============================================================================

CREATE TABLE conversations (
    conversation_id UUID        NOT NULL DEFAULT uuid_generate_v4(),
    agent_id        UUID        NOT NULL REFERENCES agents(agent_id),
    tenant_id       UUID        NOT NULL REFERENCES tenants(tenant_id),
    channel         TEXT        NOT NULL CHECK (channel IN ('voice','chat','email','whatsapp')),
    status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned','transferred','error')),
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_s      INTEGER,
    recording_url   TEXT,
    transcript_json JSONB       NOT NULL DEFAULT '[]',
    llm_cost        NUMERIC(10,6) DEFAULT 0,
    tts_cost        NUMERIC(10,6) DEFAULT 0,
    stt_cost        NUMERIC(10,6) DEFAULT 0,
    total_cost      NUMERIC(10,6) DEFAULT 0,
    language_detected TEXT,
    handoff_occurred  BOOLEAN   DEFAULT FALSE,
    rating          SMALLINT    CHECK (rating BETWEEN 1 AND 5),
    feedback_text   TEXT,
    metadata_json   JSONB       NOT NULL DEFAULT '{}'
);

SELECT create_hypertable('conversations', 'started_at');
-- After hypertable creation, unique index must include partition column
CREATE UNIQUE INDEX idx_conversations_pk ON conversations(conversation_id, started_at);

-- =============================================================================
-- AUDIT LOGS (TimescaleDB hypertable on timestamp — INSERT-ONLY via trigger)
-- =============================================================================

CREATE TABLE audit_logs (
    log_id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(tenant_id),
    user_id         UUID        REFERENCES users(user_id),
    action          TEXT        NOT NULL,
    resource_type   TEXT        NOT NULL,
    resource_id     UUID,
    before_json     JSONB,
    after_json      JSONB,
    ip_address      INET,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('audit_logs', 'timestamp');
CREATE UNIQUE INDEX idx_audit_logs_pk ON audit_logs(log_id, timestamp);

-- Trigger-based INSERT-ONLY enforcement (rules not supported on hypertables)
CREATE OR REPLACE FUNCTION fn_audit_logs_readonly()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'audit_logs is INSERT-ONLY — % operations are forbidden', TG_OP;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_readonly();

CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_readonly();

-- =============================================================================
-- RECORDINGS
-- Note: conversation_id references conversations logically;
--       FK not enforced at DB level because conversations is a hypertable
-- =============================================================================

CREATE TABLE recordings (
    recording_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID        NOT NULL,  -- logical FK to conversations.conversation_id
    tenant_id           UUID        NOT NULL REFERENCES tenants(tenant_id),
    storage_path        TEXT        NOT NULL,
    duration_s          INTEGER,
    format              TEXT        NOT NULL DEFAULT 'wav' CHECK (format IN ('wav','mp3','ogg','flac')),
    encryption_key_ref  TEXT,
    retention_until     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY — All tenant-scoped tables
-- =============================================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_docs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools                ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_policies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings           ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON roles
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON agents
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON agent_configs
    USING (agent_id IN (
        SELECT agent_id FROM agents
        WHERE tenant_id = current_setting('app.current_tenant', TRUE)::uuid
    ));
CREATE POLICY tenant_isolation ON agent_versions
    USING (agent_id IN (
        SELECT agent_id FROM agents
        WHERE tenant_id = current_setting('app.current_tenant', TRUE)::uuid
    ));
CREATE POLICY tenant_isolation ON voices
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON knowledge_base_docs
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON tools
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON widget_configs
    USING (agent_id IN (
        SELECT agent_id FROM agents
        WHERE tenant_id = current_setting('app.current_tenant', TRUE)::uuid
    ));
CREATE POLICY tenant_isolation ON auth_policies
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON handoff_policies
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON conversations
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON recordings
    USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX idx_conversations_tenant_started ON conversations(tenant_id, started_at DESC);
CREATE INDEX idx_conversations_agent          ON conversations(agent_id);
CREATE INDEX idx_conversations_status         ON conversations(tenant_id, status);
CREATE INDEX idx_audit_logs_tenant_ts         ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_logs_resource          ON audit_logs(tenant_id, resource_type, resource_id);
CREATE INDEX idx_agents_tenant                ON agents(tenant_id);
CREATE INDEX idx_agents_type_status           ON agents(tenant_id, type, status);
CREATE INDEX idx_knowledge_base_docs_agent    ON knowledge_base_docs(agent_id, tenant_id);
CREATE INDEX idx_knowledge_base_docs_status   ON knowledge_base_docs(tenant_id, status);
CREATE INDEX idx_recordings_conversation      ON recordings(conversation_id);
CREATE INDEX idx_users_tenant_email           ON users(tenant_id, email);
CREATE INDEX idx_llm_models_provider          ON llm_models(provider_id, status);
