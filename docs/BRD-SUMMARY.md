# BRD-SUMMARY.md — TRUSTNOW Autonomous AI Stack
## Reference: BRD-1 v1.1 — Unified Baseline (March 2026)

---

## WHAT WE ARE BUILDING

TRUSTNOW is a fully enterprise-grade, multi-tenant Autonomous AI Worker Stack targeting BPO organisations and Contact Centre Service Providers. The platform enables deployment of AI-powered agents and workers handling customer interactions across voice (primary) and chat (secondary) channels with a human-like experience. It is vendor-neutral, partition-flexible (cloud and on-premise AI engines selectable per agent), and non-disruptive to existing client contact centre infrastructure.

**Three agent types (all co-exist from day one):**
1. Conversational AI Agents — voice/chat, no tool execution
2. Tools-Assisted AI Agent Orchestration — conversational + external API/webhook tool execution
3. Fully Autonomous AI Workers — hierarchical Master + SME Worker teams, multi-domain resolution

---

## FIVE-LAYER ARCHITECTURE

| Layer | Name | Summary |
|-------|------|---------|
| Layer 1 | Platform Core Foundation — "The Brain" | STT → LLM → TTS pipeline; Partition A (Cloud) + Partition B (On-Prem); LiteLLM abstraction; Voice Library |
| Layer 2 | Agent Fabric Layer | Control plane: agent config, skills, routing, queues, treatment policies, multi-language |
| Layer 3 | AI Worker Stack | Conversational Agents / Tools-Assisted Agents / Fully Autonomous Workers |
| Layer 4 | Integration Layer | PSTN, SIP, Avaya, Cisco, Genesys, webhook/API framework, dual human handoff |
| Layer 5 | CX OS — Operations, Management & Governance | Multi-tenancy, RBAC, Agent Config Module, Human Agent Desktop, MIS, Recording/QM |

---

## LOCKED TECHNOLOGY STACK

### Frontend
- Framework: Next.js 14+ (App Router)
- Language: TypeScript (strict)
- UI: shadcn/ui + Radix UI
- Styling: Tailwind CSS
- State: Zustand + TanStack Query
- Real-time: Socket.io client
- Voice/WebRTC: LiveKit JS SDK
- Charts: Recharts + Tremor

### Backend — Platform API
- Framework: NestJS (Node.js + TypeScript)
- API Style: REST + GraphQL (hybrid)
- Auth/IAM: Keycloak (self-hosted, realm-per-tenant) — LOCKED
- Multi-tenancy: PostgreSQL Row-Level Security (RLS) — LOCKED

### Backend — AI Pipeline
- Framework: Python + FastAPI
- LLM Abstraction: LiteLLM (self-hosted proxy) — LOCKED — DO NOT CHANGE
- STT Cloud: Deepgram (primary)
- TTS Cloud: ElevenLabs (primary)
- STT On-Prem: FasterWhisper
- LLM On-Prem: Ollama
- TTS On-Prem: Piper
- RAG Orchestration: LlamaIndex — LOCKED — DO NOT CHANGE
- Vector DB: Qdrant (self-hosted, PRIMARY) — LOCKED — pgvector is lightweight fallback only

### Data Layer
- Primary DB: PostgreSQL 16 (ACID, RLS, JSONB)
- Cache/Session: Redis Stack
- Message Broker: Apache Kafka
- Search/Logging: Elasticsearch + Kibana
- Time-Series/Metrics: TimescaleDB

### Telephony
- Media Server/SIP: FreeSWITCH
- WebRTC SFU: LiveKit (self-hosted)
- Recording Storage: MinIO (on-prem) / AWS S3 (cloud)

### Infrastructure
- Containers: Docker
- Orchestration: Kubernetes (K8s) + Helm
- API Gateway: Kong Gateway (OSS)
- CI/CD: GitHub Actions + ArgoCD
- Secrets: HashiCorp Vault — LOCKED
- Observability: Prometheus + Grafana + Loki + OpenTelemetry

---

## NON-NEGOTIABLE PLATFORM PRINCIPLES

1. **Enterprise-grade from day one** — no demo milestone, no prototype phase
2. **Multi-tenant, governed, audit-ready** — PostgreSQL RLS, Keycloak realm-per-tenant, immutable audit trail
3. **Per-agent partition selection** — each agent independently selects Cloud Brain or On-Prem Brain
4. **Dual Voice Library** — Global (platform-managed) + Tenant-Private (custom voices per tenant)
5. **KB/RAG for all agent types** — LlamaIndex + Qdrant, from day one
6. **Dual human handoff** — Option A (PBX/CCaaS integration) + Option B (internal TRUSTNOW Agent Console)
7. **Configurable Auth Policy Engine** — OTP, biometrics, ANI, PIN, KBA, SSO, webhook — P0
8. **Payment gating** — generic webhook/API to client payment systems — P0
9. **Transparent cost display** — LLM latency + cost/min shown in agent UI, per-call cost tracked via LiteLLM

---

## CONCURRENT SESSION ARCHITECTURE (BRD-CC-001 to CC-010)

**Critical requirement:** Every conversation = unique Conversation ID (CID, UUID v4), fully isolated state, independent tracking end-to-end. Same AI Agent must handle N simultaneous calls where N is infrastructure-limited only.

**CID propagation:** FreeSWITCH channel → LiveKit Room → Redis key → Kafka partition key → PostgreSQL record → LLM API metadata → STT/TTS session → recording filename → audit log → OpenTelemetry trace

**Key requirements:**
- BRD-CC-001: CID assigned at session initiation (call answer / WebSocket open) — immutable
- BRD-CC-002: Single agent handles N concurrent conversations — horizontally scalable
- BRD-CC-003: Per-session isolated state (message history, LLM context, STT stream, TTS channel, tool state, cost accumulator)
- BRD-CC-004: CID propagated through every system component
- BRD-CC-005: Real-time live concurrent session count (global, per tenant, per agent) from Redis
- BRD-CC-006: Session failure isolation — one session error cannot affect others
- BRD-CC-007: Search/filter conversations by CID — full session record
- BRD-CC-008: CID travels with human handoff (SIP UUI header)
- BRD-CC-009: All MIS aggregations computable from CID-level records
- BRD-CC-010: Kubernetes HPA auto-scales AI pipeline pods on concurrent session load

---

## KEY REQUIREMENT IDs (REQUIREMENTS LEDGER REFERENCE)

| ID | Module | Capability | Priority |
|----|--------|-----------|---------|
| BRD-L1-005 | L1 Brain | LiteLLM self-hosted proxy — LOCKED | P0 |
| BRD-L1-009 | L1 Partition | Per-agent partition selection (Cloud/On-Prem) | P0 |
| BRD-L1-010 | L1 Voice | Global Voice Library | P0 |
| BRD-L1-011 | L1 Voice | Tenant-private Voice Library | P0 |
| BRD-L2-001 | L2 Fabric | Agent configuration management | P0 |
| BRD-L3-CA-004 | L3 Conv | KB/RAG attachment (PDF/DOCX/TXT/CSV/URL) | P0 |
| BRD-L3-TA-002 | L3 Tools | Tool execution engine (Webhook/Client/Integration/MCP) | P0 |
| BRD-L3-AW-005 | L3 Autonomous | Auth Policy Engine | P0 |
| BRD-L3-AW-020 | L3 Autonomous | Payment gating via webhook/API | P0 |
| BRD-L4-004 | L4 Integration | Human handoff — Integration-Layer (Option A) | P0 |
| BRD-L4-005 | L4 Integration | Human handoff — Internal Console (Option B) | P0 |
| BRD-L5-MT-003 | L5 Multi-tenancy | Strict data isolation (PostgreSQL RLS) | P0 |
| BRD-L5-RB-003 | L5 RBAC | Policy-driven governance (Keycloak realm-per-tenant) | P0 |
| BRD-L5-RB-004 | L5 RBAC | Immutable audit trail | P0 |
| BRD-L5-AGM-008 | L5 Agent Module | LLM picker with latency + cost/min | P0 |
| BRD-L5-AGM-WG-001 | L5 Widget | Embed code generation + CDN delivery | P0 |
| BRD-L5-REC-003 | L5 Recording | Quality management scoring (NICE/VERINT-comparable) | P0 |
| BRD-CC-001 | Concurrency | Unique CID per session — UUID v4 | P0 |
| BRD-CC-002 | Concurrency | N concurrent sessions per agent — infra-limited only | P0 |

---

## OPEN ITEMS (PENDING PRODUCT OWNER DECISIONS)

| ID | Item | Status |
|----|------|--------|
| OI-001 | Milestone and phase split definition | Pending |
| OI-006 | LLM provider scope for Core Build registry | Pending |
| OI-007 | Default Cloud STT provider (Deepgram vs alternatives) | Pending |
| OI-008 | Internal Human Agent Desktop — Core Build or phased? | Pending |
| OI-009 | Agent template library — platform-managed only or tenant-custom too? | Pending |
| OI-010 | Tenant KB size limits per pricing tier | Pending |
| OI-011 | Fully Autonomous AI Workers — detailed requirements next session | Next Session |

---

*BRD-SUMMARY.md — Generated from BRD-1 v1.1 Unified Baseline — March 2026*
*Full document: TRUSTNOW_BRD1_v1.1_Unified_Baseline.docx*
