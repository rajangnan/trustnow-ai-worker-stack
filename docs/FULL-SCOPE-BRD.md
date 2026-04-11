# FULL-SCOPE-BRD.md — TRUSTNOW Autonomous AI Stack
## BRD-1 v1.1 — Complete Reference for Platform Engineer
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## DOCUMENT CONTROL

| Field | Value |
|-------|-------|
| Document Title | TRUSTNOW Autonomous AI Stack — Business Requirements Document |
| Document ID | BRD-1 |
| Version | 1.1 (Unified Baseline — includes Agent Module) |
| Status | Requirements Intake — Approved for Build Planning |
| Organisation | TRUSTNOW |
| Date | March 2026 |
| Classification | Confidential — Internal Use Only |

---

## 1. EXECUTIVE SUMMARY

TRUSTNOW is building a fully enterprise-grade, multi-tenant Autonomous AI Worker Stack targeting Business Process Outsourcing (BPO) organisations and Contact Centre Service Providers. The platform enables service providers to deploy AI-powered agents and workers that handle customer interactions across voice (primary) and chat (secondary) channels with a human-like, seamless caller experience.

The platform is designed and will be built as a single, unified, end-to-end product — NOT in incremental tiers. It encompasses three functional flavours that co-exist within the same architecture:

- **Conversational AI Agents** — voice and chat interactions without tool execution
- **Tools-Assisted AI Agent Orchestration** — conversational agents capable of executing minor automated tasks against backend systems
- **Fully Autonomous AI Workers** — a hierarchical team of AI Workers aligned to the client organisation structure, coordinated by a Master AI Worker

The platform is vendor-neutral, partition-flexible (cloud and on-premise AI engines selectable per agent), and non-disruptive to existing client contact centre infrastructure (Avaya, Cisco, Genesys, and others). Milestone and phase splits will be defined by the product owner and are not assumed in this document.

---

## 2. PLATFORM VISION & STRATEGIC OBJECTIVES

### 2.1 Vision Statement
To deliver a fully autonomous, enterprise-grade AI Worker Stack that enables BPOs and Contact Centre Service Providers to replace, augment, or extend their human agent workforce with AI Agents and AI Workers that deliver a natural, human-like caller experience — governed, audited, and aligned to each client's organisational structure.

### 2.2 Strategic Objectives
- Deliver a single unified platform covering all three AI worker flavours from day one
- Support true multi-tenancy at enterprise scale — each tenant may deploy 100s to 1,000s of AI Agents and Workers
- Be vendor-neutral across telephony infrastructure, AI model providers, and deployment environments
- Ensure non-disruptive integration with existing client CCT infrastructure — no rip-and-replace
- Provide governance, auditability, and quality management comparable to NICE/VERINT benchmarks
- Enable clients to select AI model providers and voices per agent with full cost transparency
- Support cloud-based and on-premise AI engine deployments, selectable at the individual agent level

### 2.3 Target Customers
- BPO organisations managing contact centre operations on behalf of enterprise clients
- Contact Centre Service Providers (CCaaS/CCT platform operators)
- Enterprise organisations with large inbound/outbound contact volumes seeking AI-first operations

---

## 3. PLATFORM ARCHITECTURE OVERVIEW

The TRUSTNOW AI Stack is composed of five distinct architectural layers. ALL layers are in scope for the full platform build.

```
LAYER 1 — Platform Core Foundation ("The Brain")    STT → LLM → TTS Pipeline
LAYER 2 — Agent Fabric Layer                        Control plane: skills, routing, queues, treatment
LAYER 3 — AI Worker Stack                           Conversational | Tools-Assisted | Fully Autonomous
LAYER 4 — Integration Layer                         PSTN, SIP, Avaya, Cisco, Genesys, Gateways
LAYER 5 — CX OS                                     O&M, Governance, Reporting, Recording
```

---

## 4. LAYER 1 — PLATFORM CORE FOUNDATION ("THE BRAIN")

**Goal:** Deliver a seamless, low-latency STT → LLM → TTS pipeline that produces natural, human-like conversational responses across all agent types and interaction channels.

---

### 4.1 PARTITION A — CLOUD-BASED BRAIN

When Partition A is selected for an agent, ALL STT, LLM, and TTS processing is executed via cloud-based provider APIs. The user/client has full control over provider and model selection at the individual agent level.

#### 4.1.1 LLM Provider & Model Selection

- Clients select their preferred LLM provider and specific model during agent creation
- Selection is made at the **per-agent level** — no tenant-wide lock-in
- The agent creation UI presents a structured dropdown: Provider → Model
- The **price per token** (or price per minute equivalent) is displayed against each model selection
- Users may change the model attached to an agent at any time without rebuilding the agent

**Supported LLM Providers (initial list — extensible via LiteLLM):**

| Provider | Example Models |
|----------|---------------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1, o3 series |
| Anthropic | Claude Opus 4, Claude Sonnet 4, Claude Haiku 4 |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini Ultra |
| Alibaba / Qwen | Qwen2.5-72B, Qwen2.5-Max |
| Mistral AI | Mistral Large, Mistral Small, Mixtral 8x22B |
| Meta (via API) | Llama 3.1 405B, Llama 3.3 70B |
| Additional Providers | Any provider supported by LiteLLM abstraction layer (100+ models) |

#### 4.1.2 STT Provider Selection (Cloud)

Cloud STT providers selectable per agent (non-exhaustive):
- **Deepgram** (primary — lowest latency, streaming)
- Google Speech-to-Text
- Microsoft Azure Speech
- Amazon Transcribe
- AssemblyAI

#### 4.1.3 TTS Provider Selection (Cloud)

Cloud TTS providers selectable per agent (non-exhaustive):
- **ElevenLabs** (primary — highest voice quality and emotion range)
- OpenAI TTS
- Google WaveNet / Neural2
- Microsoft Azure Neural TTS
- Amazon Polly

---

### 4.2 PARTITION B — ON-PREMISE / SELF-HOSTED BRAIN

When Partition B is selected for an agent, the ENTIRE STT, LLM, and TTS processing stack runs inside the client's data centre or co-location facility. TRUSTNOW designs, deploys, operates, and manages this stack on behalf of the client.

**Baseline Technology Stack for Partition B (ALL REQUIRED — P0):**

| Component | Baseline Technology | Notes |
|-----------|-------------------|-------|
| STT (Speech-to-Text) | **FasterWhisper** | GPU-accelerated; production-grade; multi-language |
| LLM (Large Language Model) | **Ollama** | Model-agnostic; supports Llama 3, Mistral, Phi-3, Qwen2, and others |
| TTS (Text-to-Speech) | **Piper** | Lightweight, fast, multi-language; extensible to other on-prem engines |

**CRITICAL FOR FOUNDATIONAL INFRASTRUCTURE:**
FasterWhisper, Ollama, and Piper must be installed and verified as part of the foundational infrastructure build (Task 2 — second batch). These are not optional extras — they are the baseline on-premise Brain that every Partition B agent depends on.

**FasterWhisper Installation Requirements:**
- Requires Python 3.8+
- CUDA support for GPU acceleration (verify NVIDIA drivers first)
- Install: `pip install faster-whisper`
- Models: download `base`, `medium`, `large-v3` at minimum
- Runs as a gRPC/REST service on localhost

**Ollama Installation Requirements:**
- Install via: `curl -fsSL https://ollama.com/install.sh | sh`
- Pull initial models: `ollama pull llama3.1:8b`, `ollama pull mistral:7b`, `ollama pull qwen2:7b`
- Runs as REST API on `localhost:11434` (internal only)
- Model storage: `/opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama`

**Piper Installation Requirements:**
- Install via pip: `pip install piper-tts`
- Download voice models: English (en_US-lessac-medium), additional languages as needed
- Voice model storage: `/opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices`
- Runs as a local process called per TTS request

---

### 4.3 PARTITION SELECTION — KEY RULES

- Partition selection (Cloud or On-Prem) is made at the **individual agent level** — NOT at the tenant level
- Within the same tenant: Agent A may use Partition A (Cloud); Agent B may use Partition B (On-Prem)
- No tenant-wide lock-in on partition choice
- Partition configuration captured during agent creation and stored as part of AgentConfig entity
- Future: per-workflow and per-treatment-policy partition selection (noted for future iteration)

---

### 4.4 LLM ABSTRACTION — LiteLLM (LOCKED ARCHITECTURE DECISION — DO NOT CHANGE)

**ARCHITECTURE DECISION LOCKED: LiteLLM is adopted as the LLM abstraction and cost-tracking layer.**

**Why LiteLLM is Mandatory:**
1. The platform supports 10+ LLM providers — each has a different SDK, request format, and response structure
2. LiteLLM provides a single unified call interface: `litellm.completion()` — provider-agnostic
3. LiteLLM contains a live pricing dictionary (`litellm.model_cost`) covering 100+ models — this is the **source of truth** for price-per-model displayed in the agent creation UI dropdown
4. LiteLLM calculates exact per-call cost via `litellm.completion_cost(response)` — feeds the reporting module
5. Dropping LiteLLM would require building and permanently maintaining all of the above from scratch
6. LiteLLM is deployed as a self-hosted proxy inside TRUSTNOW infrastructure — no third-party dependency

---

### 4.5 VOICE LIBRARY SUB-MODULE

The Voice Library is a central repository of voice samples used to assign a distinct voice persona to each AI Agent.

#### 4.5.1 Global Voice Library (TRUSTNOW-Managed)
- Maintained and curated by TRUSTNOW at the platform level
- Available to all tenants subject to RBAC/governance controls
- Contains voices spanning: multiple languages, genders, tones, styles, pitches, and emotional registers
- Continuously updated with new voices over time

#### 4.5.2 Tenant-Private Voice Library
- Each tenant can add, import, and manage their own custom private voices
- Tenant-private voices are scoped strictly to that tenant's namespace
- NOT visible to any other tenant
- Supports both cloud voices (Partition A) and on-prem voices (Partition B)

#### 4.5.3 Voice Selection at Agent Creation
- During agent creation, user selects voice from Global Library or Tenant-Private Library
- Selection controlled by RBAC
- Inline audio preview available before confirming selection
- Selected voice governs all TTS output for that agent
- Voice management operations: add, import, preview, label (language/gender/tone/emotion), activate/deactivate

---

## 5. LAYER 2 — AGENT FABRIC LAYER

The Agent Fabric Layer is the control plane governing operational behaviour of all AI Agents and AI Workers across all tenants. It sits between Layer 1 (The Brain) and Layer 3 (AI Worker Stack).

### 5.1 Core Capabilities

| Capability | Description |
|-----------|-------------|
| Agent Configuration Management | Stores and manages all agent-level configuration parameters, behaviours, and operational policies |
| Multi-Language Support | Language assignment per agent; multiple languages per agent configurable |
| Skill Definition | Define named skill sets; assign skills to agents; used for skill-based routing decisions |
| Skill-Based Routing | Route inbound interactions to best-matched agent based on skill requirements |
| Priority Levels | Define priority tiers at both agent level and queue level; high-priority interactions jump queues |
| Queue Management | Named queues, queue depth limits, overflow rules, queue-to-agent mappings |
| Routing Rules Engine | Configurable strategies: skill-match, priority-first, round-robin, least-occupied, time-of-day |
| Treatment Policies | Define behaviour when no agent is available, SLA breach imminent, or caller abandon thresholds reached |
| Tenant Scoping | All configurations strictly tenant-scoped; no cross-tenant configuration leakage |
| RBAC Enforcement | All fabric configurations subject to role-based access controls |

---

## 6. LAYER 3 — AI WORKER STACK

All three agent/worker sub-types co-exist within the same unified platform and are available for deployment from the outset.

### 6.1 Sub-Type 1: Conversational AI Agents

- Voice primary, chat secondary channel support
- Pure conversational interaction — no tool execution or backend system calls
- Agent personality, tone, and conversational behaviour fully configurable at agent creation
- Voice selected from Voice Library (Global or Tenant-Private) and attached to agent at creation
- Brain partition (Cloud or On-Prem) selectable per agent
- LLM provider and model selectable per agent with pricing displayed at selection

#### 6.1.1 Basic Knowledge Base / RAG Capability (Included for ALL Agent Types)

- Attach knowledge sources: document uploads (PDF, DOCX, TXT, CSV), URLs, structured data
- Sources are indexed into Qdrant vector database at attachment time via LlamaIndex
- At inference time, relevant knowledge chunks retrieved and injected into LLM prompt context
- Responses grounded in attached knowledge base — reducing hallucinations
- Internal citation tracking for accuracy and auditability
- KB management UI: add sources, view indexing status, remove/update sources, preview retrieval

---

### 6.2 Sub-Type 2: Tools-Assisted AI Agent Orchestration

All capabilities of Sub-Type 1, PLUS:

- Tool and function definition: name, description, parameters, API endpoint, authentication method
- Tool execution engine: invokes external APIs, webhooks, or internal services during conversation
- Tool result injection: results incorporated back into conversation context seamlessly
- Caller/user experience remains natural during tool execution — no robotic pauses or scripted fallbacks

**Example tool categories:**
- Status checks (order status, account status, ticket status)
- Appointment booking and scheduling
- Callback scheduling
- First-line / Level-1 backend record updates (CRM, ticketing, ERP)
- Balance enquiries, plan/product lookups

---

### 6.3 Sub-Type 3: Fully Autonomous AI Workers

Highest-capability worker type. A coordinated team of AI Workers aligned to the client's organisation structure, delivering multi-domain task resolution within a single, seamless caller interaction.

#### 6.3.1 Master AI Worker — Intent Consolidator & Delegator

| Step | Responsibility |
|------|---------------|
| 1 — Greeting & Engagement | Greets caller naturally; establishes conversational context |
| 2 — Intent Capture | Captures and clarifies full caller intent; handles multi-intent requests |
| 3 — Authentication | Verifies caller using configured Auth Policy Engine (§6.3.3) |
| 4 — Eligibility Check | Checks eligibility for requested service(s) via integration calls |
| 5 — Dues Check | Queries outstanding/unpaid dues associated with caller's account |
| 6 — Payment Gating | If dues exist: informs caller, dispatches payment link, monitors webhook; proceeds only after confirmed clearance |
| 7 — Task Delegation | Delegates individual subtasks to appropriate SME AI Workers |
| 8 — Progress Tracking | Monitors completion of delegated tasks; places caller on hold with music as needed |
| 9 — Result Consolidation | Aggregates all SME results into coherent, complete response narrative |
| 10 — Final Response | Delivers consolidated outcome in natural, human-like language; closes or continues |

#### 6.3.2 SME AI Workers — Domain Specialists

- Each SME AI Worker scoped to a single domain (e.g., Billing, Provisioning, Technical Support)
- Each SME has its own dedicated RAG and Knowledge Base
- SMEs receive delegated tasks from Master AI Worker, execute them, return structured results
- SMEs may invoke tools (Layer 4 Integration Layer) as required
- SME Worker roster fully configurable and extensible per client vertical and org structure

**Example SME Domains (industry-configurable):**

| Domain | Example Vertical | Example Tasks |
|--------|-----------------|--------------|
| Billing | Telco, Utilities, Banking | Invoice queries, payment plans, charge disputes, statement retrieval |
| Provisioning | Telco, SaaS | Plan changes, feature activation, SIM provisioning, service orders |
| Technical Support | Telco, Technology | Fault diagnosis, service restoration, device troubleshooting, escalation |
| Banking / Finance | Banking, Insurance | Account queries, transaction disputes, product applications, limit changes |
| Retail | E-commerce, Retail | Order tracking, returns, product queries, delivery management |
| Healthcare | Healthcare, Insurance | Appointment management, prescription queries, coverage checks, referrals |

#### 6.3.3 Authentication Policy Engine (P0 — NOT DEFERRED)

- Designed as a configurable policy engine — NOT hardcoded authentication logic
- Clients select one or more auth methods per agent/worker at configuration time
- Auth steps sequenced as part of the agent workflow
- Supported mechanisms:
  - OTP via SMS or email
  - Voice biometrics (voiceprint verification)
  - ANI / DNIS lookup (inbound number matching)
  - PIN / Passcode verification
  - Knowledge-Based Authentication (KBA — security questions)
  - SSO / OAuth integration (for digital/chat channels)
  - Custom webhook-based auth (client-provided auth service)

#### 6.3.4 Payment Gating (P0)

- Triggered by Master AI Worker when outstanding dues detected on caller's account
- Primary mechanism: generic webhook/API trigger to client's payment system
- Platform generates or requests payment link from client's payment gateway
- Payment link dispatched to caller via SMS, email, or read aloud
- Platform monitors payment completion status via inbound webhook callback
- Caller workflow proceeds ONLY after confirmed payment clearance signal
- Timeout and retry policies configurable per tenant

#### 6.3.5 Caller Experience Standards (NON-NEGOTIABLE)

- Conversation must feel entirely natural and human-like throughout — no robotic IVR feel at any point
- Caller placed on hold with music when background AI Workers are processing delegated tasks
- Hold → active conversation → hold transitions must be smooth and contextually natural
- Hold music configurable per tenant (custom music / default library)
- No caller-facing indication of AI delegation or background processing unless explicitly disclosed
- If human handoff required: transition must be seamless with full context transfer to human agent

---

## 7. LAYER 4 — INTEGRATION LAYER (VENDOR-NEUTRAL)

The Integration Layer is the bridge between the TRUSTNOW AI Worker Stack and external telephony, contact-centre, and enterprise systems. Fully vendor-neutral and non-disruptive to existing client infrastructure.

### 7.1 Telephony & Voice Infrastructure

- Supports inbound and outbound: PSTN, SIP trunks, VoIP, Voice Gateways, and Media Gateways
- Vendor-agnostic: integrates with Avaya, Cisco, Genesys, IVRs, and any cloud or on-prem PBX/CCT system
- Non-disruptive integration principle: no rip-and-replace of existing client infrastructure required
- Bidirectional bridge: inbound calls routed into AI Worker Stack; AI responses routed back to caller

### 7.2 Enterprise System Integration

- Generic webhook/API framework for tool calls (Tools-Assisted and Autonomous agents)
- Payment gateway integration via generic webhook/API (§6.3.4)
- Extensible connector adapter model: CRM, ERP, ticketing, and backend system connectors

### 7.3 Human Handoff — Dual Protocol (BOTH OPTIONS MUST CO-EXIST)

| Handoff Option | Mechanism | Use Case |
|---------------|-----------|---------|
| Option A — Integration-Layer Transfer | AI Worker transfers call to client's existing live-agent queue via Avaya/Cisco/Genesys/PBX | Clients with existing CCT platform and live-agent setup |
| Option B — Internal TRUSTNOW Agent Console | Call transferred to TRUSTNOW's built-in Human Agent Desktop where human agent takes over | Clients without their own CCT platform |

#### 7.3.1 Handoff Trigger Conditions (Configurable)

- AI Worker confidence score falls below configured threshold
- Caller explicitly requests to speak to a human agent
- Specific keywords detected in conversation (configurable trigger phrases)
- Specific interaction types or intents mapped to mandatory human handling
- Escalation flag raised by any SME AI Worker
- Maximum interaction duration exceeded

---

## 8. LAYER 5 — CX OS (OPERATIONS, MANAGEMENT & GOVERNANCE)

### 8.1 Multi-Tenancy Architecture

- True enterprise-grade multi-tenancy with strict data isolation between tenants at ALL layers
- Platform-level super-admin role for TRUSTNOW operations team (full platform visibility and control)
- Tenant onboarding: self-service and admin-assisted onboarding modes
- Each tenant can deploy 100s to 1,000s of AI Agents and Workers
- Data residency controls: tenant data can be configured to remain within a specific geographic region

### 8.2 RBAC and Governance

| Governance Element | Requirement |
|-------------------|-------------|
| Role-Based Access Control (RBAC) | Defined at platform level (super-admin, platform-ops) and tenant level (tenant-admin, agent-manager, viewer, etc.) |
| Org-Structure Alignment | RBAC can mirror the client's internal org chart — roles and permissions map to organisational hierarchy |
| Policy-Driven Controls | Governance policies define what users can see, create, modify, and delete; enforced at all UI and API layers |
| Immutable Audit Trail | Every configuration change, agent action, user login, and system event logged with full context; logs are immutable and tamper-evident |
| Data Residency Controls | Tenant data remains within configured region/partition; enforced via RLS and namespace isolation |
| API Governance | All API access authenticated, rate-limited, and logged; API keys scoped to tenant and role |

### 8.3 AI Agent Creation Module

The Agent Creation Module is the primary user-facing workflow for building and configuring AI Agents and Workers. Covers all three sub-types. Designed following established enterprise SaaS UX patterns (reference: ElevenLabs Agent Platform — IA and flow patterns).

#### 8.3.1 Agent Creation Flow — Key Steps (14 Steps)

1. Agent type selection: Conversational / Tools-Assisted / Fully Autonomous
2. Agent name, description, and organisational assignment
3. Brain partition selection: Cloud (Partition A) or On-Prem (Partition B)
4. LLM provider and model selection — with price per token displayed inline
5. STT provider selection (Cloud) or FasterWhisper configuration (On-Prem)
6. TTS provider selection (Cloud) or Piper configuration (On-Prem)
7. Voice selection from Global or Tenant-Private Voice Library (with inline audio preview)
8. Language and skill configuration
9. Knowledge Base / RAG source attachment (available for ALL agent types)
10. Tool definition and attachment (Tools-Assisted and Autonomous agents)
11. Auth Policy Engine configuration (Autonomous agents)
12. SME Worker roster definition and delegation rules (Fully Autonomous agents)
13. Agent simulation and testing panel — test agent before publishing to live
14. Publish / Activate agent

#### 8.3.2 Agent Configuration Tabs (10 Tabs)

| Tab | Name | Core Capability | Build Priority |
|-----|------|----------------|---------------|
| 1 | Agent | System Prompt, First Message, Voice, Language, LLM, Partition | Core Build |
| 2 | Workflow | Visual flow builder for multi-step conversation flows | Shell first; internals phased |
| 3 | Branches | Agent config branching for A/B testing and staged rollouts | Shell first; internals phased |
| 4 | Knowledge Base | RAG enable/disable, document management, indexing status | Core Build |
| 5 | Analysis | Per-agent KPI cards, date filter, sub-tab drill-down | KPI shell Core; charts phased |
| 6 | Tools | Custom tools (Webhook/Client/Integration/MCP) + System tools panel | Core Build |
| 7 | Tests | Simulated test calls; automated eval scoring | Shell first; internals phased |
| 8 | Widget | Embeddable web/app widget publisher | Core Build |
| 9 | Security | Auth Policy Engine configuration per agent | Shell Core; full UI phased |
| 10 | Advanced | TTS fine-tuning, turn-taking, silence detection, timeout overrides | Shell first; internals phased |

### 8.4 Human Agent Desktop (Internal Console)

Built-in, fully-featured live-agent console for clients without their own CCT platform.

**Capability scope (genuine enterprise contact centre desktop — not Genesys/Avaya depth but fully capable):**
- Live call handling: answer, hold, mute, transfer, conference, end call controls
- Real-time conversation transcript displayed as AI → Human handoff occurs
- Full interaction context panel: caller identity, interaction history, AI conversation summary
- CRM-panel-style layout: caller profile, account details, interaction notes
- Disposition codes: post-interaction classification (configurable per tenant)
- Wrap-up time management: configurable post-call activity window
- Internal agent-to-agent and agent-to-supervisor chat/notes
- Supervisor monitoring: live view of all active agents, call states, queue depths
- Supervisor barge-in and whisper coaching capabilities
- Agent availability status management (available, busy, break, wrap-up, offline)
- Queue panel: see waiting interactions, priority, and estimated wait times
- Integrated call recording access: playback of current and past interactions

### 8.5 MIS & Reporting Module

#### 8.5.1 Dashboard & Reporting Requirements
- Real-time operational dashboards: active agents, live call counts, queue depths, SLA status
- Historical reporting: interaction volumes, handling times, resolution rates, escalation rates
- Per-tenant reporting (tenant admin view) and cross-tenant reporting (platform super-admin view)
- Per-agent and per-AI-Worker performance reports
- AI Agent/Worker performance scoring and KPI dashboards
- SLA tracking with threshold alerts and breach notifications
- Export capabilities: CSV, PDF, and reporting API for external BI tool integration

#### 8.5.2 Cost & Usage Reporting (LLM Billing Transparency)

| Metric | Description |
|--------|-------------|
| LLM Model Used | Exact provider and model name (e.g., anthropic/claude-sonnet-4-5) |
| Input Tokens | Total input/prompt tokens consumed for the interaction |
| Output Tokens | Total output/completion tokens generated for the interaction |
| Interaction Duration | Total duration in seconds and minutes |
| Calculated Cost | Exact cost calculated via LiteLLM cost tracking |
| Cost per Agent | Aggregated cost view per AI Agent over any time period |
| Cost per Tenant | Aggregated cost view per tenant over any time period |
| Cost Trend | Cost over time period with trend visualisation (day/week/month/quarter) |
| STT / TTS Cost | Cost of cloud STT and TTS API calls per interaction |

### 8.6 Call Recording & Quality Management (NICE/VERINT-Comparable Benchmark)

- Full recording of ALL voice calls and chat interactions across all tenants and agents
- Recordings stored securely in encrypted object storage (MinIO on-prem / AWS S3 cloud)
- Recording access RBAC-controlled — tenant admins access only their own recordings
- Quality management scoring of AI Agent and AI Worker performance per interaction
- Playback with timeline navigation and event markers (hold events, transfer events, etc.)
- Annotation and evaluation tools: reviewers can mark, score, and comment on recordings
- Automated scoring rules: configurable scoring criteria applied programmatically to all interactions
- Manual quality review workflow: assign interactions to QA reviewers, track review completion
- Performance dashboards: quality scores by agent, by queue, by interaction type, by time period

---

## 9. CONCURRENT SESSION ARCHITECTURE (BRD-CC-001 to CC-010)

**This is the most critical non-functional requirement in the platform. Must be designed in from session zero.**

Every conversation handled by any AI Agent must be:
1. Fully isolated from every other concurrent conversation on the same agent
2. Assigned a globally unique Conversation ID (CID — UUID v4) at session initiation
3. Independently tracked end-to-end for MIS, reporting, cost, QM, and troubleshooting

**Medical AI Support Agent Example:** If 100 callers simultaneously dial in, the platform must spawn 100 fully independent conversation sessions in parallel. Each session uses the same agent definition but operates in completely isolated runtime context. No caller can hear, see, influence, or contaminate another session.

### CID Design

| Property | Specification |
|----------|--------------|
| Format | UUID v4 — globally unique across entire TRUSTNOW platform |
| Generation Point | At FreeSWITCH call answer OR WebSocket connection open — immutable for session lifetime |
| Propagation | FreeSWITCH channel → LiveKit Room → Redis key → Kafka partition key → PostgreSQL record → LLM API → STT/TTS session → recording filename → audit log → OpenTelemetry trace |
| Handoff Continuity | CID travels with SIP UUI header on transfer — full session unified under one CID |

### Formal Requirements

| ID | Requirement | Priority |
|----|-------------|---------|
| BRD-CC-001 | CID (UUID v4) assigned at session initiation — immutable | P0 |
| BRD-CC-002 | Single agent handles N concurrent conversations — N is infra-limited only | P0 |
| BRD-CC-003 | Per-session isolated state: message history, LLM context, STT stream, TTS channel, tool state, cost accumulator | P0 |
| BRD-CC-004 | CID propagated through every system component | P0 |
| BRD-CC-005 | Real-time live concurrent session count (global, per tenant, per agent) from Redis | P0 |
| BRD-CC-006 | Session failure isolation — one session error cannot affect others | P0 |
| BRD-CC-007 | Search/filter conversations by CID — complete session record | P0 |
| BRD-CC-008 | CID travels with human handoff (SIP UUI header / context payload) | P0 |
| BRD-CC-009 | All MIS aggregations computable from CID-level records | P0 |
| BRD-CC-010 | Kubernetes HPA auto-scales AI pipeline pods on concurrent session load | P0 |

---

## 10. CROSS-CUTTING ENTERPRISE REQUIREMENTS

| Requirement | Specification |
|-------------|--------------|
| Availability | Enterprise-grade HA; active-active or active-passive failover; 99.9%+ uptime SLA |
| Scalability | Horizontally scalable across all layers; supports high concurrent interaction volumes |
| Security | Encryption at rest (AES-256) and in transit (TLS 1.3); PostgreSQL RLS; HashiCorp Vault |
| Compliance | SOC2/ISO 27001 aligned; audit log immutability; data residency controls |
| Human Handoff | Dual-mode handoff available at any point in any interaction |
| Governance | Policy-driven controls enforced at every layer; immutable audit trail throughout |
| Observability | Full-stack metrics, logging, distributed tracing: Prometheus + Grafana + Loki |
| Vendor Neutrality | No cloud-provider, telephony-vendor, or AI-model lock-in at any layer |
| On-Prem Support | Full platform deployable in client data centre or co-location; managed by TRUSTNOW |
| Concurrent Sessions | Every session unique CID, fully isolated, N concurrent per agent, infra-limited only |

---

## 11. UI REQUIREMENTS — LANDING PAGE SPECIFICATION (LOCKED)

| # | Element | Specification |
|---|---------|--------------|
| 1 | Background Theme | Deep dark purple — approximately #1A0A4C |
| 2 | Brand / Logo | "TRUSTNOW" — logo, top-left header |
| 3 | Navigation Items | AI Agents · Enterprise Integration · Resources · Contact us |
| 4 | Auth CTA Buttons | "Login" and "Signup" — red fill buttons, top-right |
| 5 | Hero Title | "TRUSTNOW AI WORKER STACK" — centered, white/cyan bold typography |
| 6 | Three Pillars Layout | Horizontal layout with three teal circle icons connected by horizontal line |
| 7 | Pillar 1 | "Conversational AI Agents" in cyan bold |
| 8 | Pillar 2 | "Tools Enabled AI Agent Orchestration" in cyan bold |
| 9 | Pillar 3 | "Fully Autonomous AI Workers" in cyan bold |
| 10 | Supporting Tagline | "Multi-tenant. Enterprise Grade. AI Agents aligned to client organisation structure. Policy driven. Audited. Governed. Fully Autonomous and handoff to human when required." |
| 11 | Footer Decoration | Red/purple animated wave/mesh graphic at bottom of hero section |

---

## 12. APPROVED TECHNOLOGY STACK (ALL DECISIONS LOCKED)

### 12.1 Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | SSR + SSG + API routes; optimised for multi-panel enterprise dashboards |
| Language | TypeScript (strict) | Type safety across full stack; mandatory for enterprise maintainability |
| UI Components | shadcn/ui + Radix UI | Headless, accessible, fully themeable; enables TRUSTNOW dark-purple design system |
| Styling | Tailwind CSS | Utility-first; design-token-friendly; brand system consistency |
| State Management | Zustand + TanStack Query | Lightweight global state + best-in-class async/server state management |
| Real-time UI | Socket.io client | Live transcripts, agent console events, supervisor monitoring |
| Voice / WebRTC | LiveKit JS SDK | Open-source WebRTC; media tracks, noise suppression, participant management |
| Charts / Reporting | Recharts + Tremor | Recharts for custom charts; Tremor for pre-built dashboard components |

### 12.2 Backend — Platform API (CX OS / Control Plane)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | NestJS (Node.js + TypeScript) | Modular, enterprise-grade; native WebSockets, RBAC guards, microservice support |
| API Style | REST + GraphQL (hybrid) | REST for operational calls; GraphQL for flexible reporting and dashboard queries |
| Auth / IAM | Keycloak (self-hosted) — LOCKED | Enterprise SSO, OAuth2/OIDC, SAML, RBAC, multi-realm — one realm per tenant |
| Multi-tenancy | PostgreSQL Row-Level Security — LOCKED | Strict data isolation without schema explosion; scales to hundreds of tenants |

### 12.3 Backend — AI Pipeline (The Brain)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Python + FastAPI | Native AI/ML ecosystem; async, high-performance, streaming pipeline support |
| LLM Abstraction | **LiteLLM (self-hosted proxy) — LOCKED — DO NOT CHANGE** | Unified API for 100+ LLM providers; live pricing dictionary; per-call cost calculation |
| STT (Cloud) | Deepgram (primary) | Lowest latency real-time streaming STT; wide language support |
| TTS (Cloud) | ElevenLabs (primary) | Highest voice quality and emotion range; aligns with Voice Library requirements |
| STT (On-Prem) | **FasterWhisper — REQUIRED** | GPU-accelerated; production-grade; as specified in §4.2 |
| LLM (On-Prem) | **Ollama — REQUIRED** | Model-agnostic on-prem LLM serving; as specified in §4.2 |
| TTS (On-Prem) | **Piper — REQUIRED** | Lightweight, fast, multi-language on-prem TTS; as specified in §4.2 |
| RAG Orchestration | **LlamaIndex — LOCKED — DO NOT CHANGE** | Document ingestion, chunking, indexing, retrieval, and citation management |
| Vector Database | **Qdrant — PRIMARY — LOCKED** | Self-hostable; high performance; built-in tenant/collection isolation |

### 12.4 Real-Time Voice & Telephony

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Media Server / SIP | FreeSWITCH | Industry-standard; PSTN/SIP/WebRTC bridging; native call recording; scriptable |
| WebRTC Media Server | LiveKit (self-hosted) | Open-source; browser WebRTC ↔ SIP bridging; built-in recording; room = call session |
| SIP Trunking | Provider-agnostic SIP adapter | Twilio, Vonage, Bandwidth, or client's own SIP trunk; abstracted via Integration Layer |
| Hold Music Engine | FreeSWITCH MOH | Native Music on Hold; configurable per tenant/agent |
| Recording Storage | MinIO (on-prem) / AWS S3 (cloud) | S3-compatible object storage; scalable; encryption at rest |

### 12.5 Data Layer

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Primary Database | PostgreSQL 16 | ACID; RLS for multi-tenancy; JSONB for flexible configs; pgvector for lightweight vector ops |
| Cache / Session | Redis (Redis Stack) | Session management; CID keys; queue state; real-time SLA counters; pub/sub |
| Message Broker | Apache Kafka | High-throughput event streaming for call events, transcripts, AI pipeline events, audit logs |
| Search & Logging | Elasticsearch + Kibana | Full-text search across transcripts/KBs; operational log aggregation |
| Time-Series / Metrics | **TimescaleDB** | PostgreSQL extension for real-time MIS metrics and performance scoring |

### 12.6 Infrastructure & DevOps

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Containerisation | Docker | All services containerised; standard across all environments |
| Orchestration | Kubernetes (K8s) + Helm | Production-grade; scales to multi-tenant load; cloud and on-prem deployments |
| API Gateway | Kong Gateway (OSS) | Rate limiting, auth plugins, tenant routing, edge logging |
| CI/CD | GitHub Actions + ArgoCD | GitHub Actions for build/test; ArgoCD for GitOps-based K8s deployments |
| Secrets Management | HashiCorp Vault — LOCKED | Enterprise secrets, API key management, dynamic credentials; multi-tenant key isolation |
| Observability | Prometheus + Grafana + Loki | Metrics, dashboards, log aggregation; open-source standard |
| On-Prem Deployment | Helm + K3s or full K8s | K3s for lightweight on-prem; full K8s for large client data centres |

---

## 13. REQUIREMENTS LEDGER — COMPLETE

| Module | Capability | Priority |
|--------|-----------|---------|
| L1 — Brain: Partition A | Cloud STT provider selection per agent | P0 |
| L1 — Brain: Partition A | Cloud LLM provider selection per agent (10+ providers via LiteLLM) | P0 |
| L1 — Brain: Partition A | Cloud TTS provider selection per agent | P0 |
| L1 — Brain: Partition A | LLM model picker UI with price per token displayed | P0 |
| L1 — Brain: Partition A | LiteLLM self-hosted proxy as LLM abstraction + cost tracking — LOCKED | P0 |
| L1 — Brain: Partition B | **FasterWhisper STT (on-prem, TRUSTNOW-managed)** | P0 |
| L1 — Brain: Partition B | **Ollama LLM (on-prem, model-agnostic)** | P0 |
| L1 — Brain: Partition B | **Piper TTS (on-prem)** | P0 |
| L1 — Partition Selection | Per-agent partition selection (Cloud or On-Prem) | P0 |
| L1 — Voice Library | Global Voice Library (TRUSTNOW-managed, all tenants) | P0 |
| L1 — Voice Library | Tenant-private Voice Library (scoped to tenant namespace) | P0 |
| L1 — Voice Library | Voice import/add/curate/label/preview operations | P0 |
| L1 — Voice Library | Voice selection with inline audio preview in agent creation | P0 |
| L2 — Agent Fabric | Agent configuration management | P0 |
| L2 — Agent Fabric | Multi-language support per agent | P0 |
| L2 — Agent Fabric | Skill definition and skill-based routing | P0 |
| L2 — Agent Fabric | Priority and queue management | P0 |
| L2 — Agent Fabric | Routing rules engine (multiple strategies) | P0 |
| L2 — Agent Fabric | Treatment policies (overflow, SLA breach, abandon) | P0 |
| L3 — Conversational Agents | Voice-primary conversation handling | P0 |
| L3 — Conversational Agents | Chat-secondary conversation handling | P0 |
| L3 — Conversational Agents | Agent personality and behaviour configuration | P0 |
| L3 — Conversational Agents | Basic KB/RAG attachment (PDF, DOCX, TXT, CSV, URL) | P0 |
| L3 — Conversational Agents | LlamaIndex vector indexing (Qdrant) and retrieval at inference time | P0 |
| L3 — Tools-Assisted Agents | Tool/function definition and attachment per agent | P0 |
| L3 — Tools-Assisted Agents | Tool execution engine (Webhook, Client-side, Integration, MCP) | P0 |
| L3 — Tools-Assisted Agents | Tool result injection into conversation context | P0 |
| L3 — Autonomous Workers | Master AI Worker (all 10 steps: §6.3.1) | P0 |
| L3 — Autonomous Workers | SME AI Workers (domain-specific, extensible roster, own KB/RAG) | P0 |
| L3 — Autonomous Workers | Hold music during background AI processing | P0 |
| L3 — Autonomous Workers | Natural, human-like caller experience standard | P0 |
| L3 — Autonomous Workers | Configurable Auth Policy Engine (all mechanisms) | P0 |
| L3 — Autonomous Workers | Payment gating via generic webhook/API | P0 |
| L4 — Integration | PSTN / SIP / VoIP / Gateway support | P0 |
| L4 — Integration | Avaya / Cisco / Genesys / IVR adapters (non-disruptive) | P0 |
| L4 — Integration | Generic webhook/API adapter framework | P0 |
| L4 — Integration | Human handoff — Integration-Layer transfer (Option A) | P0 |
| L4 — Integration | Human handoff — Internal TRUSTNOW Agent Console (Option B) | P0 |
| L4 — Integration | Configurable handoff trigger conditions | P0 |
| L5 — Multi-Tenancy | Platform super-admin (TRUSTNOW ops team) | P0 |
| L5 — Multi-Tenancy | Tenant onboarding (self-service + admin-assisted) | P0 |
| L5 — Multi-Tenancy | Strict data isolation between tenants (PostgreSQL RLS) | P0 |
| L5 — Multi-Tenancy | Data residency controls per tenant | P0 |
| L5 — RBAC + Governance | RBAC (platform and tenant level) | P0 |
| L5 — RBAC + Governance | Org-chart-aligned RBAC | P1 |
| L5 — RBAC + Governance | Policy-driven governance controls (Keycloak realm-per-tenant) | P0 |
| L5 — RBAC + Governance | Immutable audit trail (all actions, changes, login events) | P0 |
| L5 — Agent Creation | Agent type selection (all three sub-types) | P0 |
| L5 — Agent Creation | Per-agent Brain partition selection (Cloud / On-Prem) | P0 |
| L5 — Agent Creation | Voice selection (Global + Tenant-Private, RBAC-controlled) | P0 |
| L5 — Agent Creation | KB/RAG source attachment in creation flow | P0 |
| L5 — Agent Creation | Tool definition in creation flow | P0 |
| L5 — Agent Creation | Auth Policy Engine configuration in creation flow | P0 |
| L5 — Agent Creation | SME Worker roster and delegation rules configuration | P0 |
| L5 — Agent Creation | Agent simulation/testing panel pre-launch | P0 |
| L5 — Human Agent Desktop | Live call controls (answer, hold, mute, transfer, conference, end) | P0 |
| L5 — Human Agent Desktop | Real-time conversation transcript during handoff | P0 |
| L5 — Human Agent Desktop | CRM-panel layout with caller profile and full context | P0 |
| L5 — Human Agent Desktop | Disposition codes (configurable per tenant) | P0 |
| L5 — Human Agent Desktop | Supervisor monitoring, barge-in, whisper coaching | P0 |
| L5 — Human Agent Desktop | Queue panel and agent availability management | P0 |
| L5 — MIS & Reporting | Real-time + historical dashboards | P0 |
| L5 — MIS & Reporting | Per-tenant, per-agent, per-interaction reporting | P0 |
| L5 — MIS & Reporting | LLM cost per call (model, tokens, duration, calculated cost via LiteLLM) | P0 |
| L5 — MIS & Reporting | Cost per agent and cost per tenant over time | P0 |
| L5 — MIS & Reporting | SLA tracking and breach alerting | P0 |
| L5 — MIS & Reporting | Export (CSV, PDF, reporting API) | P1 |
| L5 — Recording + QM | Full call and chat interaction recording | P0 |
| L5 — Recording + QM | Encrypted secure recording storage with RBAC access | P0 |
| L5 — Recording + QM | Quality management scoring (NICE/VERINT-comparable) | P0 |
| L5 — Recording + QM | Playback, annotation, and evaluation tools | P0 |
| L5 — Recording + QM | Automated + manual QM review workflow | P0 |
| L5 — UI | Landing page per UI specification (§11) | P0 |
| Concurrency — CC-001 | Globally unique CID (UUID v4) per session — immutable | P0 |
| Concurrency — CC-002 | N concurrent sessions per agent — infra-limited only | P0 |
| Concurrency — CC-003 | Per-session isolated state — zero leakage between sessions | P0 |
| Concurrency — CC-004 | CID propagated through every system component | P0 |
| Concurrency — CC-005 | Real-time live concurrent session count (global, tenant, agent) | P0 |
| Concurrency — CC-006 | Session failure isolation — one failure cannot affect others | P0 |
| Concurrency — CC-007 | Search/filter conversations by CID — complete session record | P0 |
| Concurrency — CC-008 | CID travels with human handoff transfer | P0 |
| Concurrency — CC-009 | All MIS aggregations computable from CID-level records | P0 |
| Concurrency — CC-010 | Kubernetes HPA auto-scales AI pipeline pods | P0 |

---

## 14. WHAT WAS MISSING FROM BRD-SUMMARY.md (GAPS NOW ADDRESSED)

The following critical items were in BRD-1 but absent from BRD-SUMMARY.md:

| Gap | Section | Impact |
|-----|---------|--------|
| Partition A — Full LLM provider table with all 7 providers | §4.1.1 | Platform engineer did not know all supported providers |
| Partition A — Cloud STT provider list (Deepgram primary) | §4.1.2 | STT provider selection incomplete |
| Partition A — Cloud TTS provider list (ElevenLabs primary) | §4.1.3 | TTS provider selection incomplete |
| **Partition B — FasterWhisper (STT On-Prem) — P0 REQUIRED** | §4.2 | NOT in foundational infra plan |
| **Partition B — Ollama (LLM On-Prem) — P0 REQUIRED** | §4.2 | NOT in foundational infra plan |
| **Partition B — Piper (TTS On-Prem) — P0 REQUIRED** | §4.2 | NOT in foundational infra plan |
| LiteLLM full rationale (6 reasons why locked) | §4.4 | Platform engineer needs to understand why |
| Voice Library full spec (3 sub-sections) | §4.5 | Voice selection implementation incomplete |
| Agent Fabric Layer full capabilities table | §5.1 | Layer 2 requirements missing |
| Master AI Worker 10-step table | §6.3.1 | Autonomous worker flow missing |
| SME Worker domains table | §6.3.2 | Domain specialist configuration missing |
| Auth Policy Engine full mechanism list | §6.3.3 | Security config incomplete |
| Payment Gating full flow | §6.3.4 | Webhook integration spec missing |
| Caller Experience Standards | §6.3.5 | Non-negotiable UX requirements missing |
| Handoff trigger conditions | §7.3.1 | Handoff logic incomplete |
| Agent Creation 14-step flow | §8.3.1 | Creation flow steps 5-6 (FasterWhisper/Piper config) missing |
| Human Agent Desktop full capability list | §8.4 | Desktop spec missing |
| Cost & Usage Reporting table | §8.5.2 | LLM billing transparency missing |
| QM detail | §8.6 | NICE/VERINT benchmark missing |
| **TimescaleDB** (PostgreSQL extension for metrics) | §12.5 | NOT in foundational infra plan |
| Landing page UI spec | §10 | UI spec missing |
| Full requirements ledger | §13 | All requirements not listed |
| Open Items table | §14 | Pending decisions not captured |

---

## 15. TASK 2 — SECOND BATCH (ADDITIONS TO FOUNDATIONAL INFRASTRUCTURE)

The following components from the BRD must be added to foundational infrastructure as Task 2 second batch:

### 15.1 FasterWhisper (On-Prem STT — BRD-L1-Partition B)
```bash
# Install in AI pipeline venv
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install faster-whisper
# Download models
python -c "from faster_whisper import WhisperModel; WhisperModel('base'); WhisperModel('medium')"
deactivate
```

### 15.2 Ollama (On-Prem LLM — BRD-L1-Partition B)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
# Set custom model storage path
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama
sudo chown trustnow:trustnow /opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama
# Configure OLLAMA_MODELS env var
echo 'OLLAMA_MODELS=/opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama' | sudo tee -a /etc/environment
# Pull initial models
ollama pull llama3.1:8b
ollama pull mistral:7b
# Verify
ollama list && curl http://localhost:11434/api/tags
```

### 15.3 Piper TTS (On-Prem TTS — BRD-L1-Partition B)
```bash
# Install Piper in AI pipeline venv
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install piper-tts
# Create voice model storage
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices
# Download initial voice models
cd /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
deactivate
```

### 15.4 TimescaleDB (PostgreSQL Extension — BRD §12.5)
```bash
# Add TimescaleDB repository
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -cs) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update && sudo apt install -y timescaledb-2-postgresql-16
# Enable extension
sudo -u postgres psql -d trustnow_platform -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
sudo timescaledb-tune --quiet --yes
sudo systemctl restart postgresql
```

### 15.5 Nginx (Reverse Proxy + TLS Termination)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
# Verify
nginx -v && sudo systemctl status nginx
```

---

## 16. OPEN ITEMS & PENDING DECISIONS

| # | Item | Owner | Status |
|---|------|-------|--------|
| OI-001 | Milestone and phase split definition | Product Owner | Pending |
| OI-002 | ElevenLabs Agent Platform deep-dive study | Architecture Team | CLOSED — completed in BRD-1 v1.1 |
| OI-003 | Detailed functional requirements for Milestone-1 scope | Product Owner | Pending |
| OI-004 | On-prem deployment hardware baseline specification | TRUSTNOW Ops | Pending |
| OI-005 | Payment gateway integration specifics — target gateways | Product Owner | Pending |
| OI-006 | LLM provider scope for Core Build registry | Product Owner | Pending |
| OI-007 | Default Cloud STT provider confirmation | Architecture Team | Pending |
| OI-008 | Internal Human Agent Desktop — Core Build or phased? | Product Owner | Pending |
| OI-009 | Agent template library — platform-managed only or tenant-custom? | Product Owner | Pending |
| OI-010 | Tenant KB size limits per pricing tier | Product Owner | Pending |
| OI-011 | Fully Autonomous AI Workers — detailed requirements | Product Owner + Architecture | Next Session |

---

*FULL-SCOPE-BRD.md — Complete reference derived from BRD-1 v1.1 Unified Baseline*
*For Platform Engineer use — read at session start, update RUNBOOK.md after each task*
*TRUSTNOW CONFIDENTIAL — March 2026*

---

## 17. CO-BROWSING ADDENDUM — Net-New Requirements from ElevenLabs Platform Study

**Source:** CO-BROWSING-DATA-001.md v3.0 (April 2026) — live platform observations  
**Status:** Requirements confirmed by Platform Owner (Raj). Additive only — no existing BRD sections modified.

---

### BRD-CB-001 — BPO-Specific Industry Verticals in Agent Creation Wizard

**Requirement:** The TRUSTNOW Agent Creation Wizard MUST include five BPO-specialist industry verticals that are NOT present in ElevenLabs or any comparable platform. These verticals are a primary commercial differentiator for TRUSTNOW in the BPO/contact centre market.

**Background:** Co-browsing of the ElevenLabs platform (§7 — Business Agent Wizard) confirmed that ElevenLabs offers 17 generic industries. None of these directly address the core operational verticals of BPO clients. TRUSTNOW must go beyond the baseline and offer purpose-built agent creation paths for the industries that BPO clients actually serve.

**The five BPO-specific verticals required:**

| Vertical | Slug | Target BPO Use | Regulatory context |
|----------|------|---------------|-------------------|
| **Debt Collections** | `bpo_debt_collections` | Outbound collections, payment arrangements, dispute handling | FDCPA (US), FCA CONC (UK), NCCP (AU) |
| **Utilities Customer Service** | `bpo_utilities` | Billing, outages, meter reading, service connections/disconnections, tariff switching | Ofgem (UK), AEMC (AU), state PUC (US) |
| **Insurance Claims Processing** | `bpo_insurance_claims` | FNOL intake, claims status, document collection, claims triage, settlement explanation | FCA ICOBS (UK), state DOI (US), ASIC (AU) |
| **Telecoms & Broadband** | `bpo_telecoms` | Billing queries, fault logging, upgrades, retention/churn prevention, roaming queries | Ofcom (UK), FCC (US), ACMA (AU) |
| **Government Services Delivery** | `bpo_government_services` | Benefits eligibility, application status, document guidance, appointment booking, signposting | GDPR/DPA, Government Digital Service standards |

**Requirements for each BPO vertical:**
1. Must appear as distinct industry cards in Step 2 of the wizard with `BPO` badge
2. Must have 6+ specialist use cases beyond the 6 universal use cases
3. Must have dedicated `agent_templates` entries with regulatory-aware system prompt templates
4. System prompt templates must include: required call opening identification phrasing, consent capture language where mandated, escalation triggers, industry-specific disposition vocabulary
5. Must be clearly labelled as "BPO Specialist" verticals in the UI to guide BPO clients to the correct path

**Acceptance criteria:**
- A BPO client creating a debt collection agent via the wizard gets a system prompt that: identifies the caller and company, states the purpose of the call, follows FDCPA/FCA framework phrasing, and does not include language that could be deemed harassing or threatening
- A BPO client creating an FNOL agent gets a system prompt that: captures incident date/time/description, gathers policy number, confirms next steps, provides a claim reference
- These agents perform measurably better (on QA scoring) than agents created via the generic "Finance & Banking" or "Government & Public" categories

**Priority:** P0 — This is a launch-critical differentiator. No GA without BPO verticals.

**Reference:** IMPL-001 §6.2D-C (industry/use-case enums), IMPL-001 §6.2E (seed data strategy), UI-SPEC-001 §6.3A (wizard UI)

---

### BRD-CB-002 — Autonomous AI Worker as a First-Class Wizard Option

**Requirement:** The TRUSTNOW Agent Creation Wizard MUST present the Autonomous AI Worker as a fourth distinct agent type card in Step 1, equal in prominence to Conversational AI Agent and Tools-Assisted Agent.

**Background:** ElevenLabs offers 3 creation paths (Blank, Personal Assistant, Business Agent). TRUSTNOW's unique product offering — the Fully Autonomous AI Worker (BRD §6.3.1) — must be surfaced immediately at the point of creation, not buried in configuration tabs. A BPO client choosing to deploy an Autonomous Worker needs a creation path that sets appropriate expectations and initialises the right configuration defaults.

**Requirements:**
1. Step 1 wizard card: "Autonomous AI Worker" with `TRUSTNOW Exclusive` badge (cyan)
2. Preview bubble shows multi-step orchestration scenario
3. Follows Path B (5-step guided wizard) with an additional Workflow configuration step post-creation
4. `agent_type = 'autonomous'` stored on the agent record
5. Agent templates for autonomous workers include multi-step workflow scaffold in system prompt

**Priority:** P1 — Required for GA, not beta.

**Reference:** BRD §6.3.1 (Autonomous Worker spec), UI-SPEC-001 §6.3A Step 1

---

### BRD-CB-003 — Dual Agent Creation Paths (Blank vs Guided)

**Requirement:** The platform MUST support two structurally distinct agent creation paths that produce different outcomes and store different data.

**Background:** Co-browsing confirmed (§1) that ElevenLabs' Blank Agent path is a 2-step flow that produces an empty agent (no system prompt, no first message, no industry/use case metadata). The guided path (§7) is a 5-step flow that produces a fully configured agent via AI generation.

**Requirements:**
1. `creation_path VARCHAR(20)` field on `agents` table: `'blank'` or `'guided'`
2. `POST /agents` endpoint (blank path) — fast, < 200ms, no LLM call
3. `POST /agents/wizard` endpoint (guided path) — calls LLM, 2–4s
4. MIS/analytics MUST report on `creation_path` distribution (what % of agents are created blank vs guided) — this informs product decisions on wizard quality
5. Agents created via blank path SHOULD show an onboarding nudge in Tab 1 encouraging the user to complete the system prompt if it has been blank for > 24 hours

**Priority:** P0 — Both paths required for launch.

**Reference:** IMPL-001 §6.2D-A, §6.2D-B, UI-SPEC-001 §6.3A

---

### BRD-CB-004 — PII Redaction in Conversation Transcripts

**Requirement:** The TRUSTNOW platform MUST offer an automated PII (Personally Identifiable Information) redaction capability that scrubs sensitive data from conversation transcripts before they are persisted to storage.

**Background:** Co-browsing of ElevenLabs (§4 — Tab 10 Advanced, Privacy section) confirmed that ElevenLabs provides three privacy controls (Zero Retention Mode, Store Call Audio, Retention Period) but has **no transcript PII redaction**. For BPO clients operating under GDPR (EU/UK), FDCPA (US debt collection), FCA CONC (UK consumer credit), and HIPAA (US healthcare), storing raw transcripts containing caller PII is a compliance liability. TRUSTNOW must exceed ElevenLabs by providing automated PII redaction as a first-class agent configuration option.

**PII categories to be redacted (minimum scope for launch):**
- Payment card numbers (PAN)
- Social Security Numbers / National Insurance Numbers
- Dates of birth
- Email addresses
- UK and international postcodes / ZIP codes
- Phone numbers (mobile and landline patterns)
- Account numbers (contextual detection — number adjacent to "account" keyword)

**Requirements:**
1. `pii_redaction_enabled BOOLEAN DEFAULT false` on `agent_configs` table
2. When enabled: PII redaction runs on the transcript **after call ends, before any write to PostgreSQL** — the raw unredacted transcript is never persisted to disk
3. Redaction replaces PII with labelled tokens: `[CARD_NUMBER]`, `[SSN]`, `[EMAIL]`, etc.
4. Redaction does NOT apply to audio recordings (`store_call_audio` is separate) — only transcript text
5. Post-call webhooks receive the redacted transcript (not raw) when PII redaction is enabled
6. UI shows `🛡 PII Protected` badge on agents with PII redaction enabled — visible in the Agents list card and in Tab 10 Privacy section header
7. Audit log entry on every agent where PII redaction setting changes (`pii_redaction_enabled` toggle on/off)

**Regulatory alignment:**
- GDPR Article 5(1)(c) — data minimisation principle
- GDPR Article 25 — privacy by design
- FDCPA — prohibits storing debtor PII beyond necessity
- FCA CONC 4.2 — consumer credit communication records

**Priority:** P0 for any BPO client vertical (debt collections, insurance, healthcare). P1 for all other verticals.

**Reference:** IMPL-001 §6.2H (PII Redaction Service), UI-SPEC-001 §6.4 TAB 10 (Privacy section), agent_configs.pii_redaction_enabled
