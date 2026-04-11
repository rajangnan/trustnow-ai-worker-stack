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
- NOTE: sudoers entry corrected — fail2ban-client binary confirmed at /usr/bin/fail2ban-client

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

---

### [2026-03-25] TASK 2 — Foundational Infrastructure (IMPL-001 §2.1 to §2.13)
**Status:** ✅ COMPLETE

**Pre-Task 2 Cleanup (Architect-directed):**
- netxms-server stopped and disabled — port 8000 confirmed clear for Kong
- sudoers fail2ban path corrected: confirmed at /usr/bin/fail2ban-client

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
- Auth enabled (password rotated to Vault in Task 3)
- maxmemory 8GB, allkeys-lru, AOF persistence enabled
- PING → PONG ✅

**§2.4 — Apache Kafka (BRD-CC-004)**
- Containers: trustnow-zookeeper + trustnow-kafka, port 127.0.0.1:9092
- 5 topics created: trustnow.conversation.events (12p), trustnow.audit.log (6p), trustnow.call.recordings (6p), trustnow.mis.metrics (6p), trustnow.voice.library (3p)

**§2.5 — Qdrant Vector DB (BRD-L5-AGM-012 LOCKED)**
- Container: trustnow-qdrant v1.17.0, ports 127.0.0.1:6333-6334
- /healthz → healthz check passed ✅

**§2.6 — Kong API Gateway**
- kong DB + user created in PostgreSQL (password rotated to Vault in Task 3)
- 67 migrations executed cleanly
- Container: trustnow-kong v3.9.1, --network host
- Proxy: 0.0.0.0:8000/8443 | Admin: 127.0.0.1:8001
- Admin API → Kong 3.9.1 ✅

**§2.7 — Keycloak IAM (BRD-L5-RB-003)**
- keycloak DB + user created in PostgreSQL (password rotated to Vault in Task 3)
- Container: trustnow-keycloak 24.0.1, --network host, start-dev mode
- Port 8080 (localhost) | Admin credentials in Vault at secret/trustnow/keycloak
- /realms/master → HTTP 200 ✅
- Realm strategy: trustnow-platform (master) + realm_{tenant_id} per tenant

**§2.8 — MinIO Object Storage (BRD-L5-REC-002)**
- Container: trustnow-minio, ports 127.0.0.1:9000-9001
- Root user: trustnow-admin (password rotated to Vault in Task 3)
- Buckets created: trustnow-recordings, trustnow-kb-documents, trustnow-voice-samples, trustnow-backups (4 total)
- mc client installed at /usr/local/bin/mc
- Health → HTTP 200 ✅

**§2.9 — HashiCorp Vault**
- Vault v1.21.4 installed from HashiCorp apt repo
- Config: /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault.hcl
- Listener: 127.0.0.1:8200, TLS disabled
- Storage: file → /opt/trustnowailabs/trustnow-ai-worker-stack/data/vault
- Initialized and unsealed in Task 3 §3.0

**§2.10 — Python 3.11 + AI Pipeline venv**
- Python 3.11.15 installed via deadsnakes PPA
- venv: /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv
- Packages: fastapi, uvicorn, litellm, llama-index, qdrant-client, redis, kafka-python, opentelemetry-sdk, sentence-transformers, torch, deepgram-sdk, boto3, piper-tts, faster-whisper and more
- All packages import successfully ✅

**§2.11 — LiteLLM Proxy (BRD-L1-005 LOCKED)**
- Config: /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml
- 12 models registered: gpt-4o, gpt-4o-mini, claude-sonnet, claude-haiku, gemini-flash, gemini-pro, qwen-max, mistral-large, llama-3.1-70b, ollama-llama3, ollama-mistral, ollama-qwen2
- Master key enforced (stored in Vault at secret/trustnow/litellm)
- Container: trustnow-litellm, --network host, port 4000
- /health (authenticated) → healthy_endpoints listed ✅

**§2.12 — Observability Stack**
- Prometheus: trustnow-prometheus, 127.0.0.1:9090 — Healthy ✅
- Grafana: trustnow-grafana, 127.0.0.1:3000 — admin password in Vault ✅
- Loki: trustnow-loki, 127.0.0.1:3100 — Running ✅

**§2.13 — Master Verification**
- All 11 trustnow containers running ✅
- PostgreSQL, Redis, Kafka, Qdrant, Kong, Keycloak, MinIO, Vault, LiteLLM, Prometheus all verified ✅

---

### [2026-03-25] TASK 2A — Gap Fixes (FULL-SCOPE-IMPL-001 alignment)
**Status:** ✅ COMPLETE

**All 6 gaps resolved and verified:**
- pgvector 0.6.0 installed — `vector`, `uuid-ossp`, `pgcrypto` extensions enabled in trustnow_platform ✅
- Kafka 5th topic created: `trustnow.voice.library` (3 partitions) — all 5 topics confirmed ✅
- MinIO 4th bucket created: `trustnow-backups` — all 4 buckets confirmed ✅
- Node.js globals: pm2 6.0.14, TypeScript 6.0.2 (tsc), ts-node, NestJS CLI 11.0.16 — installed to ~/.npm-global/bin, PATH in ~/.bashrc ✅
- Additional Python packages: opentelemetry-exporter-prometheus, deepgram-sdk 6.0.1, boto3, python-jose[cryptography], passlib[bcrypt], bcrypt, cryptography, websockets, sentence-transformers 5.3.0, torch 2.11.0, scikit-learn 1.8.0 ✅
- LiteLLM config: full 12-model list, container restarted, /models returns 12 models ✅

---

### [2026-03-25] TASK 2B — Foundational Infrastructure: Second Batch
**Status:** ✅ COMPLETE

**§2B.1 — TimescaleDB 2.26.0**
- Installed: timescaledb-2-postgresql-16 2.26.0
- shared_preload_libraries = 'timescaledb' in postgresql.conf
- CREATE EXTENSION timescaledb executed in trustnow_platform
- VERIFY: timescaledb 2.26.0 in pg_extension ✅

**§2B.2 — Nginx**
- Installed via apt, enabled, running
- Config: /etc/nginx/sites-available/trustnow → upgraded to TLS in Task 3 §3.1
- VERIFY: HTTP /health → TRUSTNOW nginx OK ✅

**§2B.3 — FasterWhisper 1.2.1 (On-Prem STT — BRD §4.2 Partition B)**
- Installed in AI pipeline venv, base + medium models downloaded (CPU/int8)
- VERIFY: faster_whisper 1.2.1 imports OK ✅

**§2B.4 — Ollama v0.18.2 (On-Prem LLM — BRD §4.2 Partition B)**
- Binary: /usr/local/bin/ollama | Systemd service: /etc/systemd/system/ollama.service
- OLLAMA_HOST=127.0.0.1:11434, OLLAMA_MODELS=.../data/ollama
- Models: llama3.1:8b (4.9 GB), mistral:7b (4.4 GB), qwen2:7b (4.4 GB) ✅

**§2B.5 — Piper TTS 1.4.1 (On-Prem TTS — BRD §4.2 Partition B)**
- piper-tts 1.4.1 + pathvalidate installed in AI pipeline venv
- Voices: en_US-lessac-medium.onnx (61 MB), en_US-libritts_r-medium.onnx (75 MB) — in data/piper-voices/
- Smoke test: 82KB WAV generated ✅

**§2B.6 — Elasticsearch 8.19.13 + Kibana 8.19.13**
- Both installed from elastic 8.x apt repo, bound to 127.0.0.1
- ES: cluster.name=trustnow, xpack.security.enabled=false, discovery.type=single-node
- Kibana: server.host=127.0.0.1, elasticsearch.hosts=http://127.0.0.1:9200
- VERIFY: GET /9200 → trustnow cluster green ✅ | GET /5601/api/status → available ✅

---

### [2026-03-26] TASK 3 — TLS, CI/CD, Kubernetes, Secrets (FULL-SCOPE-IMPL-001 §3.0–§3.5)
**Status:** ✅ COMPLETE

**§3.0 — Vault Initialisation & Secrets Bootstrap ✅ COMPLETE**
- Vault operator init: 5 key shares, threshold 3
- vault-init.json location: /opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json
- vault-init.json permissions: -rw------- (chmod 600, owner trustnow) ✅ CRITICAL — keep secure
- Vault unsealed (3/5 keys applied), status: Initialized=true, Sealed=false
- KV-v2 secrets engine enabled at path: secret/
- Secret paths created:
  - secret/trustnow/postgres/trustnow_app (username, password)
  - secret/trustnow/postgres/kong (username, password)
  - secret/trustnow/postgres/keycloak (username, password)
  - secret/trustnow/redis (password)
  - secret/trustnow/minio (root_user, root_password)
  - secret/trustnow/grafana (admin_user, admin_password)
  - secret/trustnow/keycloak (admin_user, admin_password)
  - secret/trustnow/litellm (master_key)
- All CHANGE_THIS_IN_VAULT placeholders replaced with real Vault-sourced credentials
- Services updated with live credentials: PostgreSQL roles, Redis, Kong, Keycloak, MinIO, Grafana, LiteLLM
- All containers restarted and verified healthy post-rotation ✅
- NOTE: Vault is NOT set to auto-unseal. After server reboot, run 3x `vault operator unseal` using keys from vault-init.json before services depending on Vault can operate.

**§3.1 — TLS Certificates + Nginx SSL ✅ COMPLETE**
- Self-signed certificate generated (valid 1 year, CN=trustnow.local):
  - Cert: /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.crt (644)
  - Key:  /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.key (600)
- Nginx config updated: /etc/nginx/sites-available/trustnow
  - Port 80: /health returns 200, all other paths redirect 301 → HTTPS
  - Port 443: TLS with trustnow.crt/key, TLSv1.2+1.3, /health, /api/ → Kong :8000, /widget/ → dist
- Nginx restarted, listening on 0.0.0.0:80 and 0.0.0.0:443 ✅
- VERIFY: HTTP /health → TRUSTNOW nginx OK ✅ | HTTPS /health → TRUSTNOW nginx OK (TLS) ✅
- NOTE: Production deployment should replace self-signed cert with Let's Encrypt or corporate CA cert

**§3.2 — GitHub Repository + CI Scaffold ✅ COMPLETE**
- Git repo initialised at project root, branch: main
- .gitignore created: excludes secrets (vault-init.json, *.key, .env*), data/, logs/, venv/, node_modules/, ML binaries (*.onnx, *.bin, *.safetensors, *.gguf)
- CI workflow: .github/workflows/ci.yml
  - Triggers: push to main/develop, PR to main
  - Jobs: lint + type-check (Node.js 20 + Python 3.11), test, build
- Initial commit: d622ca1 "chore: initialise TRUSTNOW AI Worker Stack"
- NOTE: Remote origin not yet set — Architect to provide GitHub repo URL

**§3.3 — K3s + Helm + TRUSTNOW Namespaces ✅ COMPLETE**
- K3s v1.34.5+k3s1 installed, single-node control-plane
- Node: ubuntu | Status: Ready | Roles: control-plane
- kubeconfig: /etc/rancher/k3s/k3s.yaml (also exported to KUBECONFIG env)
- Helm v3.20.1 installed
- TRUSTNOW namespaces created:
  - trustnow-platform (NestJS API, Kong, Keycloak, PostgreSQL)
  - trustnow-ai-pipeline (FastAPI, LiteLLM, LlamaIndex, Qdrant)
  - trustnow-monitoring (Prometheus, Grafana, Loki, OTel)
  - trustnow-telephony (FreeSWITCH, LiveKit)
- VERIFY: kubectl get nodes → ubuntu Ready ✅ | kubectl get namespaces → 4 trustnow-* namespaces ✅

---

## PENDING TASKS

### TASK 3 — Remaining Steps
**§3.4 — ArgoCD ✅ COMPLETE**
- ArgoCD stable manifests applied via server-side apply (required due to CRD annotation size limit with K3s)
- Namespace: argocd | All 7 pods Running: application-controller, applicationset-controller, dex-server, notifications-controller, redis, repo-server, server
- Admin credentials stored in Vault at secret/trustnow/argocd
- UI accessible via: kubectl port-forward svc/argocd-server -n argocd 8090:80
- NOTE: K3s default Traefik ingress disabled (it was hijacking ports 80/443 ahead of Nginx). HelmChart CRDs removed, config.yaml written to /etc/rancher/k3s/config.yaml with `disable: [traefik]`

**§3.5 — Task 3 Full Verification ✅ COMPLETE**
- §3.0 Vault: Initialized=true, Sealed=false, 7 secret paths (argocd, grafana, keycloak, litellm, minio, postgres/*, redis) ✅
- §3.1 TLS: trustnow.crt valid until 2027-03-25, HTTP 200 ✅, HTTPS "TRUSTNOW nginx OK (TLS)" ✅
- §3.2 Git: branch main, commit d622ca1, .gitignore and CI workflow present ✅
- §3.3 K3s v1.34.5 + Helm v3.20.1: node ubuntu Ready, 4 trustnow-* namespaces ✅
- §3.4 ArgoCD: 7/7 pods Running ✅

### [2026-03-26] TASK 4 — Data Layer, CID Service, Kafka Pipeline (IMPL-001 §4.1–§4.6)
**Status:** ✅ COMPLETE

**§4.1 — PostgreSQL Schema (BRD-L5-MT-003) ✅ COMPLETE**
- Schema applied by `trustnow_app` to `trustnow_platform` via sudo -u postgres psql
- 19 tables created:
  - tenants, roles, users (auth/identity tier)
  - llm_providers, llm_models, stt_providers, tts_providers, voices (provider registry)
  - agents, agent_versions, agent_configs (agent configuration tier)
  - knowledge_base_docs, tools (knowledge/tool tier)
  - widget_configs, auth_policies, handoff_policies (policy/config tier)
  - conversations, audit_logs (TimescaleDB hypertables — partitioned on started_at / timestamp)
  - recordings (media tier)
- Row-Level Security enabled on all 14 tenant-scoped tables using `current_setting('app.current_tenant', TRUE)::uuid` pattern
- TimescaleDB constraints: conversations + audit_logs use composite unique indexes (conversation_id, started_at) and (log_id, timestamp) — standalone PKs incompatible with hypertables
- FK from recordings.conversation_id → conversations NOT enforced at DB level (hypertables cannot be FK targets) — enforced at application layer
- audit_logs INSERT-ONLY enforced via two triggers (fn_audit_logs_readonly): UPDATE/DELETE raise EXCEPTION
- VERIFY: 19 tables ✅ | 14 tables with rowsecurity=true ✅ | 2 hypertables (conversations, audit_logs) ✅ | 2 audit triggers (trg_audit_logs_no_update, trg_audit_logs_no_delete) ✅

**§4.2 — Provider Registry Seed (BRD-L1-005 / BRD-L1-006) ✅ COMPLETE**
- Seed file: /services/platform-api/src/database/seed-llm-providers.sql
- 7 LLM providers: Anthropic, OpenAI, Google, Mistral AI, Meta/Groq, Alibaba/Qwen (cloud) + Ollama On-Prem
- 12 LLM models: claude-opus-4, claude-sonnet-4-6, gpt-4o, gpt-4o-mini, gemini-1.5-flash, gemini-1.5-pro, qwen-max, qwen-plus, mistral-large-latest, llama-3.1-70b-versatile, ollama/llama3.1:8b, ollama/mistral:7b
- 5 STT providers: Deepgram, Whisper Cloud, AssemblyAI, Rev.ai, FasterWhisper (On-Prem)
- 5 TTS providers: ElevenLabs, Google TTS, Azure TTS, Amazon Polly, Piper TTS (On-Prem)
- VERIFY: 7 LLM providers ✅ | 12 models ✅ | 5 STT ✅ | 5 TTS ✅

**§4.3 — CID Generation Service (BRD-CC-001) ✅ COMPLETE**
- File: /services/ai-pipeline/cid_service.py
- generate_cid(agent_id, tenant_id, channel): atomic write → Redis session (TTL 7200s) + PostgreSQL conversations row + Kafka call_started event on trustnow.conversation.events (CID as partition key)
- end_session(cid, tenant_id): flushes handle_time, updates status=completed, sets ended_at, deletes Redis key, publishes call_ended Kafka event
- Bug fixed: Redis bind was 127.0.0.1 inside container — Docker NAT routes host→container via bridge IP (172.17.0.2), not loopback; changed to bind 0.0.0.0 in config/redis/redis.conf
- redis-py pinned to 5.2.1 (7.x had RESP3 compatibility issues with Redis Stack)
- VERIFY: python cid_service.py test → CID SERVICE TEST: PASS ✅

**§4.4 — Kafka Event Producers (BRD-CC-004) ✅ COMPLETE**
- File: /services/ai-pipeline/kafka_producers.py
- 5 producer classes (all connect localhost:9092, JSON-serialised, fields: cid, tenant_id, timestamp, event_type, payload):
  - ConversationEventProducer → trustnow.conversation.events (CID as Kafka message key)
  - AuditLogProducer → trustnow.audit.log
  - RecordingEventProducer → trustnow.call.recordings
  - MISMetricsProducer → trustnow.mis.metrics
  - VoiceLibraryProducer → trustnow.voice.library
- VERIFY: python kafka_producers.py test → KAFKA PRODUCERS TEST: PASS (5/5 topics delivered) ✅

**§4.5 — Kafka Event Consumers + systemd (BRD-CC-004) ✅ COMPLETE**
- File: /services/ai-pipeline/kafka_consumers.py
- 3 consumer classes (auto-offset-reset=earliest, enable-auto-commit=true, exponential backoff on failure):
  - MISMetricsConsumer (group trustnow-mis-consumer) — updates conversations.handle_time_s
  - AuditLogConsumer (group trustnow-audit-consumer) — INSERTs to audit_logs (DB enforces INSERT-only)
  - RecordingConsumer (group trustnow-recording-consumer) — logs events, MinIO upload in Task 14
- systemd service files installed:
  - /etc/systemd/system/trustnow-mis-consumer.service
  - /etc/systemd/system/trustnow-audit-consumer.service
  - /etc/systemd/system/trustnow-recording-consumer.service
- All 3 enabled and started via systemctl
- VERIFY: systemctl is-active trustnow-mis-consumer → active ✅ | trustnow-audit-consumer → active ✅ | trustnow-recording-consumer → active ✅

**§4.6 — Full Task 4 Verification ✅ COMPLETE**
- Schema: 19 tables ✅
- RLS: 14 tables rowsecurity=true ✅
- Hypertables: conversations + audit_logs ✅
- Audit triggers: trg_audit_logs_no_update + trg_audit_logs_no_delete ✅
- LLM providers: 7 (6 cloud + 1 onprem) ✅ | models: 12 ✅
- CID service: PASS ✅
- Kafka producers: 5/5 topics delivered ✅
- Kafka topics: 5 topics listed ✅
- Consumer services: 3/3 active ✅
- Redis: PONG ✅
- All 11 containers running ✅

---

### [2026-03-26] TASK 4B — Pre-Task-5 Infrastructure Hardening (IMPL-001 §4B.1–§4B.5)
**Status:** ✅ COMPLETE

**§4B.1 — GitHub Remote ✅ COMPLETE**
- SSH key generated: /home/trustnow/.ssh/github_trustnow (ed25519)
- SSH config: /home/trustnow/.ssh/config — Host github.com → IdentityFile ~/.ssh/github_trustnow
- Deploy key added to GitHub by Architect (repo: rajangnan/trustnow-ai-worker-stack, write access)
- Remote: git@github.com:rajangnan/trustnow-ai-worker-stack.git
- Push: `git push -u origin main` — branch main tracking origin/main ✅
- Commit d622ca1 "chore: initialise TRUSTNOW AI Worker Stack" visible on GitHub ✅

**§4B.2 — PgBouncer Connection Pooler ✅ COMPLETE**
- PgBouncer 1.22.0 installed via apt
- Config: /etc/pgbouncer/pgbouncer.ini
  - listen_addr=127.0.0.1, listen_port=5433
  - auth_type=md5, pool_mode=transaction
  - max_client_conn=200, default_pool_size=20
  - Backends: trustnow_platform → 127.0.0.1:5432
- Auth file: /etc/pgbouncer/userlist.txt (mode 640, owner postgres:postgres) — trustnow_app credentials from Vault
- Log dir: /var/log/pgbouncer/ (created, owned by postgres)
- Vault patched: secret/trustnow/platform/postgres pgbouncer_port=5433
- systemctl enable+start pgbouncer — ACTIVE ✅
- VERIFY: psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform → PgBouncer OK ✅
- **FROM TASK 5 ONWARDS: All application services connect via port 5433 (NOT 5432 directly)**

**§4B.2 — GAP-014 audit_logs Hardening ✅ COMPLETE**
- REVOKE UPDATE, DELETE ON audit_logs FROM trustnow_app (permission-level enforcement)
- Added trigger: enforce_audit_immutability (BEFORE UPDATE OR DELETE — raises EXCEPTION with log_id)
- Triple enforcement now in place: REVOKE permissions + fn_audit_logs_readonly triggers (x2) + enforce_audit_immutability (x2)
- VERIFY: 4 triggers on audit_logs: enforce_audit_immutability(×2), trg_audit_logs_no_delete, trg_audit_logs_no_update ✅

**§4B.3 — Kafka KRaft Migration Assessment ✅ REPORTED**
- Current mode: Zookeeper (deprecated in Kafka 3.x)
- Topic data volumes (all test/seed data only):

  | Topic                        | Total bytes |
  |------------------------------|-------------|
  | trustnow.conversation.events | 2,260 B     |
  | trustnow.audit.log           | 664 B       |
  | trustnow.call.recordings     | 710 B       |
  | trustnow.mis.metrics         | 642 B       |
  | trustnow.voice.library       | 692 B       |
  | **TOTAL**                    | **4,968 B** |

- Assessment: < 5KB total — test/seed data only — **optimal window for KRaft migration (Option A)**
- **ARCHITECT DECISION REQUIRED:** Proceed with KRaft now (recommended) or defer to pre-go-live?

**§4B.4 — Vault Raft Storage Assessment ✅ REPORTED**
- Current storage: `file` (single-node only, HA not enabled)
- Vault config: storage "file" { path = ".../data/vault" }
- Data dir size: 4.0K (only 11 secret paths: argocd, grafana, keycloak, litellm, minio, platform/postgres, platform/redis, postgres/keycloak, postgres/kong, postgres/trustnow_app, redis)
- Re-init with Raft would take ~20 minutes (export 11 paths → re-init → re-import)
- **ARCHITECT DECISION REQUIRED:** Migrate to Raft storage now or defer to pre-go-live?

**§4B.5 — Task 4B Verification ✅ ALL PASS**
- GitHub remote: origin → github.com/rajangnan/trustnow-ai-worker-stack ✅ (push pending credentials)
- PgBouncer: active on :5433, query returns PgBouncer OK ✅
- GAP-014: 4 audit_logs triggers confirmed ✅
- Kafka: 5 topics listed ✅
- Vault: Initialized=true, Sealed=false, Storage=file ✅
- Consumer services: 3/3 active ✅

---

### [2026-03-26] TASK 4B-KRaft — Kafka KRaft Migration (Approved by Architect)
**Status:** ✅ COMPLETE

**What was done:**
- Stopped trustnow-kafka + trustnow-zookeeper via `docker compose down`
- Old Zookeeper + broker data dirs wiped (4,968 bytes — test/seed data only, approved for discard)
- KRaft cluster UUID generated: `fjyPGsz3SjWOAqMVmdd2Hg`
- New docker-compose.yml written at config/kafka/docker-compose.yml:
  - Single container: trustnow-kafka, image confluentinc/cp-kafka:7.6.0
  - KAFKA_PROCESS_ROLES=broker,controller (combined single-node mode)
  - KAFKA_NODE_ID=1, KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093
  - CLUSTER_ID=fjyPGsz3SjWOAqMVmdd2Hg (auto-formats storage on first start)
  - network_mode: host (consistent with other containers)
  - No Zookeeper — Zookeeper container permanently removed
- KRaft storage auto-formatted by cp-kafka image on container start
- All 5 topics recreated with correct partition counts:
  - trustnow.conversation.events: 12 partitions ✅
  - trustnow.audit.log: 6 partitions ✅
  - trustnow.call.recordings: 6 partitions ✅
  - trustnow.mis.metrics: 6 partitions ✅
  - trustnow.voice.library: 3 partitions ✅
- KRaft cluster UUID stored in Vault: secret/trustnow/platform/kafka (kraft_cluster_uuid)
- Consumer services restarted: all 3 active ✅

**Verified:**
- KafkaRaftServer nodeId=1 started (no Zookeeper in logs) ✅
- kafka-topics --list: all 5 topics listed ✅
- kafka_producers.py test: PASS (5/5 topics delivered) ✅
- Consumers: trustnow-mis-consumer, trustnow-audit-consumer, trustnow-recording-consumer — all active ✅
- No trustnow-zookeeper container running ✅

---

### [2026-03-26] TASK 4B-Raft — Vault Raft Storage Migration (Approved by Architect)
**Status:** ✅ COMPLETE

**⚠️ CRITICAL: vault-init.json contains NEW unseal keys and root token. Old keys are INVALID. Architect must back up /opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json securely off-server immediately.**

**What was done:**
- All 12 secret paths exported to vault-secrets-export.tmp (chmod 600) before migration
- Vault stopped: `sudo systemctl stop vault`
- Old vault-init.json backed up to config/vault/vault-init-pre-raft-backup.json
- Old file-storage data wiped from data/vault/
- vault.hcl updated (both /etc/vault.d/vault.hcl and config/vault/vault.hcl):
  - `storage "file"` → `storage "raft" { path=.../data/vault node_id=trustnow-node-1 }`
  - Added `cluster_addr = "http://127.0.0.1:8201"`
  - Added `disable_mlock = true` (required by Vault 1.21 with Raft)
- Vault started: `sudo systemctl start vault`
- vault operator init -key-shares=5 -key-threshold=3 → NEW vault-init.json written (chmod 600)
- Vault unsealed with 3 of 5 new unseal keys
- KV-v2 enabled at path secret/
- All 12 secret paths re-imported from export file:
  - secret/trustnow/argocd ✅ | secret/trustnow/grafana ✅ | secret/trustnow/keycloak ✅
  - secret/trustnow/litellm ✅ | secret/trustnow/minio ✅ | secret/trustnow/redis ✅
  - secret/trustnow/platform/kafka ✅ | secret/trustnow/platform/postgres ✅ | secret/trustnow/platform/redis ✅
  - secret/trustnow/postgres/keycloak ✅ | secret/trustnow/postgres/kong ✅ | secret/trustnow/postgres/trustnow_app ✅
- vault-secrets-export.tmp shredded (`shred -u`) — file no longer exists
- Consumer services restarted with new Vault token (read from vault-init.json) — all 3 active ✅

**Verified:**
- Storage Type: raft ✅ | HA Enabled: true ✅ | Initialized: true ✅ | Sealed: false ✅
- All 12 secret paths readable ✅
- vault-env.sh works (reads root token from updated vault-init.json) ✅
- CID service test: PASS (Redis + PostgreSQL via PgBouncer + Kafka all exercised) ✅
- Consumer services: 3/3 active ✅

**Pre-Raft backup:** config/vault/vault-init-pre-raft-backup.json (OLD keys — for reference only, cannot unseal new Vault)

---

### [2026-03-27] TASK 5 — AI Pipeline (IMPL-001 §Task 5)
**Status:** ✅ COMPLETE

**§5.0 — GAP-014 Audit Hardening:** Already applied in Task 4B — 4 triggers confirmed ✅

**§5.1 — partition_router.py ✅ COMPLETE**
- File: /services/ai-pipeline/partition_router.py
- Partition A (cloud): Deepgram STT / Cloud LLMs / ElevenLabs eleven_flash_v2_5 / OpenAI embeddings
- Partition B (onprem): FasterWhisper STT / Ollama LLMs / Piper TTS / sentence-transformers embeddings
- Data sovereignty enforcement: enforce_no_external_call() blocks all public internet for Partition B; RFC 1918 + localhost allowed
- Self-test: PASS (8/8) ✅ | ElevenLabs SDK 1.59.0 installed ✅

**§5.2 — Enhanced Voices Schema + Global Voice Library ✅ COMPLETE**
- 14 columns ALTERed onto voices table (elevenlabs_voice_id, accent, age_group, use_case_tags, tone_tags, emotion_range, stability_default, similarity_default, speed_default, preview_text, source_type, notice_period_days, piper_model_file, provider)
- Seed applied: 40 global voices — 33 ElevenLabs (15 premade + 18 TRUSTNOW-designed) + 7 Piper onprem
- 18 languages: en, es, pt, fr, de, ar, hi, zh, ja, ko, ms, it, nl, tr, pl, sw, tl, ru
- Piper models on disk: 7 × .onnx — EN-US (×2), ES, FR, DE, IT, PT-BR
- Seed file: /services/platform-api/src/database/seed-global-voices.sql

**§5.3 — stt_adapter.py ✅ COMPLETE**
- File: /services/ai-pipeline/stt_adapter.py
- Partition A: Deepgram SDK 6.x — realtime WebSocket (client.listen.v1.connect) + batch REST (transcribe_file)
- Partition B: FasterWhisper — base/medium/large-v3 loaded at startup, ThreadPoolExecutor(workers=3)
- audioop conversion: mulaw_to_linear16_16k() for SIP→FasterWhisper (μ-law 8kHz → linear16 16kHz)
- Language detection: handle_language_detection() persists switch to Redis session
- Self-test: PASS (6/6) ✅

**§5.4 — tts_adapter.py ✅ COMPLETE**
- File: /services/ai-pipeline/tts_adapter.py
- Partition A: ElevenLabs SDK 1.59.0 — convert_as_stream() — sentence-chunked streaming, eleven_flash_v2_5 LOCKED
- Output formats: ulaw_8000 (SIP) / pcm_16000 (WebRTC) — zero transcoding for Partition A
- Partition B: Piper synthesis → audioop resample (native 22050 Hz → 8kHz μ-law or 16kHz PCM)
- Sentence chunking: regex split on sentence boundaries — TTFA ~800ms on Partition B
- Interrupt support: checks Redis interrupt:{cid} before each sentence chunk
- Self-test: PASS (6/6) ✅

**§5.5 — main.py FastAPI :8002 ✅ COMPLETE**
- File: /services/ai-pipeline/main.py
- Port: 8002 (GAP-001 FIXED — Kong Manager moved to :8003, Kong proxy stays on :8000)
- Endpoints: GET /health, POST /stt/transcribe, POST /llm/complete, POST /tts/synthesise, POST /rag/retrieve, GET+POST /session/{cid}/state, POST /session/{cid}/end
- LLM: routes through LiteLLM :4000, records cost to Redis session (llm_cost_usd, llm_turns)
- Session end: flushes Redis → PostgreSQL conversations table + Kafka call_ended event
- systemd: /etc/systemd/system/trustnow-ai-pipeline.service — 4 uvicorn workers, enabled + active ✅

**§5.6 — voice_service.py ✅ COMPLETE**
- File: /services/ai-pipeline/voice_service.py (FastAPI APIRouter, included in main.py)
- 10 endpoints: GET /voices, GET /voices/languages, GET /voices/languages/{code}/top-picks, GET /voices/{id}, GET /voices/{id}/preview, POST /voices/design, POST /voices/clone, PUT /voices/{id}, DELETE /voices/{id}, POST /voices/{id}/settings
- ElevenLabs Voice Design and IVC clone APIs integrated
- Preview: ElevenLabs → mp3_44100_128 / Piper → pcm
- Tenant isolation via query filter; global voices read-only

**§5.7 — rag_pipeline.py ✅ COMPLETE**
- File: /services/ai-pipeline/rag_pipeline.py
- DocumentIngestionService: SentenceSplitter (chunk=512, overlap=64) → embed → Qdrant upsert
- RAGRetrievalService: embed query → Qdrant query_points() → top-K chunks
- Partition A embedding: OpenAI text-embedding-3-small via LiteLLM :4000 (dim=1536)
- Partition B embedding: sentence-transformers all-MiniLM-L6-v2 local (dim=384)
- Collection naming: kb_{tenant_id}_{agent_id}
- Qdrant: 127.0.0.1:6333 (Docker), version 1.17.0
- qdrant-client 1.17.1 — uses query_points() API (not deprecated search())
- Self-test: PASS (5/5) ✅

**§5.8 — Full Verification ✅ PASS (11/11)**
- Check 1: GET /health → {"status":"ok","service":"trustnow-ai-pipeline","port":8002} ✅
- Check 2: FastAPI on :8002 (not :8000), Kong proxy :8000, Kong Manager moved :8003 ✅
- Check 3: partition_router self-test PASS 8/8 ✅
- Check 4: stt_adapter self-test PASS 6/6 (FasterWhisper base+medium+large-v3 loaded) ✅
- Check 5: tts_adapter self-test PASS 6/6 (Piper SIP/WebRTC audio verified) ✅
- Check 6: rag_pipeline self-test PASS 5/5 (Qdrant ingest + retrieval Partition B) ✅
- Check 7: Voice Library — 40 global voices, 26F/14M, 18 languages ✅
- Check 8: Voice API — GET /voices returns 40 voices, GET /voices/languages returns 18 ✅
- Check 9: Piper models on disk — 7 × .onnx (EN×2, ES, FR, DE, IT, PT-BR) ✅
- Check 10: Ollama responding — 3 models: qwen2:7b, mistral:7b, llama3.1:8b ✅
- Check 10B: Ollama real-generation verified — llama3.1:8b returned 62 real inference tokens (not health ping): `curl -s http://localhost:11434/api/generate -d '{"model":"llama3.1:8b","prompt":"Reply with: Partition B operational","stream":false}'` → response: "**Partition B ONLINE**..." `"done":true,"eval_count":62` ✅
- Check 11: systemd trustnow-ai-pipeline — active + enabled, 4 workers ✅

**§5.9 — Schema Migration 001 ✅ COMPLETE**
- File: `services/platform-api/src/database/migrate-001-task5-columns.sql`
- Applied via PgBouncer :5433 — all 6 ALTER TABLE blocks in one transaction
- agents: +post_call_webhook_url, +environment ✅
- agent_configs: +35 columns (personality, LLM, timing, ASR, guardrails, RAG, overrides) ✅
- agent_versions: +traffic_split_pct, +is_live (A/B testing support) ✅
- conversations: +15 columns (handle_time_s, llm_cost_usd, llm_turns, evaluation_results, latency, operational fields) ✅
- widget_configs: +expanded_behavior, +avatar_type, +include_www_variants, +allow_http_links ✅
- auth_policies: +conversation_initiation_webhook_url, +post_call_webhook_url, +allowed_overrides ✅
- main.py bug fixed: session_end UPDATE uses `ended_at` (was end_time) + `conversation_id` (was cid) ✅

---

### [2026-03-28] TASK 6 — PLATFORM API (NestJS Control Plane — IMPL-001 §Task 6)
**Status:** ✅ COMPLETE

**§6.1 — NestJS Scaffold ✅ COMPLETE**
- Framework: NestJS 10 on Node 20, TypeScript, port :3001
- DB: pg Pool → PgBouncer :5433 (all queries), no TypeORM entity overhead
- Swagger: http://127.0.0.1:3001/api/docs-json ✅
- systemd: trustnow-platform-api — active + enabled ✅
- Kong: service `trustnow-platform-api` + routes `/api/*` + `/health` → :3001 ✅
- Health: `curl http://127.0.0.1:3001/health` → {"status":"ok","service":"trustnow-platform-api"} ✅

**§6.2 — 13 NestJS Modules ✅ COMPLETE**
- AuthModule: JWT strategy (Keycloak RS256/HS256), token verify endpoint, tenant RLS injection ✅
- AuditModule: Global — immutable INSERT to audit_logs on all write operations ✅
- TenantsModule: GET/POST/PUT tenants (platform_admin only) ✅
- UsersModule: CRUD users per tenant, role assignment ✅
- AgentsModule: POST /agents, GET /agents, GET /agents/:id, DELETE (archive), + all sub-routes below ✅
- KnowledgeBaseModule: GET/POST/DELETE /kb/documents, attach, RAG config update ✅
- ToolsModule: CRUD tools, system tools, MCP server management ("Play keypad touch tone" included) ✅
- WidgetModule: GET/PUT /agents/:id/widget, GET embed code ✅
- VoicesModule: GET /voices (40 voices), languages, top-picks, preview, design, clone ✅
- LlmProvidersModule: GET /llm-providers, GET /llm-providers/models (all 12 models + latency/cost) ✅
- ConversationsModule: GET /conversations, GET /:id (full co-browsing metadata shape), transcript, recording ✅
- WebhooksModule: POST/DELETE /agents/:id/webhooks/post-call, PUT /agents/:id/webhooks/initiation ✅
- TestsModule: GET templates (5 defaults), GET/POST tests (next_reply|tool_invocation), POST run, folders ✅

**§6.2A — Full agent_configs DTO ✅ COMPLETE**
- UpdateAgentConfigDto: 40+ fields covering all agent_configs schema columns
- Fields: system_prompt, personality, timezone, first_message, voice, expressive_mode, languages, hinglish_mode, language_groups, LLM (model+backup+temperature+thinking+max_tokens), STT/TTS, eagerness, speculative_turn, silence timeouts (×3), max_duration (message+value), soft_timeout, filter_background_speech, asr_model, audio_format, guardrails (focus+manipulation), allowed_overrides (8 keys), RAG (9 fields), evaluation_criteria_json, data_collection_json, workflow_definition_json, tools_config_json, kb_docs_attached, widget_config_id, auth_policy_id, handoff_policy_id, post_call_webhook_url, conversation_initiation_webhook_url ✅

**§6.2B — Branches API ✅ COMPLETE**
- GET /agents/:id/branches — list all branches with traffic split + live badge
- POST /agents/:id/branches — create branch (copies current main config)
- PUT /agents/:id/branches/:branchId — update branch config (full UpdateAgentConfigDto)
- PUT /agents/:id/branches/:branchId/traffic — { traffic_split_pct: 0–100 }
- POST /agents/:id/branches/:branchId/publish — make branch live
- DELETE /agents/:id/branches/:branchId — archive (blocks if is_live=true) ✅

**§6.2C — Analytics API 8 Sub-Tabs ✅ COMPLETE**
- GET /analytics/summary — global tenant KPIs
- GET /analytics/conversations — analytics conversation list
- GET /analytics/agents/:id?tab=general — calls, duration, cost, daily trend
- GET /analytics/agents/:id?tab=evaluation — criteria pass/fail stats + recent
- GET /analytics/agents/:id?tab=data_collection — field extraction stats
- GET /analytics/agents/:id?tab=audio — TTS/ASR latency trends + p95
- GET /analytics/agents/:id?tab=tools — tool invocation stats from transcript
- GET /analytics/agents/:id?tab=llms — cost breakdown per LLM model
- GET /analytics/agents/:id?tab=knowledge_base — RAG config + attached docs
- GET /analytics/agents/:id?tab=advanced — call ending breakdown + channel/environment split ✅

**§6.2D — Wizard Creation Endpoint ✅ COMPLETE**
- POST /agents/wizard — CreateAgentWizardDto (agent_type, industry, use_case, agent_name, main_goal, website_url, kb_doc_ids, chat_only)
- Logic: template lookup → placeholder substitution → Ollama llama3.1:8b enhancement (best-effort) → agents + agent_configs + agent_versions rows → async website crawl (non-blocking) → returns {agent_id, config, redirect_url, website_personalisation_pending} ✅

**§6.2E — Agent Templates Seed ✅ COMPLETE**
- Table: agent_templates (migrate-002-task6-tables.sql)
- 21 templates seeded (9 featured): Healthcare×3, Finance×3, Retail×3, Education×3, Hospitality×3, Technology×3, Professional Services×3
- Each system_prompt_template: 800–1500 chars, professional, role-specific, {{placeholders}} ✅

**§6.3 — RBAC Guards ✅ COMPLETE**
- 6 roles: platform_admin, tenant_admin, agent_admin, supervisor, operator, auditor
- JwtAuthGuard (global via APP_GUARD) + RolesGuard on every controller
- platform_admin bypasses all role checks ✅

**Migration 002:**
- migrate-002-task6-tables.sql applied: agent_templates, agent_tests, agent_test_folders ✅
- seed-agent-templates.sql: 21 rows INSERT ON CONFLICT DO UPDATE ✅

**Verification (all pass):**
- Health: `curl http://127.0.0.1:3001/health` → 200 ✅
- Swagger: http://127.0.0.1:3001/api/docs-json → valid OpenAPI JSON ✅
- Auth guard: `curl http://127.0.0.1:3001/voices` → 401 ✅
- Kong proxy: `curl http://127.0.0.1:8000/health` → 200 ✅
- Templates DB: SELECT COUNT(*) FROM agent_templates → 21 (9 featured) ✅
- systemd trustnow-platform-api: active ✅

### [2026-03-28] TASK 7 — TELEPHONY (FreeSWITCH + LiveKit — IMPL-001 §Task 7)
**Status:** ✅ COMPLETE

**§7.1 — FreeSWITCH Docker Install**
- Config directories created: config/freeswitch/{dialplan,sip_profiles,autoload_configs,sounds/music,ssl}, data/recordings
- Image pulled: safarov/freeswitch:latest (FreeSWITCH 1.10.12; primary ghcr.io/signalwire and drachtio images denied)
- ESL password (64-char hex) generated and stored in Vault at secret/trustnow/freeswitch

**§7.2–§7.4 — FreeSWITCH Configuration Files**
- vars.xml: ESL password substituted from Vault; domain=172.25.10.142; RTP 16384-32768
- freeswitch.xml: master config including vars.xml, autoload_configs/*.xml, dialplan/*.xml
- event_socket.conf.xml: ESL listen-ip=127.0.0.1, listen-port=8021, loopback.auto ACL
- sofia.conf.xml: required config (missing from spec — added to make mod_sofia load)
- sip_profiles/internal.xml: SIP on 172.25.10.142:5060 (UDP/TCP) + :5061 (TLS); codecs PCMU,PCMA,G722; pass-callee-id=true (BRD-CC-008)
- TLS: ssl/trustnow.crt+key combined to ssl/agent.pem (600)

**§7.5 — MOH**
- local_stream.conf.xml: streams from /usr/share/freeswitch/sounds/music/default, rate=8000, shuffle=true

**§7.6 — Dialplan**
- dialplan/trustnow_inbound.xml: inbound handler (CID via curl, UUI header, record_session, socket bridge), queue transfer (Option B), SIP transfer (Option A)

**§7.7 — Modules**
- modules.conf.xml: mod_sofia, mod_commands, mod_dptools, mod_event_socket, mod_local_stream, mod_native_file, mod_tone_stream, mod_curl, mod_xml_curl, mod_logfile, mod_console, mod_cdr_csv

**§7.8 — Container Started**
- docker compose up -d → container running; sofia status: internal profile RUNNING on :5060 and :5061 TLS
- Note: Docker built-in healthcheck shows "unhealthy" (uses wrong default password) — FreeSWITCH fully operational

**§7.9 — LiveKit v1.10.0**
- Binary: livekit-server v1.10.0 installed to /usr/local/bin/livekit (v1.7.2 from spec not published; v1.10.0 used — latest stable 2026-03-23)
- Vault: key_id=trustnow-livekit-key, key_secret (64-char hex) stored at secret/trustnow/livekit
- config/livekit/config.yaml: port=7880, RTC UDP 50000-60000, node_ip=172.25.10.142
- systemd livekit.service: active, auto-start on boot

**§7.10–§7.11 — NestJS TelephonyModule**
- services/platform-api/src/telephony/esl.service.ts: EventEmitter2-based ESL client, auth + event subscriptions (CHANNEL_ANSWER, CHANNEL_HANGUP, CHANNEL_BRIDGE, DTMF, DETECTED_SPEECH), auto-reconnect on error/close, transferCall/playMoh/stopMoh/startRecording/stopRecording helpers
- services/platform-api/src/telephony/handoff.controller.ts: POST /handoff/execute — Option A (SIP) + Option B (Redis queue)
- services/platform-api/src/telephony/handoff.service.ts: executeOptionA (SIP transfer via ESL + CID in UUI), executeOptionB (Redis RPUSH + PUBLISH to trustnow:handoff:notify)
- services/platform-api/src/telephony/telephony.module.ts: EventEmitterModule.forRoot() + EslService + HandoffService + HandoffController
- app.module.ts: TelephonyModule registered
- Packages installed: ioredis@5.10.1, @nestjs-modules/ioredis@2.2.1, @nestjs/event-emitter@3.0.1
- Systemd drop-ins: esl.conf (FREESWITCH_ESL_PASSWORD), redis.conf (REDIS_PASSWORD)

**§7.12 — handoff_service.py**
- services/ai-pipeline/handoff_service.py: execute_handoff() async REST call to /api/handoff/execute, check_handoff_conditions() for caller_request / keyword_detection / max_duration_exceeded triggers
- httpx already installed in AI pipeline venv

**§7.13 — Build + Restart**
- npm run build → clean compile (no errors)
- sudo systemctl restart trustnow-platform-api → active, running

**Verification (12/12 PASS):**
1. FreeSWITCH container: Up (running) ✅
2. SIP :5060 UDP + TCP: listening on 172.25.10.142 ✅
3. ESL :8021 localhost only: listening, not externally exposed ✅
4. LiveKit service: active, :7880 listening ✅
5. UFW UDP 50000-60000: ALLOW (LiveKit UDP) ✅
6. Vault secrets: FreeSWITCH esl_password + LiveKit key_id confirmed ✅
7. Platform API health: {"status":"ok"} ✅
8. Handoff endpoint in Swagger: /handoff/execute found ✅
9. ESL auth in logs: "ESL authenticated — subscribed to TRUSTNOW call events" ✅
10. FreeSWITCH CRIT/FATAL errors: none ✅
11. Recording directory: present and accessible ✅
12. handoff_service.py import: execute_handoff + check_handoff_conditions OK ✅

**Deferrals (per §7.16):**
- DEFERRED-009: SBC/SRTP perimeter hardening — pre-go-live hardening phase
- Per-tenant MOH: Task 12 (Human Agent Desktop)
- LiveKit Python SDK in AI pipeline: Task 9
- FreeSWITCH dialplan curl to /api/sessions/initiate: endpoint built in Task 9

**Port map additions:**
- FreeSWITCH SIP: 172.25.10.142:5060 (UDP/TCP) + :5061 (TLS)
- FreeSWITCH ESL: 127.0.0.1:8021 (localhost only)
- LiveKit: 0.0.0.0:7880 (HTTP/WS) + UDP 50000-60000 (RTP)

### [2026-04-11] ADDENDUM 4A — Database Schema Backfill (28 new tables)
**Status:** ✅ COMPLETE

**Objective:** Verify the live PostgreSQL instance has all 28 new tables added during the CO-BROWSING-DATA-001.md v3.0 translation. Run migrations for any missing.

**Pre-condition fix (2026-04-11):** PostgreSQL was down since 2026-04-09 due to SSL key permissions error (`/etc/ssl/private/ssl-cert-snakeoil.key` had group/world access). Fixed with:
```bash
sudo chmod 640 /etc/ssl/private/ssl-cert-snakeoil.key
sudo systemctl start postgresql@16-main
```

**Migration applied:** `services/platform-api/src/database/migrations/002_cobrowsing_additions.sql`
- Idempotent (`CREATE TABLE IF NOT EXISTS`) — safe to re-run
- All 28 new tables defined with RLS policies and appropriate indexes

**Verification (2026-04-11):**
```
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
→ 48 tables (≥ 47 required ✅)
```

**All 28 new tables confirmed present:**
agent_branches, agent_knowledge_base, agent_test_attachments, agent_tests, api_keys,
batch_calls, batch_call_recipients, branch_versions, conversation_turns, data_collection_specs,
environment_variable_values, environment_variables, evaluation_criteria, knowledge_base_docs,
phone_numbers, stt_transcripts, test_folders, test_runs, tts_generations,
webhook_delivery_log, webhook_endpoints, whatsapp_accounts, workflow_edges, workflow_nodes,
workflow_versions, workspace_auth_connections, workspace_secrets, workspace_settings ✅

**Base tables (20):** agent_configs, agent_templates, agent_test_folders, agent_versions, agents,
audit_logs, auth_policies, conversations, handoff_policies, llm_models, llm_providers,
recordings, roles, stt_providers, tenants, tools, tts_providers, users, voices, widget_configs

---

### [2026-04-11] ADDENDUM 5A — AI Pipeline Backfill (Two New Services)
**Status:** ✅ COMPLETE

**Objective:** Add `resolveEnvVars()` and the PII Redaction service to the FastAPI AI pipeline.

**Files created:**
- `services/ai-pipeline/src/env_var_service.py`
  - `resolve_env_vars(text, tenant_id, environment, db_pool)` — async function
  - Resolves `{{env.VAR_NAME}}` tokens against `environment_variables` + `environment_variable_values` tables
  - Falls back to `production` value if no env-specific value exists (§20.4)
  - Called from: system_prompt, first_message, tool webhook URL/headers, MCP server_url
- `services/ai-pipeline/src/pii_redaction_service.py`
  - `redact_pii(text)` — synchronous function
  - Patterns: UK/IN phone numbers, E.164 international, payment card numbers, UK NI numbers, DOB formats, email addresses, NHS numbers
  - Called after `conversation_turns` is populated, before writing `conversations.transcript_json`
  - Only active when `agent_configs.pii_redaction_enabled = True`

**Smoke tests (2026-04-11 — via venv/bin/python3):**
```
✅ env_var_service: ENV_VAR_PATTERN matches correctly (CRM_URL, CRM_KEY extracted)
✅ pii_redaction_service: redaction OK → "Call me on [PHONE_NUMBER] or email [EMAIL]"
```

---

### [2026-04-11] ADDENDUM 6A — NestJS Platform API: 21 New Modules (§6.2D–§6.2X)
**Status:** ✅ COMPLETE

All 21 new NestJS modules from the CO-BROWSING-DATA-001.md v3.0 translation are implemented and registered.

**Previously completed (prior sessions):**
- §6.2D — AgentWizard ✅
- §6.2E — 48 Tier 1 Templates (seed-agent-templates-tier1.sql) ✅
- §6.2F — SecurityModule (PII, fraud, OFAC, GDPR) ✅
- §6.2G — Widget avatar upload + shareable URL ✅
- §6.2H — RetentionPurgeJob (daily 03:00 cron, MinIO cleanup) ✅
- §6.2I — WebhooksModule extended ✅
- §6.2J — ToolsModule (PATCH system tools, MCP CRUD, test, history) ✅
- §6.2K — KnowledgeBase workspace architecture (migrate-003, junction table) ✅
- §6.2L — AnalysisModule (criteria, data-specs, 3 BullMQ post-call jobs) + ConversationsModule extended (15 filters, turns, share-link) ✅
- §6.2M — PhoneNumbersModule ✅
- §6.2N — BatchCallsModule ✅
- §6.2O — WorkflowModule ✅
- §6.2P — BranchesModule ✅

**Completed this session:**
- §6.2Q — TestsModule rewritten: workspace CRUD, 3 test types (next_reply/tool_invocation/simulation), templates GET+clone, async BullMQ execution (test-execution queue), GET /test-runs/:run_id, agent attach/detach, test folders CRUD ✅
- §6.2R — WhatsAppModule: accounts CRUD, Meta OAuth connect, outbound message+call, inbound webhook (@SkipAuth, X-Hub-Signature-256 verified), GET webhook challenge ✅
- §6.2S — SettingsModule: workspace settings UPSERT, webhook test, secrets (Vault path), auth connections CRUD with 409 guard ✅
- §6.2T — ApiKeysModule: sk-tn_ prefix, SHA-256 hash, one-time reveal, list/update/revoke; ApiKeyMiddleware (x-api-key header, fire-and-forget last_used_at) ✅
- §6.2U — WebhookEndpointsModule: HMAC shared secret, 7 event types, deliverWebhookEvent() with 3-attempt exponential backoff (5s/25s), rotate-secret ✅
- §6.2V — EnvVarsModule: CRUD, UPSERT on conflict(var_id, environment), resolveEnvVars() with {{env.VAR_NAME}} tokens + production fallback ✅
- §6.2W — StandaloneTTSModule: ElevenLabs TTS API, MinIO trustnow-tts-generations, presigned URLs (1h TTL), history + download + delete ✅
- §6.2X — AsyncSTTModule: BullMQ stt-transcribe processor, ElevenLabs Scribe v2, MinIO trustnow-stt-transcripts, list/get/export(txt/json/srt)/rename/delete ✅

**app.module.ts:** All 21+ modules registered; BullModule.forRootAsync (REDIS_PASSWORD from env); ApiKeyMiddleware applied globally ✅

**Build:** npm run build → 0 errors (fixed @types/multer missing) ✅

**Smoke test:** `curl http://127.0.0.1:3001/tests` → 401 (route registered, JWT required) ✅
**Smoke test:** `curl http://127.0.0.1:3001/env-vars` → 401 ✅
**Smoke test:** `curl http://127.0.0.1:3001/api-keys` → 401 ✅

**New MinIO buckets required (provision before Task 8):**
- trustnow-tts-generations (standalone TTS audio)
- trustnow-stt-transcripts (async STT upload files)
- trustnow-widget-assets (already created in §6.2G)
- trustnow-kb-docs (already created in §6.2K)

---

### [2026-04-11] Addendum 7A — FreeSWITCH Outbound SIP Gateway
**Status:** ✅ COMPLETE

**What was done:**
- **Step 7A.1:** Created `config/freeswitch/sip_profiles/external/` directory (dynamic gateway fragment directory)
- **Step 7A.1:** Created `config/freeswitch/sip_profiles/external.xml` — external Sofia SIP profile on port 5080 (172.25.10.142:5080), codecs PCMU/PCMA/G722, `<gateways>` block with `<X-PRE-PROCESS cmd="include" data="external/*.xml"/>` for dynamic per-phone-number gateway fragments
- **Step 7A.2:** `sofia.conf.xml` wildcard `../sip_profiles/*.xml` already covers external.xml — no freeswitch.xml change needed
- **Step 7A.3:** Loaded external profile into running container: `reloadxml` + `sofia profile external start` — profile RUNNING on :5080
- **Step 7A.4:** Rewrote `PhoneNumbersService.upsertFreeSwitchGateway()` per spec: gateway naming `tn_{phone_number_id.replace(/-/g,'').substring(0,12)}`, `fs.mkdirSync` + `fs.writeFileSync`, ESL `reloadxml` + `sofia profile external rescan`; added `removeFreeSwitchGateway()` for archive; wired both into `create()`, `update()`, `archive()`
- **Step 7A.5:** `npm run build` → 0 errors; `systemctl restart trustnow-platform-api` → active

**7-Item Checklist — All PASSED:**
| # | Check | Result |
|---|-------|--------|
| 7A-1 | `sip_profiles/external.xml` created | ✅ PASS |
| 7A-2 | External include in sofia.conf.xml wildcard | ✅ PASS |
| 7A-3 | FreeSWITCH external profile RUNNING (sip:mod_sofia@172.25.10.142:5080) | ✅ PASS |
| 7A-4 | `upsertFreeSwitchGateway()` with `tn_${id.replace(/-/g,'').substring(0,12)}` naming + `fs.mkdirSync` | ✅ PASS |
| 7A-5 | Platform API builds 0 errors | ✅ PASS |
| 7A-6 | Test gateway write → rescan → `sofia status gateway tn_test000000` shows UP | ✅ PASS |
| 7A-7 | `originate sofia/gateway/tn_test000000/+12025550001` → `NORMAL_TEMPORARY_FAILURE` (NOT `INVALID_PROFILE`) | ✅ PASS |

**Fix applied:** `$${global_codec_prefs}` undefined in vars.xml — replaced with explicit `PCMU,PCMA,G722`; added `sip-ip`/`sip-port` to profile (required for FreeSWITCH to bind the listener).

**Task Addendum Status: ✅ COMPLETE (4A + 5A + 6A + 7A all verified)**

---

### TASK 8 onwards ← NEXT STEP
- Agent Configuration Module (Next.js + shadcn/ui — UI-SPEC-001.md §6.4, 10 tabs)
- Human Agent Desktop
- Voice pipeline end-to-end
- Web Widget publisher

### Carry-forward open items
- Vault auto-unseal: currently manual — consider cloud KMS auto-unseal for production
- LiteLLM API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY etc.) must be injected as env vars when real keys are available
- Keycloak start-dev mode → production mode before go-live
- MinIO SSE-S3 encryption: requires Vault KMS integration (post-Task 3)
- GitHub: main branch pushed, tracking origin/main ✅
- Self-signed TLS cert: replace with Let's Encrypt or corporate CA before production
- Kafka: migrated to KRaft mode (Zookeeper removed) — see Task 4B-KRaft entry below ✅
- Vault: migrated to Raft storage (HA enabled) — see Task 4B-Raft entry below ✅ ⚠️ NEW vault-init.json — ARCHITECT MUST BACK UP IMMEDIATELY
- **PostgreSQL port note:** From Task 5 onwards, all app services use PgBouncer on :5433. Direct :5432 access is for DBA/admin only.

---

## HOW TO USE THIS RUNBOOK
- Read top to bottom at the start of every session
- After completing any task: add it to COMPLETED TASKS with date, details, and verification
- Move completed items from PENDING to COMPLETED
- Never delete completed task entries — this is an immutable build journal
