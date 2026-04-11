# ARCH-001.md — TRUSTNOW Autonomous AI Stack
## Module Architecture Document — Modular Design & Interface Contracts
### Document ID: ARCH-001 v1.0 | March 2026
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v1.0 | March 2026 | Initial module architecture. Full decomposition of all five layers into independently deployable modules. Interface contracts, communication patterns, state classification, scaling characteristics, and isolation boundaries defined for every module. |

---

## PURPOSE & GOVERNING PRINCIPLE

This document defines the modular architecture of the TRUSTNOW Autonomous AI Worker Stack. Every module described here is:

- **Independently deployable** — can be deployed, updated, or rolled back without affecting other modules
- **Independently testable** — can be unit tested, integration tested, and load tested in isolation
- **Independently scalable** — can be scaled up or down based on its own load profile, not the platform's aggregate load
- **Loosely coupled** — communicates with other modules only through defined interface contracts (REST API, Kafka events, or Redis pub/sub) — never through shared memory or direct database access across module boundaries
- **Highly cohesive** — every module has one clear responsibility and owns its own data domain

**The fundamental rule: if you can troubleshoot, develop, or scale a module without touching another module — the boundary is correct. If you cannot — the boundary needs to move.**

This is not academic design. It is a direct consequence of the BRD requirements:
- Per-agent partition selection (BRD §4.3) requires STT, LLM, and TTS to be independent swappable modules
- Vendor neutrality (BRD §9) requires every AI provider to be behind a stable interface contract
- Concurrent session isolation (BRD-CC-001 to CC-010) requires stateless pipeline modules
- NICE/VERINT-comparable QM (BRD §8.6) requires recording and scoring to be independent of the live call path
- Multi-tenancy (BRD-L5-MT-003) requires every module to be tenant-context-aware without sharing state

---

## HOW TO READ THIS DOCUMENT

Each module entry follows this structure:

```
### Module Name
- Responsibility: what this module does and only this module does
- BRD Reference: which BRD requirements this module satisfies
- Technology: runtime / framework
- State Classification: STATELESS | STATEFUL | STATELESS (external state)
- Owns: which data entities or storage this module owns
- Exposes: API endpoints or Kafka topics this module publishes
- Consumes: APIs or Kafka topics this module subscribes to
- Communicates via: REST | Kafka | Redis pub/sub | gRPC
- Scales independently: yes/no + trigger
- Isolation test: how to test this module in complete isolation
```

---

## LAYER MAP — MODULE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 5 — CX OS                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Platform │ │  Agent   │ │  Voice   │ │   MIS /  │ │Recording │ │
│  │   API    │ │  Config  │ │ Library  │ │Reporting │ │  & QM    │ │
│  │ (NestJS) │ │  Module  │ │ Service  │ │ Service  │ │ Service  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │  Widget  │ │  Human   │ │   Auth   │                            │
│  │Publisher │ │  Agent   │ │  & IAM   │                            │
│  │ Service  │ │ Desktop  │ │ Service  │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
├─────────────────────────────────────────────────────────────────────┤
│ LAYER 4 — INTEGRATION LAYER                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │Telephony │ │  Human   │ │  Tool    │ │ Payment  │              │
│  │ Gateway  │ │ Handoff  │ │Execution │ │  Gating  │              │
│  │(FreeSW)  │ │ Service  │ │ Service  │ │ Service  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│ LAYER 3 — AI WORKER STACK                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │   Conv.  │ │  Tools   │ │  Master  │ │   SME    │              │
│  │  Agent   │ │  Agent   │ │   AI     │ │   AI     │              │
│  │ Runtime  │ │ Runtime  │ │ Worker   │ │ Workers  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│ LAYER 2 — AGENT FABRIC                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │  Agent   │ │ Routing  │ │  Queue   │                            │
│  │  Config  │ │  Engine  │ │ Manager  │                            │
│  │  Store   │ │          │ │          │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
├─────────────────────────────────────────────────────────────────────┤
│ LAYER 1 — THE BRAIN                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   CID    │ │   STT    │ │   LLM    │ │   TTS    │ │   RAG    │ │
│  │ Session  │ │ Adapter  │ │  Router  │ │ Adapter  │ │ Pipeline │ │
│  │ Service  │ │          │ │(LiteLLM) │ │          │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐                                                       │
│  │  Voice   │                                                       │
│  │ Library  │                                                       │
│  │ Store    │                                                       │
│  └──────────┘                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ CROSS-CUTTING INFRASTRUCTURE                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   CID    │ │  Kafka   │ │  Redis   │ │  Vault   │ │  Audit   │ │
│  │ Generator│ │  Event   │ │ Session  │ │ Secrets  │ │  Logger  │ │
│  │          │ │  Bus     │ │  Store   │ │ Manager  │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CROSS-CUTTING MODULES (USED BY ALL LAYERS)

These modules have no layer affiliation — every other module depends on them.

---

### CC-01: CID Generator
- **Responsibility:** Generate and register a globally unique Conversation ID (UUID v4) at the exact moment a session initiates. This is the first action in every call flow — before any AI processing begins. Propagates CID to Redis, PostgreSQL, and Kafka atomically.
- **BRD Reference:** BRD-CC-001, BRD-CC-004
- **Technology:** Python module, called synchronously at session open
- **State Classification:** STATELESS (writes to external stores only)
- **Owns:** Nothing — it writes to Redis (session store) and PostgreSQL (conversations table) but does not own them
- **Exposes:**
  - `generate_cid(agent_id, tenant_id, channel) → CID` — synchronous call
  - Publishes `call_started` event to Kafka `trustnow.conversation.events` with CID as partition key
- **Communicates via:** Direct function call (not an HTTP service — embedded in AI pipeline)
- **Scales independently:** No — embedded in AI pipeline pods (scales with them)
- **Isolation test:** Call `generate_cid()` with mock agent/tenant IDs. Verify UUID v4 format, Redis key `session:{CID}` created, PostgreSQL `conversations` row created, Kafka `call_started` event published. All three side effects must succeed atomically — if any fails, CID is not returned.

---

### CC-02: Kafka Event Bus
- **Responsibility:** Reliable, ordered, high-throughput event streaming between all modules. CID is the partition key on `trustnow.conversation.events` — guaranteeing all events for one session are processed in order.
- **BRD Reference:** BRD-CC-004, BRD-L5-RB-004, BRD-L5-MIS-001
- **Technology:** Apache Kafka 3.x + Zookeeper
- **State Classification:** STATEFUL (persistent log)
- **Topics:**
  - `trustnow.conversation.events` (12 partitions, CID = key)
  - `trustnow.audit.log` (6 partitions)
  - `trustnow.call.recordings` (6 partitions)
  - `trustnow.mis.metrics` (6 partitions)
  - `trustnow.voice.library` (3 partitions)
- **Isolation test:** Produce test events, verify consumer group receives in order, verify CID partition routing.

---

### CC-03: Redis Session Store
- **Responsibility:** Hold the live state of every active conversation session, keyed by CID. Each session key holds the complete, isolated state for one conversation: message history, current LLM context, tool call state, cost accumulator, agent config cache.
- **BRD Reference:** BRD-CC-003, BRD-CC-005
- **Technology:** Redis Stack 7.x
- **State Classification:** STATEFUL
- **Key patterns owned:**
  - `session:{CID}` — full session state, TTL = max call duration
  - `active_calls:{tenant_id}` — sorted set of active CIDs
  - `active_calls:global` — global active count
  - `agent_config:{agent_id}` — config cache, TTL 5min
  - `rate_limit:{tenant_id}:{endpoint}` — API rate counters
- **Isolation test:** SET/GET/DEL a `session:{CID}` key, verify TTL enforcement, verify no cross-key contamination.

---

### CC-04: HashiCorp Vault Secrets Manager
- **Responsibility:** Centralised secrets management. No module stores credentials in environment variables, config files, or code. All API keys, DB passwords, and tokens are retrieved from Vault at runtime.
- **BRD Reference:** §11.6, §9 Security
- **Technology:** HashiCorp Vault 1.16.x
- **Secret path convention:** `secret/trustnow/{tenant_id}/{service}/{key_name}`
- **Isolation test:** Write a test secret, retrieve it from a consuming service. Verify deleted secrets are immediately inaccessible.

---

### CC-05: Audit Logger
- **Responsibility:** Receive audit events from every module and write them to the immutable `audit_logs` PostgreSQL table (insert-only, no UPDATE or DELETE ever). Subscribed to `trustnow.audit.log` Kafka topic.
- **BRD Reference:** BRD-L5-RB-004
- **Technology:** Python Kafka consumer
- **State Classification:** STATELESS (writes to PostgreSQL)
- **Isolation test:** Publish test audit event to Kafka, verify immutable insert in `audit_logs`. Attempt UPDATE/DELETE on audit_logs — must be rejected by DB policy.

---

## LAYER 1 — THE BRAIN: MODULE DEFINITIONS

---

### L1-01: STT Adapter
- **Responsibility:** Receive raw audio from the call session and convert it to text. Route to either Deepgram (Partition A) or FasterWhisper (Partition B) based on the agent's partition setting. Present a single unified interface to the AI pipeline regardless of which provider is used underneath.
- **BRD Reference:** BRD-L1-001 (cloud), BRD-L1-006 (on-prem), §4.1.2, §4.2
- **Technology:** Python + FastAPI, Deepgram SDK (cloud), faster-whisper (on-prem)
- **State Classification:** STATELESS — processes one audio chunk per call, no session state held internally
- **Owns:** Nothing — receives audio, returns transcript text
- **Exposes:**
  - `POST /stt/transcribe` — Body: `{cid, audio_bytes, language, partition}` → Response: `{cid, transcript, language_detected, duration_ms, cost}`
- **Consumes:** Audio stream from Telephony Gateway (L4-01) or LiveKit room
- **Communicates via:** REST (called by AI pipeline turn loop)
- **Scales independently:** YES — high CPU/GPU load during peak call volume. Scale STT pods independently of LLM pods.
- **Partition routing logic:**
  ```
  if partition == "cloud":
      return deepgram_transcribe(audio, language)
  elif partition == "onprem":
      return fasterwhisper_transcribe(audio, language)
  ```
- **Isolation test:** Send a recorded WAV file to `POST /stt/transcribe` with `partition=cloud` and `partition=onprem`. Verify accurate transcript returned in both cases. Verify cost field populated for cloud, zero for on-prem.

---

### L1-02: LLM Router (LiteLLM Proxy)
- **Responsibility:** Accept LLM completion requests from the AI pipeline and route them to the correct LLM provider (any of the 10+ supported providers or local Ollama) using LiteLLM's unified interface. Track per-call cost and return it in the response. This is the LOCKED module — provider swap happens here, nowhere else.
- **BRD Reference:** BRD-L1-002 (cloud), BRD-L1-007 (on-prem), §4.4 LOCKED, BRD-L5-MIS-003
- **Technology:** LiteLLM self-hosted proxy (Docker), :4000
- **State Classification:** STATELESS — each request independent. Response streaming supported.
- **Owns:** Nothing — passes through to providers
- **Exposes:**
  - `POST /chat/completions` — OpenAI-compatible format. Body includes `model` (maps to LiteLLM model_name), `messages[]`, `stream` flag
  - `GET /models` — list all configured models with latency and cost metadata
  - `GET /health` — health check
- **Consumes:** Provider APIs (OpenAI, Anthropic, Google, Qwen, Mistral, Meta/Groq, Ollama)
- **Communicates via:** REST (called by AI pipeline turn loop)
- **Scales independently:** YES — LiteLLM proxy is CPU-light but I/O heavy (waiting on provider responses). Scale when request queue depth rises.
- **Critical design note:** The calling module MUST pass the `cid` as a metadata field so LiteLLM can tag cost records per conversation session.
- **Isolation test:** POST to `/chat/completions` with each configured model name. Verify response returned, `usage.total_tokens` populated, cost calculable via `litellm.completion_cost()`. Verify Ollama models respond from localhost.

---

### L1-03: TTS Adapter
- **Responsibility:** Convert text response to audio. Route to ElevenLabs (Partition A) or Piper (Partition B) based on agent partition. Return audio stream to be played to caller. Voice selection is passed in the request — this module does not know which agent is calling.
- **BRD Reference:** BRD-L1-003 (cloud), BRD-L1-008 (on-prem), §4.1.3, §4.2
- **Technology:** Python + FastAPI, ElevenLabs SDK (cloud), piper-tts (on-prem)
- **State Classification:** STATELESS
- **Owns:** Nothing
- **Exposes:**
  - `POST /tts/synthesise` — Body: `{cid, text, voice_id, partition, language, output_format}` → Response: audio stream (WAV/MP3)
  - `POST /tts/preview` — Body: `{voice_id, text, partition}` → Response: short audio sample (used in Voice Picker UI)
- **Communicates via:** REST (called by AI pipeline turn loop)
- **Scales independently:** YES — TTS is CPU/GPU intensive. Scale independently of LLM pods.
- **Isolation test:** POST text + voice_id to `/tts/synthesise` for both partitions. Verify audio bytes returned. Verify different voices produce distinguishably different audio.

---

### L1-04: RAG Pipeline (LlamaIndex + Qdrant)
- **Responsibility:** Two sub-functions: (a) document ingestion — chunk, embed, and store documents in Qdrant; (b) retrieval — at inference time, query Qdrant for the most relevant chunks and return them for injection into LLM prompt context. Each agent's KB is a separate Qdrant collection — complete tenant isolation.
- **BRD Reference:** BRD-L3-CA-004, BRD-L5-AGM-012 to 015, §11.3 (LlamaIndex LOCKED, Qdrant LOCKED)
- **Technology:** Python + FastAPI, LlamaIndex, Qdrant client
- **State Classification:** STATELESS (external state in Qdrant)
- **Owns:** Qdrant collections (naming: `kb_{tenant_id}_{agent_id}`)
- **Exposes:**
  - `POST /rag/ingest` — Body: `{tenant_id, agent_id, document_type, content_or_url}` → Response: `{doc_id, status, chunk_count}`. Async — returns immediately, indexes in background.
  - `GET /rag/status/{doc_id}` — polling endpoint for indexing status
  - `POST /rag/retrieve` — Body: `{tenant_id, agent_id, query, top_k}` → Response: `{chunks[], sources[]}`
  - `DELETE /rag/document/{doc_id}` — remove document and its vectors from Qdrant
- **Communicates via:** REST (ingestion called by Platform API; retrieval called by AI pipeline turn loop)
- **Scales independently:** YES — ingestion is batch/async (scale on queue depth); retrieval is synchronous real-time (scale on concurrent requests).
- **Isolation test:** Ingest a test PDF, poll until status=ready, then call retrieve with a query matching the PDF content. Verify relevant chunks returned. Verify a query to a different agent's collection returns nothing from the first agent's data (isolation test).

---

### L1-05: Voice Library Store
- **Responsibility:** Manage the global and per-tenant voice catalogues. Store voice metadata in PostgreSQL. Store voice sample audio files in MinIO. Provide voice listing and preview streaming for the Agent Configuration Module.
- **BRD Reference:** BRD-L1-010 (global), BRD-L1-011 (tenant-private), BRD-L1-012/013
- **Technology:** Python + FastAPI, MinIO client, PostgreSQL
- **State Classification:** STATELESS (external state in PostgreSQL + MinIO)
- **Owns:** PostgreSQL `voices` table, MinIO `trustnow-voice-samples` bucket
- **Exposes:**
  - `GET /voices` — Query params: `scope={global|private|all}`, `tenant_id`, `language`, `gender` → voice list with metadata
  - `POST /voices/:id/preview` — Body: `{text}` → streams audio sample via TTS Adapter
  - `POST /voices` — Upload new voice to tenant-private library
  - `DELETE /voices/:id` — Remove voice
- **Communicates via:** REST (called by Platform API and Agent Config Module)
- **Scales independently:** NO — low-traffic, scales with Platform API
- **Isolation test:** Create a global voice and a tenant-private voice. Query with `scope=global` — verify only global returned. Query with `scope=private&tenant_id=X` — verify only Tenant X's voices returned. Query as Tenant Y — verify Tenant X's private voices not visible.

---

## LAYER 2 — AGENT FABRIC: MODULE DEFINITIONS

---

### L2-01: Agent Config Store
- **Responsibility:** The single source of truth for all agent configuration. Stores and versions agent definitions including system prompt, voice, language, LLM model, partition, tools, KB docs, widget config, auth policy, and handoff policy. All reads go to cache (Redis) first, falling back to PostgreSQL.
- **BRD Reference:** BRD-L2-001, BRD-L5-AGM-001 to 011
- **Technology:** NestJS AgentsModule, PostgreSQL, Redis
- **State Classification:** STATELESS (external state in PostgreSQL + Redis cache)
- **Owns:** PostgreSQL `agents`, `agent_configs`, `agent_versions` tables. Redis `agent_config:{agent_id}` cache keys.
- **Exposes:**
  - `POST /agents` — create agent
  - `GET /agents` — list agents (tenant-scoped via RLS)
  - `GET /agents/:id` — get agent with full config
  - `PUT /agents/:id/config` — save configuration
  - `POST /agents/:id/publish` — publish agent (creates version snapshot, sets status=live)
  - `PATCH /agents/:id` — update metadata (name, status, partition)
  - `DELETE /agents/:id` — archive agent
- **Communicates via:** REST
- **Scales independently:** NO — scales with Platform API (NestJS)
- **Isolation test:** Create agent, publish, verify version snapshot created. Update config, verify previous version still accessible. Test RLS — Tenant A cannot read Tenant B's agents.

---

### L2-02: Routing Engine
- **Responsibility:** Determine which AI agent should handle an incoming interaction based on: skill matching, priority levels, time-of-day rules, queue depth, and overflow policies.
- **BRD Reference:** BRD-L2-003, BRD-L2-004, BRD-L2-005
- **Technology:** NestJS module, Redis (queue state), PostgreSQL (routing rules)
- **State Classification:** STATELESS (routing rules from DB, queue state from Redis)
- **Owns:** PostgreSQL `routing_rules`, `skills`, `skill_assignments` tables
- **Exposes:**
  - `POST /routing/resolve` — Body: `{tenant_id, interaction_type, required_skills[], priority}` → Response: `{agent_id, queue_position, estimated_wait_ms}`
- **Communicates via:** REST (called by Telephony Gateway at call arrival)
- **Scales independently:** NO — lightweight, scales with Platform API
- **Isolation test:** Define routing rules with skill requirements. Submit interactions with different skill sets. Verify correct agent selected. Verify overflow policy triggers when all agents at capacity.

---

### L2-03: Queue Manager
- **Responsibility:** Manage named interaction queues. Track queue depth, waiting interactions, overflow thresholds, and SLA timers. Publish queue state updates to Redis for real-time dashboard consumption.
- **BRD Reference:** BRD-L2-004, BRD-L5-MIS-005
- **Technology:** NestJS module, Redis (queue state), TimescaleDB (SLA metrics)
- **State Classification:** STATEFUL (queue state in Redis)
- **Owns:** Redis queue state keys, TimescaleDB SLA metrics
- **Exposes:**
  - `GET /queues` — list queues with current depth and wait times
  - `POST /queues/:id/enqueue` — add interaction to queue
  - `POST /queues/:id/dequeue` — claim next interaction
  - `GET /queues/:id/stats` — real-time stats
- **Communicates via:** REST + WebSocket (pushes queue updates to Human Agent Desktop)
- **Scales independently:** NO — scales with Platform API
- **Isolation test:** Enqueue 10 interactions, verify depth=10. Dequeue 3, verify depth=7. Trigger overflow policy, verify escalation event fired.

---

## LAYER 3 — AI WORKER STACK: MODULE DEFINITIONS

---

### L3-01: Conversational Agent Runtime
- **Responsibility:** Execute the conversational turn loop for Sub-Type 1 agents. Coordinates STT → RAG → LLM → TTS per turn. Maintains per-session state in Redis via CID. Publishes turn events to Kafka. Fires system tools (end call, detect language, transfer) when triggered.
- **BRD Reference:** BRD-L3-CA-001 to 005, §6.1, BRD-CC-001 to CC-010
- **Technology:** Python + FastAPI, async
- **State Classification:** STATELESS — all session state is in Redis keyed by CID. Pod can crash and restart without losing session state (another pod picks up from Redis).
- **Owns:** Nothing — reads/writes Redis session state via CC-03
- **Exposes:**
  - `POST /agent/turn` — Body: `{cid, audio_input_or_text, agent_id}` → Response: `{cid, audio_output, transcript, cost, tool_calls_made[]}`
  - `POST /agent/session/start` — initialise session (calls CC-01 CID Generator)
  - `POST /agent/session/end` — finalise session
- **Communicates via:** REST (called by Telephony Gateway per turn), calls L1-01 (STT), L1-02 (LLM), L1-03 (TTS), L1-04 (RAG)
- **Scales independently:** YES — this is the hottest path. Scale based on concurrent active sessions. Kubernetes HPA monitors active session count in Redis (BRD-CC-010).
- **Isolation test:** Start a session, send 3 text turns, verify coherent responses using message history. Verify Redis `session:{CID}` grows with each turn. End session, verify Redis key deleted and PostgreSQL conversation record updated.

---

### L3-02: Tools-Assisted Agent Runtime
- **Responsibility:** All capabilities of L3-01 plus tool execution. When the LLM response includes a tool_call, this module executes the tool (Webhook/Client/MCP/Integration) and injects the result back into the next LLM turn. Tool execution is transparent to the caller — no audible pause.
- **BRD Reference:** BRD-L3-TA-001 to 004, §6.2
- **Technology:** Python + FastAPI + httpx (for webhook execution)
- **State Classification:** STATELESS (tool call results injected into Redis session state)
- **Owns:** Nothing
- **Exposes:** Same as L3-01 plus:
  - `POST /tools/execute` — Body: `{cid, tool_id, tool_type, parameters}` → Response: `{result, latency_ms, error?}`
- **Communicates via:** REST (calls external webhooks based on tool config), calls all L1 modules
- **Scales independently:** YES — webhook execution can be slow (external API latency). Scale based on active tools-assisted session count.
- **Isolation test:** Configure a test webhook tool pointing to a mock HTTP server. Trigger a turn where LLM calls the tool. Verify mock server received the request, result injected into next turn's context. Verify caller experience uninterrupted.

---

### L3-03: Master AI Worker
- **Responsibility:** Orchestrate the full 10-step flow for Fully Autonomous AI Workers. Greet caller, capture intent, trigger Auth Policy, check eligibility, check dues, gate on payment, delegate tasks to SME Workers, track progress, consolidate results, deliver final response. Places caller on hold with MOH during SME processing.
- **BRD Reference:** BRD-L3-AW-001 (10 steps), §6.3.1, BRD-L3-AW-004 (caller experience)
- **Technology:** Python + FastAPI, async orchestration engine
- **State Classification:** STATELESS (orchestration state in Redis keyed by CID)
- **Owns:** Nothing — coordinates other modules
- **Exposes:**
  - `POST /master-worker/session/start` — initialise autonomous worker session
  - `POST /master-worker/turn` — process one caller turn within orchestration flow
- **Communicates via:** REST (calls L3-04 SME Workers, L4-03 Auth Policy, L4-04 Payment Gating, L4-01 Telephony for MOH)
- **Scales independently:** YES — scale with autonomous worker session count
- **Isolation test:** Step through all 10 workflow stages using mock SME Workers and mock integration responses. Verify caller placed on hold during SME processing. Verify MOH starts/stops correctly. Verify final consolidated response coherent.

---

### L3-04: SME AI Worker Pool
- **Responsibility:** Execute domain-specific tasks delegated by the Master AI Worker. Each SME domain (Billing, Provisioning, Technical Support, etc.) is a separately configurable worker with its own KB, system prompt, and tool set. Workers are stateless — any available SME pool instance can handle any domain task.
- **BRD Reference:** BRD-L3-AW-002, §6.3.2
- **Technology:** Python + FastAPI
- **State Classification:** STATELESS (receives full task context in request body)
- **Owns:** Per-domain Qdrant collections (via L1-04 RAG Pipeline)
- **Exposes:**
  - `POST /sme/execute` — Body: `{cid, domain, task_description, caller_context, available_tools[]}` → Response: `{result, confidence, tool_calls_made[], duration_ms}`
- **Communicates via:** REST (called by Master AI Worker)
- **Scales independently:** YES — high-load domains can have more replicas. Scale by domain.
- **Isolation test:** Send a test billing task to the Billing SME with a mock KB. Verify task executed using KB context. Verify result returned with structured output. Verify Billing SME cannot access Provisioning SME's KB.

---

## LAYER 4 — INTEGRATION LAYER: MODULE DEFINITIONS

---

### L4-01: Telephony Gateway (FreeSWITCH)
- **Responsibility:** Handle all inbound and outbound telephony. Bridge PSTN/SIP calls to the AI pipeline. Manage call recording. Handle Music on Hold. Pass CID in SIP UUI header on transfers. Expose ESL (Event Socket Layer) for the Platform API to subscribe to call events.
- **BRD Reference:** BRD-L4-001, §11.4, BRD §6.3.5 (MOH), BRD-CC-008 (CID in SIP UUI)
- **Technology:** FreeSWITCH 1.10.x + LiveKit for WebRTC
- **State Classification:** STATEFUL (active call channels)
- **Owns:** Active SIP channels, RTP media streams, recording files (temporary, before MinIO upload)
- **Exposes (via ESL events):**
  - `CHANNEL_ANSWER` → triggers CID generation (CC-01)
  - `CHANNEL_HANGUP` → triggers session end
  - `CHANNEL_BRIDGE` → triggers handoff recording
- **API consumed by Platform:**
  - `transfer(channel_uuid, destination, cid_uui)` — transfer call with CID in UUI
  - `play_moh(channel_uuid, music_file)` — play hold music
  - `start_recording(channel_uuid, cid)` — start recording, file named by CID
  - `stop_recording(channel_uuid)` — stop and upload
- **Communicates via:** ESL (Event Socket Layer), custom protocol
- **Scales independently:** YES — FreeSWITCH cluster for high call volumes. Add nodes when concurrent channel count exceeds threshold.
- **Isolation test:** Place a test call via SIP soft-phone. Verify CHANNEL_ANSWER event fires. Verify CID generated and session started. Verify recording file named `{CID}.wav`. Verify CHANNEL_HANGUP triggers session end.

---

### L4-02: Human Handoff Service
- **Responsibility:** Execute the dual-protocol human handoff. For Option A (Integration-Layer): issue FreeSWITCH SIP transfer with CID in UUI header. For Option B (Internal Console): push caller to internal queue, notify Human Agent Desktop via WebSocket, deliver full conversation context including CID and transcript.
- **BRD Reference:** BRD-L4-004 (Option A), BRD-L4-005 (Option B), BRD-L4-006 (trigger conditions), BRD-CC-008
- **Technology:** NestJS module, WebSocket, Redis (internal queue)
- **State Classification:** STATELESS (handoff is a transition event, not persistent state)
- **Owns:** Nothing — orchestrates Telephony Gateway and Human Agent Desktop
- **Exposes:**
  - `POST /handoff/execute` — Body: `{cid, handoff_type (A|B), target, transcript, context}` → Response: `{status, queue_position?}`
- **Communicates via:** REST (called by any agent runtime when handoff triggered)
- **Scales independently:** NO — lightweight, scales with Platform API
- **Isolation test:** Trigger Option A handoff — verify SIP transfer issued with correct CID in UUI. Trigger Option B handoff — verify queue entry created, WebSocket push to agent desktop, full context payload delivered.

---

### L4-03: Auth Policy Engine
- **Responsibility:** Execute the configured authentication flow for a specific agent. Receives caller context, applies the configured sequence of auth methods (OTP, biometrics, ANI, PIN, KBA, SSO, webhook), and returns an authenticated/rejected decision with the authenticated identity.
- **BRD Reference:** BRD-L3-AW-005, §6.3.3 — P0 REQUIRED
- **Technology:** Python + FastAPI, integrates with SMS provider (OTP), voice biometrics provider, webhook client
- **State Classification:** STATELESS (auth state held in Redis session during multi-step auth only)
- **Owns:** Nothing — reads auth policy from Agent Config Store, executes methods
- **Exposes:**
  - `POST /auth/initiate` — Body: `{cid, agent_id, tenant_id, caller_ani}` → Response: `{auth_session_id, next_step, prompt_text}`
  - `POST /auth/verify` — Body: `{auth_session_id, method, input}` → Response: `{status (authenticated|rejected|next_step), identity?, next_step?}`
- **Communicates via:** REST (called by Master AI Worker at Step 3)
- **Scales independently:** YES — auth can be slow (OTP wait, biometrics processing). Scale independently.
- **Isolation test:** Configure OTP-only policy. Initiate auth, verify OTP SMS sent. Submit correct OTP, verify authenticated. Submit wrong OTP, verify rejected. Test ANI lookup — known ANI returns identity without OTP.

---

### L4-04: Payment Gating Service
- **Responsibility:** When the Master AI Worker detects outstanding dues, this service triggers the client's payment system via generic webhook/API. Dispatches payment link to caller, monitors for completion webhook callback, and signals the Master Worker to proceed or timeout.
- **BRD Reference:** BRD-L3-AW-020, §6.3.4 — P0 REQUIRED
- **Technology:** Python + FastAPI, webhook client, Redis (pending payment state)
- **State Classification:** STATEFUL (payment session state in Redis keyed by CID, TTL = payment timeout)
- **Owns:** Redis `payment_session:{CID}` keys
- **Exposes:**
  - `POST /payment/initiate` — Body: `{cid, tenant_id, amount, caller_id, delivery_method (sms|email|voice)}` → Response: `{payment_session_id, link, status}`
  - `POST /payment/webhook` — inbound callback from client payment system → updates Redis `payment_session:{CID}` → publishes `payment_completed` event to Kafka
  - `GET /payment/status/{cid}` — Master Worker polls this to check completion
- **Communicates via:** REST (called by Master Worker; receives callback from external payment system)
- **Scales independently:** NO — low frequency events, scales with Platform API
- **Isolation test:** Initiate payment session, verify Redis state created. POST a mock payment completion webhook, verify Redis state updated. Verify Master Worker polling detects completion. Test timeout — verify timeout event fires after configured period.

---

### L4-05: Tool Execution Service
- **Responsibility:** Execute individual custom tools (Webhook, Client-side, Integration connectors, MCP) on behalf of Tools-Assisted and Autonomous agents. Handles auth (API key / Bearer / OAuth2), timeout, retry with backoff, and result parsing.
- **BRD Reference:** BRD-L3-TA-002, §6.2
- **Technology:** Python + FastAPI + httpx
- **State Classification:** STATELESS
- **Owns:** Nothing — reads tool config from Agent Config Store
- **Exposes:**
  - `POST /tools/execute` — Body: `{cid, tool_id, input_params}` → Response: `{result, latency_ms, http_status, error?}`
- **Communicates via:** REST (called by Tools Agent Runtime and SME Workers)
- **Scales independently:** YES — external API latency can cause queue buildup. Scale on active webhook call count.
- **Isolation test:** Configure a test webhook tool with a mock server. Execute it. Verify request headers (auth), body template rendered with variables, response parsed and returned. Test timeout — verify timeout fires and error returned cleanly without hanging.

---

## LAYER 5 — CX OS: MODULE DEFINITIONS

---

### L5-01: Platform API (NestJS)
- **Responsibility:** The central HTTP control plane. Exposes all REST and GraphQL APIs consumed by the frontend. Enforces authentication (Keycloak JWT validation), RBAC (role-based guards), tenant context injection (sets `app.current_tenant` for PostgreSQL RLS), and rate limiting (via Kong Gateway). Coordinates all Layer 2, Layer 5 modules. Does NOT execute AI processing — it configures and monitors.
- **BRD Reference:** §11.2, BRD-L5-RB-001, BRD-L5-MT-003
- **Technology:** NestJS (Node.js + TypeScript)
- **State Classification:** STATELESS
- **Owns:** Nothing — routes to other modules
- **Exposes:** All REST endpoints documented in FULL-SCOPE-IMPL-001.md §Task 6
- **Communicates via:** REST (incoming from frontend via Kong), REST (outgoing to Layer 1-4 modules)
- **Scales independently:** YES — scale on request rate (behind Kong load balancer)
- **Isolation test:** Mock all downstream modules. Test each endpoint returns correct HTTP status, respects RBAC (403 for wrong role), enforces tenant isolation (RLS rejects cross-tenant queries).

---

### L5-02: Agent Configuration Module (Frontend)
- **Responsibility:** The UI surface for creating, configuring, and publishing AI Agents. 10-tab interface in Next.js. Calls Platform API exclusively — no direct calls to backend services. Renders live Voice Picker, LLM Picker with latency/cost, Language selector, Knowledge Base management, Tools panel, Widget configurator, Security/Auth policy UI.
- **BRD Reference:** BRD-L5-AGM-001 to 020, §8.3
- **Technology:** Next.js 14+ App Router, TypeScript, shadcn/ui, Tailwind CSS, Zustand, TanStack Query
- **State Classification:** STATELESS (all persistence via Platform API)
- **Exposes:** UI only — no server-side endpoints
- **Communicates via:** REST (calls Platform API via Kong)
- **Scales independently:** NO — static Next.js assets served from Nginx CDN. Scales with traffic automatically.
- **Isolation test:** Mock Platform API with MSW (Mock Service Worker). Navigate all 10 tabs, verify each loads and saves correctly. Verify Voice Picker renders voices, LLM Picker shows latency+cost per model. Verify widget live preview updates as settings change.

---

### L5-03: Widget Publisher Service + Widget CDN Bundle

**Two components — both part of the same build task (Task 8):**

**Component A — Widget Publisher Service (NestJS WidgetModule):**
- **Responsibility:** Store widget configuration per agent. Generate embed code. Handle feedback collection (1-5 star CSAT + comment). Generate and return shareable page URLs. Handle avatar image uploads.
- **BRD Reference:** BRD-L5-AGM-WG-001 to WG-009, §8.3.4
- **Technology:** NestJS WidgetModule (config storage), MinIO (avatar image storage)
- **State Classification:** STATELESS (config in PostgreSQL, avatars in MinIO)
- **Owns:** PostgreSQL `widget_configs` table, MinIO `trustnow-widget-assets` bucket
- **Exposes:**
  - `GET /agents/:id/widget` — return widget config (for UI)
  - `PUT /agents/:id/widget` — save widget config (all fields, upsert)
  - `POST /agents/:id/widget/avatar` — upload avatar image → store in MinIO → return CDN URL
  - `GET /agents/:id/widget/embed` — return embed code snippet (2-line HTML)
  - `GET /agents/:id/widget/shareable-url` — return public shareable page URL
  - `POST /widget/feedback` — receive post-call CSAT feedback from caller's browser
- **Communicates via:** REST
- **Scales independently:** NO — scales with Platform API

**Component B — Widget CDN Bundle (client-side Web Component):**
- **Responsibility:** Deliver the `<trustnow-agent>` Web Component JavaScript bundle to client websites. This is a **separate build artifact** from the main React platform frontend — it is a vanilla JS Web Component published to a CDN.
- **Architecture position:** Layer 5 (CX OS) — client-facing delivery. Loaded directly into BPO client websites, NOT the TRUSTNOW platform UI.
- **Technology:** Vite/Rollup bundle → single-file Web Component (`embed.js`) → CloudFront + S3 CDN
- **Embed code (confirmed live §3.2):**
  ```html
  <trustnow-agent agent-id="[AGENT_ID]"></trustnow-agent>
  <script src="https://cdn.trustnow.ai/widget/embed.js" async type="text/javascript"></script>
  ```
- **CDN URL:** `https://cdn.trustnow.ai/widget/embed.js`
- **Versioned URL:** `https://cdn.trustnow.ai/widget/embed@v1.x.x.js` (version pinning for enterprise clients)
- **State Classification:** STATELESS — widget loads config via `GET /agents/:id/widget` at runtime using the `agent-id` attribute
- **Owns:** S3 `trustnow-widget-cdn` bucket, CloudFront distribution
- **Build requirements:**
  - No `eval()` — strict Content Security Policy (CSP) compliant
  - CORS: `Access-Control-Allow-Origin: *` (must load on any client domain)
  - Single file bundle — no dynamic imports (for CSP compatibility)
  - Semantic versioning + CHANGELOG maintained
  - Bundle size target: < 50KB gzipped
- **Widget runtime data flow:**
  ```
  Client website loads embed.js from cdn.trustnow.ai
      ↓
  <trustnow-agent agent-id="X"> renders Web Component in Shadow DOM
      ↓
  Widget JS calls GET https://app.trustnow.ai/agents/X/widget (CORS-enabled)
      ↓
  Loads widget_configs (colors, text, avatar, toggles)
      ↓
  User clicks → widget initiates WebRTC or WebSocket call to Platform API
      ↓
  Live call: audio ↔ AI Pipeline via WebRTC/WebSocket
      ↓
  Post-call: POST /widget/feedback (CSAT rating)
  ```
- **Scales independently:** YES (CloudFront CDN scales to global traffic automatically)
- **Isolation test:** Load `embed.js` in a test HTML page. Confirm `<trustnow-agent>` renders without errors. Open DevTools — confirm no CSP violations, no eval calls. Test with an agent that has `avatar_type='orb'` and one with `avatar_type='image'`. Test feedback submission.

**EXCEED ELEVENLABS — Widget CDN additions:**
- Framework-specific embed snippets: JavaScript (raw) | React | Vue | Angular — shown as code tabs in Widget tab UI
- CSP policy strings displayed in embed section so BPO clients' IT teams can copy-paste the exact headers needed
- Version pinning UI: dropdown to select widget bundle version (latest / pinned to v1.x)

---

### L5-04: MIS & Reporting Service
- **Responsibility:** Aggregate conversation events, cost data, and performance metrics into queryable MIS reports. Consumes Kafka `trustnow.mis.metrics` topic and writes to TimescaleDB. Exposes analytics API consumed by dashboards.
- **BRD Reference:** BRD-L5-MIS-001 to MIS-006, §8.5
- **Technology:** Python Kafka consumer + TimescaleDB writer; NestJS AnalyticsModule for REST/GraphQL
- **State Classification:** STATELESS (external state in TimescaleDB)
- **Owns:** TimescaleDB `conversations` hypertable, `mis_aggregations` continuous aggregates
- **Exposes:**
  - `GET /analytics/summary` — Query: `agent_id, tenant_id, period, granularity` → KPI JSON
  - `GET /analytics/cost-breakdown` — LLM + STT + TTS cost per call, agent, tenant
  - `GET /analytics/conversations` — Rich-filter conversation list (all BRD-CC-007 filters)
  - `GET /analytics/export` — CSV/PDF export (P1)
  - GraphQL schema for flexible dashboard queries
- **Communicates via:** REST + GraphQL (consumed by frontend), Kafka (consumes events)
- **Scales independently:** YES — reporting queries can be heavy. Scale report service independently of live call path.
- **Isolation test:** Publish 100 test conversation events to Kafka. Verify TimescaleDB writer persists them. Query analytics summary, verify aggregations correct. Test date range filters, granularity (day/week/month). Verify cost calculations match LiteLLM completion_cost output.

---

### L5-05: Recording & QM Service
- **Responsibility:** Receive completed call recordings from FreeSWITCH, encrypt them, upload to MinIO, and make them searchable. Execute automated QM scoring per interaction. Manage manual QM review workflow assignment and completion tracking.
- **BRD Reference:** BRD-L5-REC-001 to REC-005, §8.6
- **Technology:** Python Kafka consumer, MinIO client, NestJS RecordingsModule
- **State Classification:** STATELESS (external state in MinIO + PostgreSQL)
- **Owns:** MinIO `trustnow-recordings` bucket, PostgreSQL `recordings` table, `qm_scores` table, `qm_reviews` table
- **Exposes:**
  - `GET /recordings` — list recordings (tenant-scoped, RBAC-gated)
  - `GET /recordings/:cid` — get recording metadata + pre-signed MinIO URL for playback
  - `POST /recordings/:cid/score` — trigger automated QM scoring
  - `POST /recordings/:cid/review` — assign to QA reviewer
  - `PUT /recordings/:cid/review/:id` — submit manual review scores and annotations
- **Communicates via:** REST, Kafka (consumes `trustnow.call.recordings`)
- **Scales independently:** YES — post-call processing can be batched. Scale recording ingestion queue workers independently.
- **Isolation test:** Upload a test WAV file as if from FreeSWITCH, verify encryption + MinIO upload. Retrieve pre-signed URL, verify audio accessible. Run automated QM scoring, verify score stored. Assign review to mock QA user, verify workflow state transitions.

---

### L5-06: Human Agent Desktop (Frontend)
- **Responsibility:** The live-agent console. Receives real-time call events and transcripts via WebSocket. Provides call controls via Platform API (which calls FreeSWITCH ESL). Displays queue panel, agent availability, supervisor monitoring tools.
- **BRD Reference:** BRD-L5-HAD-001 to HAD-006, §8.4
- **Technology:** Next.js App Router, Socket.io client (real-time), Zustand (call state)
- **State Classification:** STATELESS (all state from WebSocket + API)
- **Exposes:** UI only
- **Communicates via:** WebSocket (real-time call events), REST (call controls via Platform API)
- **Scales independently:** NO — static Next.js assets, scales with Nginx
- **Isolation test:** Mock WebSocket server emitting call events. Verify transcript updates in real time. Mock Platform API for call controls. Verify hold/mute/transfer buttons trigger correct API calls. Verify CID displayed throughout session.

---

### L5-07: Auth & IAM Service
- **Responsibility:** Integrate with Keycloak for all authentication and authorisation. Validate JWTs, extract `tenant_id` + role claims, inject tenant context for PostgreSQL RLS. Manage Keycloak realm lifecycle (create realm on tenant onboarding, destroy on offboarding).
- **BRD Reference:** BRD-L5-RB-001 to RB-004, §11.2
- **Technology:** NestJS AuthModule, Keycloak Admin Client, passport-jwt
- **State Classification:** STATELESS
- **Owns:** Nothing (Keycloak owns auth data)
- **Exposes:**
  - `POST /auth/token` → exchanges credentials for JWT via Keycloak
  - `POST /auth/refresh` → refresh JWT
  - `GET /auth/me` → current user info from JWT
  - Internal: `verifyToken(jwt)` → extracts tenant_id + role → injects into request context
- **Communicates via:** REST
- **Scales independently:** NO — lightweight token validation, scales with Platform API
- **Isolation test:** Issue JWT for Tenant A user with `agent_admin` role. Verify agent endpoints accessible. Verify tenant_id injected correctly for RLS. Verify Tenant B endpoints return 403. Verify expired JWT rejected.

---

## MODULE COMMUNICATION PATTERNS

### Pattern 1: Synchronous REST (request-response)
Used when: the caller needs an immediate response to continue processing.

```
Frontend → [Kong Gateway] → Platform API → Module → Response
AI Pipeline turn → STT Adapter → Transcript
AI Pipeline turn → LLM Router → Completion
AI Pipeline turn → TTS Adapter → Audio
AI Pipeline turn → RAG Pipeline → Chunks
Master Worker → SME Worker → Task Result
Master Worker → Auth Policy Engine → Auth Decision
Master Worker → Payment Service → Payment Status
```

**Rule:** Synchronous calls must have timeouts configured. No synchronous call should block indefinitely.

---

### Pattern 2: Kafka Event (async fire-and-forget)
Used when: the sender does not need to wait for processing. Processing can happen at different speed. Multiple consumers may process the same event.

```
CID Generator → [trustnow.conversation.events] → MIS Writer, Audit Logger, Recording Trigger
Conversation turn ends → [trustnow.conversation.events] → MIS Writer
Call ends → [trustnow.call.recordings] → Recording Service
Config change → [trustnow.audit.log] → Audit Logger
```

**Rule:** Producers never block waiting for consumer confirmation. CID is always the partition key on conversation events.

---

### Pattern 3: Redis Pub/Sub (real-time push)
Used when: low-latency push to connected UI clients is needed.

```
Incoming call → Redis PUBLISH → Human Agent Desktop (subscribed)
Queue depth change → Redis PUBLISH → Supervisor Dashboard (subscribed)
Transcript update → Redis PUBLISH → Widget transcript display (subscribed)
```

**Rule:** Redis pub/sub is for real-time UI updates only. Not for data persistence — Kafka handles persistence.

---

### Pattern 4: Redis Direct Read (cache)
Used when: a module needs to read data that is hot (read many times) and tolerates slight staleness.

```
Any module → GET session:{CID} → current session state
AI Pipeline → GET agent_config:{agent_id} → agent configuration (5min TTL)
Kong Plugin → GET rate_limit:{tenant_id}:{endpoint} → rate counter
```

**Rule:** Cache keys have TTLs. Never use Redis cache as primary source of truth — PostgreSQL is always the source of truth.

---

## STATELESS vs STATEFUL CLASSIFICATION

| Module | Classification | State Location |
|--------|---------------|----------------|
| CID Generator | STATELESS | Writes to Redis + DB, holds nothing |
| STT Adapter | STATELESS | Processes audio, returns text |
| LLM Router | STATELESS | Passes through to providers |
| TTS Adapter | STATELESS | Converts text to audio |
| RAG Pipeline | STATELESS | External state in Qdrant |
| Voice Library Store | STATELESS | PostgreSQL + MinIO |
| Agent Config Store | STATELESS | PostgreSQL + Redis cache |
| Routing Engine | STATELESS | Rules from DB, queue state from Redis |
| Queue Manager | STATEFUL | Queue state in Redis |
| Conversational Agent Runtime | STATELESS | Session state in Redis by CID |
| Tools-Assisted Agent Runtime | STATELESS | Session state in Redis by CID |
| Master AI Worker | STATELESS | Orchestration state in Redis by CID |
| SME AI Worker Pool | STATELESS | Receives full context in request |
| Telephony Gateway | STATEFUL | Active SIP channels |
| Human Handoff Service | STATELESS | Transition event only |
| Auth Policy Engine | STATELESS | Transient Redis state during multi-step auth |
| Payment Gating Service | STATEFUL | Payment session in Redis by CID |
| Tool Execution Service | STATELESS | Executes and returns |
| Platform API | STATELESS | Routes to other modules |
| Agent Config Module (UI) | STATELESS | All state via Platform API |
| Widget Publisher Service | STATELESS | Config in PostgreSQL |
| MIS & Reporting Service | STATELESS | TimescaleDB |
| Recording & QM Service | STATELESS | PostgreSQL + MinIO |
| Human Agent Desktop (UI) | STATELESS | WebSocket + API |
| Auth & IAM Service | STATELESS | Keycloak + JWT |

**Key insight:** The majority of modules are STATELESS by design. This is intentional and critical. Stateless pods can:
- Crash and restart without data loss (state is in Redis/DB)
- Be scaled up or down without coordination
- Be deployed in any Kubernetes pod without sticky sessions
- Be independently tested without persistent state setup

---

## INDEPENDENT SCALING MATRIX

| Module | Scale Trigger | Scale Unit | Scale Direction |
|--------|--------------|------------|----------------|
| STT Adapter | Concurrent STT requests | Pod | Horizontal |
| LLM Router (LiteLLM) | Request queue depth | Pod | Horizontal |
| TTS Adapter | Concurrent TTS requests | Pod | Horizontal |
| RAG Pipeline | Ingestion queue + retrieval requests | Pod | Horizontal |
| Conversational Agent Runtime | Active session count in Redis | Pod | Horizontal |
| Tools-Assisted Agent Runtime | Active session + webhook call count | Pod | Horizontal |
| Master AI Worker | Active autonomous session count | Pod | Horizontal |
| SME AI Worker Pool | Active SME task queue depth | Pod per domain | Horizontal |
| Telephony Gateway (FreeSWITCH) | Concurrent channel count | Node | Horizontal cluster |
| Tool Execution Service | Active webhook call count | Pod | Horizontal |
| MIS & Reporting Service | Report query load | Pod | Horizontal |
| Recording & QM Service | Recording ingestion queue | Pod | Horizontal |
| Platform API (NestJS) | HTTP request rate | Pod | Horizontal |

**Kubernetes HPA configuration required for all rows above.**
**BRD-CC-010:** AI pipeline pods specifically must scale before session quality is impacted — set scale-up threshold at 70% of target concurrent sessions per pod.

---

## MODULE DEVELOPMENT & TESTING ISOLATION PROTOCOL

The following protocol must be followed when developing or troubleshooting any individual module:

### Step 1 — Identify the module boundary
Refer to the module definition above. Know exactly:
- What inputs this module accepts
- What outputs it produces
- What external dependencies it has (which other modules it calls)

### Step 2 — Mock all external dependencies
Never test a module by hitting production services. Use:
- `MockRedis` or `fakeredis` for Redis
- Mock HTTP server (httpretty / pytest-mock) for external API calls
- Kafka mock (kafka-python mock) for event publishing
- Mock PostgreSQL (or test DB with clean schema) for DB operations

### Step 3 — Test the module contract
Test that the module:
- Accepts valid inputs and returns correct outputs
- Handles errors gracefully (provider down, timeout, invalid input)
- Does NOT leak data between tenants (send requests for Tenant A and Tenant B in sequence — verify no cross-contamination)
- Does NOT hold state between requests (stateless modules must pass this)

### Step 4 — Integration test the boundary
Test the module with its real direct dependencies (not the full stack):
- STT Adapter → test with a real Deepgram API call (not full call pipeline)
- RAG Pipeline → test ingestion + retrieval with real Qdrant (not full agent session)
- Tool Execution → test with a real mock webhook server (not full agent runtime)

### Step 5 — Document findings in RUNBOOK.md
If a bug was found and fixed, or a module was extended, document it:
- Which module
- What the issue was
- What was changed
- How to verify the fix

---

## CRITICAL DESIGN RULES — NON-NEGOTIABLE

1. **No module reads another module's database table directly.** The only exception is Platform API reading its own modules' tables. All cross-module data access is via the defined REST interface.

2. **No module shares a Redis key namespace with another module.** Every module has its own key prefix (`session:`, `agent_config:`, `active_calls:`, `rate_limit:`, `payment_session:`).

3. **CID is propagated to every module, every log line, every database record, every Kafka event.** If a module does not receive the CID in its request, it must reject the request.

4. **No hardcoded credentials anywhere.** Every secret retrieved from Vault at runtime.

5. **Every module exposes a `/health` endpoint.** Kubernetes liveness and readiness probes depend on this.

6. **Every module logs with structured JSON including `cid`, `tenant_id`, `module_name`, `timestamp`.** This makes cross-module debugging via a single CID query possible.

7. **Stateless modules must pass the "crash test"** — kill the pod mid-request, restart it, verify the next request succeeds cleanly using state recovered from Redis/DB.

8. **LiteLLM, LlamaIndex, and Qdrant are LOCKED decisions.** No module implements its own LLM call, its own vector search, or its own document chunking. All such operations go through L1-02, L1-04 respectively.

9. **RLS is enforced at the database level, not the application level.** Application-level tenant filtering is a safety net only, not the primary control.

10. **Hold music (MOH) during AI processing is a non-negotiable caller experience requirement** (BRD §6.3.5). The Telephony Gateway must activate MOH the moment the Master Worker begins SME delegation. No audible silence.

---

## ARCH-001 — WHAT TO BUILD NEXT (TASK SEQUENCING BY MODULE)

Reading this document alongside FULL-SCOPE-IMPL-001.md, the correct build sequence ensures foundational modules are ready before dependent modules:

```
[Infrastructure Complete — Tasks 1 + 2A + 2B]
         ↓
Task 3: TLS + K8s + CI/CD
         ↓
Task 4: CC-01 CID Generator + CC-02 Kafka producers/consumers + PostgreSQL schema
         ↓
Task 5: L1-01 STT Adapter + L1-02 LLM Router verify + L1-03 TTS Adapter + L1-04 RAG Pipeline + L1-05 Voice Library
         ↓
Task 6: L5-07 Auth+IAM + L5-01 Platform API (all modules) + L2-01 Agent Config Store + L2-02 Routing Engine + L2-03 Queue Manager
         ↓
Task 7: L4-01 Telephony Gateway (FreeSWITCH+LiveKit) + L4-02 Human Handoff Service
         ↓
Task 8: L5-02 Agent Config Module (UI) + L5-03 Widget Publisher
         ↓
Task 9: L3-01 Conversational Agent Runtime (first end-to-end call)
         ↓
Task 10: L4-05 Tool Execution Service + L3-02 Tools-Assisted Agent Runtime
         ↓
Task 11: L4-03 Auth Policy Engine + L4-04 Payment Gating + L3-03 Master AI Worker + L3-04 SME Worker Pool
         ↓
Task 12: L5-06 Human Agent Desktop
         ↓
Task 13: L5-04 MIS & Reporting Service
         ↓
Task 14: L5-05 Recording & QM Service
         ↓
Task 15: Landing Page + complete frontend build
         ↓
Task 16: End-to-End Integration Testing
```

Each arrow represents a dependency — the upstream module must be working before the downstream one can be built and tested.

---

*ARCH-001.md v1.0 — Module Architecture Document — March 2026*
*TRUSTNOW CONFIDENTIAL*
*Cross-reference: FULL-SCOPE-BRD.md (requirements), FULL-SCOPE-IMPL-001.md (implementation steps)*
