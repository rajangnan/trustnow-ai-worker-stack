-- ============================================================
-- TRUSTNOW Platform — Migration 001 — Task 5 Column Additions
-- Run via: psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform -f migrate-001-task5-columns.sql
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents
-- Missing: post_call_webhook_url, environment
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS post_call_webhook_url     TEXT,
    ADD COLUMN IF NOT EXISTS environment               VARCHAR(20) DEFAULT 'production';

-- ─────────────────────────────────────────────────────────────
-- TABLE: agent_configs
-- ~35 missing columns covering voice, LLM, conversation,
-- guardrails, RAG, and override settings
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agent_configs
    -- Personality / voice behaviour
    ADD COLUMN IF NOT EXISTS default_personality_enabled        BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS timezone_override                  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS first_message_interruptible        BOOLEAN      DEFAULT true,
    ADD COLUMN IF NOT EXISTS expressive_mode_enabled            BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS additional_voices                  JSONB        DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS hinglish_mode_enabled              BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS language_groups                    JSONB        DEFAULT '[]',

    -- LLM settings
    ADD COLUMN IF NOT EXISTS backup_llm_policy                  VARCHAR(20)  DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS backup_llm_model_id                UUID         REFERENCES llm_models(model_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS llm_temperature                    NUMERIC(3,2) DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS llm_thinking_budget_enabled        BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS llm_max_tokens                     INTEGER      DEFAULT -1,

    -- Turn / conversation timing
    ADD COLUMN IF NOT EXISTS eagerness                          VARCHAR(10)  DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS speculative_turn_enabled           BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS take_turn_after_silence_ms         INTEGER      DEFAULT 7000,
    ADD COLUMN IF NOT EXISTS end_conversation_after_silence_s   INTEGER      DEFAULT -1,
    ADD COLUMN IF NOT EXISTS max_conversation_duration_s        INTEGER      DEFAULT 600,
    ADD COLUMN IF NOT EXISTS max_conversation_duration_message  TEXT         DEFAULT 'Conversation ended, goodbye!',
    ADD COLUMN IF NOT EXISTS soft_timeout_s                     INTEGER      DEFAULT -1,

    -- Audio / ASR input settings
    ADD COLUMN IF NOT EXISTS filter_background_speech_enabled   BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS asr_model                          VARCHAR(50)  DEFAULT 'original',
    ADD COLUMN IF NOT EXISTS user_input_audio_format            VARCHAR(30)  DEFAULT 'pcm_16000',

    -- Guardrails
    ADD COLUMN IF NOT EXISTS guardrails_focus_enabled           BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS guardrails_focus_config            JSONB,
    ADD COLUMN IF NOT EXISTS guardrails_manipulation_enabled    BOOLEAN      DEFAULT false,

    -- Overrides
    ADD COLUMN IF NOT EXISTS allowed_overrides                  TEXT[]       DEFAULT '{}',

    -- RAG settings
    ADD COLUMN IF NOT EXISTS rag_enabled                        BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS rag_embedding_model                VARCHAR(30)  DEFAULT 'multilingual',
    ADD COLUMN IF NOT EXISTS rag_character_limit                INTEGER      DEFAULT 50000,
    ADD COLUMN IF NOT EXISTS rag_chunk_limit                    INTEGER      DEFAULT 20,
    ADD COLUMN IF NOT EXISTS rag_vector_distance_limit          NUMERIC(4,3) DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS rag_num_candidates_enabled         BOOLEAN      DEFAULT false,
    ADD COLUMN IF NOT EXISTS rag_num_candidates                 INTEGER      DEFAULT 100,
    ADD COLUMN IF NOT EXISTS rag_query_rewrite_enabled          BOOLEAN      DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agent_versions
-- Missing: traffic_split_pct, is_live (A/B testing)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agent_versions
    ADD COLUMN IF NOT EXISTS traffic_split_pct  INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS is_live            BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- TABLE: conversations
-- Missing: ElevenLabs-parity, operational, evaluation,
--          latency fields, plus code-required extras
-- ─────────────────────────────────────────────────────────────
ALTER TABLE conversations
    -- ElevenLabs parity
    ADD COLUMN IF NOT EXISTS call_cost_credits          INTEGER,
    ADD COLUMN IF NOT EXISTS llm_credits                INTEGER,

    -- Operational
    ADD COLUMN IF NOT EXISTS environment                VARCHAR(20) DEFAULT 'production',
    ADD COLUMN IF NOT EXISTS how_call_ended             VARCHAR(50),
    ADD COLUMN IF NOT EXISTS user_id                    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS branch_id                  UUID REFERENCES agent_versions(version_id) ON DELETE SET NULL,

    -- Latency
    ADD COLUMN IF NOT EXISTS tts_latency_ms_avg         INTEGER,
    ADD COLUMN IF NOT EXISTS asr_latency_ms_avg         INTEGER,

    -- Evaluation / data collection
    ADD COLUMN IF NOT EXISTS turn_count                 INTEGER,
    ADD COLUMN IF NOT EXISTS call_successful            BOOLEAN,
    ADD COLUMN IF NOT EXISTS evaluation_results         JSONB,
    ADD COLUMN IF NOT EXISTS data_collection_results    JSONB,

    -- Required by main.py session_end + kafka_consumers.py MISMetricsConsumer
    ADD COLUMN IF NOT EXISTS handle_time_s              INTEGER,
    ADD COLUMN IF NOT EXISTS llm_cost_usd               NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS llm_turns                  INTEGER;

-- ─────────────────────────────────────────────────────────────
-- TABLE: widget_configs
-- Missing: expanded_behavior, avatar_type, include_www_variants, allow_http_links
-- ─────────────────────────────────────────────────────────────
ALTER TABLE widget_configs
    ADD COLUMN IF NOT EXISTS expanded_behavior      VARCHAR(20)  DEFAULT 'starts_expanded',
    ADD COLUMN IF NOT EXISTS avatar_type            VARCHAR(10)  DEFAULT 'orb',
    ADD COLUMN IF NOT EXISTS include_www_variants   BOOLEAN      DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_http_links       BOOLEAN      DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- TABLE: auth_policies
-- Missing: conversation_initiation_webhook_url, post_call_webhook_url, allowed_overrides
-- ─────────────────────────────────────────────────────────────
ALTER TABLE auth_policies
    ADD COLUMN IF NOT EXISTS conversation_initiation_webhook_url    TEXT,
    ADD COLUMN IF NOT EXISTS post_call_webhook_url                  TEXT,
    ADD COLUMN IF NOT EXISTS allowed_overrides                      TEXT[] DEFAULT '{}';

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- Verification queries (run separately after migration)
-- ─────────────────────────────────────────────────────────────
-- \d agents
-- \d agent_configs
-- \d agent_versions
-- \d conversations
-- \d widget_configs
-- \d auth_policies
