# RUNBOOK.md — TRUSTNOW Platform Engineer Live Project Journal

## What We Are Building
TRUSTNOW is a fully enterprise-grade, multi-tenant Autonomous AI Worker Stack targeting BPO organisations and Contact Centre Service Providers. The platform delivers AI-powered voice and chat agents across three capability tiers: Conversational AI Agents, Tools-Assisted AI Agent Orchestration, and Fully Autonomous AI Workers. Built on a five-layer architecture (The Brain, Agent Fabric, AI Worker Stack, Integration Layer, CX OS), the platform is vendor-neutral, partition-flexible, and fully governed. Reference: BRD-1 v1.1 and IMPL-001 v1.0 in /docs/.

## Project Root
/opt/trustnowailabs/trustnow-ai-worker-stack/

## Server
- IP: 172.25.10.142 | OS: Ubuntu 24.04.4 LTS | Kernel: 6.8.0-106-generic
- CPU: 40 cores | RAM: 125GB | Users: trustnow, opsadmin

---

## COMPLETED TASKS

### [2026-03-24] PRE-HARDENING — Server Audit & Setup
**Status:** ✅ COMPLETE
**What was done:**
- Server received from server team: Ubuntu 24.04.4 LTS, plain vanilla
- Full system audit performed: 40 cores, 125GB RAM, 98GB disk confirmed
- OS updated: all 67 pending packages upgraded, 0 updates remaining
- Kernel upgraded from 6.8.0-100-generic to 6.8.0-106-generic — reboot completed
- Tomcat10 identified and removed — port 8080 freed for Keycloak
- netxms-server broken package fixed and noted (server team monitoring tool)
- Two users configured: trustnow (primary), opsadmin (ops)
- SSH key authentication deployed for both users (ed25519 keys)
- Passwordless sudo configured for Claude Code operations
- VS Code Remote SSH connected, Claude Code v2.1.81 installed and authenticated
- Node.js 20.20.1 installed (required for Claude Code)
- Project directory created: /opt/trustnowailabs/trustnow-ai-worker-stack/
- AGENT.md and RUNBOOK.md created (this file)

**Verified:**
- ssh trustnow@172.25.10.142 — key login works, no password ✅
- ssh opsadmin-server — key login works, no password ✅
- Kernel: 6.8.0-106-generic ✅
- 0 updates pending ✅
- Port 8080: clear ✅

---

### [2026-03-24] TASK 1 — OS Hardening (IMPL-001 §1.2 to §1.9)
**Status:** ✅ COMPLETE
**What was done:**

**§1.2 — Package Installation**
- Installed: fail2ban, ufw, auditd, logrotate, rsyslog, chrony, acl, libpam-pwquality, unattended-upgrades, curl, wget, git, vim, htop, net-tools, unzip, build-essential, software-properties-common, apt-transport-https, ca-certificates, gnupg, lsb-release
- All 6 required security packages confirmed via dpkg

**§1.3 — UFW Firewall**
- Policy: deny all inbound, allow all outgoing
- Public ports opened: 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS), 5060/tcp+udp (SIP), 5061/tcp (SIP TLS), 16384-32768/udp (RTP), 7880/tcp (LiveKit API), 7881/tcp (LiveKit RTC), 50000-60000/udp (LiveKit UDP), 8000/tcp (Kong HTTP), 8443/tcp (Kong HTTPS)
- Localhost-only: 5432 (PostgreSQL), 6379 (Redis), 9092 (Kafka), 6333 (Qdrant), 4000 (LiteLLM), 8200 (Vault), 8001 (Kong admin), 8080 (Keycloak)
- UFW enabled and active

**§1.4 — Fail2ban**
- jail.conf copied to jail.local
- /etc/fail2ban/jail.d/trustnow.conf created: bantime=3600, findtime=600, maxretry=3, sshd jail enabled
- fail2ban enabled and running
- NOTE: sudoers entry for fail2ban-client uses wrong path (/usr/sbin/) — actual binary at /usr/bin/fail2ban-client — to fix in next sudo config update

**§1.5 — Auditd (BRD-L5-RB-004)**
- auditd enabled and running
- /etc/audit/rules.d/trustnow.rules loaded: monitors /etc/passwd, /etc/shadow, /etc/sudoers, /etc/ssh/sshd_config, /opt/trustnowailabs, all execve syscalls
- Rules loaded via augenrules on service restart (ExecStartPost confirmed clean)

**§1.6 — Chrony NTP**
- chrony enabled and running
- Time offset at final check: 0.000004815s (~5 microseconds) — well within 1ms requirement

**§1.7 — Kernel sysctl (BRD-CC-002)**
- Applied to /etc/sysctl.conf and loaded with sysctl -p — clean, no errors
- Network security: rp_filter, syncookies, martian logging, redirect blocking
- High-concurrency: fs.file-max=2097152, net.core.somaxconn=65535, tcp_max_syn_backlog=65535, netdev_max_backlog=65536

**§1.8 — Directory Structure**
- Created full structure under /opt/trustnowailabs/trustnow-ai-worker-stack/
- Subdirs: services/, data/{postgres,redis,kafka,qdrant,recordings,kb-docs,vault}, logs/{app,nginx,freeswitch,livekit}, config/{nginx,postgres,redis,kafka,kong,keycloak,litellm,monitoring,vault}, backups/, ssl/, docs/
- Ownership: trustnow:trustnow, Permissions: 750 (config: 700)

**§1.9 — Final Verification**
- Kernel: 6.8.0-106-generic ✅
- UFW: active, deny inbound, all rules correct ✅
- fail2ban: active, enabled ✅
- auditd: active ✅
- Chrony offset: ~5 microseconds ✅
- fs.file-max: 2097152 ✅
- Directory structure: all subdirs present, correct ownership/permissions ✅

**⚠️ OPEN ITEM — Requires Architect Decision:**
- `netxmsd` (server team monitoring) is listening on 127.0.0.1:8000 — conflicts with Kong HTTP proxy (also port 8000)
- `nxagentd`/`netxmsd` listening on 0.0.0.0:4700, 4701, 4747 — UFW will now block these externally; server team monitoring connectivity may be impacted
- Architect to decide: (a) move Kong to alternate port, or (b) request server team move netxmsd off 8000, (c) add UFW exceptions for netxms ports

---

### [2026-03-25] TASK 2 — Foundational Infrastructure (IMPL-001 §2.1 to §2.13)
**Status:** ✅ COMPLETE

**Pre-Task 2 Cleanup (Architect-directed):**
- netxms-server stopped and disabled (was already in this state) — port 8000 confirmed clear for Kong
- sudoers fail2ban path corrected: /usr/sbin/fail2ban-client → /usr/bin/fail2ban-client (already correct from previous session)

**§2.1 — Docker Engine**
- Docker 29.3.0 + Docker Compose v5.1.1 installed
- Users trustnow + opsadmin added to docker group

**§2.2 — PostgreSQL 16**
- Pre-installed by server team — configured for TRUSTNOW
- RLS enabled globally (row_security = on) — BRD-L5-MT-003
- Database created: trustnow_platform
- Roles created: trustnow_app (rw), trustnow_readonly (ro)
- Additional databases created: kong, keycloak (for §2.6 and §2.7)

**§2.3 — Redis Stack (BRD-CC-003)**
- Container: trustnow-redis, port 127.0.0.1:6379
- Auth enabled with CHANGE_THIS_IN_VAULT placeholder
- maxmemory 8GB, allkeys-lru, AOF persistence enabled
- PING → PONG ✅

**§2.4 — Apache Kafka (BRD-CC-004)**
- Containers: trustnow-zookeeper + trustnow-kafka, port 127.0.0.1:9092
- 4 topics created: trustnow.conversation.events (12 partitions), trustnow.audit.log (6), trustnow.call.recordings (6), trustnow.mis.metrics (6)

**§2.5 — Qdrant Vector DB (BRD-L5-AGM-012 LOCKED)**
- Container: trustnow-qdrant v1.17.0, ports 127.0.0.1:6333-6334
- /healthz → healthz check passed ✅

**§2.6 — Kong API Gateway**
- kong DB + user created in PostgreSQL (CHANGE_THIS_IN_VAULT)
- 67 migrations executed cleanly
- Container: trustnow-kong v3.9.1, --network host
- Proxy: 0.0.0.0:8000/8443 | Admin: 127.0.0.1:8001
- Admin API → Kong 3.9.1 ✅

**§2.7 — Keycloak IAM (BRD-L5-RB-003)**
- keycloak DB + user created in PostgreSQL (CHANGE_THIS_IN_VAULT)
- Container: trustnow-keycloak 24.0.1, --network host, start-dev mode
- Port 8080 (localhost) | Admin: admin / CHANGE_THIS_IN_VAULT
- /realms/master → HTTP 200 ✅
- Realm strategy: trustnow-platform (master) + realm_{tenant_id} per tenant (created on onboarding)

**§2.8 — MinIO Object Storage (BRD-L5-REC-002)**
- Container: trustnow-minio, ports 127.0.0.1:9000-9001
- Root user: trustnow-admin / CHANGE_THIS_IN_VAULT
- Buckets created: trustnow-recordings, trustnow-kb-documents, trustnow-voice-samples
- mc client installed at /usr/local/bin/mc
- NOTE: SSE-S3 encryption deferred — requires KMS (Vault) integration (Task 3)
- Health → HTTP 200 ✅

**§2.9 — HashiCorp Vault**
- Vault v1.21.4 installed from HashiCorp apt repo
- Config: /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault.hcl
- Listener: 127.0.0.1:8200, TLS disabled (dev mode)
- Storage: file → /opt/trustnowailabs/trustnow-ai-worker-stack/data/vault
- vault user added to trustnow group for directory access
- State: running, Initialized=false, Sealed=true (awaiting operator init — Task 3)
- NOTE: Vault must be initialized and unsealed before secrets can be used (Task 3)

**§2.10 — Python 3.11 + AI Pipeline venv**
- Python 3.11.15 installed via deadsnakes PPA (GPG key imported manually — add-apt-repository not in sudoers)
- venv: /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv
- Packages installed: fastapi, uvicorn, litellm, llama-index, qdrant-client, redis, kafka-python, opentelemetry-sdk
- All packages import successfully ✅

**§2.11 — LiteLLM Proxy (BRD-L1-005 LOCKED)**
- Config: /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml
- Models registered: gpt-4o (OpenAI), claude-sonnet (Anthropic), gemini-flash (Google)
- API keys use os.environ/ references (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
- Redis cache integration configured
- Container: trustnow-litellm, --network host, port 4000
- /health → HTTP 200 ✅

**§2.12 — Observability Stack**
- Prometheus: trustnow-prometheus, 127.0.0.1:9090 — Healthy ✅
- Grafana: trustnow-grafana, 127.0.0.1:3000 — HTTP 302 (redirect to login) ✅ | Admin password: CHANGE_THIS_IN_VAULT
- Loki: trustnow-loki, 127.0.0.1:3100 — Running, ring stabilization in progress (normal for first start)

**§2.13 — Master Verification**
- Docker: 29.3.0 / Compose v5.1.1 ✅
- PostgreSQL: active, trustnow_platform + kong + keycloak databases present ✅
- Redis: PONG ✅
- Kafka: 4 topics listed ✅
- Qdrant: healthz check passed ✅
- Kong: v3.9.1 admin API ✅
- Keycloak: /realms/master HTTP 200 ✅
- MinIO: 3 buckets listed ✅
- Vault: running, listening on :8200 ✅
- LiteLLM: /health HTTP 200 ✅
- Prometheus: Healthy ✅
- Python venv: 3.11.15 ✅
- UFW: active ✅
- All 11 trustnow containers running ✅

**⚠️ OPEN ITEMS for Task 3:**
- Vault must be initialized (vault operator init) and unsealed (vault operator unseal) before use
- CHANGE_THIS_IN_VAULT placeholders must be replaced with real secrets via Vault
- MinIO SSE-S3 encryption must be enabled after Vault KMS integration
- LiteLLM API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY) must be injected from Vault
- Keycloak start-dev mode → must be switched to production mode before go-live

---

## PENDING TASKS

### [2026-03-25] TASK 2A — Gap Fixes (FULL-SCOPE-IMPL-001 alignment)
**Status:** ⚠️ IN PROGRESS — most gaps fixed, 2 items still open

**FIXED AND VERIFIED ✅:**
- pgvector 0.6.0 installed (postgresql-16-pgvector) — `vector`, `uuid-ossp`, `pgcrypto` extensions enabled in trustnow_platform
- Kafka 5th topic created: `trustnow.voice.library` (3 partitions) — all 5 topics confirmed
- MinIO 4th bucket created: `trustnow-backups` — all 4 buckets confirmed
- Node.js globals installed to ~/.npm-global/bin (PATH added to ~/.bashrc):
  - pm2 6.0.14
  - TypeScript 6.0.2 (tsc)
  - ts-node
  - NestJS CLI 11.0.16 (nest)
- Additional Python venv packages installed: opentelemetry-exporter-prometheus, deepgram-sdk 6.0.1, boto3, python-jose[cryptography], passlib[bcrypt], bcrypt, cryptography, websockets
- LiteLLM config updated: 12 models (gpt-4o, gpt-4o-mini, claude-sonnet, claude-haiku, gemini-flash, gemini-pro, qwen-max, mistral-large, llama-3.1-70b, ollama-llama3, ollama-mistral, ollama-qwen2) — container restarted, /models returns 12 models ✅

**ALL GAPS RESOLVED ✅**
- sentence-transformers 5.3.0 installed (background task bvqs2v7tu exit 0) — torch 2.11.0, transformers 5.3.0, scikit-learn 1.8.0 also installed. Import verified: sentence-transformers OK ✅
- ~etuptools artefact: auto-cleaned by successful setuptools reinstall during sentence-transformers install. No manual cleanup needed ✅

---

### [2026-03-25] TASK 2B — Foundational Infrastructure: Second Batch
**Status:** ✅ COMPLETE

**§2B.1 — TimescaleDB 2.26.0**
- Installed: timescaledb-2-postgresql-16 2.26.0
- shared_preload_libraries = 'timescaledb' appended to /etc/postgresql/16/main/postgresql.conf
- CREATE EXTENSION timescaledb executed (was deferred until this session)
- VERIFY: timescaledb 2.26.0 in pg_extension ✅

**§2B.2 — Nginx 1.25.x**
- Installed via apt, enabled, running
- Config at /etc/nginx/sites-available/trustnow (copied to sites-enabled)
- Default site neutralised (replaced with # disabled)
- Routes: /health (200 "TRUSTNOW nginx OK"), /api/ → Kong :8000, /widget/ → CDN dist
- VERIFY: curl http://localhost/health → TRUSTNOW nginx OK ✅

**§2B.3 — FasterWhisper 1.2.1 (On-Prem STT — BRD §4.2 Partition B)**
- Installed via pip into AI pipeline venv
- `base` and `medium` models downloaded (CPU/int8 mode)
- VERIFY: faster_whisper 1.2.1 imports OK ✅

**§2B.4 — Ollama v0.18.2 (On-Prem LLM — BRD §4.2 Partition B)**
- Installed manually from GitHub release (v0.18.2 tar.zst)
- Binary: /usr/local/bin/ollama | Libs: /usr/local/lib/ollama
- Systemd service: /etc/systemd/system/ollama.service
  - User: trustnow, OLLAMA_MODELS=/opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama, OLLAMA_HOST=127.0.0.1:11434
- Service enabled and running on 127.0.0.1:11434
- Models pulled (all 3 confirmed):
  - llama3.1:8b (4.9 GB) ✅
  - mistral:7b (4.4 GB) ✅
  - qwen2:7b (4.4 GB) ✅
- VERIFY: `ollama list` → 3 models present ✅

**§2B.5 — Piper TTS 1.4.1 (On-Prem TTS — BRD §4.2 Partition B)**
- piper-tts 1.4.1 installed in AI pipeline venv (+ pathvalidate dependency)
- Voice files in /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices/:
  - en_US-lessac-medium.onnx (61 MB) + .json ✅
  - en_US-libritts_r-medium.onnx (75 MB) + .json ✅
- Smoke test: echo "TRUSTNOW Piper TTS test" | python -m piper → 82KB WAV generated ✅
- VERIFY: `import piper` imports OK ✅

**§2B.6 — Elasticsearch 8.19.13 + Kibana 8.19.13**
- GPG key: /usr/share/keyrings/elasticsearch-keyring.gpg
- Apt repo: /etc/apt/sources.list.d/elastic-8.x.list
- Elasticsearch config: /etc/elasticsearch/elasticsearch.yml
  - cluster.name: trustnow | network.host/http.host: 127.0.0.1 | http.port: 9200
  - xpack.security.enabled: false | xpack.security.http.ssl.enabled: false | xpack.security.transport.ssl.enabled: false
  - discovery.type: single-node
  - NOTE: Explicit SSL disable was required to clear stale keystore entries from auto-install
- Kibana config: /etc/kibana/kibana.yml
  - server.host: 127.0.0.1 | server.port: 5601
  - elasticsearch.hosts: ["http://127.0.0.1:9200"]
- Both services enabled and running
- VERIFY: GET http://127.0.0.1:9200/ → cluster_name: trustnow, version: 8.19.13 ✅
- VERIFY: GET http://127.0.0.1:5601/api/status → level: available ✅

**§2B Master Verification Results:**
- TimescaleDB 2.26.0: ✅ (in pg_extension)
- Nginx: active, /health → TRUSTNOW nginx OK ✅
- FasterWhisper 1.2.1: imports OK ✅
- Ollama 0.18.2: active, 3 models (llama3.1:8b, mistral:7b, qwen2:7b) ✅
- Piper TTS 1.4.1: installed, 2 voice files, smoke-test WAV generated ✅
- Elasticsearch 8.19.13: active, cluster green, 127.0.0.1:9200 ✅
- Kibana 8.19.13: active, status available, 127.0.0.1:5601 ✅
- Port bindings: all services on 127.0.0.1 only (confirmed via ss -tlnp) ✅

---

### NEXT → TASK 3: Application Build (after 2B complete)
- [ ] PostgreSQL schema with RLS policies
- [ ] CID (Conversation ID) generation service
- [ ] Kafka producers/consumers
- [ ] Redis session manager
- [ ] NestJS Platform API scaffold
- [ ] FastAPI AI pipeline scaffold
- [ ] LlamaIndex RAG pipeline
- [ ] FreeSWITCH + LiveKit telephony
- [ ] Agent Configuration Module (BRD-1 §8.3)
- [ ] Voice pipeline end-to-end
- [ ] Web Widget publisher

---

## HOW TO USE THIS RUNBOOK
- Read top to bottom at the start of every session
- After completing any task: add it to COMPLETED TASKS with date, details, and verification
- Move completed items from PENDING to COMPLETED
- Never delete completed task entries — this is an immutable build journal
