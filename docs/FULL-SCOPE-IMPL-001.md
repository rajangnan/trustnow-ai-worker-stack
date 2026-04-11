# IMPL-001.md — TRUSTNOW Autonomous AI Stack
## Complete Implementation Manual — All Tasks, All Layers
### Document ID: IMPL-001 v3.3 | March 2026
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v1.0 | March 2026 | Initial baseline — Task 1 OS Hardening + Task 2 First Batch infra only |
| v1.1 | March 2026 | Added Task 2 Second Batch (FasterWhisper, Ollama, Piper, TimescaleDB, Nginx) |
| v2.0 | March 2026 | Complete rewrite — full BRD scope alignment. Added Tasks 3–16 covering all five architecture layers, full application build, CI/CD, Kubernetes, voice pipeline, Agent Config Module, Human Agent Desktop, MIS, Recording/QM. Updated all component maps, port reference, and verification checklists. Removed incorrect deferrals. Aligned to FULL-SCOPE-BRD.md. |
| v3.3 | March 2026 | Targeted endpoint additions: AgentsModule §6.2 route table — added GET /agents/:id/preview-history/count. ConversationsModule §6.2 route table — confirmed GET /agents/:id/preview-history with is_preview=true filter, ?branchId= query param, and full endpoint contract for the Publish button soft gate. |
| v3.2 | March 2026 | Co-browse live call findings incorporated (28 Mar 2026). Task 9 §9.1–§9.9 fully rewritten with complete turn loop implementation: first_message separate path (no LLM), full STT→LLM→TTS pipeline with latency recording per stage, barge-in interrupt chain (DETECTED_SPEECH → Redis pub/sub → TTS stop), 3-tier silence re-prompt watchdog, platform_end_call() via FreeSWITCH ESL (agent cannot self-terminate — confirmed live), transcript JSON schema with asr/llm/tts latency per turn, real-time transcript streaming via Redis pub/sub, LLM latency display format (Xms vs X.X s), text+voice simultaneous mode. how_call_ended values confirmed. |
| v3.1 | March 2026 | Task 7 fully expanded: FreeSWITCH (Docker/Ubuntu 24.04 compatible), ESL configuration, Sofia SIP profile, MOH, recording dialplan, CID/UUI header, LiveKit binary+systemd, Vault secrets for both services, NestJS TelephonyModule (EslService + HandoffModule), Python handoff_service.py, 12-point verification checklist. DEFERRED-009 noted. |
| v3.0 | March 2026 | Gap Register integration (TRUSTNOW-GAP-REGISTER v1.1). Fixed port collision GAP-001 (AI Pipeline moved to :8002). Fixed agent-desktop path GAP-002 (/agent-desktop/ canonical). Replaced placeholder UI tab language GAP-008. Strengthened audit_log immutability GAP-014. Pinned ElevenLabs SDK method GAP-017. Clarified Docker vs K8s deployment boundary GAP-012. Added GitHub remote step. Added PgBouncer connection pooler as pre-Task-5 infrastructure step. Added Kafka KRaft migration note. Added Vault Raft note. Added DEFERRED GAP PLACEHOLDERS throughout relevant task sections so no gap is lost when we reach those stages. |

---

## PURPOSE & HOW TO USE THIS MANUAL

Authoritative implementation guide covering ALL tasks required to build the complete TRUSTNOW Autonomous AI Worker Stack. Every step maps to BRD-1 v1.1. Read FULL-SCOPE-BRD.md for requirements context before starting any task.

**Rules:**
- Work tasks in sequence — do not start a task until the previous one is fully verified
- Run every VERIFY command before proceeding to the next step
- Never hardcode passwords — use `CHANGE_THIS_IN_VAULT` as placeholder everywhere
- All services bind to `127.0.0.1` (localhost) unless explicitly stated otherwise
- After completing any task: update RUNBOOK.md immediately with date, what was done, verification results

---

## SERVER SPECIFICATIONS

| Property | Value |
|----------|-------|
| IP | 172.25.10.142 |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-106-generic |
| CPU | 40 cores |
| RAM | 125GB |
| Disk | 98GB root volume |
| Swap | 8GB |
| Users | trustnow (primary), opsadmin (ops) |
| Project Root | /opt/trustnowailabs/trustnow-ai-worker-stack/ |

---

## COMPLETE TASK MAP

| Task | Name | Architecture Layer | Build Status |
|------|------|-------------------|-------------|
| Task 1 | OS Hardening & Base Security | Infrastructure | ✅ COMPLETE |
| Task 2A | Foundational Infrastructure — First Batch | Infrastructure | In Progress |
| Task 2B | Foundational Infrastructure — Second Batch | Infrastructure + Layer 1 On-Prem Brain | Pending |
| Task 3 | TLS, CI/CD & Kubernetes Orchestration | Infrastructure | Pending |
| Task 4 | Database Schema, CID Service & Event Pipeline | Layer 1 + Concurrency | Pending |
| Task 5 | AI Pipeline — STT/LLM/TTS Services | Layer 1 — The Brain | Pending |
| Task 6 | Platform API — NestJS Control Plane | Layer 2 + Layer 5 CX OS | Pending |
| Task 7 | Telephony — FreeSWITCH + LiveKit | Layer 4 Integration | Pending |
| Task 8 | Agent Configuration Module (10 tabs) | Layer 5 CX OS | Pending |
| Task 9 | Conversational AI Agents | Layer 3 AI Worker Stack | Pending |
| Task 10 | Tools-Assisted AI Agents | Layer 3 AI Worker Stack | Pending |
| Task 11 | Fully Autonomous AI Workers | Layer 3 AI Worker Stack | Pending |
| Task 12 | Human Agent Desktop | Layer 5 CX OS | Pending |
| Task 13 | MIS, Reporting & Analytics | Layer 5 CX OS | Pending |
| Task 14 | Call Recording & Quality Management | Layer 5 CX OS | Pending |
| Task 15 | Landing Page & Frontend Complete Build | Layer 5 CX OS | Pending |
| Task 16 | End-to-End Integration Testing | All Layers | Pending |

---

## TASK 1 — OS HARDENING ✅ COMPLETE

**Status: COMPLETE — verified 24 March 2026**

All steps 1.1 through 1.9 completed and verified:
- Ubuntu 24.04.4 LTS, Kernel 6.8.0-106-generic ✅
- All security packages installed (fail2ban, ufw, auditd, chrony, libpam-pwquality) ✅
- UFW firewall: deny-all-inbound, all required ports opened per port reference table ✅
- Fail2ban: SSH jail active (bantime 3600, maxretry 3) ✅
- auditd: running, TRUSTNOW rules loaded, project directory monitored ✅
- Chrony NTP: running, offset ~5 microseconds ✅
- Kernel sysctl: network security + high-concurrency params applied (fs.file-max=2097152) ✅
- TRUSTNOW directory structure: all subdirs created under project root ✅
- Two users: trustnow + opsadmin with SSH key auth, passwordless sudo for Claude Code ✅
- netxms-server: stopped and disabled (port 8000 freed for Kong) ✅

**Verification:**
```bash
echo "=== KERNEL ===" && uname -r
echo "=== UFW ===" && sudo ufw status verbose
echo "=== FAIL2BAN ===" && sudo fail2ban-client status
echo "=== AUDITD ===" && sudo systemctl is-active auditd
echo "=== CHRONY ===" && chronyc tracking | grep offset
echo "=== FILE DESCRIPTORS ===" && sysctl fs.file-max
echo "=== DIRECTORIES ===" && ls -la /opt/trustnowailabs/trustnow-ai-worker-stack/
```

---

## TASK 2A — FOUNDATIONAL INFRASTRUCTURE: FIRST BATCH

**Prerequisite: Task 1 complete.**

### Installation Sequence

| Seq | Component | Version | BRD Ref | Port |
|-----|-----------|---------|---------|------|
| 2A.1 | Docker Engine + Compose | 25.x | §11.6 | — |
| 2A.2 | PostgreSQL 16 + RLS + pgvector | 16.x | BRD-L5-MT-003, §11.5 | 5432 local |
| 2A.3 | Redis Stack | 7.x | BRD-CC-003, §11.5 | 6379 local |
| 2A.4 | Apache Kafka + Zookeeper | 3.x | BRD-CC-004, §11.5 | 9092 local |
| 2A.5 | Qdrant Vector DB | latest | BRD-L5-AGM-012 LOCKED | 6333 local |
| 2A.6 | Kong API Gateway | 3.x | §11.6 | 8000/8443 public |
| 2A.7 | Keycloak IAM | 24.x | BRD-L5-RB-003, §11.2 | 8080 local |
| 2A.8 | MinIO Object Storage | latest | BRD-L5-REC-002, §11.4 | 9000 local |
| 2A.9 | HashiCorp Vault | 1.16.x | §11.6 | 8200 local |
| 2A.10 | Node.js 20 LTS + NestJS CLI | 20.x | §11.1, §11.2 | — |
| 2A.11 | Python 3.11 + AI Pipeline venv | 3.11.x | §11.3 | — |
| 2A.12 | LiteLLM Self-Hosted Proxy | latest | BRD-L1-005 LOCKED | 4000 local |
| 2A.13 | Prometheus + Grafana + Loki | latest | §11.6, §9 Observability | 9090/3000/3100 local |

### 2A.1 — Docker Engine + Docker Compose
```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker trustnow && sudo usermod -aG docker opsadmin
sudo systemctl enable docker && sudo systemctl start docker
```
**VERIFY:** `docker --version && docker compose version && docker run hello-world`

---

### 2A.2 — PostgreSQL 16 + RLS + pgvector
PostgreSQL 16 is pre-installed by server team. Configure for TRUSTNOW:
```bash
# Install pgvector extension (BRD §11.5 — lightweight vector ops)
sudo apt install -y postgresql-16-pgvector

# Enable RLS globally — CRITICAL for multi-tenancy (BRD-L5-MT-003)
sudo -u postgres psql -c "ALTER SYSTEM SET row_security = on;"

# Create TRUSTNOW databases and roles
sudo -u postgres psql << 'EOF'
CREATE DATABASE trustnow_platform;
CREATE ROLE trustnow_app LOGIN PASSWORD 'CHANGE_THIS_IN_VAULT';
CREATE ROLE trustnow_readonly LOGIN PASSWORD 'CHANGE_THIS_IN_VAULT';
GRANT CONNECT ON DATABASE trustnow_platform TO trustnow_app;
GRANT CONNECT ON DATABASE trustnow_platform TO trustnow_readonly;
\c trustnow_platform
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\l
EOF

sudo systemctl restart postgresql
```

**CRITICAL RLS NOTE:** Every tenant-scoped table in Task 4 MUST have:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table}
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

**VERIFY:** `sudo -u postgres psql -c "SHOW row_security;" && sudo -u postgres psql -d trustnow_platform -c "\dx"`
Expected: row_security=on; vector, uuid-ossp, pgcrypto extensions listed

---

### 2A.3 — Redis Stack (CID Session State — BRD-CC-003)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/redis

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/redis/redis.conf << 'EOF'
bind 127.0.0.1
protected-mode yes
requirepass CHANGE_THIS_IN_VAULT
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
appendonly yes
appendfsync everysec
tcp-keepalive 300
EOF

docker run -d \
  --name trustnow-redis \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/config/redis/redis.conf:/usr/local/etc/redis/redis.conf \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/redis:/data \
  -p 127.0.0.1:6379:6379 \
  redis/redis-stack-server:latest \
  redis-server /usr/local/etc/redis/redis.conf
```

**Redis Key Design (BRD-CC-001 to CC-005):**
| Key Pattern | Purpose |
|-------------|---------|
| `session:{CID}` | Active conversation state — message history, agent_id, tenant_id, LLM model, tool state, cost accumulator. TTL = max call duration. |
| `active_calls:{tenant_id}` | Sorted set of active CIDs per tenant — feeds live dashboard BRD-CC-005 |
| `active_calls:global` | Global active CID count — platform super-admin dashboard |
| `agent_config:{agent_id}` | Cached agent config TTL 5min — avoids repeated DB reads on N concurrent calls |
| `rate_limit:{tenant_id}:{endpoint}` | API rate limiting counters — fed by Kong Gateway |

**VERIFY:** `docker exec trustnow-redis redis-cli -a CHANGE_THIS_IN_VAULT ping`
Expected: PONG

---

### 2A.4 — Apache Kafka + Zookeeper (CID Event Streaming — BRD-CC-004)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/kafka
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/kafka/{zookeeper,broker}

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/kafka/docker-compose.yml << 'EOF'
version: "3.8"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: trustnow-zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - /opt/trustnowailabs/trustnow-ai-worker-stack/data/kafka/zookeeper:/var/lib/zookeeper
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: trustnow-kafka
    restart: unless-stopped
    depends_on: [zookeeper]
    ports:
      - "127.0.0.1:9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - /opt/trustnowailabs/trustnow-ai-worker-stack/data/kafka/broker:/var/lib/kafka
EOF

cd /opt/trustnowailabs/trustnow-ai-worker-stack/config/kafka && docker compose up -d
sleep 20

# Create all platform topics (CID = partition key on conversation.events)
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.conversation.events --partitions 12 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.audit.log --partitions 6 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.call.recordings --partitions 6 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.mis.metrics --partitions 6 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.voice.library --partitions 3 --replication-factor 1
```

**Kafka Topic Purpose:**
| Topic | Purpose | CID Role | BRD Ref |
|-------|---------|---------|---------|
| trustnow.conversation.events | All lifecycle events: call_started, turn_completed, tool_called, handoff_triggered, call_ended, error | CID = partition key | BRD-CC-004 |
| trustnow.audit.log | Config changes, user logins, agent publishes, RBAC changes | — | BRD-L5-RB-004 |
| trustnow.call.recordings | Recording completion — triggers MinIO storage | CID in payload | BRD-L5-REC-001 |
| trustnow.mis.metrics | Real-time MIS events — consumed by TimescaleDB writer | — | BRD-L5-MIS-001 |
| trustnow.voice.library | Voice upload/clone events — triggers voice processing | — | BRD-L1-012 |

**VERIFY:** `docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092`
Expected: 5 topics listed

---

### 2A.5 — Qdrant Vector Database (PRIMARY LOCKED — BRD-L5-AGM-012)
```bash
docker run -d \
  --name trustnow-qdrant \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/qdrant:/qdrant/storage \
  -p 127.0.0.1:6333:6333 \
  -p 127.0.0.1:6334:6334 \
  qdrant/qdrant:latest
```

**Collection naming:** `kb_{tenant_id}_{agent_id}` — created programmatically when agent first enables RAG. Enforces strict KB isolation between tenants per BRD-L5-MT-003.

**VERIFY:** `curl http://localhost:6333/healthz`
Expected: JSON with version info

---

### 2A.6 — Kong API Gateway
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE kong;
CREATE USER kong WITH PASSWORD 'CHANGE_THIS_IN_VAULT';
GRANT ALL PRIVILEGES ON DATABASE kong TO kong;
EOF

docker run --rm --network host \
  -e KONG_DATABASE=postgres -e KONG_PG_HOST=127.0.0.1 \
  -e KONG_PG_USER=kong -e KONG_PG_PASSWORD=CHANGE_THIS_IN_VAULT \
  -e KONG_PG_DATABASE=kong \
  kong:latest kong migrations bootstrap

docker run -d \
  --name trustnow-kong \
  --restart unless-stopped \
  --network host \
  -e KONG_DATABASE=postgres -e KONG_PG_HOST=127.0.0.1 \
  -e KONG_PG_USER=kong -e KONG_PG_PASSWORD=CHANGE_THIS_IN_VAULT \
  -e KONG_PG_DATABASE=kong \
  -e KONG_PROXY_LISTEN=0.0.0.0:8000,0.0.0.0:8443 ssl \
  -e KONG_ADMIN_LISTEN=127.0.0.1:8001 \
  kong:latest
```

**VERIFY:** `curl http://localhost:8001/ | python3 -c "import sys,json; print('Kong version:', json.load(sys.stdin).get('version'))"`

---

### 2A.7 — Keycloak IAM (Realm-per-Tenant — BRD-L5-RB-003)
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE keycloak;
CREATE USER keycloak WITH PASSWORD 'CHANGE_THIS_IN_VAULT';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
EOF

docker run -d \
  --name trustnow-keycloak \
  --restart unless-stopped \
  --network host \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://127.0.0.1:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD=CHANGE_THIS_IN_VAULT \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=CHANGE_THIS_IN_VAULT \
  quay.io/keycloak/keycloak:24.0.1 start-dev
```

**Realm Strategy:**
- `trustnow-platform` — master realm, TRUSTNOW platform admins only
- `realm_{tenant_id}` — one realm per tenant, created on tenant onboarding
- JWT tokens carry `tenant_id` + `role` claims validated by ALL TRUSTNOW services

**VERIFY:** `curl http://localhost:8080/health`
Expected: `{"status":"UP"}`

---

### 2A.8 — MinIO Object Storage (AES-256 encrypted — BRD-L5-REC-002)
```bash
docker run -d \
  --name trustnow-minio \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/recordings:/data \
  -p 127.0.0.1:9000:9000 \
  -p 127.0.0.1:9001:9001 \
  -e MINIO_ROOT_USER=trustnow-admin \
  -e MINIO_ROOT_PASSWORD=CHANGE_THIS_IN_VAULT \
  minio/minio server /data --console-address ":9001"

curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc
mc alias set local http://localhost:9000 trustnow-admin CHANGE_THIS_IN_VAULT

mc mb local/trustnow-recordings      # Call recordings — BRD-L5-REC-001
mc mb local/trustnow-kb-documents    # KB source docs pre-indexing — BRD-L5-AGM-013
mc mb local/trustnow-voice-samples   # Voice Library — BRD-L1-010/011
mc mb local/trustnow-backups         # System backups

mc encrypt set sse-s3 local/trustnow-recordings
mc encrypt set sse-s3 local/trustnow-kb-documents
mc encrypt set sse-s3 local/trustnow-voice-samples
```

**VERIFY:** `mc ls local/`
Expected: 4 buckets listed

---

### 2A.9 — HashiCorp Vault (Secrets Management LOCKED)
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vault

mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/vault
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault.hcl << 'EOF'
storage "file" {
  path = "/opt/trustnowailabs/trustnow-ai-worker-stack/data/vault"
}
listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}
api_addr = "http://127.0.0.1:8200"
EOF

sudo systemctl enable vault && sudo systemctl start vault

# CRITICAL: Initialize and unseal Vault (first time only)
# vault operator init      → saves 5 unseal keys + root token (store SECURELY — unrecoverable if lost)
# vault operator unseal    → run 3 times with 3 different unseal keys
# vault login <root_token>
# vault secrets enable -path=secret kv-v2
```

**Secret path convention:**
- `secret/trustnow/platform/postgres/app_password`
- `secret/trustnow/platform/redis/password`
- `secret/trustnow/{tenant_id}/llm/openai_api_key`
- `secret/trustnow/{tenant_id}/tts/elevenlabs_api_key`
- `secret/trustnow/{tenant_id}/stt/deepgram_api_key`

**VERIFY:** `vault status | grep -E "Initialized|Sealed"`
Expected: Initialized: true, Sealed: false

---

### 2A.10 — Node.js 20 LTS + NestJS CLI
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 typescript ts-node @nestjs/cli
```

**VERIFY:** `node --version && npm --version && nestjs --version`
Expected: v20.x.x installed

---

### 2A.11 — Python 3.11 + AI Pipeline Virtual Environment
```bash
python3 --version
# If not 3.11: sudo add-apt-repository ppa:deadsnakes/ppa -y && sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev

mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
python3.11 -m venv /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv

source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn litellm llama-index qdrant-client redis kafka-python \
  opentelemetry-sdk opentelemetry-exporter-prometheus deepgram-sdk \
  httpx pydantic python-jose[cryptography] passlib[bcrypt] \
  sentence-transformers boto3
deactivate
```

**VERIFY:** `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python --version`
Expected: Python 3.11.x

---

### 2A.12 — LiteLLM Self-Hosted Proxy (LOCKED — BRD-L1-005 — DO NOT CHANGE)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml << 'EOF'
model_list:
  # OpenAI — BRD §4.1.1
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
  # Anthropic — BRD §4.1.1
  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-5
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: claude-haiku
    litellm_params:
      model: anthropic/claude-haiku-4-5
      api_key: os.environ/ANTHROPIC_API_KEY
  # Google — BRD §4.1.1
  - model_name: gemini-flash
    litellm_params:
      model: gemini/gemini-2.5-flash
      api_key: os.environ/GOOGLE_API_KEY
  - model_name: gemini-pro
    litellm_params:
      model: gemini/gemini-2.5-pro
      api_key: os.environ/GOOGLE_API_KEY
  # Alibaba/Qwen — BRD §4.1.1
  - model_name: qwen-max
    litellm_params:
      model: openai/qwen2.5-72b-instruct
      api_base: https://dashscope.aliyuncs.com/compatible-mode/v1
      api_key: os.environ/QWEN_API_KEY
  # Mistral — BRD §4.1.1
  - model_name: mistral-large
    litellm_params:
      model: mistral/mistral-large-latest
      api_key: os.environ/MISTRAL_API_KEY
  # Meta/Llama via Groq — BRD §4.1.1
  - model_name: llama-3.1-70b
    litellm_params:
      model: groq/llama-3.1-70b-versatile
      api_key: os.environ/GROQ_API_KEY
  # On-Prem Ollama — BRD §4.2 Partition B
  - model_name: ollama-llama3
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: http://localhost:11434
  - model_name: ollama-mistral
    litellm_params:
      model: ollama/mistral:7b
      api_base: http://localhost:11434
  - model_name: ollama-qwen2
    litellm_params:
      model: ollama/qwen2:7b
      api_base: http://localhost:11434
litellm_settings:
  success_callback: ["prometheus"]
  failure_callback: ["prometheus"]
  cache: true
  cache_params:
    type: redis
    host: localhost
    port: 6379
    password: os.environ/REDIS_PASSWORD
EOF

docker run -d \
  --name trustnow-litellm \
  --restart unless-stopped \
  --network host \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml --port 4000
```

**VERIFY:** `curl http://localhost:4000/health && curl http://localhost:4000/models | python3 -c "import sys,json; d=json.load(sys.stdin); print('Models:', len(d.get('data',[])))"`
Expected: health OK; all configured models returned

---

### 2A.13 — Observability Stack (Prometheus + Grafana + Loki)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: trustnow-litellm
    static_configs:
      - targets: ['localhost:4000']
  - job_name: trustnow-platform-api
    static_configs:
      - targets: ['localhost:3001']
  - job_name: trustnow-ai-pipeline
    static_configs:
      - targets: ['localhost:8002']   # GAP-001 FIXED: AI Pipeline on :8002, Kong proxy on :8000
EOF

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring/docker-compose.yml << 'EOF'
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: trustnow-prometheus
    restart: unless-stopped
    ports: ["127.0.0.1:9090:9090"]
    volumes:
      - /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  grafana:
    image: grafana/grafana:latest
    container_name: trustnow-grafana
    restart: unless-stopped
    ports: ["127.0.0.1:3000:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: CHANGE_THIS_IN_VAULT
  loki:
    image: grafana/loki:latest
    container_name: trustnow-loki
    restart: unless-stopped
    ports: ["127.0.0.1:3100:3100"]
EOF

cd /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring && docker compose up -d
```

**VERIFY:** `curl -s http://localhost:9090/-/healthy && curl -s http://localhost:3000/api/health | python3 -c "import sys,json; print('Grafana DB:', json.load(sys.stdin).get('database'))"`
Expected: Prometheus healthy; Grafana database ok

### 2A — First Batch Master Verification
```bash
echo "=== DOCKER ===" && docker --version && docker compose version
echo "=== POSTGRESQL ===" && sudo systemctl is-active postgresql && sudo -u postgres psql -c "SHOW row_security;"
echo "=== PGVECTOR ===" && sudo -u postgres psql -d trustnow_platform -c "\dx" | grep vector
echo "=== REDIS ===" && docker exec trustnow-redis redis-cli -a CHANGE_THIS_IN_VAULT ping
echo "=== KAFKA TOPICS ===" && docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092
echo "=== QDRANT ===" && curl -s http://localhost:6333/healthz | head -c 80
echo "=== KONG ===" && curl -s http://localhost:8001/ | python3 -c "import sys,json; print('Kong:', json.load(sys.stdin).get('version'))"
echo "=== KEYCLOAK ===" && curl -s http://localhost:8080/health
echo "=== MINIO ===" && mc ls local/
echo "=== VAULT ===" && vault status | grep -E "Initialized|Sealed"
echo "=== NODE ===" && node --version
echo "=== PYTHON ===" && /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python --version
echo "=== LITELLM ===" && curl -s http://localhost:4000/health | head -c 80
echo "=== PROMETHEUS ===" && curl -s http://localhost:9090/-/healthy
echo "=== ALL CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## TASK 2B — FOUNDATIONAL INFRASTRUCTURE: SECOND BATCH

---
### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 2B

You are the TRUSTNOW Platform Engineer. Before executing any command in this section:

**Step 1 — Read current project state:**
```bash
cat /opt/trustnowailabs/trustnow-ai-worker-stack/RUNBOOK.md
```
Confirm Task 2A is marked COMPLETE in RUNBOOK.md before proceeding.

**Step 2 — Run server health check:**
```bash
echo "=== SERVER STATE ===" && uname -r && uptime && free -h && df -h
echo "=== ALL CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Status}}"
echo "=== TASK 2A VERIFY ===" && sudo systemctl is-active postgresql && docker exec trustnow-redis redis-cli -a CHANGE_THIS_IN_VAULT ping && curl -s http://localhost:6333/healthz | head -c 50 && curl -s http://localhost:4000/health | head -c 50
```

**Step 3 — If Task 2A is confirmed complete and all containers are running, proceed with Task 2B steps 2B.1 through 2B.6 in sequence.**

**Step 4 — After completing ALL steps in Task 2B and running the master verification at the end of this section, update RUNBOOK.md:**
Add Task 2B to COMPLETED TASKS with today's date, list all 6 components installed, and paste the verification results. Then report back to Architect.

**RULES FOR THIS SESSION:**
- Execute steps 2B.1 → 2B.2 → 2B.3 → 2B.4 → 2B.5 → 2B.6 in strict sequence
- Run the VERIFY command after every step before proceeding
- If any VERIFY fails — STOP immediately and report the error to Architect
- Never hardcode passwords — CHANGE_THIS_IN_VAULT is the placeholder
- All services must bind to localhost (127.0.0.1) except Nginx (80/443)

---

**Prerequisite: Task 2A fully verified.**

### Installation Sequence

| Seq | Component | Version | BRD Ref | Port |
|-----|-----------|---------|---------|------|
| 2B.1 | TimescaleDB | 2.x (PG16) | §12.5 MIS metrics | PG extension |
| 2B.2 | Nginx | 1.25.x | §11.6 TLS + proxy + Widget CDN | 80/443 public |
| 2B.3 | FasterWhisper | latest | BRD-L1-006 On-Prem STT **P0** | local service |
| 2B.4 | Ollama | latest | BRD-L1-007 On-Prem LLM **P0** | 11434 local |
| 2B.5 | Piper TTS | latest | BRD-L1-008 On-Prem TTS **P0** | local process |
| 2B.6 | Elasticsearch + Kibana | 8.x | §11.5 full-text search + logging | 9200/5601 local |

---

### 2B.1 — TimescaleDB (MIS Metrics — BRD §12.5)
```bash
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -cs) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update && sudo apt install -y timescaledb-2-postgresql-16
sudo timescaledb-tune --quiet --yes
sudo -u postgres psql -d trustnow_platform -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
sudo systemctl restart postgresql
```

**VERIFY:** `sudo -u postgres psql -d trustnow_platform -c "\dx" | grep timescale`
Expected: timescaledb listed as installed

---

### 2B.2 — Nginx (Reverse Proxy + TLS Termination + Widget CDN — BRD §11.6)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx

sudo bash -c 'cat > /etc/nginx/sites-available/trustnow << EOF
server {
    listen 80;
    server_name _;

    location /health {
        return 200 "TRUSTNOW nginx OK";
        add_header Content-Type text/plain;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;   # Kong proxy — routes to all backend services
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Direct AI Pipeline health (internal monitoring only — NOT public)
    # GAP-001 FIX: AI Pipeline FastAPI runs on :8002, Kong proxy on :8000
    location /widget/ {
        alias /opt/trustnowailabs/trustnow-ai-worker-stack/services/widget/dist/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }
}
EOF'

sudo ln -sf /etc/nginx/sites-available/trustnow /etc/nginx/sites-enabled/trustnow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**VERIFY:** `curl http://localhost/health`
Expected: `TRUSTNOW nginx OK`

---

### 2B.3 — FasterWhisper (On-Prem STT — BRD §4.2 Partition B — P0 REQUIRED)
```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate

pip install faster-whisper

python3 << 'EOF'
from faster_whisper import WhisperModel
print("Downloading base model...")
m = WhisperModel("base", device="cpu", compute_type="int8"); del m
print("Downloading medium model...")
m = WhisperModel("medium", device="cpu", compute_type="int8"); del m
print("FasterWhisper models ready.")
EOF

deactivate
```

**VERIFY:** `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python -c "from faster_whisper import WhisperModel; print('FasterWhisper OK')"`

**GPU Note:** For production GPU acceleration, install CUDA toolkit and set `device="cuda"`, `compute_type="float16"`. CPU+int8 mode is sufficient for development.

---

### 2B.4 — Ollama (On-Prem LLM — BRD §4.2 Partition B — P0 REQUIRED)
```bash
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama
sudo chown trustnow:trustnow /opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama

curl -fsSL https://ollama.com/install.sh | sh

sudo bash -c 'cat > /etc/systemd/system/ollama.service << EOF
[Unit]
Description=TRUSTNOW Ollama On-Prem LLM (BRD Partition B)
After=network-online.target

[Service]
User=trustnow
Group=trustnow
Environment="OLLAMA_MODELS=/opt/trustnowailabs/trustnow-ai-worker-stack/data/ollama"
Environment="OLLAMA_HOST=127.0.0.1:11434"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable ollama && sudo systemctl start ollama
sleep 10

# Pull initial models (BRD §4.2)
ollama pull llama3.1:8b      # Meta — Llama 3
ollama pull mistral:7b        # Mistral AI
ollama pull qwen2:7b          # Alibaba/Qwen
```

**Note:** LiteLLM config (2A.12) already includes Ollama model routes. Once Ollama is running, LiteLLM automatically routes `ollama-*` model requests to it without any further config.

**VERIFY:** `sudo systemctl is-active ollama && ollama list && curl http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print('Models:', [m['name'] for m in d.get('models',[])])"`

---

### 2B.5 — Piper TTS (On-Prem TTS — BRD §4.2 Partition B — P0 REQUIRED)
```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install piper-tts
deactivate

mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices
cd /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices

# English male voice
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" -O en_US-lessac-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" -O en_US-lessac-medium.onnx.json

# English female voice
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx" -O en_US-libritts_r-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx.json" -O en_US-libritts_r-medium.onnx.json

ls -lh /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices/
```

**VERIFY:** `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python -c "from piper import PiperVoice; print('Piper OK')"`

---

### 2B.6 — Elasticsearch + Kibana (Full-text search + log aggregation — BRD §11.5)
```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install -y elasticsearch kibana

sudo bash -c 'cat >> /etc/elasticsearch/elasticsearch.yml << EOF
network.host: 127.0.0.1
http.port: 9200
xpack.security.enabled: false
EOF'

sudo systemctl enable elasticsearch && sudo systemctl start elasticsearch
sleep 20

sudo bash -c 'cat >> /etc/kibana/kibana.yml << EOF
server.host: "127.0.0.1"
elasticsearch.hosts: ["http://127.0.0.1:9200"]
EOF'

sudo systemctl enable kibana && sudo systemctl start kibana
```

**VERIFY:** `curl http://localhost:9200/_cluster/health?pretty | head -5`
Expected: status green or yellow

### 2B — Second Batch Master Verification
```bash
echo "=== TIMESCALEDB ===" && sudo -u postgres psql -d trustnow_platform -c "\dx" | grep timescale
echo "=== NGINX ===" && sudo systemctl is-active nginx && curl -s http://localhost/health
echo "=== FASTERWHISPER ===" && /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python -c "from faster_whisper import WhisperModel; print('FasterWhisper OK')"
echo "=== OLLAMA ===" && sudo systemctl is-active ollama && ollama list
echo "=== PIPER ===" && /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python -c "from piper import PiperVoice; print('Piper OK')"
echo "=== PIPER VOICES ===" && ls -lh /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices/
echo "=== ELASTICSEARCH ===" && curl -s http://localhost:9200/_cluster/health | python3 -c "import sys,json; print('ES status:', json.load(sys.stdin).get('status'))"
echo "=== PARTITION B BRAIN STACK ==="
echo "  STT: FasterWhisper — On-Prem ready"
echo "  LLM: Ollama — On-Prem ready (llama3.1:8b + mistral:7b + qwen2:7b)"
echo "  TTS: Piper — On-Prem ready (en_US voices)"
```

---

## TASK 3 — VAULT INITIALISATION, TLS, CI/CD & KUBERNETES ORCHESTRATION

**Prerequisite: Tasks 2A and 2B fully verified.**

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 3

Read RUNBOOK.md and confirm Tasks 2A and 2B are both marked COMPLETE before starting. Then execute §3.0 through §3.5 in strict sequence. You have full autonomy — do not pause for confirmation between steps. Report back only when Task 3 is fully complete or if something fails.

---

### 3.0 — Vault Initialisation & Credential Hardening (MUST BE FIRST — ALL OTHER STEPS DEPEND ON THIS)

**Why first:** Every service currently runs with `CHANGE_THIS_IN_VAULT` placeholder credentials. Task 4 application code requires real credentials. Vault must be initialised and all platform secrets stored before any application build begins.

```bash
export VAULT_ADDR='http://127.0.0.1:8200'

# Step 1: Initialise Vault (one-time operation)
vault operator init -key-shares=5 -key-threshold=3 -format=json > /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json
chmod 600 /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json
echo "vault-init.json created and locked to 600 permissions"

# Step 2: Unseal Vault using first 3 of 5 unseal keys
UNSEAL_KEY_1=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json')); print(d['unseal_keys_b64'][0])")
UNSEAL_KEY_2=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json')); print(d['unseal_keys_b64'][1])")
UNSEAL_KEY_3=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json')); print(d['unseal_keys_b64'][2])")
ROOT_TOKEN=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json')); print(d['root_token'])")

vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3

# Step 3: Login and enable KV-v2 secrets engine
vault login $ROOT_TOKEN
vault secrets enable -path=secret kv-v2
echo "Vault unsealed and kv-v2 secrets engine enabled"

# Step 4: Generate strong random credentials for all platform services
POSTGRES_APP_PASS=$(openssl rand -base64 32 | tr -d '/+=')
POSTGRES_READONLY_PASS=$(openssl rand -base64 32 | tr -d '/+=')
REDIS_PASS=$(openssl rand -base64 32 | tr -d '/+=')
KONG_DB_PASS=$(openssl rand -base64 32 | tr -d '/+=')
KEYCLOAK_DB_PASS=$(openssl rand -base64 32 | tr -d '/+=')
KEYCLOAK_ADMIN_PASS=$(openssl rand -base64 32 | tr -d '/+=')
MINIO_PASS=$(openssl rand -base64 32 | tr -d '/+=')
GRAFANA_PASS=$(openssl rand -base64 32 | tr -d '/+=')
LIVEKIT_SECRET=$(openssl rand -base64 32 | tr -d '/+=')
LITELLM_MASTER_KEY=$(openssl rand -base64 32 | tr -d '/+=')

# Step 5: Store all credentials in Vault
vault kv put secret/trustnow/platform/postgres \
  app_password="$POSTGRES_APP_PASS" \
  readonly_password="$POSTGRES_READONLY_PASS"

vault kv put secret/trustnow/platform/redis \
  password="$REDIS_PASS"

vault kv put secret/trustnow/platform/kong \
  db_password="$KONG_DB_PASS"

vault kv put secret/trustnow/platform/keycloak \
  db_password="$KEYCLOAK_DB_PASS" \
  admin_password="$KEYCLOAK_ADMIN_PASS"

vault kv put secret/trustnow/platform/minio \
  root_password="$MINIO_PASS"

vault kv put secret/trustnow/platform/grafana \
  admin_password="$GRAFANA_PASS"

vault kv put secret/trustnow/platform/livekit \
  secret="$LIVEKIT_SECRET"

vault kv put secret/trustnow/platform/litellm \
  master_key="$LITELLM_MASTER_KEY"

echo "All platform credentials stored in Vault"
vault kv list secret/trustnow/platform/

# Step 6: Update PostgreSQL passwords to match Vault
sudo -u postgres psql << EOF
ALTER ROLE trustnow_app WITH PASSWORD '$POSTGRES_APP_PASS';
ALTER ROLE trustnow_readonly WITH PASSWORD '$POSTGRES_READONLY_PASS';
ALTER USER kong WITH PASSWORD '$KONG_DB_PASS';
ALTER USER keycloak WITH PASSWORD '$KEYCLOAK_DB_PASS';
EOF
echo "PostgreSQL passwords updated"

# Step 7: Update Redis with real password and restart
REDIS_CONF=/opt/trustnowailabs/trustnow-ai-worker-stack/config/redis/redis.conf
sudo sed -i "s/requirepass.*/requirepass $REDIS_PASS/" $REDIS_CONF
docker restart trustnow-redis
sleep 5
docker exec trustnow-redis redis-cli -a "$REDIS_PASS" ping
echo "Redis restarted with real credentials"

# Step 8: Restart Kong with real DB password
docker stop trustnow-kong && docker rm trustnow-kong
docker run -d \
  --name trustnow-kong \
  --restart unless-stopped \
  --network host \
  -e KONG_DATABASE=postgres \
  -e KONG_PG_HOST=127.0.0.1 \
  -e KONG_PG_USER=kong \
  -e KONG_PG_PASSWORD="$KONG_DB_PASS" \
  -e KONG_PG_DATABASE=kong \
  -e KONG_PROXY_LISTEN=0.0.0.0:8000,0.0.0.0:8443 ssl \
  -e KONG_ADMIN_LISTEN=127.0.0.1:8001 \
  kong:latest
sleep 15
curl -s http://localhost:8001/ | python3 -c "import sys,json; print('Kong OK:', json.load(sys.stdin).get('version'))"

# Step 9: Restart Keycloak with real passwords
docker stop trustnow-keycloak && docker rm trustnow-keycloak
docker run -d \
  --name trustnow-keycloak \
  --restart unless-stopped \
  --network host \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://127.0.0.1:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD="$KEYCLOAK_DB_PASS" \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASS" \
  quay.io/keycloak/keycloak:24.0.1 start-dev
sleep 25
curl -s http://localhost:8080/health
echo "Keycloak restarted with real credentials"

# Step 10: Restart MinIO with real password
docker stop trustnow-minio && docker rm trustnow-minio
docker run -d \
  --name trustnow-minio \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/recordings:/data \
  -p 127.0.0.1:9000:9000 \
  -p 127.0.0.1:9001:9001 \
  -e MINIO_ROOT_USER=trustnow-admin \
  -e MINIO_ROOT_PASSWORD="$MINIO_PASS" \
  minio/minio server /data --console-address ":9001"
sleep 5
mc alias set local http://localhost:9000 trustnow-admin "$MINIO_PASS"
mc ls local/
echo "MinIO restarted with real credentials"

# Step 11: Restart Grafana with real password
cd /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring
sudo sed -i "s/GF_SECURITY_ADMIN_PASSWORD:.*/GF_SECURITY_ADMIN_PASSWORD: $GRAFANA_PASS/" docker-compose.yml
docker compose up -d grafana
sleep 10
curl -s http://localhost:3000/api/health | python3 -c "import sys,json; print('Grafana DB:', json.load(sys.stdin).get('database'))"

# Step 12: Create vault-env.sh for credential injection (chmod 700 — never commit)
cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh << 'ENVEOF'
#!/bin/bash
# Source this file to inject Vault token into environment
# NEVER commit this file to Git — it is in .gitignore
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json')); print(d['root_token'])")
ENVEOF
chmod 700 /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh

echo "=== §3.0 VAULT COMPLETE ==="
vault status
vault kv list secret/trustnow/platform/
```

**VERIFY §3.0:**
```bash
vault status | grep -E "Initialized|Sealed"
vault kv list secret/trustnow/platform/
docker exec trustnow-redis redis-cli -a $(vault kv get -field=password secret/trustnow/platform/redis) ping
curl -s http://localhost:8001/ | python3 -c "import sys,json; print('Kong:', json.load(sys.stdin).get('version'))"
curl -s http://localhost:8080/health
mc ls local/
```
Expected: Vault Initialized=true Sealed=false, 8 secrets listed, Redis PONG, Kong version, Keycloak UP, MinIO 4 buckets

---

### 3.1 — TLS Certificate Setup
```bash
sudo apt install -y certbot python3-certbot-nginx

# Development: self-signed certificate
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.key \
  -out /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.crt \
  -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=TRUSTNOW/CN=trustnow.local"
chmod 600 /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.key
chmod 644 /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.crt

# Update Nginx config with TLS — HTTP redirects to HTTPS
sudo bash -c 'cat > /etc/nginx/sites-available/trustnow << EOF
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.crt;
    ssl_certificate_key /opt/trustnowailabs/trustnow-ai-worker-stack/ssl/trustnow.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /health {
        return 200 "TRUSTNOW OK";
        add_header Content-Type text/plain;
    }
    location /api/ {
        # GAP-001 FIX: Kong proxy on :8000, AI Pipeline FastAPI on :8002 (localhost only)
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /widget/ {
        alias /opt/trustnowailabs/trustnow-ai-worker-stack/services/widget/dist/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }
}
EOF'

sudo nginx -t && sudo systemctl reload nginx
```

**VERIFY §3.1:** `curl -sk https://localhost/health`
Expected: `TRUSTNOW OK`

---

### 3.2 — GitHub Repository + CI/CD
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack
git init && git branch -M main

cat > .gitignore << 'EOF'
# Secrets — NEVER commit these
.env
*.env
config/vault/vault-init.json
config/vault/vault-env.sh
secrets/
*.key
*.pem
*.crt
ssl/

# Data directories — server-local only
data/
logs/
*.log

# Node / Python build artefacts
node_modules/
__pycache__/
*.pyc
venv/
.venv/
dist/
build/
.next/

# Large model files
*.onnx
*.bin
*.safetensors
data/ollama/
data/piper-voices/

# IDE
.vscode/settings.json
.idea/
EOF

# Initial commit
git add AGENT.md RUNBOOK.md docs/ .gitignore
git commit -m "chore: initialise TRUSTNOW AI Worker Stack — Tasks 1-3 infrastructure complete"

# Create GitHub Actions CI workflow scaffold
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: TRUSTNOW CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Lint and test
        run: echo "Expand as services are built in Tasks 4-15"
EOF

git add .github/
git commit -m "ci: add GitHub Actions CI workflow scaffold"

# Connect to GitHub repository (GAP: GitHub repo URL now confirmed)
git remote add origin https://github.com/rajangnan/trustnow-ai-worker-stack.git
git push -u origin main
```

**VERIFY §3.2:** `git log --oneline && git status`
Expected: 2 commits, working tree clean, no secrets staged

---

### 3.3 — Kubernetes (K3s) + Helm
```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -
sleep 30

# Configure kubectl for trustnow user
mkdir -p /home/trustnow/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /home/trustnow/.kube/config
sudo chown trustnow:trustnow /home/trustnow/.kube/config
sudo chmod 600 /home/trustnow/.kube/config
export KUBECONFIG=/home/trustnow/.kube/config
echo 'export KUBECONFIG=/home/trustnow/.kube/config' >> /home/trustnow/.bashrc

# Create TRUSTNOW namespaces
kubectl create namespace trustnow-platform
kubectl create namespace trustnow-monitoring
kubectl create namespace argocd

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

**VERIFY §3.3:**
```bash
export KUBECONFIG=/home/trustnow/.kube/config
kubectl get nodes
kubectl get namespaces
helm version --short
```
Expected: node in Ready state, 3 TRUSTNOW namespaces, Helm v3.x

---

### 3.4 — ArgoCD (GitOps CD)
```bash
export KUBECONFIG=/home/trustnow/.kube/config

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Extract admin password and store in Vault
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)
vault kv put secret/trustnow/platform/argocd admin_password="$ARGOCD_PASS"
echo "ArgoCD admin password stored in Vault at secret/trustnow/platform/argocd"

kubectl get pods -n argocd
```

**VERIFY §3.4:** `kubectl get pods -n argocd | grep -c Running`
Expected: multiple pods running

---

### 3.5 — Task 3 Complete Verification
```bash
export VAULT_ADDR='http://127.0.0.1:8200'
export KUBECONFIG=/home/trustnow/.kube/config

echo "=== VAULT INITIALISED ===" && vault status | grep -E "Initialized|Sealed"
echo "=== VAULT SECRETS ===" && vault kv list secret/trustnow/platform/
echo "=== TLS ===" && curl -sk https://localhost/health
echo "=== HTTP→HTTPS REDIRECT ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost/health
echo "=== REDIS REAL CREDS ===" && docker exec trustnow-redis redis-cli -a $(vault kv get -field=password secret/trustnow/platform/redis) ping
echo "=== KONG ===" && curl -s http://localhost:8001/ | python3 -c "import sys,json; print('Kong:', json.load(sys.stdin).get('version'))"
echo "=== KEYCLOAK ===" && curl -s http://localhost:8080/health
echo "=== MINIO ===" && mc ls local/
echo "=== GRAFANA ===" && curl -s http://localhost:3000/api/health | python3 -c "import sys,json; print('Grafana DB:', json.load(sys.stdin).get('database'))"
echo "=== KUBERNETES NODE ===" && kubectl get nodes
echo "=== K8S NAMESPACES ===" && kubectl get namespaces | grep trustnow
echo "=== HELM ===" && helm version --short
echo "=== ARGOCD PODS ===" && kubectl get pods -n argocd | grep -c Running
echo "=== GIT LOG ===" && git -C /opt/trustnowailabs/trustnow-ai-worker-stack log --oneline
echo "=== ALL CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Status}}"
echo "=== VAULT INIT FILE ===" && ls -la /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-init.json
```

**Expected results:**
- Vault: Initialized=true, Sealed=false ✅
- Vault secrets: 9 entries listed (postgres/redis/kong/keycloak/minio/grafana/livekit/litellm/argocd) ✅
- TLS: `TRUSTNOW OK` via HTTPS ✅
- HTTP redirect: returns 301 ✅
- Redis: PONG with real credential ✅
- Kong: version returned ✅
- Keycloak: status UP ✅
- MinIO: 4 buckets listed ✅
- Kubernetes: node Ready, 3 trustnow namespaces ✅
- Helm: v3.x ✅
- ArgoCD: pods running ✅
- Git: 2 commits ✅
- vault-init.json: present, permissions 600 ✅

After all verifications pass — update RUNBOOK.md with Task 3 completion. Include: date, all Vault secret paths created, TLS cert location, K3s node name, ArgoCD namespace status, and this critical note: **vault-init.json contains unseal keys and root token — Architect must back this up offline immediately.** Then report back to Architect.

---

## TASK 4 — DATABASE SCHEMA, CID SERVICE & EVENT PIPELINE

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 4

Read RUNBOOK.md and confirm Task 3 is marked COMPLETE before starting. Then execute §4.1 through §4.6 in strict sequence. You have full autonomy — do not pause for confirmation between steps. Report back only when Task 4 is fully complete or if something fails.

**CRITICAL environment setup — run these before every command in this task:**
```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh
export KUBECONFIG=/home/trustnow/.kube/config
export VAULT_ADDR='http://127.0.0.1:8200'

# Retrieve PostgreSQL app password for use in psql commands
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)
REDIS_PASS=$(vault kv get -field=password secret/trustnow/platform/redis)
```

---

**Prerequisite: Task 3 complete.**

### 4.1 — PostgreSQL Schema with Full RLS (BRD-L5-MT-003, BRD-CC-001)

Create the complete schema file:
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database
```

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/schema.sql` with ALL of the following:

**Entities to implement (19 tables):**
- `tenants` — tenant_id (uuid PK default uuid_generate_v4()), name, plan_tier, default_partition,
  settings_json JSONB DEFAULT '{
    "mcp_terms_accepted": false,
    "mcp_terms_accepted_at": null,
    "mcp_terms_accepted_by": null
  }',  -- §6.9: MCP Terms accepted once per workspace (not per server). Also stores other workspace-level prefs.
  created_at, status
- `users` — user_id, tenant_id (FK+RLS), email, name, role_id, status, last_login, mfa_enabled
- `roles` — role_id, tenant_id (RLS), name (6 standard roles), permissions_json
- `agents` — agent_id, tenant_id (RLS), name,
  type VARCHAR(20) NOT NULL DEFAULT 'conversational',  -- conversational|tools_assisted|autonomous (agent capability level)
  creation_path VARCHAR(20) NOT NULL DEFAULT 'blank',  -- blank|guided (which wizard path created this agent)
  industry VARCHAR(60) DEFAULT NULL,                   -- from Step 2 of guided wizard (e.g. 'healthcare_medical', 'bpo_collections')
  use_case VARCHAR(80) DEFAULT NULL,                   -- from Step 3 of guided wizard (e.g. 'telehealth_support')
  main_goal TEXT DEFAULT NULL,                         -- from Step 5 of guided wizard — free text, used in LLM prompt generation
  website_url TEXT DEFAULT NULL,                       -- from Step 5 of guided wizard — async-crawled post-creation to enrich system prompt
  text_only BOOLEAN DEFAULT false,                     -- from Chat only toggle (present on BOTH blank and guided paths, Step 2/Step 5 respectively)
  status VARCHAR(20) DEFAULT 'draft',                  -- draft|live|paused|archived
  partition VARCHAR(10) DEFAULT 'A',                   -- A=cloud|B=onprem
  created_by UUID REFERENCES users(user_id),
  current_version_id UUID,                             -- FK to agent_versions, updated on Publish
  post_call_webhook_url TEXT DEFAULT NULL,
  environment VARCHAR(20) DEFAULT 'production',        -- production|staging|development
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  analysis_language VARCHAR(10) DEFAULT 'auto'         -- §9.4: 'auto'|language code — used for post-call LLM summary + criteria evaluation
- `agent_configs` — config_id, agent_id, version,
  -- Core
  system_prompt TEXT DEFAULT '',
  default_personality_enabled BOOLEAN DEFAULT true,   -- CONFIRMED LIVE: ON by default. Applies ElevenLabs base personality layer on top of system prompt.
  timezone_variable_enabled BOOLEAN DEFAULT false,    -- tracks whether {timezone} was injected via "Set timezone" button
  timezone_override VARCHAR(50),                       -- explicit timezone override (e.g. 'Asia/Kolkata') — distinct from {timezone} variable
  first_message TEXT DEFAULT '',
  first_message_interruptible BOOLEAN DEFAULT true,
  first_message_localized JSONB DEFAULT '{}',         -- {"hi": "...", "ta": "..."} per-language first message overrides
  -- Voice
  voice_id, expressive_mode_enabled BOOLEAN DEFAULT false,
  expressive_mode_dismissed BOOLEAN DEFAULT false,    -- tracks whether the Expressive Mode promo card was dismissed (UI preference, not a feature toggle)
  additional_voices JSONB DEFAULT '[]',               -- array of {voice_id, language}
  -- Language
  primary_language, additional_languages[], hinglish_mode_enabled BOOLEAN DEFAULT false,
  language_groups JSONB DEFAULT '[]',  -- e.g. [{name:"Hindi & Tamil", languages:["hi","ta"]}]
  -- LLM
  llm_model_id, backup_llm_policy VARCHAR(20) DEFAULT 'default', -- default|custom|disabled
  backup_llm_model_id UUID REFERENCES llm_models(model_id),
  llm_temperature NUMERIC(3,2) DEFAULT 0.5,
  llm_thinking_budget_enabled BOOLEAN DEFAULT false,
  llm_max_tokens INTEGER DEFAULT -1,
  llm_cascade_timeout_s INTEGER DEFAULT 8,  -- seconds before trying backup LLM (NEW)
  -- STT/TTS
  stt_provider_id, tts_provider_id,
  -- Multimodal input (NEW)
  allow_file_attachments BOOLEAN DEFAULT false,  -- images/PDFs in chat (requires multimodal LLM)
  -- Conversation behaviour
  eagerness VARCHAR(10) DEFAULT 'normal',  -- eager|normal|patient (NOT low|normal|high — confirmed live)
  spelling_patience VARCHAR(10) DEFAULT 'auto',  -- auto|off (NEW — extends VAD when user spells names/numbers)
  speculative_turn_enabled BOOLEAN DEFAULT false,
  take_turn_after_silence_s INTEGER DEFAULT 7,  -- renamed from _ms to _s (confirmed: value is 7 seconds)
  end_conversation_after_silence_s INTEGER DEFAULT -1,
  max_conversation_duration_s INTEGER DEFAULT 600,
  max_conversation_duration_message TEXT DEFAULT 'Conversation ended, goodbye!',
  max_duration_message_localized JSONB DEFAULT '{}',  -- per-language overrides (NEW)
  soft_timeout_s INTEGER DEFAULT -1,
  soft_timeout_message TEXT DEFAULT 'Let me check that for you...',  -- filler TTS spoken during soft timeout wait (CO-BROWSING §4.4)
  soft_timeout_message_localized JSONB DEFAULT '{}',  -- per-language overrides: {"hi": "...", "es": "..."}
  filter_background_speech_enabled BOOLEAN DEFAULT false,
  asr_model VARCHAR(50) DEFAULT 'original',  -- original|scribe_realtime_v2_1
  user_input_audio_format VARCHAR(30) DEFAULT 'pcm_16000',  -- pcm_8000|pcm_16000|pcm_22050|pcm_24000|pcm_44100|pcm_48000|ulaw_8000
  -- Client events (NEW)
  client_events TEXT[] DEFAULT ARRAY['audio','interruption','user_transcript','agent_response','agent_response_correction'],
  -- Guardrails (§5.2 — card-based redesign confirmed live)
  guardrails_focus_enabled BOOLEAN DEFAULT false,              -- Focus card: keeps agent on-topic
  -- NOTE: guardrails_focus_config JSONB removed — Focus is a simple boolean, no sub-config (confirmed §5.2)
  guardrails_manipulation_enabled BOOLEAN DEFAULT false,       -- Manipulation card: parent toggle
  guardrails_prompt_injection BOOLEAN DEFAULT false,           -- sub-toggle inside Manipulation drawer (NEW)
  guardrails_content_enabled BOOLEAN DEFAULT false,            -- Content card (sub-toggles TBC — drawer not fully explored in §5.2)
  guardrails_custom_prompt TEXT DEFAULT null,                  -- Custom card: user-written guardrail instructions
  -- Privacy (CO-BROWSING §4.7 + TRUSTNOW BPO extension)
  zero_retention_mode BOOLEAN DEFAULT false,  -- no conversation content stored
  store_call_audio BOOLEAN DEFAULT true,  -- audio recording stored
  conversations_retention_days INTEGER DEFAULT -1,  -- -1 = unlimited; positive = auto-purge after N days
  pii_redaction_enabled BOOLEAN DEFAULT false,  -- TRUSTNOW EXCEED ELEVENLABS: auto-redact PII from transcripts before storage (phone numbers, account numbers, DOB, addresses)
  -- Overrides (what callers can override per-conversation)
  allowed_overrides TEXT[] DEFAULT '{}', -- first_message|system_prompt|llm|voice|voice_speed|voice_stability|voice_similarity|text_only
  -- RAG (§8.4 — confirmed live defaults)
  rag_enabled BOOLEAN DEFAULT true,                -- CONFIRMED LIVE: ON by default (not false — corrected)
  rag_embedding_model VARCHAR(30) DEFAULT 'english',  -- 'english'|'multilingual' (co-browsing: English optimized is default)
  rag_character_limit INTEGER DEFAULT 50000,
  rag_chunk_limit INTEGER DEFAULT 20,
  rag_vector_distance_limit NUMERIC(4,3) DEFAULT 0.5,
  rag_num_candidates_enabled BOOLEAN DEFAULT false,
  rag_num_candidates_value INTEGER DEFAULT 100,       -- renamed from rag_num_candidates for clarity
  rag_query_rewrite_enabled BOOLEAN DEFAULT false,
  rag_query_rewrite_prompt TEXT DEFAULT null,         -- custom prompt when query rewrite is ON (NEW)
  -- Other
  tools_config_json JSONB DEFAULT '{
    "system_tools": {
      "end_conversation": false,
      "detect_language": false,
      "skip_turn": false,
      "transfer_to_agent": false,
      "transfer_to_number": false,
      "play_keypad_touch_tone": false,
      "voicemail_detection": false
    },
    "attached_tool_ids": []
  }',  -- §6.3: system tool toggles + list of user-created tool UUIDs attached to this agent
- `agent_versions` — version_id, agent_id,
  -- NOTE: agent_versions is a lightweight pointer table — the canonical branch/version data
  -- is in agent_branches + branch_versions (confirmed §13.7). agent_versions.current_version_id
  -- on agents table points to the live branch_versions.version_id for routing purposes.
  config_snapshot_json, published_by, published_at,
  traffic_split_pct INTEGER DEFAULT 100, is_live BOOLEAN DEFAULT false
- `agent_branches` — branch_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — §13 Tab 3 (Branches) — one row per agent branch (Main, A, B, etc.)
  tenant_id UUID NOT NULL (RLS),
  name VARCHAR(100) NOT NULL,          -- e.g. 'Main', 'Variant A', 'Hindi Script Test'
  description TEXT,
  traffic_split DECIMAL(5,2) DEFAULT 0.00,   -- 0.00–100.00 %
                                              -- all live branches for an agent must sum to 100%
  status VARCHAR(20) DEFAULT 'draft',         -- 'draft'|'live'|'paused'|'archived'
  is_protected BOOLEAN DEFAULT false,         -- when true: edits require explicit unlock
  parent_branch_id UUID REFERENCES agent_branches(branch_id),  -- which branch this was cloned from
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `branch_versions` — version_id UUID PK, branch_id UUID NOT NULL REFERENCES agent_branches(branch_id),
  -- NEW TABLE — §13.4 version history (clock icon) — each Publish creates one row
  tenant_id UUID NOT NULL (RLS),
  version_number INTEGER NOT NULL,       -- auto-incremented per branch
  snapshot JSONB NOT NULL,               -- full agent_configs snapshot at publish time
  published_by UUID REFERENCES users(user_id),
  published_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT                             -- optional publish notes / changelog entry
- `workflow_versions` — version_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — §12 EXCEED: workflow version history (flagged in Step 11)
  -- Snapshot taken on every workflow save (not just publish)
  branch_id UUID NOT NULL,
  tenant_id UUID NOT NULL (RLS),
  nodes_json JSONB NOT NULL,             -- workflow_nodes snapshot
  edges_json JSONB NOT NULL,             -- workflow_edges snapshot
  saved_by UUID REFERENCES users(user_id),
  saved_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT                             -- e.g. "Restored from v3", "Added qualification step"
  -- Retention: keep last 30 days; older versions auto-purged by retention cron
- `test_folders` — folder_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §14 workspace test library folder organisation
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
- `agent_tests` — test_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §14 workspace-level test definitions (shared across agents)
  folder_id UUID REFERENCES test_folders(folder_id),
  name VARCHAR(200) NOT NULL,
  test_type VARCHAR(20) NOT NULL,        -- 'next_reply'|'tool_invocation'|'simulation'
  is_template BOOLEAN DEFAULT false,     -- true for the 5 ElevenLabs-equivalent seed templates
  created_by UUID REFERENCES users(user_id),
  -- Next Reply fields (§14.5.1)
  conversation JSONB DEFAULT '[]',       -- [{role: 'user'|'agent', content: '...'}]
  expected_criteria TEXT,                -- natural language description of expected response
  success_examples JSONB DEFAULT '[]',   -- example passing responses
  failure_examples JSONB DEFAULT '[]',   -- example failing responses
  -- Tool Invocation fields (§14.5.2)
  tool_type VARCHAR(30),                 -- 'workflow_transition'|'tool_call'
  target_agent_id UUID REFERENCES agents(agent_id),
  target_node_id UUID REFERENCES workflow_nodes(node_id),
  should_invoke BOOLEAN DEFAULT true,    -- pass if tool IS invoked (true) or IS NOT invoked (false)
  -- Simulation fields (§14.5.3)
  user_scenario TEXT,                    -- description of simulated user persona
  success_criteria TEXT,                 -- what defines a passing simulation
  max_turns INTEGER DEFAULT 5,
  mock_all_tools BOOLEAN DEFAULT false,
  -- Shared
  dynamic_variables JSONB DEFAULT '{}',  -- {key: value} substituted at test run time
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `agent_test_attachments` — (agent_id, test_id) junction table,
  -- NEW TABLE — which tests are attached to which agents (many-to-many)
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  test_id UUID NOT NULL REFERENCES agent_tests(test_id),
  attached_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, test_id)
- `test_runs` — run_id UUID PK, test_id UUID NOT NULL REFERENCES agent_tests(test_id),
  -- NEW TABLE — each test execution creates one row
  tenant_id UUID NOT NULL (RLS),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  branch_id UUID NOT NULL REFERENCES agent_branches(branch_id),
  status VARCHAR(20) DEFAULT 'running',  -- 'running'|'passed'|'failed'|'error'
  result_detail JSONB,                   -- full LLM evaluation response + reasoning
  duration_ms INTEGER,
  run_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
- `agent_templates` — template_id, agent_type VARCHAR(20) (conversational/tools_assisted/autonomous), industry VARCHAR(60), use_case VARCHAR(80), system_prompt_template TEXT, first_message_template TEXT, suggested_voice_id, suggested_llm_model_id, suggested_tools TEXT[], is_bpo_specific BOOLEAN DEFAULT false, created_at
  -- 22 industries (17 ElevenLabs baseline + 5 TRUSTNOW BPO-specific) × up to 13 use cases each.
  -- Tier 1 launch seed: 48 templates (all 5 BPO industries + Healthcare, Finance, Technology × top 6 use cases).
  -- Full GA seed: 132+ templates across all 22 industries.
  -- Template placeholders: {{agent_name}}, {{company_name}}, {{industry}}, {{use_case}}, {{main_goal}}, {{website_content}}
  -- BPO templates include regulatory compliance language, call structure, escalation triggers, industry disposition vocabulary.
  -- See §6.2D-D for seeding strategy and §6.2D-C for complete industry/use-case enum lists.
- `voices` — voice_id, tenant_id (null=global), name, description, gender, language_tags[], trait_tags[], provider, sample_audio_url, is_global
- `llm_providers` — provider_id, name, type (cloud/onprem), base_url, auth_type
- `llm_models` — model_id, provider_id (FK), model_name, display_name, latency_p50_ms, cost_per_min (numeric), context_window_tokens, supported_languages[], status
- `stt_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `tts_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `knowledge_base_docs` — doc_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NOTE: NO agent_id FK — KB docs are WORKSPACE-LEVEL assets (confirmed live §8.2)
  -- Agent-KB relationship is through agent_knowledge_base junction table below
  name VARCHAR(200) NOT NULL,
  type VARCHAR(10) NOT NULL,         -- 'url'|'file'|'text'
  source_url TEXT,                   -- for type='url' — the crawled URL
  storage_path TEXT,                 -- MinIO path for uploaded files
  content TEXT,                      -- for type='text' — inline text content
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending'|'indexing'|'ready'|'failed'
  visibility VARCHAR(20) DEFAULT 'workspace',  -- 'private'|'workspace'|'public'
                                     -- 'workspace' = all agents in tenant can use it (confirmed §8.2: shared across agents)
  chunk_count INTEGER,
  vector_collection_ref VARCHAR(200),  -- Qdrant collection reference
  last_indexed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `agent_knowledge_base` — junction table (NEW — §8.2 confirmed KB is workspace-level, agents attach to KB docs)
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  kb_doc_id UUID NOT NULL REFERENCES knowledge_base_docs(doc_id),
  branch_id UUID REFERENCES agent_versions(version_id),  -- which branch this attachment applies to (NULL = all branches)
  attached_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, kb_doc_id, branch_id)
  -- Index: CREATE INDEX idx_akb_agent ON agent_knowledge_base(agent_id, branch_id)
  -- Index: CREATE INDEX idx_akb_kb_doc ON agent_knowledge_base(kb_doc_id) -- for "Dependent agents" query
- `tools` — tool_id, tenant_id (RLS), agent_id, name, type (webhook/client/integration/mcp/system), description,
  -- HTTP config (webhook only)
  method VARCHAR(10),                         -- GET|POST|PUT|PATCH|DELETE
  url TEXT,
  auth_connection_id UUID,
  headers JSONB DEFAULT '{}',
  response_timeout_s INTEGER DEFAULT 20,
  -- Execution config (all types)
  disable_interruptions BOOLEAN DEFAULT false,
  wait_for_response BOOLEAN DEFAULT false,    -- client tools only: pause conversation until client responds
  pre_tool_speech VARCHAR(10) DEFAULT 'auto', -- auto|force
  execution_mode VARCHAR(20) DEFAULT 'immediate',
  tool_call_sound VARCHAR(50) DEFAULT null,
  -- Parameters & mocking
  input_schema JSONB,                         -- JSON Schema defining LLM-extractable parameters
  dynamic_variable_assignments JSONB DEFAULT '{}',  -- which dynamic vars update from tool response
  response_mocks JSONB DEFAULT '[]'           -- mock conditions for test simulations
- `widget_configs` — widget_id, agent_id,
  -- Setup
  feedback_enabled BOOLEAN DEFAULT true,  -- 1-5 star CSAT post-call rating
  -- Interface (8 toggles — confirmed live)
  interface_chat_mode BOOLEAN DEFAULT false,
  interface_send_text_on_call BOOLEAN DEFAULT false,
  interface_realtime_transcript BOOLEAN DEFAULT false,
  interface_language_dropdown BOOLEAN DEFAULT true,
  interface_mute_button BOOLEAN DEFAULT false,
  interface_action_indicator BOOLEAN DEFAULT false,       -- NEW
  interface_show_conversation_id BOOLEAN DEFAULT true,    -- NEW
  interface_hide_audio_tags BOOLEAN DEFAULT true,         -- NEW
  expanded_behavior VARCHAR(20) DEFAULT 'starts_expanded',  -- starts_collapsed|starts_expanded|always_expanded
  -- Markdown links
  allow_all_domains BOOLEAN DEFAULT false,
  allowed_domains TEXT[] DEFAULT '{}',
  include_www_variants BOOLEAN DEFAULT true,
  allow_http_links BOOLEAN DEFAULT true,
  -- Avatar
  avatar_type VARCHAR(10) DEFAULT 'orb',  -- orb|link|image
  avatar_orb_color_1 VARCHAR(7) DEFAULT '#2792dc',   -- first orb gradient color
  avatar_orb_color_2 VARCHAR(7) DEFAULT '#9ce6e6',   -- second orb gradient color
  avatar_image_url TEXT DEFAULT null,                 -- for link or uploaded image type
  -- Style section (NEW — all design tokens)
  collapsible BOOLEAN DEFAULT false,
  placement VARCHAR(20) DEFAULT 'bottom_right',       -- bottom_right|bottom_left|top_right|top_left
  style_config JSONB DEFAULT '{
    "base": "#000000",
    "base_hover": "#ffffff",
    "base_active": "#ffffff",
    "base_border": "#ffffff",
    "base_subtle": "#ffffff",
    "base_primary": "#000000",
    "accent_border": "#ffffff",
    "accent_subtle": "#ffffff",
    "accent_primary": "#ffffff",
    "overlay_padding": "32px",
    "button_radius": "18px",
    "input_radius": "18px",
    "bubble_radius": "15px",
    "sheet_radius": "24px",
    "compact_sheet_radius": "30px"
  }',
  code_block_theme VARCHAR(10) DEFAULT 'auto',        -- auto|light|dark
  -- Text contents / i18n (NEW — 24 tokens)
  text_contents JSONB DEFAULT '{
    "main_label": "Need help?",
    "start_call": "Start a call",
    "start_chat": "Start a chat",
    "new_call": "New call",
    "end_call": "End",
    "mute_microphone": "Mute microphone",
    "change_language": "Change language",
    "collapse": "Collapse",
    "expand": "Expand",
    "copied": "Copied!",
    "accept_terms": "Accept",
    "dismiss_terms": "Cancel",
    "connecting_status": "Connecting",
    "chatting_status": "Chatting with AI Agent",
    "input_label": "Text message input",
    "input_placeholder": "Send a message",
    "input_placeholder_text_only": "Send a message",
    "input_placeholder_new_conversation": "Start a new conversation",
    "user_ended_conversation": "You ended the conversation",
    "agent_ended_conversation": "The agent ended the conversation",
    "conversation_id": "Conversation ID",
    "agent_working": "Working...",
    "agent_done": "Completed",
    "agent_error": "Error occurred"
  }',
  -- Shareable page (NEW)
  shareable_description TEXT DEFAULT 'Chat with AI',
  require_terms_on_shareable BOOLEAN DEFAULT false
- `mcp_servers` — mcp_server_id UUID PK, tenant_id UUID NOT NULL (RLS),   -- NEW TABLE
  agent_id UUID REFERENCES agents(agent_id),  -- null = workspace-level server
  name VARCHAR(100) NOT NULL,
  description TEXT,
  server_type VARCHAR(20) NOT NULL,           -- 'sse' | 'streamable_http'
  server_url TEXT NOT NULL,
  auth_connection_id UUID,                    -- reference to auth config
  headers JSONB DEFAULT '{}',
  terms_accepted BOOLEAN DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  terms_accepted_by UUID,                     -- user_id who accepted
  created_at TIMESTAMPTZ DEFAULT now()
- `auth_policies` — policy_id, agent_id, tenant_id (RLS),
  authentication_enabled BOOLEAN DEFAULT false,   -- §5.1: "Enable authentication" toggle on Security tab
  allowed_hosts TEXT[] DEFAULT '{}',              -- §5.3: Allowlist — hosts permitted to connect to this agent's WebSocket
                                                  --   Empty array = any host can connect (public agents)
                                                  --   Populated = only listed domains accepted
  methods_enabled[], allowed_numbers[], ip_allowlist[], jwt_config_json,
  conversation_initiation_webhook_url TEXT,  -- §5.5: fetches caller context from client CRM at call start
  post_call_webhook_url TEXT,               -- §5.5: fires after call ends (CRM write-back, n8n automation)
  post_call_webhook_secret TEXT,            -- HMAC secret for signing post-call webhook payloads
  allowed_overrides TEXT[] DEFAULT '{}',    -- §5.4: which per-conversation overrides the client embed may pass
                                            --   values: 'first_message'|'system_prompt'|'llm'|'voice'|'voice_speed'|'voice_stability'|'voice_similarity'|'text_only'
- `handoff_policies` — policy_id, agent_id, tenant_id (RLS), handoff_type, transfer_target, escalation_triggers[], pre_handoff_tts_message
- `phone_numbers` — phone_number_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §10 Phone Numbers sidebar (Deploy → Phone Numbers)
  label VARCHAR(100) NOT NULL,          -- descriptive name e.g. "UK Support Line"
  phone_number VARCHAR(20) NOT NULL,    -- E.164 format e.g. +15551234567
  agent_id UUID REFERENCES agents(agent_id),  -- assigned agent (NULL = unassigned)
  -- Inbound SIP settings (Step 3 of 8-step wizard)
  sip_transport VARCHAR(5) DEFAULT 'tls',            -- 'tcp'|'tls'
  media_encryption VARCHAR(10) DEFAULT 'required',   -- 'disabled'|'allowed'|'required'
  -- Outbound SIP settings (Step 4 of 8-step wizard)
  outbound_address VARCHAR(255),         -- provider SIP hostname e.g. sip.telnyx.com (NO sip: prefix)
  outbound_transport VARCHAR(5) DEFAULT 'tls',
  outbound_encryption VARCHAR(10) DEFAULT 'required',
  -- Authentication (Step 6 — digest auth OR ACL)
  sip_username VARCHAR(100),             -- digest auth username (NULL = use ACL)
  sip_password_enc TEXT,                 -- AES-256-encrypted password (stored in Vault reference)
  -- Custom SIP headers (Step 5 — optional)
  custom_sip_headers JSONB DEFAULT '[]', -- [{name: "X-Custom", value: "..."}]
  -- Status
  status VARCHAR(20) DEFAULT 'active',   -- 'active'|'paused'|'archived'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraint: unique phone number per tenant
  UNIQUE (tenant_id, phone_number)
- `whatsapp_accounts` — wa_account_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §16 Deploy → WhatsApp
  meta_waba_id VARCHAR(100) NOT NULL,       -- WhatsApp Business Account ID from Meta API
  phone_number_id VARCHAR(100) NOT NULL,    -- Meta phone number ID (distinct from E.164 number)
  phone_number VARCHAR(20),                 -- E.164 display format e.g. +15551234567
  display_name VARCHAR(100),               -- WhatsApp Business profile display name
  agent_id UUID REFERENCES agents(agent_id),  -- assigned agent (NULL = inbound ignored, calls rejected)
  access_token_enc TEXT,                   -- encrypted Meta Graph API access token (Vault reference)
  respond_with_audio BOOLEAN DEFAULT true, -- true = TTS audio responses; false = text-only
  status VARCHAR(20) DEFAULT 'active',     -- 'active'|'paused'|'disconnected'
  -- System dynamic variables (§16.7 — auto-set per conversation)
  -- system__caller_id: WhatsApp user ID of the person messaging/calling
  -- system__called_number: WhatsApp phone number ID of the business account
  -- (these are runtime values, not stored fields)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `conversations` — conversation_id (CID uuid PK), agent_id, tenant_id (RLS), channel, status, started_at TIMESTAMPTZ NOT NULL, ended_at, duration_s, recording_url, transcript_json, llm_cost, tts_cost, stt_cost, total_cost, language_detected, handoff_occurred, rating, feedback_text,
  -- ElevenLabs-parity fields (from live platform observation §9.3)
  call_cost_credits INTEGER,           -- total platform credits consumed
  llm_credits INTEGER,                 -- LLM-specific credits
  llm_cost_usd DECIMAL(10,6),         -- actual USD cost (confirmed §9.3.1 — $0.00316 per call)
  llm_rate_per_min DECIMAL(10,6),     -- per-minute rate applied (NEW — confirmed §9.3.1)
  environment VARCHAR(20) DEFAULT 'production',   -- production|development|staging
  is_preview BOOLEAN DEFAULT false,
  how_call_ended VARCHAR(50),          -- 'client'|'agent'|'silence_timeout'|'max_duration'|'error'
                                       -- CONFIRMED §9.3.1: 'client' = "Client ended call" (NOT 'client_navigated_away')
  user_id VARCHAR(255),
  branch_id UUID REFERENCES agent_versions(version_id),
  tts_latency_ms_avg INTEGER,
  asr_latency_ms_avg INTEGER,
  turn_count INTEGER,
  call_successful BOOLEAN,             -- aggregate of all criteria: true only if all pass
  evaluation_results JSONB DEFAULT '{}',    -- {criteria_id: true/false, ...} per criterion
  data_collection_results JSONB DEFAULT '{}',  -- renamed from extracted_data for consistency
  extracted_data JSONB DEFAULT '{}',   -- legacy alias — same as data_collection_results
  client_data JSONB DEFAULT '{}',      -- caller-side data from variables/flow (§9.3.3)
  ai_summary TEXT DEFAULT NULL,        -- LLM-generated post-call summary (NEW — §9.3.1)
  applied_overrides JSONB DEFAULT '{}' -- which per-conversation overrides the client applied (§5.4)
- `evaluation_criteria` — criteria_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — confirmed §9.4: separate table, not stored in agent_configs JSONB
  tenant_id UUID NOT NULL (RLS),
  name VARCHAR(200) NOT NULL,          -- e.g. "Did the agent collect caller's name?"
  description TEXT,                    -- human-readable description
  llm_prompt TEXT NOT NULL,            -- prompt sent to LLM post-call: "Given this transcript, did the agent [criterion]? Answer YES or NO."
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `data_collection_specs` — spec_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — confirmed §9.4: separate table for structured data extraction specs
  tenant_id UUID NOT NULL (RLS),
  field_name VARCHAR(100) NOT NULL,    -- e.g. "customer_intent", "product_mentioned"
  field_type VARCHAR(20) DEFAULT 'string',  -- 'string'|'boolean'|'number'
  extraction_prompt TEXT NOT NULL,     -- prompt: "Extract the customer's stated reason for calling from this transcript"
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
- `conversation_turns` — turn_id UUID PK, conversation_id UUID NOT NULL REFERENCES conversations(conversation_id),
  -- NEW TABLE — enables per-turn analytics queries and waveform sync
  -- NOTE: full transcript also stored in conversations.transcript_json for backward compat
  tenant_id UUID NOT NULL (RLS),
  turn_index INTEGER NOT NULL,         -- sequential turn number within conversation
  speaker VARCHAR(10) NOT NULL,        -- 'agent'|'user'
  text TEXT,
  timestamp_ms INTEGER,                -- milliseconds from call start
  tts_latency_ms INTEGER,              -- agent turns only: time from LLM response → TTS audio start
  llm_latency_ms INTEGER,              -- agent turns only (except first_message)
  asr_latency_ms INTEGER               -- user turns only
- `audit_logs` — log_id, tenant_id (RLS), user_id, action, resource_type, resource_id, before_json, after_json, ip_address, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `recordings` — recording_id, conversation_id (CID FK), tenant_id (RLS), storage_path, duration_s, format, encryption_key_ref, retention_until
- `workspace_settings` — tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id),
  -- NEW TABLE — §17 Settings page: workspace-level defaults (one row per tenant)
  -- Webhook fallback: agent-level webhook (auth_policies) takes priority; workspace default fires if none set
  conversation_initiation_webhook_url TEXT,       -- workspace default initiation webhook
  conversation_initiation_webhook_auth JSONB DEFAULT '{}',  -- auth config for above
  post_call_webhook_url TEXT,                     -- workspace default post-call webhook
  post_call_webhook_secret TEXT,                  -- HMAC signing secret for post-call payloads
  post_call_webhook_auth JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
- `workspace_secrets` — secret_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §17.4: write-once encrypted secret values for tool configs
  -- Referenced in tool webhooks as {{secret.SECRET_NAME}} — resolved at runtime, never exposed
  name VARCHAR(100) NOT NULL,      -- reference key e.g. 'CRM_TOKEN', 'OPENAI_API_KEY'
  value_enc TEXT NOT NULL,         -- AES-256 encrypted (Vault reference preferred)
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- NOTE: No updated_at — secrets are write-once. Delete and recreate to change value.
  -- The value is NEVER returned to the frontend after creation ("once added cannot be retrieved")
  UNIQUE (tenant_id, name)
- `workspace_auth_connections` — auth_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §17.5: reusable auth connections for tool webhook authentication
  -- Referenced in tool configs via auth_connection_id FK — one configuration, many tools
  name VARCHAR(100) NOT NULL,      -- e.g. 'Salesforce OAuth', 'HubSpot API Key'
  auth_type VARCHAR(20) NOT NULL,  -- 'oauth2'|'api_key'|'bearer'|'basic'
  config_enc JSONB NOT NULL,       -- encrypted auth config (token, client_id/secret, username/password)
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `api_keys` — key_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §18 ElevenAPI → Configure → API Keys
  -- Used by BPO clients/developers to call the TRUSTNOW Platform API programmatically
  name VARCHAR(100) NOT NULL,           -- e.g. "CRM Connector" or auto-generated "Venerated Persian Leopard"
  key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of actual key — key shown once at creation, never stored
  key_prefix VARCHAR(12) NOT NULL,      -- first 8 chars for display: e.g. 'sk-tn_ab'
  restrict_key BOOLEAN DEFAULT true,    -- ON = granular endpoint permissions; OFF = full access
  monthly_credit_limit INTEGER,         -- NULL = unlimited; positive integer = monthly credit cap
  permissions JSONB DEFAULT '{}',       -- {endpoint: 'read'|'write'|'access'|null}
                                        -- TRUSTNOW scopes: agents|tts|stt|conversations|workspace|analytics|
                                        --   phone_numbers|batch_calls|whatsapp|kb|tools|tests|voices
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true        -- false = revoked
- `webhook_endpoints` — endpoint_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §19 ElevenAPI → Configure → Webhooks (platform-level event callbacks)
  -- Distinct from conversation webhooks (auth_policies/workspace_settings): this fires on platform events
  url VARCHAR(500) NOT NULL,            -- HTTPS endpoint where TRUSTNOW POSTs event payloads
  description TEXT,
  secret_enc TEXT NOT NULL,             -- HMAC shared secret (encrypted) — used to sign payloads
                                        -- Header name: X-TRUSTNOW-Signature (TRUSTNOW equivalent of ElevenLabs-Signature)
  events TEXT[] NOT NULL,               -- subscribed events: ['voice.removal', 'transcription.completed', ...]
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
- `webhook_delivery_log` — delivery_id UUID PK, endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(endpoint_id),
  -- NEW TABLE — delivery audit log for all webhook attempts (success + failure + retry)
  -- Also used by Settings page webhook payload inspector (§17 EXCEED ElevenLabs item 4)
  tenant_id UUID NOT NULL (RLS),
  event_type VARCHAR(50) NOT NULL,      -- e.g. 'voice.removal', 'transcription.completed', 'post_call'
  payload JSONB NOT NULL,               -- full payload POSTed to endpoint
  http_status INTEGER,                  -- HTTP response code (null if no response)
  response_body TEXT,                   -- trimmed response (first 500 chars)
  duration_ms INTEGER,
  success BOOLEAN,
  attempt_number INTEGER DEFAULT 1,     -- 1 = first attempt, 2/3 = retries
  attempted_at TIMESTAMPTZ DEFAULT now()
- `environment_variables` — var_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §20 ElevenAPI → Configure → Environment Variables
  -- Variables defined here are referenced as {{env.VAR_NAME}} in agent configs, tool URLs, system prompts
  name VARCHAR(100) NOT NULL,          -- snake_case identifier e.g. 'my_api_url', 'CRM_TOKEN'
  var_type VARCHAR(20) DEFAULT 'string',  -- 'string'|'number'|'boolean'
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)              -- name must be unique per workspace
- `environment_variable_values` — value_id UUID PK, var_id UUID NOT NULL REFERENCES environment_variables(var_id) ON DELETE CASCADE,
  -- NEW TABLE — one row per environment per variable
  -- Production is canonical default: if no value for current environment → falls back to production value
  environment VARCHAR(30) NOT NULL,    -- 'production'|'staging'|'development' (or custom env names)
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(var_id, environment)
- `tts_generations` — generation_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §21 ElevenCreative → Text to Speech (standalone, async TTS — NOT the realtime conversation pipeline)
  -- Used for: IVR prompts, on-hold messages, bulk voice-overs, training data generation
  input_text TEXT NOT NULL,              -- source text (max 5,000 chars)
  voice_id UUID REFERENCES voices(voice_id),
  model_id VARCHAR(50) NOT NULL,         -- 'eleven_multilingual_v2'|'eleven_v3'|'piper' etc.
  stability NUMERIC(3,2),                -- 0.0–1.0 slider value
  similarity_boost NUMERIC(3,2),         -- 0.0–1.0 slider value
  style_exaggeration NUMERIC(3,2),       -- 0.0–1.0 slider value
  speed NUMERIC(3,2),                    -- 0.5–2.0x
  use_speaker_boost BOOLEAN DEFAULT true,
  language_override VARCHAR(10),         -- null = auto-detect; set for forced language
  output_format VARCHAR(30) DEFAULT 'mp3_128000',
  storage_path TEXT,                     -- MinIO path for the generated audio file
  duration_s NUMERIC(8,2),              -- generated audio duration
  credits_used INTEGER,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
- `stt_transcripts` — transcript_id UUID PK, tenant_id UUID NOT NULL (RLS),
  -- NEW TABLE — §22 ElevenCreative → Speech to Text (standalone async STT — NOT realtime conversation pipeline)
  -- Used for: meeting transcription, uploaded call recordings, bulk media processing
  title VARCHAR(200),                    -- user-set or auto-generated from filename
  source_type VARCHAR(10) NOT NULL,      -- 'upload'|'youtube'|'url'
  source_url TEXT,                       -- for youtube/url source types; null for file upload
  storage_path TEXT,                     -- MinIO path for uploaded audio/video (upload type only)
  file_size_mb DECIMAL(8,2),
  duration_seconds INTEGER,
  language_detected VARCHAR(10),         -- auto-detected ISO language code
  language_override VARCHAR(10),         -- null = Detect (auto); set for forced language
  tag_audio_events BOOLEAN DEFAULT true, -- detect and label [applause][music][laughter] etc.
  include_subtitles BOOLEAN DEFAULT false,  -- generate SRT alongside text
  no_verbatim BOOLEAN DEFAULT false,     -- clean up filler words when true
  keyterms TEXT[] DEFAULT '{}',          -- domain vocabulary hints for accuracy
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending'|'processing'|'completed'|'failed'
  transcript_json JSONB,                 -- full transcript with word-level timestamps
  srt_content TEXT,                      -- SRT subtitle format (populated when include_subtitles=true)
  plain_text TEXT,                       -- clean text-only transcript (derived, for search indexing)
  credits_used INTEGER,
  error_message TEXT,                    -- populated on status='failed'
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  -- NEW TABLE — §11 Deploy → Outbound (Batch Calling)
  name VARCHAR(100) NOT NULL DEFAULT 'Untitled Batch',
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  phone_number_id UUID NOT NULL REFERENCES phone_numbers(phone_number_id),
  status VARCHAR(20) DEFAULT 'pending',   -- 'pending'|'running'|'completed'|'cancelled'|'failed'
  ringing_timeout_s INTEGER DEFAULT 60,   -- seconds to ring before marking unanswered
  concurrency_limit INTEGER,              -- NULL = auto (see formula in §6.2N)
  total_recipients INTEGER DEFAULT 0,
  calls_completed INTEGER DEFAULT 0,
  calls_failed INTEGER DEFAULT 0,
  calls_pending INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,              -- NULL = run immediately on submit
  timezone VARCHAR(60),                  -- e.g. 'Asia/Calcutta' — from browser auto-detect
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  compliance_acknowledged BOOLEAN DEFAULT false,  -- TRUSTNOW: must be true before submit
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
- `batch_call_recipients` — recipient_id UUID PK, batch_call_id UUID NOT NULL REFERENCES batch_calls(batch_call_id),
  -- NEW TABLE — one row per recipient in a batch call
  tenant_id UUID NOT NULL (RLS),
  phone_number VARCHAR(20) NOT NULL,       -- E.164 — from phone_number column in CSV
  dynamic_variables JSONB DEFAULT '{}',   -- {name: 'Nav', account_balance: '£245.00', ...}
  overrides JSONB DEFAULT '{}',           -- {language: 'en', first_message: '...', voice_id: '...', system_prompt: '...'}
                                          -- only populated when override columns present in CSV
                                          -- override columns only work if agent's Security Overrides are enabled
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending'|'in_progress'|'completed'|'failed'|'cancelled'
  conversation_id UUID REFERENCES conversations(conversation_id),  -- set when call completes
  attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
- `workflow_nodes` — node_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — §12 Tab 2 (Workflow) — individual nodes on the workflow canvas
  -- NOTE: Replaces workflow_definition_json JSONB on agent_configs (confirmed §12.9 — dedicated tables required)
  branch_id UUID NOT NULL,            -- which agent branch this workflow belongs to
  node_type VARCHAR(30) NOT NULL,     -- 'start'|'subagent'|'say'|'agent_transfer'|'phone_transfer'|'tool'|'end'
  label VARCHAR(100),                 -- display label on canvas node
  tenant_id UUID NOT NULL (RLS),
  -- Subagent node fields (§12.7)
  conversation_goal TEXT,             -- the sub-goal for this node
  override_prompt BOOLEAN DEFAULT false,  -- when ON: ignore global system prompt, use goal only
  voice_id UUID REFERENCES voices(voice_id),  -- null = use agent default
  llm_model VARCHAR(50),              -- null = use agent default
  eagerness VARCHAR(20),              -- null = use agent default; 'eager'|'normal'|'patient'
  spelling_patience VARCHAR(10),      -- null = use agent default; 'auto'|'off'
  speculative_turn_enabled BOOLEAN,   -- null = use agent default
  -- Canvas position
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  -- Node-type-specific config (agent_transfer delay/message, tool selection, etc.)
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
- `workflow_edges` — edge_id UUID PK, agent_id UUID NOT NULL REFERENCES agents(agent_id),
  -- NEW TABLE — §12.8 directed edges between workflow nodes
  branch_id UUID NOT NULL,
  tenant_id UUID NOT NULL (RLS),
  source_node_id UUID NOT NULL REFERENCES workflow_nodes(node_id),
  target_node_id UUID NOT NULL REFERENCES workflow_nodes(node_id),
  condition_label VARCHAR(200),       -- e.g. 'User info collected', 'Unconditional'
  condition_type VARCHAR(20) DEFAULT 'llm_evaluated',
                                      -- 'unconditional'|'llm_evaluated'|'tool_output'
  priority INTEGER DEFAULT 0,         -- evaluation order — lower = first evaluated
  created_at TIMESTAMPTZ DEFAULT now()

**Required at end of schema.sql:**
```sql
-- TimescaleDB hypertables (requires TimescaleDB extension already installed)
SELECT create_hypertable('conversations', 'started_at');
SELECT create_hypertable('audit_logs', 'timestamp');

-- RLS policies on every tenant-scoped table
-- Apply this pattern to: users, roles, agents, agent_configs, agent_versions,
-- knowledge_base_docs, tools, auth_policies, handoff_policies,
-- conversations, audit_logs, recordings
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
-- (repeat for all tenant-scoped tables)

-- audit_logs INSERT-ONLY enforcement
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- Performance indexes
CREATE INDEX idx_conversations_tenant_started ON conversations(tenant_id, started_at DESC);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_audit_logs_tenant_ts ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_knowledge_base_docs_agent ON knowledge_base_docs(agent_id, tenant_id);
```

Apply schema to database:
```bash
PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -f /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/schema.sql
```

**VERIFY §4.1:**
```bash
echo "=== ALL TABLES ===" && sudo -u postgres psql -d trustnow_platform -c "\dt"
echo "=== RLS ENABLED ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
echo "=== HYPERTABLES ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT hypertable_name FROM timescaledb_information.hypertables;"
echo "=== AUDIT RULES ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT rulename FROM pg_rules WHERE tablename='audit_logs';"
```
Expected: 19 tables, all tenant-scoped tables show rowsecurity=true, conversations + audit_logs as hypertables, 2 audit rules listed.

---

### 4.2 — Seed LLM Provider and Model Registry

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/seed-llm-providers.sql`:

```sql
-- LLM Providers (updated from live ElevenLabs platform observation March 2026)
INSERT INTO llm_providers (provider_id, name, type, base_url, auth_type) VALUES
  (uuid_generate_v4(), 'OpenAI',          'cloud',  'https://api.openai.com/v1',                            'api_key'),
  (uuid_generate_v4(), 'Anthropic',        'cloud',  'https://api.anthropic.com',                            'api_key'),
  (uuid_generate_v4(), 'Google',           'cloud',  'https://generativelanguage.googleapis.com',            'api_key'),
  (uuid_generate_v4(), 'Alibaba/Qwen',     'cloud',  'https://dashscope.aliyuncs.com/compatible-mode/v1',   'api_key'),
  (uuid_generate_v4(), 'Mistral AI',       'cloud',  'https://api.mistral.ai/v1',                           'api_key'),
  (uuid_generate_v4(), 'Meta/Groq',        'cloud',  'https://api.groq.com/openai/v1',                      'api_key'),
  (uuid_generate_v4(), 'ElevenLabs',       'cloud',  'https://api.elevenlabs.io',                           'api_key'),
  (uuid_generate_v4(), 'Ollama (On-Prem)', 'onprem', 'http://localhost:11434',                               'none');

-- LLM Models — updated with LIVE latency/cost data observed from ElevenLabs platform March 2026
-- OpenAI
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-5',       'GPT-5',        1220,  0.0304, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-5.1',     'GPT-5.1',      887,   0.0304, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o',      'GPT-4o',       816,   0.0585, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o-mini', 'GPT-4o Mini',  798,   0.0035, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4-turbo', 'GPT-4 Turbo',  1390,  0.2320, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-3.5-turbo','GPT-3.5 Turbo',528,  0.0116, 16000,  'active' FROM llm_providers WHERE name='OpenAI';
-- Anthropic
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-sonnet-4-6','Claude Sonnet 4.6', 986, 0.0709, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-sonnet-4-5','Claude Sonnet 4.5', 1390, 0.0709, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-haiku-4-5', 'Claude Haiku 4.5', 660, 0.0236, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-3-haiku',   'Claude 3 Haiku',   637, 0.0059, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
-- Google
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-3-pro-preview',       'Gemini 3 Pro Preview',       3890, 0.0477, 1000000, 'active' FROM llm_providers WHERE name='Google';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-3-flash-preview',     'Gemini 3 Flash Preview',     1310, 0.0119, 1000000, 'active' FROM llm_providers WHERE name='Google';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-3.1-flash-lite',      'Gemini 3.1 Flash Lite',      1550, 0.0060, 1000000, 'active' FROM llm_providers WHERE name='Google';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-flash',           'Gemini 2.5 Flash',           1090, 0.0035, 1000000, 'active' FROM llm_providers WHERE name='Google';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-flash-lite',      'Gemini 2.5 Flash Lite',      544,  0.0023, 1000000, 'active' FROM llm_providers WHERE name='Google';
-- ElevenLabs native LLMs
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'glm-4.5-air',    'GLM-4.5-Air (Ultra low latency)', 825, 0.0227, 128000, 'active' FROM llm_providers WHERE name='ElevenLabs';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen3-30b-a3b',  'Qwen3-30B-A3B (Ultra low latency)', 196, 0.0065, 128000, 'active' FROM llm_providers WHERE name='ElevenLabs';
-- Ollama On-Prem
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'llama3.1:8b','Llama 3.1 8B (On-Prem)', 380, 0.0000, 128000, 'active' FROM llm_providers WHERE name='Ollama (On-Prem)';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'mistral:7b', 'Mistral 7B (On-Prem)',   350, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen2:7b',   'Qwen2 7B (On-Prem)',     360, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';

-- LLM Models (with latency_p50_ms and cost_per_min for LLM picker UI)
-- OpenAI
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o',     'GPT-4o',      180, 0.0030, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o-mini','GPT-4o Mini', 140, 0.0010, 128000, 'active' FROM llm_providers WHERE name='OpenAI';
-- Anthropic
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-sonnet-4-5','Claude Sonnet', 220, 0.0040, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-haiku-4-5', 'Claude Haiku',  160, 0.0020, 200000, 'active' FROM llm_providers WHERE name='Anthropic';
-- Google
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-flash','Gemini 2.5 Flash', 150, 0.0020, 1000000, 'active' FROM llm_providers WHERE name='Google';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-pro',  'Gemini 2.5 Pro',   280, 0.0060, 1000000, 'active' FROM llm_providers WHERE name='Google';
-- Alibaba/Qwen
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen2.5-72b-instruct','Qwen Max', 200, 0.0025, 128000, 'active' FROM llm_providers WHERE name='Alibaba/Qwen';
-- Mistral
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'mistral-large-latest','Mistral Large', 190, 0.0028, 128000, 'active' FROM llm_providers WHERE name='Mistral AI';
-- Meta/Groq
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'llama-3.1-70b-versatile','Llama 3.1 70B', 210, 0.0015, 128000, 'active' FROM llm_providers WHERE name='Meta/Groq';
-- Ollama On-Prem
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'llama3.1:8b','Llama 3.1 8B (On-Prem)', 380, 0.0000, 128000, 'active' FROM llm_providers WHERE name='Ollama (On-Prem)';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'mistral:7b', 'Mistral 7B (On-Prem)',   350, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen2:7b',   'Qwen2 7B (On-Prem)',     360, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';

-- STT Providers
INSERT INTO stt_providers (provider_id, name, type, base_url, supported_languages) VALUES
  (uuid_generate_v4(), 'Deepgram',         'cloud',  'https://api.deepgram.com',       ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Google STT',       'cloud',  'https://speech.googleapis.com',  ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Azure Speech',     'cloud',  'https://eastus.api.cognitive.microsoft.com', ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'Amazon Transcribe','cloud',  'https://transcribe.amazonaws.com', ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'FasterWhisper',    'onprem', 'local',                          ARRAY['en','es','fr','de','hi','ja','pt','zh','ar','ru']);

-- TTS Providers
INSERT INTO tts_providers (provider_id, name, type, base_url, supported_languages) VALUES
  (uuid_generate_v4(), 'ElevenLabs',    'cloud',  'https://api.elevenlabs.io',       ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'OpenAI TTS',   'cloud',  'https://api.openai.com/v1',       ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Google WaveNet','cloud', 'https://texttospeech.googleapis.com', ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Azure Neural', 'cloud',  'https://eastus.tts.speech.microsoft.com', ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'Piper TTS',    'onprem', 'local',                           ARRAY['en','es','fr','de']);
```

Apply seed:
```bash
PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -f /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/seed-llm-providers.sql
```

**VERIFY §4.2:**
```bash
echo "=== LLM PROVIDERS ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT name, type FROM llm_providers ORDER BY type, name;"
echo "=== LLM MODELS ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT display_name, latency_p50_ms, cost_per_min FROM llm_models ORDER BY cost_per_min DESC;"
echo "=== STT PROVIDERS ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT name, type FROM stt_providers;"
echo "=== TTS PROVIDERS ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT name, type FROM tts_providers;"
```
Expected: 7 LLM providers, 12 LLM models with latency and cost values, 5 STT providers, 5 TTS providers.

---

### 4.3 — CID Generation Service (BRD-CC-001)

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/cid_service.py`

**Requirements:**
- `generate_cid(agent_id, tenant_id, channel)` → UUID v4
- Atomically performs three operations:
  1. Write Redis key `session:{CID}` with initial session state JSON and TTL 7200s (2-hour max call)
  2. Write PostgreSQL `conversations` row with status='active'
  3. Publish `call_started` event to Kafka topic `trustnow.conversation.events` with CID as the partition key
- Return the CID string — caller propagates it to every downstream service
- `end_session(cid)` — flush Redis session state to PostgreSQL conversations record (update duration_s, transcript_json, llm_cost, tts_cost, stt_cost, total_cost, status='completed'), delete Redis key, publish `call_ended` event to Kafka
- Full error handling — if any write fails: attempt rollback of completed writes and raise exception
- CLI test entrypoint: `python cid_service.py test` — generates CID, verifies all three writes, reads back from Redis + PostgreSQL, confirms Kafka event published, cleans up test data, prints PASS or FAIL with details

**VERIFY §4.3:**
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
source venv/bin/activate
python cid_service.py test
deactivate
```
Expected: `CID SERVICE TEST: PASS` with CID printed, Redis/PostgreSQL/Kafka all confirmed.

---

### 4.4 — Kafka Event Producers (BRD-CC-004)

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/kafka_producers.py`

**Classes to implement:**
- `ConversationEventProducer` — publishes to `trustnow.conversation.events`, CID always as Kafka message key (guarantees ordered per-session processing)
- `AuditLogProducer` — publishes to `trustnow.audit.log`
- `RecordingEventProducer` — publishes to `trustnow.call.recordings`
- `MISMetricsProducer` — publishes to `trustnow.mis.metrics`
- All producers connect to Kafka at `localhost:9092`
- All messages serialised as JSON with `cid`, `tenant_id`, `timestamp`, `event_type`, and event-specific payload fields
- CLI test: `python kafka_producers.py test` — publishes one test event per topic, prints delivery confirmation for each

**VERIFY §4.4:**
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
source venv/bin/activate
python kafka_producers.py test
deactivate
echo "=== KAFKA TOPICS ===" && docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092
```
Expected: test events published to all 5 topics, confirmed delivery printed, all 5 topics listed.

---

### 4.5 — Kafka Event Consumers (BRD-CC-004)

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/kafka_consumers.py`

**Classes to implement:**
- `MISMetricsConsumer` — consumer group `trustnow-mis-consumer`, reads `trustnow.mis.metrics`, writes aggregated records to TimescaleDB conversations hypertable
- `AuditLogConsumer` — consumer group `trustnow-audit-consumer`, reads `trustnow.audit.log`, writes to PostgreSQL audit_logs (INSERT only — never UPDATE/DELETE, enforced by the database rules created in §4.1)
- `RecordingConsumer` — consumer group `trustnow-recording-consumer`, reads `trustnow.call.recordings`, logs recording completion events (full MinIO upload logic in Task 14)
- All consumers: auto-offset-reset=earliest, enable-auto-commit=true, reconnect with backoff on failure

**Create systemd service files for each consumer:**
```bash
# /etc/systemd/system/trustnow-mis-consumer.service
# /etc/systemd/system/trustnow-audit-consumer.service
# /etc/systemd/system/trustnow-recording-consumer.service
```

Each service file pattern:
```ini
[Unit]
Description=TRUSTNOW {Consumer Name}
After=network.target

[Service]
User=trustnow
WorkingDirectory=/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
Environment="VAULT_ADDR=http://127.0.0.1:8200"
ExecStart=/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python kafka_consumers.py {consumer_class}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start all three:
```bash
sudo systemctl daemon-reload
sudo systemctl enable trustnow-mis-consumer trustnow-audit-consumer trustnow-recording-consumer
sudo systemctl start trustnow-mis-consumer trustnow-audit-consumer trustnow-recording-consumer
```

**VERIFY §4.5:**
```bash
sudo systemctl is-active trustnow-mis-consumer
sudo systemctl is-active trustnow-audit-consumer
sudo systemctl is-active trustnow-recording-consumer
```
Expected: active for all three.

---

### 4.6 — Task 4 Complete Verification

Run this full verification block and include all output in the RUNBOOK.md update:

```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)
REDIS_PASS=$(vault kv get -field=password secret/trustnow/platform/redis)

echo "=== §4.1 SCHEMA TABLES ===" && sudo -u postgres psql -d trustnow_platform -c "\dt"

echo "=== §4.1 RLS STATUS ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND rowsecurity=true ORDER BY tablename;"

echo "=== §4.1 HYPERTABLES ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT hypertable_name FROM timescaledb_information.hypertables;"

echo "=== §4.1 AUDIT RULES ===" && sudo -u postgres psql -d trustnow_platform \
  -c "SELECT rulename FROM pg_rules WHERE tablename='audit_logs';"

echo "=== §4.2 LLM PROVIDERS ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT name, type FROM llm_providers ORDER BY type, name;"

echo "=== §4.2 LLM MODEL COUNT ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -U trustnow_app -d trustnow_platform \
  -c "SELECT COUNT(*) as total_models FROM llm_models;"

echo "=== §4.3 CID SERVICE TEST ===" && cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline \
  && source venv/bin/activate && python cid_service.py test && deactivate

echo "=== §4.4 KAFKA PRODUCERS TEST ===" && cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline \
  && source venv/bin/activate && python kafka_producers.py test && deactivate

echo "=== §4.4 KAFKA TOPICS ===" && docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092

echo "=== §4.5 CONSUMER SERVICES ===" && sudo systemctl is-active trustnow-mis-consumer \
  && sudo systemctl is-active trustnow-audit-consumer \
  && sudo systemctl is-active trustnow-recording-consumer

echo "=== REDIS HEALTH ===" && docker exec trustnow-redis redis-cli -a "$REDIS_PASS" ping

echo "=== ALL CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Expected results:**
- Schema: 19 tables listed ✅
- RLS: all tenant-scoped tables show rowsecurity=true ✅
- Hypertables: conversations + audit_logs listed ✅
- Audit rules: no_update_audit + no_delete_audit listed ✅
- LLM providers: 7 providers (6 cloud + 1 onprem) ✅
- LLM models: COUNT = 12 ✅
- CID service test: PASS ✅
- Kafka producers test: delivery confirmed on all 5 topics ✅
- Kafka topics: 5 topics listed ✅
- Consumer services: active × 3 ✅
- Redis: PONG ✅

After all verifications pass — update RUNBOOK.md with Task 4 completion: date, schema applied (list all 19 tables), seed data loaded (provider + model counts), CID service test result, Kafka pipeline status, consumer services running. Then report back to Architect.

---

## TASK 4B — PRE-TASK-5 INFRASTRUCTURE HARDENING
### (PgBouncer + GitHub remote + HA-readiness foundations)

**Prerequisite: Task 4 complete and verified.**

This is a short hardening task (estimated 30–45 minutes). It resolves three infrastructure items identified in the Gap Register (TRUSTNOW-GAP-REGISTER v1.1) that are low-cost now but expensive to retrofit later.

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 4B

Read RUNBOOK.md and confirm Task 4 is marked COMPLETE before starting.
Execute §4B.1 through §4B.4 in sequence. Full autonomy — no confirmation needed between steps.

---

### 4B.1 — GitHub Remote (GAP-REGISTER: GitHub remote pending)
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack

# Add remote and push all commits
git remote add origin https://github.com/rajangnan/trustnow-ai-worker-stack.git
git push -u origin main
```

**VERIFY:** `git remote -v && git log --oneline`
Expected: origin pointing to github.com/rajangnan/trustnow-ai-worker-stack, commits visible on GitHub.

---

### 4B.2 — PgBouncer Connection Pooler (GAP-REGISTER GAP-006 HA foundation)

**Why now:** Without PgBouncer, every application service (NestJS, FastAPI, consumers) holds direct PostgreSQL connections. When we move to Patroni HA PostgreSQL in the enterprise deployment, we would need to update every service's connection string. With PgBouncer in place today, we simply point PgBouncer at the new Patroni VIP — zero application changes required.

```bash
sudo apt install -y pgbouncer

# Configure PgBouncer
sudo bash -c 'cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
trustnow_platform = host=127.0.0.1 port=5432 dbname=trustnow_platform

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 5433
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
log_connections = 1
log_disconnections = 1
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid
EOF'

# Create auth file with trustnow_app credentials
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)
sudo bash -c "echo '\"trustnow_app\" \"${PG_PASS}\"' > /etc/pgbouncer/userlist.txt"
sudo chmod 640 /etc/pgbouncer/userlist.txt

sudo systemctl enable pgbouncer && sudo systemctl start pgbouncer
```

**From Task 5 onwards:** All application services connect to PostgreSQL via PgBouncer on port **5433** (not 5432 directly).
Update Vault to record this: `vault kv patch secret/trustnow/platform/postgres pgbouncer_port=5433`

**VERIFY:** `sudo systemctl is-active pgbouncer && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform -c "SELECT 1 as pgbouncer_ok;"`
Expected: pgbouncer active, query returns 1.

---

### 4B.3 — Kafka KRaft Migration Note (GAP-REGISTER HA foundation)

**Current state:** Kafka is running with Zookeeper (the legacy architecture). Zookeeper is deprecated in Kafka 3.x and will be removed. For future 3-broker Kafka HA, KRaft mode (built-in Raft consensus, no Zookeeper) is the required foundation.

**Decision:** Migrating Kafka from Zookeeper to KRaft mode while data exists in topics is risky and requires a full cluster migration. Since Tasks 1–4 data is test/seed data only (no production data), the correct window to migrate is **before Task 5** when the first real AI pipeline events start flowing.

```bash
# OPTION A (Recommended if Kafka topics are empty or contain only test data):
# Stop Kafka + Zookeeper, re-deploy in KRaft mode
# Reference: https://kafka.apache.org/documentation/#kraft

# OPTION B (Acceptable if migration risk is too high at this point):
# Continue with Zookeeper now. Document as a MANDATORY pre-go-live activity.
# Add to pre-production checklist: "Migrate Kafka to KRaft mode before multi-broker deployment"

# CHECK current topic data volume:
docker exec trustnow-kafka kafka-log-dirs --bootstrap-server localhost:9092 \
  --describe --topic-list trustnow.conversation.events,trustnow.audit.log,trustnow.mis.metrics
```

**Architect decision required:** If topics are empty (seed data only, no real AI events), proceed with KRaft migration now. If topics contain data the team wants to preserve, defer to pre-go-live and document.

**IF MIGRATING TO KRAFT:**
```bash
# Stop existing Kafka + Zookeeper
cd /opt/trustnowailabs/trustnow-ai-worker-stack/config/kafka && docker compose down

# Generate new KRaft cluster UUID
KAFKA_UUID=$(docker run --rm confluentinc/cp-kafka:7.6.0 kafka-storage random-uuid)
echo "KRaft cluster UUID: $KAFKA_UUID"

# Create KRaft config and restart (single-node combined mode)
# Store UUID in Vault for reference
vault kv put secret/trustnow/platform/kafka kraft_cluster_uuid="$KAFKA_UUID"
```
Full KRaft config included in `/config/kafka/kraft-docker-compose.yml` — to be created by Platform Engineer following Confluent KRaft single-node documentation.

**VERIFY (post-migration):** `docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092`
Expected: all 5 topics listed, no Zookeeper errors.

---

### 4B.4 — Vault Raft Storage Note (GAP-REGISTER HA foundation)

**Current state:** Vault uses file storage (`storage "file"`). File storage is single-node only — it cannot participate in a Vault HA cluster.

**For future enterprise HA deployment:** Vault HA requires integrated Raft storage. The correct approach is to re-initialise Vault with Raft storage before significant production secrets accumulate.

**Current window:** We have 9 known secret paths. Re-initialising now takes 20 minutes (export secrets → re-init with Raft → re-import). This is worth doing if the enterprise deployment timeline is within the next few months.

**Architect decision required:** Decide whether to migrate Vault to Raft storage now or defer to pre-go-live.

**IF MIGRATING TO RAFT STORAGE:**
```bash
# Step 1: Export all current secret values (store securely, not in Git)
vault kv get secret/trustnow/platform/postgres
vault kv get secret/trustnow/platform/redis
# ... (export all 9 paths)

# Step 2: Stop Vault, update config to use Raft storage
# vault.hcl change: storage "file" → storage "raft" { path = "..." node_id = "trustnow-node-1" }

# Step 3: Re-initialise (new unseal keys + root token generated)
# vault operator init -key-shares=5 -key-threshold=3

# Step 4: Re-import all secrets
# Step 5: Update vault-init.json backup with new keys
```

**IF DEFERRING:** Add to pre-go-live checklist: "Migrate Vault to Raft storage before multi-node deployment."

---

### 4B.5 — Task 4B Complete Verification
```bash
echo "=== GITHUB REMOTE ===" && git -C /opt/trustnowailabs/trustnow-ai-worker-stack remote -v
echo "=== PGBOUNCER ===" && sudo systemctl is-active pgbouncer
echo "=== PGBOUNCER CONNECTION ===" && PGPASSWORD=$(vault kv get -field=app_password secret/trustnow/platform/postgres) \
  psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform -c "SELECT 'PgBouncer OK' as status;"
echo "=== KAFKA TOPICS (confirm still running) ===" && docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092
echo "=== VAULT STORAGE ===" && vault status | grep -E "Storage Type|Initialized|Sealed"
```

After all verifications pass — update RUNBOOK.md with Task 4B completion. Note PgBouncer port (:5433) as the new standard PostgreSQL connection port for all application services from Task 5 onwards. Note any Kafka/Vault migration decisions made. Then report back to Architect.

---

## TASK 5 — AI PIPELINE (STT → LLM → TTS SERVICES)

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 5

Read RUNBOOK.md and confirm Tasks 4 and 4B are marked COMPLETE before starting. Execute §5.0 through §5.8 in strict sequence. Full autonomy — do not pause for confirmation between steps. Report back only when Task 5 is fully complete or if something fails.

**CRITICAL — read before writing a single line of code:**
- Read §5.4 (Partition Router) FIRST — build `partition_router.py` before any other file. All STT, LLM, TTS and RAG routing flows through this single module.
- AI Pipeline FastAPI runs on port **:8002** — Kong is on :8000. Never use :8000 here.
- All PostgreSQL connections use **:5433 (PgBouncer)** — never :5432 directly.
- ElevenLabs SDK is LOCKED — `pip install elevenlabs`. No direct HTTP calls to ElevenLabs.
- ElevenLabs model locked — `eleven_flash_v2_5` for ALL realtime turns. `eleven_multilingual_v2` for pre-recorded only. Never swap these.
- Audio format chain is locked — SIP = μ-law 8kHz. Use `audioop` (Python built-in) for all conversions. Full spec in §5.4.5 and §5.4.5B.
- Store ElevenLabs API key in Vault before §5.2: `vault kv put secret/trustnow/platform/elevenlabs api_key="YOUR_KEY"`

**CRITICAL environment setup — run before every command:**
```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh
export KUBECONFIG=/home/trustnow/.kube/config
export VAULT_ADDR='http://127.0.0.1:8200'
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)
REDIS_PASS=$(vault kv get -field=password secret/trustnow/platform/redis)
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
source venv/bin/activate
```

**Execution sequence:**
- §5.0 — Apply GAP-014 audit log hardening (REVOKE + trigger) to database
- §5.1 — Build `partition_router.py` FIRST — verify before proceeding
- §5.2 — Apply enhanced voices schema + seed 30+ global voices + expand Piper models
- §5.3 — Build `stt_adapter.py` (Deepgram Partition A + FasterWhisper Partition B with audioop)
- §5.4 — Build `tts_adapter.py` (ElevenLabs streaming Partition A + Piper chunked Partition B with audioop)
- §5.5 — Build `main.py` — FastAPI at :8002, 6 endpoints, uvicorn systemd service with 4 workers
- §5.6 — Build `voice_service.py` — 9 API endpoints
- §5.7 — Build `rag_pipeline.py` — LlamaIndex + Qdrant, partition-routed embeddings
- §5.8 — Run full verification block, confirm all 11 checks pass, update RUNBOOK.md

After all verifications pass — update RUNBOOK.md with Task 5 completion: FastAPI port, partition router verified, voice library counts, ElevenLabs integration status, Piper audio chain confirmed, Ollama responding, RAG pipeline status. Then report back to Architect.

**Prerequisite: Tasks 4 and 4B complete.**

### 5.1 — FastAPI AI Pipeline Service

File: `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/main.py`

**GAP-017 LOCKED — ElevenLabs integration method:** Use the official `elevenlabs` Python SDK (not direct HTTP). The SDK handles streaming audio, voice cloning API, and retry logic cleanly. Pin version in requirements: `elevenlabs==1.x`. Install in venv: `pip install elevenlabs`. API key retrieved from Vault at `secret/trustnow/{tenant_id}/tts/elevenlabs_api_key` at runtime — never hardcoded.

**GAP-014 HARDENED — Audit log additional protection (add to schema.sql after Task 4 schema applied):**
```sql
-- Revoke UPDATE and DELETE on audit_logs from application role (defence-in-depth)
REVOKE UPDATE, DELETE ON audit_logs FROM trustnow_app;

-- Explicit trigger that raises exception (belt-and-suspenders with rules)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable — UPDATE and DELETE are forbidden. CID: %', OLD.log_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```
Apply this immediately after Task 4 schema is verified. This gives triple enforcement: PostgreSQL rules (GAP-014 partial), REVOKE permissions, and exception-raising trigger.

**Key endpoints:**
- `POST /stt/transcribe` — partition routing: Deepgram (Partition A) or FasterWhisper (Partition B)
- `POST /llm/complete` — routes through LiteLLM proxy :4000, records cost per turn
- `POST /tts/synthesise` — ElevenLabs SDK streaming (Partition A) or Piper (Partition B)
- `POST /rag/retrieve` — queries Qdrant collection `kb_{tenant_id}_{agent_id}`
- `GET/POST /session/{cid}/state` — Redis session state CRUD
- `POST /session/{cid}/end` — flush Redis → PostgreSQL :5433, publish `call_ended` Kafka event

**Design rules:**
- Every endpoint receives and propagates CID (BRD-CC-004)
- Every LLM call records cost via `litellm.completion_cost()` to Redis session (BRD-L5-MIS-003)
- Partition routing reads agent config from Redis cache → falls back to PostgreSQL
- Async/await throughout — FastAPI + asyncio handles N concurrent sessions (BRD-CC-002)
- ALL partition routing decisions go through `PartitionRouter` (§5.4) — never inline

**§5.1.1 — Streaming TTS while LLM generates (CRITICAL caller experience — Partition A)**

Do NOT wait for the full LLM response before starting TTS. Stream LLM tokens directly into the ElevenLabs SDK as they arrive. This reduces Time-to-First-Audio (TTFA) from ~1500ms to ~300ms.

```python
# tts_adapter.py — Partition A streaming: LLM tokens pipe directly into ElevenLabs
async def synthesise_streaming(text_stream, voice_id: str, cid: str, channel: str):
    client = ElevenLabs(api_key=vault_get(f"secret/trustnow/{tenant_id}/tts/elevenlabs_api_key"))
    output_format = "ulaw_8000" if channel == "sip" else "pcm_16000"  # see §5.1.2

    audio_stream = client.text_to_speech.convert_as_stream(
        text=text_stream,              # async generator of LLM token chunks
        voice_id=voice_id,
        model_id="eleven_flash_v2_5",  # LOCKED — 75ms latency for realtime
        voice_settings=VoiceSettings(
            stability=voice.stability_default,
            similarity_boost=voice.similarity_default,
            speed=voice.speed_default,
            use_speaker_boost=True     # always True for telephony clarity
        ),
        output_format=output_format
    )
    async for audio_chunk in audio_stream:
        yield audio_chunk  # stream directly to FreeSWITCH/LiveKit audio channel
```

Subscribe to interrupt channel per CID: if `interrupt:{CID}` fires on Redis pub/sub while TTS is streaming, cancel the stream immediately and begin new STT capture.

**§5.1.2 — Audio Format Chain — LOCKED (Partition A)**

| Component | Input | Output | Config params |
|-----------|-------|--------|---------------|
| FreeSWITCH (SIP telephony) | PSTN μ-law 8kHz | PCM μ-law 8kHz | RTP codec: PCMU |
| LiveKit (WebRTC) | Opus 48kHz | PCM linear16 16kHz | codec: opus, resample |
| Deepgram STT — SIP calls | PCM μ-law 8kHz | transcript | `encoding=mulaw, sample_rate=8000` |
| Deepgram STT — WebRTC | PCM linear16 16kHz | transcript | `encoding=linear16, sample_rate=16000` |
| ElevenLabs TTS → SIP | text stream | μ-law 8kHz audio | `output_format=ulaw_8000` (no transcode) |
| ElevenLabs TTS → WebRTC | text stream | PCM 16kHz audio | `output_format=pcm_16000` |

AI pipeline reads `session:{CID}.channel` field (`sip` or `webrtc`) and selects the correct format parameters automatically. Zero manual transcoding steps in the pipeline.

**§5.1.3 — Automatic Language Detection and Voice Switch (Partition A)**

Deepgram returns `info.language` on every utterance. If the detected language differs from `agent_config.primary_language` AND is in `agent_config.additional_languages`, the pipeline must switch both the STT language and the active voice:

```python
# stt_adapter.py — first utterance language auto-detect
async def handle_language_detection(cid: str, detected_lang: str, agent_config):
    if detected_lang != agent_config.primary_language:
        if detected_lang in agent_config.additional_languages:
            # Persist detected language to session
            await redis.hset(f"session:{cid}", "detected_language", detected_lang)

            # Switch to native voice for detected language (ElevenLabs best practice)
            matching_voice = await voice_service.get_best_voice_for_language(
                tenant_id=agent_config.tenant_id,
                language=detected_lang,
                gender=current_voice.gender   # maintain same gender
            )
            if matching_voice:
                await redis.hset(f"session:{cid}",
                    "active_voice_id", matching_voice.elevenlabs_voice_id)

            # Reconfigure Deepgram WebSocket for new language
            await deepgram_ws.send({"type": "Configure", "language": detected_lang})
```

Uses Voice Library `GET /voices/languages/{code}/top-picks` to find best native voice per language.

### 5.2 — Voice Library Service — COMPREHENSIVE SPECIFICATION (BRD-L1-010/011/012/013)

#### 5.2.1 — Overview & Architecture

The TRUSTNOW Voice Library is a two-tier catalogue:
- **Global Library** — platform-curated voices available to ALL tenants, sourced from ElevenLabs pre-made voices and TRUSTNOW-designed voices. Managed by Platform Super Admin. Read-only for tenant users.
- **Tenant-Private Library** — voices created, cloned, or purchased by a specific tenant. Visible only to that tenant. Full CRUD by Tenant Admin and Agent Admin.

**Three voice source types:**
1. **ElevenLabs Pre-made** — ElevenLabs' curated voice catalogue (5,000+ voices, 70+ languages). Accessed via ElevenLabs API at synthesis time using the `voice_id` from ElevenLabs. These voices are stored as metadata references in TRUSTNOW — the audio is generated on-demand by ElevenLabs, not stored locally.
2. **TRUSTNOW-Designed** — Voices created using ElevenLabs Voice Design API from text prompts. Generated by TRUSTNOW platform admins and seeded into the Global Library. Stored as metadata with ElevenLabs `voice_id`.
3. **Tenant-Cloned** — Voices created by tenants using ElevenLabs Instant Voice Clone (IVC) from uploaded audio samples. Stored in tenant's ElevenLabs account and referenced by `voice_id` in TRUSTNOW.

#### 5.2.2 — Enhanced voices Table Schema

Update `voices` table in schema.sql to include full ElevenLabs metadata:
```sql
ALTER TABLE voices ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(64);
ALTER TABLE voices ADD COLUMN IF NOT EXISTS elevenlabs_model VARCHAR(64) DEFAULT 'eleven_flash_v2_5';
ALTER TABLE voices ADD COLUMN IF NOT EXISTS accent VARCHAR(100);
ALTER TABLE voices ADD COLUMN IF NOT EXISTS age_group VARCHAR(50);  -- young/middle_aged/old
ALTER TABLE voices ADD COLUMN IF NOT EXISTS use_case_tags TEXT[];   -- customer_service, news, meditation, etc.
ALTER TABLE voices ADD COLUMN IF NOT EXISTS tone_tags TEXT[];        -- professional, warm, authoritative, friendly
ALTER TABLE voices ADD COLUMN IF NOT EXISTS emotion_range VARCHAR(50); -- limited/moderate/expressive
ALTER TABLE voices ADD COLUMN IF NOT EXISTS stability_default NUMERIC(3,2) DEFAULT 0.65;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS similarity_default NUMERIC(3,2) DEFAULT 0.75;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS speed_default NUMERIC(3,2) DEFAULT 1.0;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS preview_text TEXT;        -- sample text for preview generation
ALTER TABLE voices ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'elevenlabs_premade'; -- elevenlabs_premade | trustnow_designed | tenant_cloned | piper_onprem
ALTER TABLE voices ADD COLUMN IF NOT EXISTS notice_period_days INTEGER; -- ElevenLabs Voice Library notice period
```

#### 5.2.3 — ElevenLabs Model Selection Strategy for Realtime Agents

**CRITICAL for contact centre use:** Always use the correct ElevenLabs model per use case. Wrong model choice = either bad quality or high latency.

| Model ID | Latency | Languages | Use Case | Cost |
|----------|---------|-----------|---------|------|
| `eleven_flash_v2_5` | **~75ms** | 32 languages | **DEFAULT for all realtime agent conversations** — ultra-low latency | Low |
| `eleven_multilingual_v2` | ~300ms | 29 languages | High-quality recordings, announcements, hold messages | Medium |
| `eleven_v3` | ~200ms | 32 languages | Highest emotional range, complex autonomous worker interactions | High |
| `eleven_monolingual_v1` | ~150ms | English only | English-only agents where quality matters more than cost | Low |

**Implementation rule:** The TTS adapter MUST use `eleven_flash_v2_5` for all live conversation turns (Partition A, realtime). Use `eleven_multilingual_v2` only for pre-recorded messages (hold music announcements, IVR prompts) where latency is not a concern.

Store the model selection per voice in `voices.elevenlabs_model` — defaulting to `eleven_flash_v2_5`.

#### 5.2.4 — Global Voice Library Seed Data

Create and apply: `/opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/seed-global-voices.sql`

This seeds the TRUSTNOW Global Library with TRUSTNOW-designed voices created via ElevenLabs Voice Design API covering all major BPO/contact centre deployment languages. The `elevenlabs_voice_id` values below are the ElevenLabs IDs for recommended pre-made voices optimised for contact centre use:

```sql
-- ═══════════════════════════════════════════════════════════════
-- TRUSTNOW GLOBAL VOICE LIBRARY — CONTACT CENTRE EDITION
-- Sources: ElevenLabs pre-made voices + TRUSTNOW-designed voices
-- All voices tested for contact centre use (customer service use case)
-- All use eleven_flash_v2_5 model for realtime synthesis
-- ═══════════════════════════════════════════════════════════════

-- ─── ENGLISH — MULTIPLE ACCENTS ──────────────────────────────────
INSERT INTO voices (voice_id, tenant_id, is_global, source_type, name, description, gender, age_group, accent, language_tags, trait_tags, tone_tags, use_case_tags, emotion_range, elevenlabs_voice_id, elevenlabs_model, stability_default, similarity_default, speed_default) VALUES
-- English US
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Sarah (EN-US)', 'Warm, professional American female voice. Clear enunciation, reassuring tone. Ideal for banking, healthcare, and insurance contact centres.', 'female', 'young', 'American', ARRAY['en'], ARRAY['warm','clear','professional'], ARRAY['professional','warm'], ARRAY['customer_service','banking','healthcare'], 'moderate', 'EXAVITQu4vr4xnSDxMaL', 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Michael (EN-US)', 'Authoritative, trustworthy American male voice. Confident delivery with natural warmth. Perfect for financial services and enterprise support.', 'male', 'middle_aged', 'American', ARRAY['en'], ARRAY['authoritative','trustworthy','confident'], ARRAY['authoritative','professional'], ARRAY['customer_service','financial_services','technical_support'], 'limited', 'flq6f7yk4E4fJM5XTYuZ', 'eleven_flash_v2_5', 0.70, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Jessica (EN-US)', 'Energetic, empathetic American female. High emotional range — excellent for de-escalation and complex complaint handling.', 'female', 'young', 'American', ARRAY['en'], ARRAY['empathetic','energetic','expressive'], ARRAY['friendly','warm'], ARRAY['customer_service','complaint_handling','healthcare'], 'expressive', 'cgSgspJ2msm6clMCkdW9', 'eleven_flash_v2_5', 0.50, 0.75, 1.0),
-- English UK
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Charlotte (EN-GB)', 'Polished, composed British female voice. Professional gravitas with friendly undertones. Ideal for premium customer service tiers.', 'female', 'middle_aged', 'British', ARRAY['en'], ARRAY['polished','composed','professional'], ARRAY['authoritative','professional'], ARRAY['customer_service','premium_banking','insurance'], 'moderate', 'XB0fDUnXU5powFXDhCwa', 'eleven_flash_v2_5', 0.70, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'James (EN-GB)', 'Deep, reassuring British male voice. Commands confidence without being intimidating. Strong for regulated industries.', 'male', 'middle_aged', 'British', ARRAY['en'], ARRAY['deep','reassuring','confident'], ARRAY['authoritative','warm'], ARRAY['customer_service','banking','legal'], 'limited', 'ZQe5CZNOzWyzPSCn5a3c', 'eleven_flash_v2_5', 0.75, 0.75, 0.95),
-- English Australian
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Emma (EN-AU)', 'Friendly, approachable Australian female. Natural conversational flow, high relatability. Ideal for telco and retail.', 'female', 'young', 'Australian', ARRAY['en'], ARRAY['friendly','approachable','natural'], ARRAY['friendly','warm'], ARRAY['customer_service','telco','retail'], 'moderate', 'pFZP5JQG7iQjIQuC4Bku', 'eleven_flash_v2_5', 0.60, 0.75, 1.05),
-- English Indian
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Priya (EN-IN)', 'Professional Indian English female voice. Clear, neutral accent with warm delivery. Designed specifically for BPO operations.', 'female', 'young', 'Indian', ARRAY['en'], ARRAY['professional','clear','warm'], ARRAY['professional','warm'], ARRAY['customer_service','bpo','technical_support'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Arjun (EN-IN)', 'Confident Indian English male voice. Technical clarity, professional tone. Excellent for IT support and provisioning workflows.', 'male', 'young', 'Indian', ARRAY['en'], ARRAY['confident','clear','technical'], ARRAY['professional','authoritative'], ARRAY['technical_support','bpo','provisioning'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 1.0),

-- ─── SPANISH ─────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Sofia (ES-ES)', 'Natural Castilian Spanish female. Warm, professional delivery. Clear pronunciation suitable for all Spanish-speaking markets.', 'female', 'young', 'Castilian', ARRAY['es'], ARRAY['warm','clear','professional'], ARRAY['professional','warm'], ARRAY['customer_service','banking','insurance'], 'moderate', 'AZnzlk1XvdvUeBnXmlld', 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Carlos (ES-MX)', 'Mexican Spanish male voice. Friendly, approachable delivery with neutral LatAm accent. Ideal for pan-Latin American deployments.', 'male', 'middle_aged', 'Latin American', ARRAY['es'], ARRAY['friendly','neutral','professional'], ARRAY['friendly','professional'], ARRAY['customer_service','telco','retail'], 'moderate', 'VR6AewLTigWG4xSOukaG', 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── PORTUGUESE ──────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Ana (PT-BR)', 'Brazilian Portuguese female. Natural, energetic delivery. High relatability for consumer-facing applications.', 'female', 'young', 'Brazilian', ARRAY['pt'], ARRAY['natural','energetic','friendly'], ARRAY['friendly','warm'], ARRAY['customer_service','retail','telco'], 'expressive', 'ODq5zmih8GrVes37Dizd', 'eleven_flash_v2_5', 0.55, 0.75, 1.05),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Ricardo (PT-PT)', 'European Portuguese male. Composed, professional delivery. Suitable for formal service contexts.', 'male', 'middle_aged', 'European', ARRAY['pt'], ARRAY['composed','professional','clear'], ARRAY['professional','authoritative'], ARRAY['customer_service','banking','insurance'], 'limited', 'SOYHLrjzK2X1ezoPC6cr', 'eleven_flash_v2_5', 0.70, 0.75, 0.95),

-- ─── FRENCH ──────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Camille (FR-FR)', 'Native Parisian French female. Elegant, professional tone. Ideal for premium services.', 'female', 'young', 'Parisian', ARRAY['fr'], ARRAY['elegant','professional','clear'], ARRAY['professional','warm'], ARRAY['customer_service','banking','premium'], 'moderate', 'CwhRBWXzGAHq8TQ4Fs17', 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Marc (FR-FR)', 'Confident French male voice. Clear diction, authoritative but approachable. Strong for financial and telco.', 'male', 'middle_aged', 'Parisian', ARRAY['fr'], ARRAY['confident','clear','authoritative'], ARRAY['authoritative','professional'], ARRAY['customer_service','banking','telco'], 'limited', 'onwK4e9ZLuTAKqWW03F9', 'eleven_flash_v2_5', 0.70, 0.75, 0.95),

-- ─── GERMAN ──────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Lena (DE)', 'Professional German female. Clear, precise delivery with natural warmth. Ideal for B2B and enterprise contact centres.', 'female', 'middle_aged', 'Standard German', ARRAY['de'], ARRAY['precise','professional','warm'], ARRAY['professional','authoritative'], ARRAY['customer_service','b2b','enterprise_support'], 'moderate', 'MF3mGyEYCl7XYWbV9V6O', 'eleven_flash_v2_5', 0.70, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Klaus (DE)', 'Deep, composed German male voice. Trustworthy and measured. Strong for financial services.', 'male', 'middle_aged', 'Standard German', ARRAY['de'], ARRAY['deep','composed','trustworthy'], ARRAY['authoritative','professional'], ARRAY['customer_service','banking','insurance'], 'limited', 'TxGEqnHWrfWFTfGW9XjX', 'eleven_flash_v2_5', 0.75, 0.75, 0.95),

-- ─── ARABIC ──────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Layla (AR-SA)', 'Professional Modern Standard Arabic female. Clear, authoritative delivery suitable for Gulf markets. Formal register.', 'female', 'middle_aged', 'Gulf/MSA', ARRAY['ar'], ARRAY['professional','clear','formal'], ARRAY['professional','authoritative'], ARRAY['customer_service','banking','government'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95),
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Omar (AR-SA)', 'Confident Arabic male voice. Composed, respectful tone. Ideal for banking and government services in the Gulf.', 'male', 'middle_aged', 'Gulf/MSA', ARRAY['ar'], ARRAY['confident','respectful','professional'], ARRAY['authoritative','professional'], ARRAY['customer_service','banking','government'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95),

-- ─── HINDI ───────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Ananya (HI)', 'Warm, professional Hindi female voice. Natural conversational flow. Designed for Indian contact centre operations.', 'female', 'young', 'Standard Hindi', ARRAY['hi'], ARRAY['warm','natural','professional'], ARRAY['warm','professional'], ARRAY['customer_service','banking','telco'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Vikram (HI)', 'Clear, authoritative Hindi male voice. Professional register suitable for financial and utility services.', 'male', 'middle_aged', 'Standard Hindi', ARRAY['hi'], ARRAY['clear','authoritative','professional'], ARRAY['authoritative','professional'], ARRAY['customer_service','banking','utilities'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95),

-- ─── MANDARIN CHINESE ────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Mei (ZH)', 'Professional Mandarin female voice. Neutral Beijing standard pronunciation. Suitable for mainland China and Taiwan markets.', 'female', 'young', 'Mandarin/Putonghua', ARRAY['zh'], ARRAY['professional','neutral','clear'], ARRAY['professional','warm'], ARRAY['customer_service','banking','e_commerce'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Wei (ZH)', 'Composed Mandarin male voice. Professional tone with authoritative delivery. Enterprise-grade.', 'male', 'middle_aged', 'Mandarin/Putonghua', ARRAY['zh'], ARRAY['composed','professional','authoritative'], ARRAY['authoritative','professional'], ARRAY['customer_service','banking','enterprise_support'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95),

-- ─── JAPANESE ────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Yuki (JA)', 'Polite, professional Japanese female voice. Respectful keigo register. Essential for Japanese-market customer service.', 'female', 'young', 'Standard Japanese', ARRAY['ja'], ARRAY['polite','respectful','professional'], ARRAY['professional','warm'], ARRAY['customer_service','banking','telco'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95),
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Kenji (JA)', 'Measured, professional Japanese male voice. Formal register with natural warmth. Suitable for enterprise B2B.', 'male', 'middle_aged', 'Standard Japanese', ARRAY['ja'], ARRAY['measured','professional','formal'], ARRAY['authoritative','professional'], ARRAY['customer_service','enterprise_support','banking'], 'limited', NULL, 'eleven_flash_v2_5', 0.75, 0.75, 0.95),

-- ─── KOREAN ──────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Jiyeon (KO)', 'Professional Korean female voice. Clear standard pronunciation. Suitable for financial services and telco.', 'female', 'young', 'Standard Korean', ARRAY['ko'], ARRAY['professional','clear','warm'], ARRAY['professional','warm'], ARRAY['customer_service','banking','telco'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── MALAY / BAHASA ──────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Nurul (MS)', 'Warm, professional Bahasa Malaysia/Indonesia female voice. Neutral accent suitable for both markets.', 'female', 'young', 'Standard Malay', ARRAY['ms'], ARRAY['warm','professional','clear'], ARRAY['warm','professional'], ARRAY['customer_service','banking','telco'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── ITALIAN ─────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'elevenlabs_premade', 'Giulia (IT)', 'Professional Italian female voice. Warm delivery with clear articulation. Suitable for premium consumer services.', 'female', 'young', 'Standard Italian', ARRAY['it'], ARRAY['warm','professional','clear'], ARRAY['warm','professional'], ARRAY['customer_service','banking','retail'], 'moderate', 'pqHfZKP75CvOlQylNhV4', 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── DUTCH ───────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Lotte (NL)', 'Professional Dutch female voice. Clear, efficient delivery. Suitable for Dutch and Belgian markets.', 'female', 'young', 'Standard Dutch', ARRAY['nl'], ARRAY['professional','clear','efficient'], ARRAY['professional','friendly'], ARRAY['customer_service','banking','insurance'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── TURKISH ─────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Zeynep (TR)', 'Warm Turkish female voice. Friendly, professional delivery. Well-suited for consumer-facing services.', 'female', 'young', 'Standard Turkish', ARRAY['tr'], ARRAY['warm','friendly','professional'], ARRAY['warm','friendly'], ARRAY['customer_service','telco','retail'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── POLISH ──────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Agnieszka (PL)', 'Professional Polish female voice. Clear diction with natural warmth. Ideal for CEE market contact centres.', 'female', 'young', 'Standard Polish', ARRAY['pl'], ARRAY['professional','clear','warm'], ARRAY['professional','warm'], ARRAY['customer_service','banking','bpo'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── SWAHILI ─────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Amina (SW)', 'Professional Swahili female voice. Clear, warm delivery. Designed for East African market contact centres (Kenya, Tanzania, Uganda).', 'female', 'young', 'Standard Swahili', ARRAY['sw'], ARRAY['professional','warm','clear'], ARRAY['warm','professional'], ARRAY['customer_service','banking','telco'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── TAGALOG / FILIPINO ──────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Maria (TL)', 'Warm, professional Filipino female voice. Clear English-accented delivery suitable for BPO operations serving global markets.', 'female', 'young', 'Filipino', ARRAY['tl','en'], ARRAY['warm','professional','friendly'], ARRAY['warm','friendly'], ARRAY['customer_service','bpo','outsourcing'], 'moderate', NULL, 'eleven_flash_v2_5', 0.65, 0.75, 1.0),

-- ─── RUSSIAN ─────────────────────────────────────────────────────
(uuid_generate_v4(), NULL, true, 'trustnow_designed', 'Natasha (RU)', 'Professional Russian female voice. Clear standard pronunciation. Suitable for CIS market customer service.', 'female', 'young', 'Standard Russian', ARRAY['ru'], ARRAY['professional','clear','composed'], ARRAY['professional','authoritative'], ARRAY['customer_service','banking','telco'], 'limited', NULL, 'eleven_flash_v2_5', 0.70, 0.75, 0.95);
```

Apply seed:
```bash
PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform \
  -f /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/seed-global-voices.sql
```

**IMPORTANT — TRUSTNOW-Designed voices (source_type='trustnow_designed'):**
These voices have `elevenlabs_voice_id = NULL` in the seed. They must be created using the ElevenLabs Voice Design API before the Voice Library goes live. The Platform Engineer creates them using the Voice Design prompts in §5.2.5 below and updates the `elevenlabs_voice_id` column with the generated IDs.

#### 5.2.5 — ElevenLabs Voice Design Prompts for TRUSTNOW-Designed Voices

When creating TRUSTNOW-designed voices via the ElevenLabs Voice Design API (`POST /v1/voice-generation/generate-voice`), use these prompts. Following ElevenLabs best practices: always specify language and dialect in the first sentence, use "thick" not "strong" for accent prominence, describe intonation not accent, avoid FX words:

```python
# Example Voice Design API call (Python SDK)
from elevenlabs import ElevenLabs
client = ElevenLabs(api_key=vault.get("secret/trustnow/platform/elevenlabs/design_api_key"))

# Priya (EN-IN) — Indian English female, contact centre
voice = client.voice_design.create(
    voice_description="Professional Indian English female voice, aged 28-32. Native Indian speaker with a clear, neutral accent — not heavily regional, suitable for pan-India deployments. Smooth, natural timbre with gentle intonation. Delivers updates at a confident pace with clear emphasis on helpful information, projecting empathy and professionalism. Ideal for BPO contact centre operations.",
    text="Thank you for calling. I'm here to help you today. Could you please share your account number so I can pull up your details?"
)
# Store the returned voice_id in the voices table
```

Voice Design best practices applied:
- Language + dialect specified in first sentence (ElevenLabs requirement)
- Intonation described, not accent (prevents dialect drift)
- Use case context given for better calibration
- Preview text is representative of actual deployment use

#### 5.2.6 — Voice Library API Endpoints (voice_service.py)

```
GET  /voices                    — List voices. Query: scope (global|private|all), language (ISO 639-1), gender, accent, use_case, tone, search. RBAC: tenant isolation via JWT tenant_id.
GET  /voices/{id}               — Get single voice with full metadata
GET  /voices/{id}/preview       — Stream TTS audio preview. Body: {text}. Uses voice.elevenlabs_voice_id + eleven_flash_v2_5 model.
POST /voices/design             — Create new voice via ElevenLabs Voice Design API (Admin only). Body: {description, preview_text, name, accent, gender, use_case_tags, tone_tags}
POST /voices/clone              — Create instant voice clone from audio file (Tenant Admin only). Multipart: audio_file + metadata. Calls ElevenLabs IVC API.
PUT  /voices/{id}               — Update voice metadata (name, description, tags, settings defaults)
DELETE /voices/{id}             — Remove from tenant-private library (cannot delete global voices)
GET  /voices/languages          — List all languages with voice counts
GET  /voices/languages/{code}/top-picks — Return top 2 voices per language per gender (male/female)
POST /voices/{id}/settings      — Override stability/similarity/speed defaults for this tenant's use of this voice
```

#### 5.2.7 — Piper On-Premise Voice Expansion (Partition B)

For Partition B (on-premise) deployments, expand beyond the two English voices installed in Task 2B. Download additional Piper voice models for the most common BPO deployment languages:

```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices

# Spanish
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx" -O es_ES-davefx-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json" -O es_ES-davefx-medium.onnx.json

# French
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx" -O fr_FR-siwis-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json" -O fr_FR-siwis-medium.onnx.json

# German
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx" -O de_DE-thorsten-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json" -O de_DE-thorsten-medium.onnx.json

# Italian
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx" -O it_IT-paola-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx.json" -O it_IT-paola-medium.onnx.json

# Portuguese (Brazil)
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx" -O pt_BR-faber-medium.onnx
wget -q "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json" -O pt_BR-faber-medium.onnx.json

ls -lh /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices/
```

Seed on-premise Piper voices into the global voices table with `source_type='piper_onprem'` and `elevenlabs_voice_id=NULL` — the TTS adapter routes these to the Piper engine when the agent is on Partition B.

#### 5.2.8 — TTS Adapter Voice Routing Logic

The TTS adapter (`/services/ai-pipeline/tts_adapter.py`) routes synthesis requests based on agent partition AND voice source type:

```
if agent.partition == "cloud" AND voice.source_type in ('elevenlabs_premade', 'trustnow_designed', 'tenant_cloned'):
    → ElevenLabs SDK: client.text_to_speech.convert(voice_id=voice.elevenlabs_voice_id, model_id=voice.elevenlabs_model, ...)
    → Use eleven_flash_v2_5 for realtime turns (default)
    → Use eleven_multilingual_v2 for pre-recorded messages only

elif agent.partition == "onprem" AND voice.source_type == 'piper_onprem':
    → Piper: PiperVoice.load(f"/data/piper-voices/{voice.piper_model_file}")
    → voice.piper_model_file stored in voice metadata

elif agent.partition == "onprem" AND voice.source_type != 'piper_onprem':
    → Fallback: use default Piper English voice (en_US-lessac-medium)
    → Log warning: voice {voice_id} is ElevenLabs-type but agent is Partition B
```

**Voice settings passed to ElevenLabs API per request:**
```python
voice_settings = VoiceSettings(
    stability=voice.stability_default,           # from voices table (default 0.65)
    similarity_boost=voice.similarity_default,   # from voices table (default 0.75)
    speed=agent_config.tts_speed_override or voice.speed_default,  # Tab 10 Advanced override
    style=0.0,                                   # keep at 0 unless specific style needed
    use_speaker_boost=True                       # always True for contact centre clarity
)
```

#### 5.2.9 — Voice Library VERIFY

```bash
echo "=== GLOBAL VOICE COUNT ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform \
  -c "SELECT COUNT(*) as total_voices, COUNT(*) FILTER (WHERE gender='female') as female, COUNT(*) FILTER (WHERE gender='male') as male, COUNT(DISTINCT language_tags[1]) as languages FROM voices WHERE is_global=true;"

echo "=== VOICES BY LANGUAGE ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform \
  -c "SELECT language_tags[1] as language, COUNT(*) as voices FROM voices WHERE is_global=true GROUP BY language_tags[1] ORDER BY language_tags[1];"

echo "=== VOICES BY SOURCE ===" && PGPASSWORD=$PG_PASS psql -h 127.0.0.1 -p 5433 -U trustnow_app -d trustnow_platform \
  -c "SELECT source_type, COUNT(*) FROM voices WHERE is_global=true GROUP BY source_type;"

echo "=== PIPER VOICES ===" && ls -lh /opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices/
```

Expected: 30+ global voices across 15+ languages, both male and female per major language, Piper voices for 6 languages.

### 5.4 — Partition Router — CENTRALISED SPECIFICATION (CRITICAL — READ BEFORE BUILDING §5.1)

This section is the single authoritative reference for ALL partition routing decisions. Every component in Task 5 reads agent partition from this single module. Nothing routes independently — everything flows through `PartitionRouter`.

#### 5.4.1 — Partition Definitions

| Partition | Value in DB | Description | Data Sovereignty Guarantee |
|-----------|------------|-------------|---------------------------|
| Cloud Brain | `cloud` | All AI processing via external cloud APIs (Deepgram, ElevenLabs, LiteLLM cloud models) | Data leaves the server — suitable for standard deployments |
| On-Premise Brain | `onprem` | All AI processing via on-server inference only (FasterWhisper, Ollama, Piper) | **ZERO external API calls — all data stays on server** — mandatory for regulated/data-sovereign clients |

**Partition B Data Sovereignty Guarantee — NON-NEGOTIABLE:**
When `agent.partition == 'onprem'`, the AI pipeline MUST NEVER make any external HTTP call for AI processing. This includes:
- No Deepgram API calls
- No ElevenLabs API calls
- No OpenAI API calls (including embeddings)
- No Anthropic, Google, Mistral, Groq, or any other cloud LLM API calls

This guarantee is enforced in the PartitionRouter at the code level — not left to caller discipline.

#### 5.4.2 — Complete Component Routing Table

| AI Component | Partition A (cloud) | Partition B (onprem) | Implementation |
|-------------|---------------------|----------------------|----------------|
| **STT** | Deepgram Nova-2 via REST/WebSocket | FasterWhisper (base/medium/large-v3 per quality preset) | `stt_adapter.py` |
| **LLM** | Cloud LiteLLM models (gpt-4o, claude, gemini, etc.) | Ollama models (ollama-llama3, ollama-mistral, ollama-qwen2) | LiteLLM proxy at :4000 |
| **TTS** | ElevenLabs SDK — `eleven_flash_v2_5` for realtime, `eleven_multilingual_v2` for pre-recorded | Piper TTS — model file from `/data/piper-voices/` | `tts_adapter.py` |
| **RAG Embedding** | OpenAI `text-embedding-3-small` via LiteLLM | `sentence-transformers/all-MiniLM-L6-v2` local inference | `rag_pipeline.py` |
| **VAD (end-of-speech)** | Deepgram built-in endpointing parameter | silero-vad local inference | `stt_adapter.py` |
| **Language Detection** | Deepgram language detection | FasterWhisper built-in language detection | `stt_adapter.py` |
| **Cost Recording** | Real cost from LiteLLM `completion_cost()` | $0.00 external API cost (infra cost only, not tracked per-call) | `session_manager.py` |

#### 5.4.3 — PartitionRouter Module (partition_router.py)

Create `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/partition_router.py`

**This module is the single source of truth for all routing decisions:**

```python
# partition_router.py
from enum import Enum
from dataclasses import dataclass
from typing import Optional

class Partition(str, Enum):
    CLOUD = "cloud"
    ONPREM = "onprem"

@dataclass
class PartitionConfig:
    partition: Partition
    # STT
    stt_provider: str           # "deepgram" | "fasterwhisper"
    stt_model: str              # "nova-2" | "base" | "medium" | "large-v3"
    stt_api_key_path: Optional[str]  # Vault path — None for onprem
    # LLM
    llm_model_prefix: str       # "" (any) | "ollama/" (onprem only)
    llm_allowed_models: list    # list of allowed model names for validation
    # TTS
    tts_provider: str           # "elevenlabs" | "piper"
    tts_model: str              # "eleven_flash_v2_5" | piper model filename
    tts_api_key_path: Optional[str]  # Vault path — None for onprem
    # Embedding (RAG)
    embedding_provider: str     # "openai" | "sentence_transformers"
    embedding_model: str        # "text-embedding-3-small" | "all-MiniLM-L6-v2"
    # Data sovereignty
    allow_external_calls: bool  # True for cloud, False for onprem — ENFORCED

PARTITION_CONFIGS = {
    Partition.CLOUD: PartitionConfig(
        partition=Partition.CLOUD,
        stt_provider="deepgram",
        stt_model="nova-2",
        stt_api_key_path="secret/trustnow/{tenant_id}/stt/deepgram_api_key",
        llm_model_prefix="",
        llm_allowed_models=["gpt-4o", "gpt-4o-mini", "claude-sonnet", "claude-haiku",
                            "gemini-flash", "gemini-pro", "qwen-max", "mistral-large",
                            "llama-3.1-70b"],
        tts_provider="elevenlabs",
        tts_model="eleven_flash_v2_5",
        tts_api_key_path="secret/trustnow/{tenant_id}/tts/elevenlabs_api_key",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        allow_external_calls=True
    ),
    Partition.ONPREM: PartitionConfig(
        partition=Partition.ONPREM,
        stt_provider="fasterwhisper",
        stt_model="medium",     # override per quality preset: base|medium|large-v3
        stt_api_key_path=None,  # no external API
        llm_model_prefix="ollama/",
        llm_allowed_models=["ollama-llama3", "ollama-mistral", "ollama-qwen2"],
        tts_provider="piper",
        tts_model="en_US-lessac-medium",  # override per voice selection
        tts_api_key_path=None,  # no external API
        embedding_provider="sentence_transformers",
        embedding_model="all-MiniLM-L6-v2",
        allow_external_calls=False   # DATA SOVEREIGNTY: NEVER TRUE FOR ONPREM
    )
}

def get_partition_config(partition: str) -> PartitionConfig:
    """Single entry point — all routing decisions start here."""
    return PARTITION_CONFIGS[Partition(partition)]

def enforce_no_external_call(partition: str, attempted_service: str):
    """Called before any external API call. Raises if Partition B."""
    config = get_partition_config(partition)
    if not config.allow_external_calls:
        raise RuntimeError(
            f"DATA SOVEREIGNTY VIOLATION: Partition B agent attempted external call "
            f"to {attempted_service}. All AI processing must use on-premise services only."
        )

def validate_llm_model_for_partition(partition: str, model_name: str) -> bool:
    """Validates that selected LLM model is compatible with agent partition."""
    config = get_partition_config(partition)
    return model_name in config.llm_allowed_models
```

#### 5.4.4 — Deepgram Partition A — Implementation Specifics

**For Partition A STT, use Deepgram with these exact settings:**

```python
# stt_adapter.py — Partition A path
from deepgram import DeepgramClient, PrerecordedOptions, LiveOptions

# For realtime streaming (live calls via WebSocket — preferred for <200ms latency):
deepgram = DeepgramClient(api_key=vault.get(config.stt_api_key_path.format(tenant_id=tenant_id)))

live_options = LiveOptions(
    model="nova-2",                    # Best accuracy/latency balance for contact centre
    language=agent_config.primary_language,  # ISO 639-1 code e.g. "en", "es", "hi"
    smart_format=True,                 # Punctuation + capitalisation
    interim_results=True,              # Stream partial transcripts
    endpointing=vad_config.end_of_speech_silence_ms,  # From agent Tab 10 Advanced
    utterance_end_ms=vad_config.end_of_speech_silence_ms,
    vad_events=True,                   # Receive VAD events for interrupt handling
    encoding="linear16",               # Standard PCM from FreeSWITCH/LiveKit
    sample_rate=8000,                  # 8kHz for telephony (16kHz for WebRTC)
    channels=1
)

# Vault key path: secret/trustnow/{tenant_id}/stt/deepgram_api_key
# Cost: Deepgram charges per minute — record to Redis session for MIS
```

**For batch transcription (post-call, recording processing):**
```python
options = PrerecordedOptions(
    model="nova-2",
    language=detected_language,
    smart_format=True,
    diarize=True,    # Speaker diarization for QM (DEFERRED-010 — enable in Task 14)
    punctuate=True
)
```

#### 5.4.5 — FasterWhisper Partition B — Implementation Specifics

**Audio format conversion — CRITICAL for Partition B telephony (GAP — now fixed):**

FreeSWITCH SIP telephony delivers μ-law 8kHz PCM. FasterWhisper requires linear16 16kHz PCM. Python's built-in `audioop` library handles both conversions with zero dependencies:

```python
import audioop

# SIP inbound audio → FasterWhisper input
def mulaw_to_linear16_16k(mulaw_8k_bytes: bytes) -> bytes:
    """Convert μ-law 8kHz (from FreeSWITCH SIP) to linear16 16kHz (for FasterWhisper)"""
    linear_8k = audioop.ulaw2lin(mulaw_8k_bytes, 2)   # μ-law → linear16 8kHz
    linear_16k = audioop.ratecv(linear_8k, 2, 1, 8000, 16000, None)[0]  # 8kHz → 16kHz
    return linear_16k

# WebRTC inbound audio (LiveKit) — already linear16 16kHz, no conversion needed
```

```python
# stt_adapter.py — Partition B path
from faster_whisper import WhisperModel
import audioop

# Models loaded ONCE at service startup — not per call:
WHISPER_MODELS = {
    "fast":         WhisperModel("base",     device="cpu", compute_type="int8"),
    "balanced":     WhisperModel("medium",   device="cpu", compute_type="int8"),
    "high_quality": WhisperModel("large-v3", device="cpu", compute_type="int8"),
}

# Worker pool — 3 workers per model for concurrent session support
import asyncio
from concurrent.futures import ThreadPoolExecutor

WHISPER_EXECUTOR = ThreadPoolExecutor(max_workers=3)  # scale up pre-go-live

async def transcribe_onprem(audio_bytes: bytes, language: str,
                             quality_preset: str, channel: str) -> tuple:
    # Convert audio format based on channel type
    if channel == "sip":
        audio_input = mulaw_to_linear16_16k(audio_bytes)
    else:  # webrtc — already linear16 16kHz
        audio_input = audio_bytes

    model = WHISPER_MODELS[quality_preset]

    # Run in thread pool — FasterWhisper is CPU-bound, asyncio-safe via executor
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        WHISPER_EXECUTOR,
        lambda: model.transcribe(
            audio_input,
            language=language if language != "auto" else None,
            beam_size=5,
            vad_filter=True,
            vad_parameters={
                "threshold": 0.5,
                "min_speech_duration_ms": vad_config.min_speech_duration_ms,
                "max_speech_duration_s": vad_config.max_utterance_duration_s,
                "min_silence_duration_ms": vad_config.end_of_speech_silence_ms,
            }
        )
    )
    segments, info = result
    transcript = " ".join(seg.text for seg in segments)
    return transcript, info.language   # FasterWhisper always returns detected language
    # No external API call — data never leaves server (Partition B guarantee)
```

**Concurrency capacity for Partition B on current server (125GB RAM):**
| Model | RAM per instance | Workers (executor) | Effective concurrent sessions |
|-------|-----------------|---------------------|-------------------------------|
| base (fast preset) | ~150MB | 3 | ~600 concurrent (fast queuing) |
| medium (balanced) | ~1.5GB | 3 | ~60 concurrent |
| large-v3 (high quality) | ~3.1GB | 3 | ~30 concurrent |

Worker pool sizing note: `ThreadPoolExecutor(max_workers=3)` is the safe default for the current single-server build. Scale to `max_workers=10` pre-go-live after load testing. Queue depth: asyncio naturally queues excess requests — add timeout of 10s to reject requests if queue is too deep.

#### 5.4.5B — Piper TTS Partition B — Audio Format Chain + Sentence Chunking (GAP — now fixed)

**Piper audio format conversion chain (critical — Piper has NO native ulaw output):**

Piper TTS natively outputs 16kHz PCM WAV. FreeSWITCH SIP telephony requires μ-law 8kHz. Unlike ElevenLabs which supports `output_format=ulaw_8000`, Piper requires an explicit conversion step using `audioop`:

```python
import audioop
from piper import PiperVoice
import wave, io

def piper_to_sip_audio(text: str, voice: PiperVoice) -> bytes:
    """Synthesise text with Piper and convert to μ-law 8kHz for FreeSWITCH SIP."""
    # Step 1: Piper synthesises to 16kHz PCM WAV in memory
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        voice.synthesize(text, wav_file)
    wav_buffer.seek(0)

    # Step 2: Read raw PCM bytes from WAV
    with wave.open(wav_buffer, 'rb') as wav_file:
        pcm_16k = wav_file.readframes(wav_file.getnframes())  # linear16 16kHz PCM

    # Step 3: Downsample 16kHz → 8kHz
    pcm_8k = audioop.ratecv(pcm_16k, 2, 1, 16000, 8000, None)[0]

    # Step 4: Convert linear16 → μ-law
    mulaw_8k = audioop.lin2ulaw(pcm_8k, 2)

    return mulaw_8k  # ready to stream to FreeSWITCH RTP channel

def piper_to_webrtc_audio(text: str, voice: PiperVoice) -> bytes:
    """For WebRTC/LiveKit — Piper 16kHz PCM is already correct format."""
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        voice.synthesize(text, wav_file)
    wav_buffer.seek(0)
    with wave.open(wav_buffer, 'rb') as wav_file:
        return wav_file.readframes(wav_file.getnframes())  # linear16 16kHz — no conversion
```

**Piper sentence chunking — reduces Time-to-First-Audio from 3–5s to ~800ms:**

Piper has no streaming API — it synthesises a complete text string and returns audio as a block. Passing the full LLM response as one string means the caller waits for full LLM generation + full synthesis before hearing anything.

Solution: split LLM output at sentence boundaries and synthesise sentence-by-sentence, overlapping generation with playback:

```python
import re

async def synthesise_piper_chunked(llm_response_stream, voice: PiperVoice,
                                    channel: str, cid: str):
    """
    Reads LLM token stream, buffers until sentence boundary,
    synthesises each sentence immediately, overlaps with next LLM tokens.
    Caller hears first sentence while LLM is still generating sentence 2.
    """
    sentence_buffer = ""
    sentence_end = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')

    async for token in llm_response_stream:
        # Check for interrupt signal before each sentence
        interrupted = await redis.get(f"interrupt:{cid}")
        if interrupted:
            return  # cancel immediately

        sentence_buffer += token

        # Check if we have a complete sentence
        if sentence_end.search(sentence_buffer):
            sentences = sentence_end.split(sentence_buffer)
            for sentence in sentences[:-1]:  # all complete sentences
                sentence = sentence.strip()
                if sentence:
                    if channel == "sip":
                        audio = piper_to_sip_audio(sentence, voice)
                    else:
                        audio = piper_to_webrtc_audio(sentence, voice)
                    yield audio
            sentence_buffer = sentences[-1]  # keep incomplete sentence

    # Flush remaining buffer
    if sentence_buffer.strip():
        if channel == "sip":
            yield piper_to_sip_audio(sentence_buffer.strip(), voice)
        else:
            yield piper_to_webrtc_audio(sentence_buffer.strip(), voice)
```

**Typical Partition B latency profile (single turn, balanced preset):**
| Stage | Duration |
|-------|----------|
| FasterWhisper transcription (medium model) | 350–600ms |
| sentence-transformers RAG embedding | 80–120ms |
| Ollama LLM first token (llama3.1:8b) | 350–500ms |
| Piper first sentence synthesis | 200–350ms |
| audioop format conversion | <10ms |
| **Total Time-to-First-Audio (TTFA)** | **~1000–1600ms** |

This is higher than Partition A (~300ms TTFA) but acceptable for regulated deployments where data sovereignty is the priority.

#### 5.4.5C — Partition B Internal Tools Distinction (GAP — important clarity)

**The data sovereignty guarantee bans public internet API calls. It does NOT ban calls to the client's own internal/intranet systems.**

This distinction is critical for enterprise Partition B deployments. A banking client running Partition B will have:
- Core banking system (on-premises) — ✅ callable via internal webhook
- CRM system (internal network) — ✅ callable via internal webhook
- Payment gateway (on-premises) — ✅ callable via internal webhook
- Deepgram API (public internet) — ❌ BLOCKED by PartitionRouter
- ElevenLabs API (public internet) — ❌ BLOCKED by PartitionRouter
- Any `api.*.com` or public endpoint — ❌ BLOCKED by PartitionRouter

**Implementation in PartitionRouter:**

```python
import socket

def enforce_no_external_call(partition: str, attempted_url: str):
    """
    Partition B blocks public internet calls.
    Allows calls to private/internal IP ranges (RFC 1918).
    """
    if partition != "onprem":
        return  # Partition A — all calls allowed

    try:
        hostname = attempted_url.split("//")[-1].split("/")[0].split(":")[0]
        ip = socket.gethostbyname(hostname)

        # Allow RFC 1918 private ranges (internal network)
        private_ranges = [
            ip.startswith("10."),
            ip.startswith("172.16.") or ip.startswith("172.17."),
            ip.startswith("192.168."),
            ip == "127.0.0.1" or ip == "localhost",
        ]

        if not any(private_ranges):
            raise RuntimeError(
                f"DATA SOVEREIGNTY VIOLATION: Partition B agent attempted call "
                f"to public internet endpoint {attempted_url} (resolved to {ip}). "
                f"Only private/internal network endpoints are permitted."
            )
    except socket.gaierror:
        raise RuntimeError(f"Could not resolve hostname in {attempted_url}")
```

Document this clearly in agent configuration (Tab 6 Tools): when Partition B is selected, the tool endpoint URL field shows validation — red warning if URL resolves to a public IP, green if it resolves to a private IP range.

#### 5.4.6 — LLM Partition Routing — Explicit Rules

**The LiteLLM proxy at :4000 routes ALL LLM calls regardless of partition.** Partition B LLM calls route to Ollama at localhost:11434 via the LiteLLM config (already configured in Task 2A.12). The PartitionRouter validates the model choice is partition-compatible before the call is made:

```python
# In AI pipeline turn loop — BEFORE calling LiteLLM:
from partition_router import get_partition_config, validate_llm_model_for_partition, enforce_no_external_call

config = get_partition_config(agent.partition)

# Validate model is allowed for this partition
if not validate_llm_model_for_partition(agent.partition, agent_config.llm_model_name):
    raise ValueError(
        f"Model {agent_config.llm_model_name} is not compatible with "
        f"Partition {agent.partition}. "
        f"Allowed: {config.llm_allowed_models}"
    )

# Enforce data sovereignty for Partition B
if agent.partition == "onprem":
    # Verify model routes to Ollama — check LiteLLM model config
    assert agent_config.llm_model_name.startswith("ollama-"), \
        "Partition B must use ollama-* models only"
    # No enforce_no_external_call needed — LiteLLM routes ollama/* to localhost:11434
```

**Ollama concurrency on current server (125GB RAM):**
| Model | RAM usage | Max concurrent (estimate) |
|-------|-----------|--------------------------|
| llama3.1:8b | ~8GB | ~12 concurrent |
| mistral:7b | ~7GB | ~14 concurrent |
| qwen2:7b | ~7GB | ~14 concurrent |

For higher concurrency on Partition B, run multiple Ollama processes on different ports with load balancing. Document as a pre-go-live capacity item.

#### 5.4.7 — Partition Validation at Agent Save Time

When an Agent Admin saves agent configuration (Platform API `PUT /agents/:id/config`), validate partition compatibility before persisting:

```python
# NestJS AgentsModule — agent config save validation
async validatePartitionCompatibility(config: AgentConfigDto): Promise<void> {
  if (config.partition === 'onprem') {
    // Validate LLM model is Ollama
    const model = await this.llmModelsRepo.findOne(config.llmModelId);
    if (!model.model_name.startsWith('ollama')) {
      throw new BadRequestException(
        `Partition B (On-Premise) requires an Ollama model. ` +
        `Selected model "${model.display_name}" is a cloud model. ` +
        `Please select Llama 3.1 8B, Mistral 7B, or Qwen2 7B.`
      );
    }
    // Validate voice is Piper
    const voice = await this.voicesRepo.findOne(config.voiceId);
    if (voice.source_type !== 'piper_onprem') {
      throw new BadRequestException(
        `Partition B (On-Premise) requires a Piper voice. ` +
        `Selected voice "${voice.name}" is an ElevenLabs voice. ` +
        `Please select a voice with the On-Prem badge.`
      );
    }
  }
}
```

**UI behaviour:** In Tab 1, when Partition B is selected:
- LLM picker filters to show ONLY Ollama models (hide all cloud models)
- Voice picker filters to show ONLY Piper voices (On-Prem badge) in Global Library
- STT and TTS provider dropdowns are hidden (determined by partition, not configurable)
- Partition B badge shown prominently in orange

#### 5.4.8 — Partition B Fallback Policy

If Ollama or FasterWhisper becomes unavailable during an active Partition B call, the system must follow a defined fallback policy. This is configurable per tenant (stored in `tenants.settings_json`):

| Policy | Behaviour | Use case |
|--------|-----------|---------|
| `fail_hard` (default) | Immediately end call with TTS message + publish error event to Kafka | Strict data sovereignty — never route to cloud |
| `fallback_cloud` | Silently switch to Partition A for remainder of call — log event to audit | Resilience-first — data sovereignty is preferred but not absolute |
| `hold_and_retry` | Place caller on MOH, retry Partition B service for 30s, then fail_hard | Best experience for transient failures |

```sql
-- Tenant settings_json example for Partition B fallback policy:
UPDATE tenants SET settings_json = jsonb_set(
    settings_json,
    '{partition_b_fallback}',
    '"fail_hard"'
) WHERE tenant_id = 'xxx';
```

#### 5.4.9 — Mixed Partition Test (Two Agents, One Tenant)

This explicit test verifies that Partition A and Partition B agents can operate simultaneously within the same tenant with no cross-contamination:

```python
# test_mixed_partition.py — run as part of Task 16 integration test
import asyncio

async def test_mixed_partition_isolation():
    tenant_id = "test-tenant-001"

    # Agent A = Partition A (cloud)
    cid_a = await cid_service.generate_cid("agent-cloud-001", tenant_id, "test")
    response_a = await pipeline.transcribe(cid_a, audio_bytes, "cloud")
    assert response_a["provider"] == "deepgram"

    # Agent B = Partition B (onprem) — simultaneous
    cid_b = await cid_service.generate_cid("agent-onprem-001", tenant_id, "test")
    response_b = await pipeline.transcribe(cid_b, audio_bytes, "onprem")
    assert response_b["provider"] == "fasterwhisper"

    # Verify no cross-contamination in Redis sessions
    session_a = redis.get(f"session:{cid_a}")
    session_b = redis.get(f"session:{cid_b}")
    assert session_a["partition"] == "cloud"
    assert session_b["partition"] == "onprem"

    print("MIXED PARTITION TEST: PASS")
```

#### 5.4.10 — Partition Reporting in MIS

Cost recording differs by partition and must be correctly reflected in MIS:

| Metric | Partition A | Partition B |
|--------|------------|------------|
| `llm_cost` | Real cost from `litellm.completion_cost()` | $0.00 (no external API) |
| `stt_cost` | Deepgram per-minute rate | $0.00 (no external API) |
| `tts_cost` | ElevenLabs per-character rate | $0.00 (no external API) |
| `total_cost` | Sum of above | $0.00 |
| `partition` field | 'cloud' | 'onprem' |

MIS dashboards must allow filtering by partition to compare cloud vs on-premise cost profiles across the same agent types.

### 5.5 — RAG Pipeline (LlamaIndex + Qdrant — LOCKED)
- `DocumentIngestionService` — LlamaIndex chunking + embedding → Qdrant collection `kb_{tenant_id}_{agent_id}`
- `RAGRetrievalService` — query Qdrant at inference time, inject top-K chunks into LLM context
- Embedding: OpenAI `text-embedding-3-small` (Partition A) / `sentence-transformers/all-MiniLM-L6-v2` (Partition B) — routing via PartitionRouter §5.4
- Supported formats: PDF, DOCX, TXT, CSV, URL (web scraping)

---

## TASK 6 — PLATFORM API (NestJS CONTROL PLANE)

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 6

Read RUNBOOK.md and confirm Task 5 is COMPLETE and schema migration (ALTER TABLE for all new columns) is confirmed. Then execute Task 6 per this section in full. Full autonomy — no confirmation needed between steps. Report back only when complete or if something fails.

**CRITICAL — read before writing any NestJS code:**
- Read `§6.2A` fully — the `UpdateAgentConfigDto` has ~40 fields added from co-browsing. Every field in `agent_configs` schema (§3.1) must be in the DTO. Do not thin it down.
- Read `§6.2B` — Branches API is NEW and required for A/B testing UI (Tab 3) in Task 8.
- Read `§6.2C` — Analytics API has 8 sub-tabs; conversation response must include all co-browsing metadata fields.
- All DB connections use **PostgreSQL via PgBouncer :5433** — never :5432 directly.
- NestJS runs on :3001 internally. Kong Gateway on :8000 proxies external traffic.
- Keycloak on :8080 is the identity provider — validate its JWTs in AuthModule.
- Every write operation must emit an immutable record to `audit_logs` via AuditModule.

**Execution sequence:**
- §6.1 — NestJS scaffold + package installs
- §6.2 — All 13 modules (see module table)
- §6.2A — Full agent_configs DTO with all co-browsing fields
- §6.2B — Branches API (A/B testing)
- §6.2C — Analytics 8 sub-tab endpoints + full conversation response shape
- §6.3 — RBAC guards on all endpoints
- Register all routes in Kong

After all verifications pass — update RUNBOOK.md. Then report back to Architect.

**Prerequisite: Task 5 complete + schema migration confirmed.**

---

**Prerequisite: Task 5 complete + schema migration (ALTER TABLE for all new agent_configs/conversations columns) complete.**

### 6.1 — NestJS Application Scaffold
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services
nest new platform-api --skip-git --package-manager npm
cd platform-api
npm install @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config @nestjs/swagger kafka-node ioredis uuid
npm install @nestjs/graphql @apollo/server graphql
```

### 6.2 — Core NestJS Modules

| Module | BRD Ref | Key REST Endpoints |
|--------|---------|-------------------|
| AuthModule | BRD-L5-RB-003 | JWT validation, Keycloak token verify, tenant context injection |
| TenantsModule | BRD-L5-MT-001/002 | POST /tenants, GET /tenants/:id, tenant onboarding |
| UsersModule | BRD-L5-RB-001 | CRUD users per tenant, role assignment |
| AgentsModule | BRD-L5-AGM-001 to 011 | POST /agents, GET /agents, GET /agents/:id, PUT /agents/:id/config, POST /agents/:id/publish, GET /agents/:id/branches, POST /agents/:id/branches, PUT /agents/:id/branches/:branchId/traffic, **GET /agents/:id/preview-history/count** |
| KnowledgeBaseModule | BRD-L5-AGM-012 to 015 | POST /kb/documents, GET /kb/documents, POST /agents/:id/kb/attach, PUT /agents/:id/kb/rag-config |
| ToolsModule | BRD-L5-AGM-016 to 020 | POST /tools, GET /tools, PUT /tools/:id, DELETE /tools/:id, PUT /agents/:id/tools/system, GET /tools/mcp, POST /tools/mcp, GET /mcp-servers, POST /mcp-servers, DELETE /mcp-servers/:id |
| WidgetModule | BRD-L5-AGM-WG-001 to 009 | PUT /agents/:id/widget, GET /agents/:id/widget/embed, POST /agents/:id/translate-first-message, GET /agents/:id/widget/shareable-url |
| VoicesModule | BRD-L1-010 to 013 | GET /voices, POST /voices/:id/preview, POST /voices/design, POST /voices/clone, GET /voices/languages/:code/top-picks |
| LLMProvidersModule | BRD-L1-005 | GET /llm-providers/models (with latency + cost/min), GET /llm-providers |
| ConversationsModule | BRD-L5-MIS-002 | GET /conversations, GET /conversations/:id, GET /conversations/:id/transcript, GET /conversations/:id/recording, **GET /agents/:id/preview-history** (list preview conversations with auto-generated names, filtered `is_preview=true AND agent_id=:id`, supports `?branchId=` query param, returns same shape as GET /conversations list), **GET /agents/:id/preview-history/count** (alias — returns `{ count: N }` for Publish button soft gate; queries `SELECT COUNT(*) FROM conversations WHERE agent_id=:id AND is_preview=true AND branch_id=:branchId`) |
| AnalyticsModule | BRD-L5-MIS-001 to 005 | GET /analytics/summary, GET /analytics/conversations, GET /analytics/agents/:id |
| AuditModule | BRD-L5-RB-004 | Internal — immutable insert to audit_logs on all changes |
| WebhooksModule | co-browsing | POST /agents/:id/webhooks/post-call, DELETE /agents/:id/webhooks/post-call |
| TestsModule | co-browsing | GET /tests, POST /tests, POST /tests/:id/run, GET /tests/templates |

### 6.2A — AgentsModule: Full agent_configs DTO (CRITICAL — co-browsing additions)

The `PUT /agents/:id/config` endpoint must accept and persist ALL fields in the agent_configs schema (§3.1). The NestJS DTO must include every co-browsing-added field. Partial update — only provided fields are written. Use `class-validator` for all fields.

```typescript
// agents/dto/update-agent-config.dto.ts
export class UpdateAgentConfigDto {
  // System Prompt
  system_prompt?: string;
  default_personality_enabled?: boolean;   // "Default personality" toggle
  timezone_override?: string;               // "Set timezone" button

  // First Message
  first_message?: string;
  first_message_interruptible?: boolean;    // "Interruptible" toggle

  // Voice
  voice_id?: string;
  expressive_mode_enabled?: boolean;        // "Expressive Mode" — NEW from co-browsing
  additional_voices?: Array<{voice_id: string, language: string}>;

  // Language
  primary_language?: string;
  additional_languages?: string[];
  hinglish_mode_enabled?: boolean;          // "Hinglish Mode" toggle — NEW from co-browsing
  language_groups?: Array<{name: string, languages: string[]}>;

  // LLM
  llm_model_id?: string;
  backup_llm_policy?: 'default' | 'custom' | 'disabled';   // NEW from co-browsing
  backup_llm_model_id?: string;                              // NEW from co-browsing
  llm_temperature?: number;                                  // NEW from co-browsing
  llm_thinking_budget_enabled?: boolean;                    // NEW from co-browsing
  llm_max_tokens?: number;                                   // NEW from co-browsing

  // STT/TTS
  stt_provider_id?: string;
  tts_provider_id?: string;

  // Conversational behaviour — updated from co-browsing v1.5
  eagerness?: 'eager' | 'normal' | 'patient';    // CORRECTED: eager|normal|patient (NOT low|normal|high)
  spelling_patience?: 'auto' | 'off';             // NEW — extends VAD when user spells
  speculative_turn_enabled?: boolean;
  take_turn_after_silence_s?: number;             // RENAMED from _ms, default 7 (seconds, not ms)
  end_conversation_after_silence_s?: number;      // default -1
  max_conversation_duration_s?: number;           // default 600
  max_conversation_duration_message?: string;
  max_duration_message_localized?: Record<string, string>;  // NEW — per-language
  soft_timeout_s?: number;                        // default -1
  llm_cascade_timeout_s?: number;                 // NEW — default 8
  filter_background_speech_enabled?: boolean;
  asr_model?: 'original' | 'scribe_realtime_v2_1';  // UPDATED — exact enum values confirmed
  user_input_audio_format?: 'pcm_8000' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'pcm_48000' | 'ulaw_8000';  // UPDATED — 7 options

  // Multimodal input — NEW from co-browsing v1.5
  allow_file_attachments?: boolean;               // images/PDFs in chat

  // Client events — NEW from co-browsing v1.5
  client_events?: Array<'audio'|'interruption'|'user_transcript'|'agent_response'|'agent_response_correction'|'agent_response_metadata'|'agent_chat_response_part'|'agent_tool_request'|'agent_tool_response'|'vad_score'|'guardrail_triggered'>;

  // First message localisation — NEW from co-browsing v1.5
  first_message_localized?: Record<string, string>;  // {"hi": "...", "ta": "..."}

  // Guardrails — UPDATED from co-browsing v1.5 (card-based, sub-toggles)
  guardrails_focus_enabled?: boolean;
  guardrails_focus_config?: object;
  guardrails_manipulation_enabled?: boolean;
  guardrails_prompt_injection?: boolean;          // NEW — sub-toggle in Manipulation drawer
  guardrails_content_enabled?: boolean;           // NEW — Content guardrail card
  guardrails_custom_prompt?: string;              // NEW — Custom guardrail text

  // Privacy — NEW from co-browsing v1.5
  zero_retention_mode?: boolean;
  store_call_audio?: boolean;
  conversations_retention_days?: number;

  // Overrides — NEW from co-browsing
  allowed_overrides?: string[];   // 'first_message'|'system_prompt'|'llm'|'voice'|'voice_speed'|'voice_stability'|'voice_similarity'|'text_only'

  // RAG — NEW from co-browsing
  rag_enabled?: boolean;
  rag_embedding_model?: 'english' | 'multilingual';
  rag_character_limit?: number;       // default 50000
  rag_chunk_limit?: number;           // default 20
  rag_vector_distance_limit?: number;
  rag_num_candidates_enabled?: boolean;
  rag_num_candidates_value?: number;  // renamed from rag_num_candidates — min 100 recommended
  rag_query_rewrite_enabled?: boolean;
  rag_query_rewrite_prompt?: string;  // NEW — custom rewrite prompt when enabled

  // Evaluation & Data Collection — NEW from co-browsing
  evaluation_criteria_json?: Array<{name: string, prompt: string}>;
  data_collection_json?: Array<{name: string, description: string, type?: string}>;

  // Workflow — NEW from co-browsing
  workflow_definition_json?: {nodes: any[], edges: any[]};

  // Other
  tools_config_json?: object;
  kb_docs_attached?: string[];
  widget_config_id?: string;
  auth_policy_id?: string;
  handoff_policy_id?: string;

  // Post-call webhook
  post_call_webhook_url?: string;
  conversation_initiation_webhook_url?: string;
}
```

### 6.2B — Branches API (NEW from co-browsing — A/B testing)

```typescript
// Branches: each branch is a version of agent_configs with traffic split
GET  /agents/:id/branches              // list all branches with traffic split
POST /agents/:id/branches              // create new branch (copies current main config)
PUT  /agents/:id/branches/:branchId    // update branch config
PUT  /agents/:id/branches/:branchId/traffic  // { traffic_split_pct: 20 }
POST /agents/:id/branches/:branchId/publish  // make live
DELETE /agents/:id/branches/:branchId  // archive branch
```

### 6.2C — Analytics API expansion (NEW from co-browsing)

```typescript
// Analytics: 8 sub-tabs observed on live platform
GET /analytics/agents/:id?tab=general          // calls, duration, cost KPIs
GET /analytics/agents/:id?tab=evaluation       // evaluation criteria results
GET /analytics/agents/:id?tab=data_collection  // extracted data points
GET /analytics/agents/:id?tab=audio            // TTS/ASR latency trends
GET /analytics/agents/:id?tab=tools            // tool invocation stats
GET /analytics/agents/:id?tab=llms             // LLM cost breakdown per model
GET /analytics/agents/:id?tab=knowledge_base   // KB retrieval stats
GET /analytics/agents/:id?tab=advanced         // detailed technical metrics

// Conversations include all co-browsing metadata fields
GET /conversations/:id  // returns: summary, call_successful, how_call_ended, user_id,
                         // branch_id, tts_latency_ms_avg, asr_latency_ms_avg, turn_count,
                         // call_cost_credits, llm_credits, environment, evaluation_results,
                         // data_collection_results
```

### 6.2D — Agent Creation APIs: Two Distinct Paths (CO-BROWSING §1 + §7)

The "+New Agent" wizard has two mutually exclusive creation paths. Each has its own endpoint with distinct validation and behaviour. **Never conflate these two paths.**

---

#### 6.2D-A — Blank Agent Path: `POST /agents`

The Blank Agent path is a **2-step minimal wizard** (Step 1: type selection → Step 2: name + chat only). No industry, no use case, no system prompt generation, no LLM call.

```typescript
// AgentsModule — blank agent creation (fast path)
// POST /agents
export class CreateAgentBlankDto {
  agent_name: string;        // Required. Max 50 chars. Validated: minLength(1), maxLength(50).
  text_only?: boolean;       // Optional. Default false. From "Chat only" toggle.
  // NOTE: agent_type is always 'conversational' for blank path in v1.
  // 'tools_assisted' and 'autonomous' blank paths follow in future iterations.
}

// Response
{
  agent_id: string,                        // UUID of newly created agent
  config: {                                // Sparse config — most fields at defaults
    system_prompt: '',                     // empty — user fills in Tab 1
    first_message: '',                     // empty — user fills in Tab 1
    text_only: boolean,                    // from dto.text_only
    status: 'draft'
  },
  redirect_url: '/app/agents/{id}?tab=agent'  // land on Tab 1 (Agent) to start configuring
}
```

**Endpoint logic (blank path):**
1. Create `agents` row: `{name, creation_path: 'blank', type: 'conversational', status: 'draft', text_only, tenant_id}`
2. Create `agent_configs` row with all fields at defaults (system_prompt = '', first_message = '')
3. Create `agent_branches` row: `{name: 'Main', traffic_split: 100, status: 'draft', is_live: false}`
4. Return `{agent_id, config, redirect_url}`
5. **No LLM call. No async jobs. Response time < 200ms.**

---

#### 6.2D-B — Guided Wizard Path: `POST /agents/wizard`

The Guided (Business Agent) path is a **5-step wizard** (Type → Industry → Use Case → KB → Complete). Calls LLM to generate system_prompt + first_message. Optionally crawls website URL async.

```typescript
// AgentsModule — guided wizard creation
// POST /agents/wizard
export class CreateAgentWizardDto {
  agent_type: 'conversational' | 'tools_assisted' | 'autonomous';  // Step 1 — wizard type
  industry: string;           // Step 2 — validated against industry enum (see §6.2D-C below)
  use_case: string;           // Step 3 — validated against use_case enum per industry
  agent_name: string;         // Step 5 — required, max 50 chars
  main_goal: string;          // Step 5 — required, free text, max 1000 chars
  website_url?: string;       // Step 5 — optional, must be valid HTTPS URL
  kb_doc_ids?: string[];      // Step 4 — IDs of KB docs selected in Ground step
  text_only?: boolean;        // Step 5 — Chat only toggle, default false
}

// Response
{
  agent_id: string,
  config: AgentConfig,         // fully pre-populated from LLM generation
  redirect_url: string         // → /app/agents/{id}?tab=agent
}
```

**Endpoint logic (guided path):**
1. Validate `industry` and `use_case` against the enum lists in §6.2D-C
2. Look up `agent_templates` WHERE `agent_type = dto.agent_type AND industry = dto.industry AND use_case = dto.use_case`
3. Call LLM (Claude Sonnet — **not GPT-4o**, Claude is cheaper + better for structured prompts) with template + `{agent_name, main_goal, website_content: ''}` → generate `system_prompt` + `first_message`. Target latency: < 3s.
4. Create `agents` row: `{name, creation_path: 'guided', type, industry, use_case, main_goal, website_url, text_only, status: 'draft'}`
5. Create `agent_configs` row with: `{system_prompt, first_message, ...template_defaults}`
6. If `kb_doc_ids` provided: attach all docs to agent
7. Create `agent_branches` row: `{name: 'Main', traffic_split: 100, status: 'draft'}`
8. If `website_url` provided: **fire async job** (do not block response) → crawl URL → create KB doc → attach to agent → push WS notification "Website personalisation complete"
9. Return `{agent_id, config, redirect_url}`

**Website crawl async job:**
- Queue: Redis BullMQ job `website_crawl`
- Max crawl depth: 2 levels, max 50 pages
- On completion: create `knowledge_base_docs` row, attach to agent, emit WebSocket event `{type: 'website_crawl_complete', agent_id}`
- Tab 4 (KB) shows spinner with "Personalising from your website..." until WS event arrives

---

#### 6.2D-C — Industry and Use Case Enum Validation

Both `industry` and `use_case` fields on the wizard DTO are validated against these enum lists.  
**Source of truth for the wizard Step 2 and Step 3 screens. Also used to seed `agent_templates`.**

**Industry slugs (22 total — 17 ElevenLabs baseline + 5 TRUSTNOW BPO-specific):**

```typescript
export const INDUSTRY_SLUGS = [
  // 17 ElevenLabs baseline industries (confirmed live co-browsing §7.3)
  'retail_ecommerce',
  'healthcare_medical',
  'finance_banking',
  'real_estate',
  'education_training',
  'hospitality_travel',
  'automotive',
  'professional_services',
  'technology_software',
  'government_public',
  'food_beverage',
  'manufacturing',
  'fitness_wellness',
  'legal_services',
  'nonprofit',
  'media_entertainment',
  'other',
  // 5 TRUSTNOW BPO-specific verticals (TRUSTNOW differentiator — not in ElevenLabs)
  'bpo_debt_collections',         // Debt collection / credit control outreach
  'bpo_utilities',                // Utility company customer service (billing, outages, meter reading)
  'bpo_insurance_claims',         // Insurance FNOL, claims intake, claims status
  'bpo_telecoms',                 // Telecom customer service (billing, tech support, upgrades)
  'bpo_government_services',      // Government service delivery (benefits, applications, queries)
] as const;

export type IndustrySlug = typeof INDUSTRY_SLUGS[number];
```

**Use case slugs per industry — universal set (always present in every industry):**
```typescript
export const UNIVERSAL_USE_CASES = [
  'customer_support',
  'outbound_sales',
  'learning_development',
  'scheduling',
  'lead_qualification',
  'answering_service',
] as const;
```

**Industry-specific use case additions (confirmed from §7.4 co-browsing):**
```typescript
export const INDUSTRY_USE_CASES: Record<IndustrySlug, string[]> = {
  retail_ecommerce:        [...UNIVERSAL_USE_CASES, 'product_recommendations','order_tracking','returns_exchanges','lead_generation','loyalty_programs','other'],
  healthcare_medical:      [...UNIVERSAL_USE_CASES, 'appointment_scheduling','patient_intake','symptom_guidance','insurance_verification','prescription_reminders','telehealth_support','other'],
  finance_banking:         [...UNIVERSAL_USE_CASES, 'account_inquiries','loan_applications','fraud_alerts','investment_guidance','bill_payment_support','financial_planning','other'],
  real_estate:             [...UNIVERSAL_USE_CASES, 'property_search','viewing_appointments','market_information','mortgage_guidance','listing_information','other'],
  education_training:      [...UNIVERSAL_USE_CASES, 'student_enrollment','course_recommendations','tutoring_support','campus_information','career_guidance','learning_companion','other'],
  hospitality_travel:      [...UNIVERSAL_USE_CASES, 'reservation_management','concierge_services','guest_services','travel_planning','loyalty_programs','check_in_support','other'],
  automotive:              [...UNIVERSAL_USE_CASES, 'vehicle_enquiries','test_drive_booking','service_maintenance','parts_accessories','finance_insurance','trade_in_support','other'],
  professional_services:   [...UNIVERSAL_USE_CASES, 'consultation_booking','client_onboarding','project_enquiries','document_collection','invoice_billing','expert_matching','other'],
  technology_software:     [...UNIVERSAL_USE_CASES, 'technical_support','product_demos','api_documentation','user_onboarding','feature_requests','sales_engineering','other'],
  government_public:       [...UNIVERSAL_USE_CASES, 'citizen_services','permit_applications','information_requests','complaint_filing','service_eligibility','emergency_services','other'],
  food_beverage:           [...UNIVERSAL_USE_CASES, 'order_taking','reservation_management','menu_recommendations','delivery_tracking','loyalty_programs','nutritional_information','other'],
  manufacturing:           [...UNIVERSAL_USE_CASES, 'inventory_management','quality_control','maintenance_scheduling','safety_protocols','production_planning','supplier_communication','other'],
  fitness_wellness:        [...UNIVERSAL_USE_CASES, 'class_booking','workout_planning','nutrition_guidance','progress_tracking','membership_management','wellness_coaching','other'],
  legal_services:          [...UNIVERSAL_USE_CASES, 'consultation_scheduling','case_intake','legal_resources','billing_inquiries','document_preparation','case_updates','other'],
  nonprofit:               [...UNIVERSAL_USE_CASES, 'volunteer_coordination','donation_processing','program_information','event_management','beneficiary_support','impact_reporting','other'],
  media_entertainment:     [...UNIVERSAL_USE_CASES, 'content_recommendations','subscription_management','technical_support','event_information','fan_engagement','content_discovery','other'],
  other:                   [...UNIVERSAL_USE_CASES, 'other'],
  // BPO-specific verticals (TRUSTNOW differentiator)
  bpo_debt_collections:    [...UNIVERSAL_USE_CASES, 'debt_collection_outreach','payment_arrangement','dispute_resolution','skip_tracing_support','regulatory_compliance_scripting','payment_confirmation','other'],
  bpo_utilities:           [...UNIVERSAL_USE_CASES, 'billing_enquiries','outage_reporting','meter_reading_capture','service_connection_disconnection','tariff_switching','payment_plan_setup','other'],
  bpo_insurance_claims:    [...UNIVERSAL_USE_CASES, 'fnol_first_notice_of_loss','claims_status_update','claims_document_collection','claims_triage','settlement_explanation','fraud_referral','other'],
  bpo_telecoms:            [...UNIVERSAL_USE_CASES, 'bill_shock_resolution','contract_upgrade','technical_fault_logging','network_outage_support','roaming_queries','churn_prevention','other'],
  bpo_government_services: [...UNIVERSAL_USE_CASES, 'benefits_eligibility_check','application_status','document_submission_guidance','appointment_booking','complaint_escalation','service_signposting','other'],
};
```

**Validation rule:** If `industry` is not in `INDUSTRY_SLUGS`, return HTTP 422. If `use_case` is not in `INDUSTRY_USE_CASES[industry]`, return HTTP 422 with message: "Use case '{use_case}' is not valid for industry '{industry}'".

---

#### 6.2D-D — `agent_templates` Seed Data Scope (Updated)

Seed `agent_templates` for **all 22 industries** (not just 7). Priority order for launch:

**Tier 1 — Launch critical (seed before go-live):**
- All 5 BPO-specific industries × top 6 use cases = **30 templates**
- Healthcare × 6, Finance × 6, Technology × 6 = **18 templates**

**Tier 2 — Complete within first sprint post-launch:**
- Remaining 14 ElevenLabs-baseline industries × 6 use cases each = **84 templates**

**Minimum viable seed for beta:** 48 templates (Tier 1).  
**Full coverage for GA:** 132+ templates.

Each template's `system_prompt_template` must be 800–1,500 chars, professional, role-specific, with `{{agent_name}}`, `{{company_name}}`, `{{industry}}`, `{{use_case}}`, `{{main_goal}}`, `{{website_content}}` placeholders. Write these as a separate `seed-agent-templates.sql` file during Task 6.

**EXCEED ELEVENLABS — Template quality standard:**
ElevenLabs generates generic prompts. TRUSTNOW templates for BPO verticals must include:
- Regulatory compliance language (e.g., FDCPA phrasing for debt collection, HIPAA-safe language for healthcare)
- Industry-specific call structure (opening identification, purpose statement, consent capture where required)
- Escalation trigger conditions (when to transfer to human)
- Call disposition vocabulary aligned to the industry (e.g., "Promise to Pay" for collections, "FNOL accepted" for insurance)

This makes TRUSTNOW's AI agents meaningfully better for BPO clients than ElevenLabs' generic templates.

### 6.2E — Agent Templates — Seed Data (REQUIRED for wizard to function)

**See §6.2D-D for full seeding strategy and §6.2D-C for industry/use-case enum reference.**

Seed `agent_templates` in two tiers:

**Tier 1 — Launch critical (48 templates minimum, must be seeded before beta):**

```sql
-- Seed file: seed-agent-templates.sql (written in full during Task 6)
-- Format: INSERT INTO agent_templates (agent_type, industry, use_case, is_bpo_specific,
--           system_prompt_template, first_message_template) VALUES (...)

-- BPO Debt Collections × 6 use cases (is_bpo_specific = true)
('conversational','bpo_debt_collections','customer_support', true,
  'You are {{agent_name}}, a professional customer service representative for {{company_name}}, a debt collection agency. Your goal: {{main_goal}}. You must always identify yourself and your company at the start of every call. You are calling about an outstanding account. You must follow all applicable consumer protection regulations. Never threaten, harass, or use abusive language. If the consumer disputes the debt, note the dispute and advise them of their rights.',
  'Good [morning/afternoon], may I speak with [customer name]? This is {{agent_name}} calling from {{company_name}} regarding an important account matter. Is this a convenient time to speak?'),
-- ('conversational','bpo_debt_collections','debt_collection_outreach', true, ...) × 5 more use cases

-- BPO Utilities × 6 use cases (is_bpo_specific = true)
-- BPO Insurance Claims × 6 use cases (is_bpo_specific = true)
-- BPO Telecoms × 6 use cases (is_bpo_specific = true)
-- BPO Government Services × 6 use cases (is_bpo_specific = true)

-- Healthcare × 6 use cases
('conversational','healthcare_medical','telehealth_support', false,
  'You are {{agent_name}}, a professional telehealth support agent for {{company_name}}. Your goal: {{main_goal}}. You help patients with medical queries, appointment scheduling, and health guidance. Always recommend consulting a qualified doctor for clinical decisions. Never diagnose conditions.',
  'Hello, thank you for calling {{company_name}}. My name is {{agent_name}} and I am here to assist with your healthcare needs today. How may I help you?'),
-- × 5 more healthcare use cases

-- Finance × 6 use cases
-- Technology × 6 use cases
;
```

**EXCEED ELEVENLABS — BPO template quality bar:**
- Regulatory phrasing embedded in prompts (FDCPA for collections, HIPAA-safe for healthcare, FCA-compliant for finance)
- Industry-standard call opening/closing scripts
- Explicit escalation trigger conditions in system prompt
- Disposition vocabulary aligned to industry (Promise to Pay, FNOL, Churn Save, Service Reconnect)
- Compliance guardrails woven into the prompt, not bolted on afterwards

Full template SQL (800–1,500 chars per system_prompt_template) is written as `seed-agent-templates.sql` during Task 6.

**Tier 2 — Complete by GA (remaining 14 standard industries × 6 use cases = 84 additional templates):**
Retail, Real Estate, Education, Hospitality, Automotive, Professional Services, Government, Food & Beverage, Manufacturing, Fitness, Legal, Non-Profit, Media & Entertainment, Other × 6 use cases each.

### 6.3 — RBAC: Six Standard Tenant Roles (BRD-L5-RB-001)
- `platform_admin` — TRUSTNOW ops, full platform visibility
- `tenant_admin` — Full tenant control including billing/users/settings
- `agent_admin` — Create/edit/publish agents, manage KB and tools
- `supervisor` — View conversations, monitoring, barge-in
- `operator` — Limited agent configuration, no billing
- `auditor` — Read-only access to audit logs and recordings

---

### 6.2F — Additional AgentsModule Endpoint Contracts (CO-BROWSING §2)

#### `POST /agents/:id/translate-first-message`

**Module:** AgentsModule (not WidgetModule — corrected from route table)  
**Purpose:** Translate the agent's default first message to all additional configured languages. Populates `agent_configs.first_message_localized` map.  
**Trigger:** User clicks "Translate to all" button in Tab 1 First Message toolbar.

```typescript
// POST /agents/:id/translate-first-message
// No request body — operates on the agent's existing first_message and languages config

// Guards: tenant_id RLS, agent_admin or above
// Behaviour:
// 1. Load agent_configs: first_message (source), additional_languages[]
// 2. If additional_languages is empty → return HTTP 400 "No additional languages configured"
// 3. For each language in additional_languages:
//    a. Call translation service (LibreTranslate self-hosted OR DeepL API)
//       with {text: first_message, source_lang: primary_language, target_lang: language_code}
//    b. Store translated text in first_message_localized[language_code]
// 4. UPDATE agent_configs SET first_message_localized = {...merged...} WHERE agent_id = :id
// 5. Return updated first_message_localized map

// Response 200
{
  first_message_localized: Record<string, string>;  // e.g. {"hi": "...", "ta": "..."}
  translated_languages: string[];                    // list of language codes translated
  source_language: string;                           // e.g. "en"
}

// Response 400
{ error: "No additional languages configured. Add languages in the Language section first." }
```

**Translation service note:** Use LibreTranslate (self-hosted, Partition B compatible, zero data egress) as the primary translation engine. DeepL API as Partition A alternative. Both are abstracted behind a `TranslationService` interface. **Do not use Google Translate — it requires sharing call content with Google.**

**EXCEED ELEVENLABS:** ElevenLabs offers translate-to-all as a single-button action with no visibility into translations. TRUSTNOW must additionally show each translated result inline below the textarea (per-language collapsible rows) so the agent_admin can review and edit individual translations before saving.

---

#### `PUT /agents/:id/config` — DTO Additions (CO-BROWSING §2)

Add the following fields to `UpdateAgentConfigDto` (they are in the schema but missing from the DTO):

```typescript
// Add to UpdateAgentConfigDto
timezone_variable_enabled?: boolean;    // "Set timezone" button was used — {timezone} injected
expressive_mode_dismissed?: boolean;    // User dismissed Expressive Mode promo card
first_message_localized?: Record<string, string>;  // already present ✅ — confirm
```

---

### 6.2G — WidgetModule Endpoint Contracts (CO-BROWSING §3)

**Naming note:** `widget_configs.feedback_enabled` is the authoritative field name in the schema (set during IMPL-001 v3.0). The co-browsing §3.2 referred to it as `feedback_collection_enabled` — that is descriptive language only, not the column name. Field name stays `feedback_enabled`.

---

#### `PUT /agents/:id/widget`

**Module:** WidgetModule  
**Purpose:** Create or fully replace the widget configuration for an agent. Upsert pattern — if no `widget_configs` row exists, creates one; otherwise replaces all provided fields.

```typescript
// PUT /agents/:id/widget
export class UpdateWidgetConfigDto {
  // Setup
  feedback_enabled?: boolean;                     // 1–5 star CSAT post-call rating

  // Interface toggles (8 total)
  interface_chat_mode?: boolean;
  interface_send_text_on_call?: boolean;
  interface_realtime_transcript?: boolean;
  interface_language_dropdown?: boolean;
  interface_mute_button?: boolean;
  interface_action_indicator?: boolean;
  interface_show_conversation_id?: boolean;
  interface_hide_audio_tags?: boolean;
  expanded_behavior?: 'starts_collapsed' | 'starts_expanded' | 'always_expanded';

  // Markdown links
  allow_all_domains?: boolean;
  allowed_domains?: string[];
  include_www_variants?: boolean;
  allow_http_links?: boolean;

  // Avatar
  avatar_type?: 'orb' | 'link' | 'image';
  avatar_orb_color_1?: string;        // hex, e.g. '#2792dc'
  avatar_orb_color_2?: string;        // hex, e.g. '#9ce6e6'
  avatar_image_url?: string;          // external URL (link type) or CDN URL (image type, set by upload endpoint)

  // Style section
  collapsible?: boolean;
  placement?: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  style_config?: {
    base?: string;
    base_hover?: string;
    base_active?: string;
    base_border?: string;
    base_subtle?: string;
    base_primary?: string;
    accent_border?: string;
    accent_subtle?: string;
    accent_primary?: string;
    overlay_padding?: string;   // CSS value e.g. '32px'
    button_radius?: string;     // CSS value e.g. '18px'
    input_radius?: string;
    bubble_radius?: string;
    sheet_radius?: string;
    compact_sheet_radius?: string;
  };
  code_block_theme?: 'auto' | 'light' | 'dark';

  // Text contents (i18n tokens)
  text_contents?: Record<string, string>;  // partial or full token map

  // Shareable page
  shareable_description?: string;
  require_terms_on_shareable?: boolean;
}

// Response 200
{
  widget_id: string,
  agent_id: string,
  updated_at: string   // ISO timestamp
}
```

**Logic:**
1. Validate `agent_id` belongs to `tenant_id` (RLS check)
2. `UPSERT widget_configs` on conflict `(agent_id)` — update all provided fields, leave others unchanged
3. Return `{widget_id, agent_id, updated_at}`
4. **Do NOT auto-save on every keystroke** — widget config is saved only on explicit PUT. Frontend debounces by 1.5s or saves on field blur.

---

#### `POST /agents/:id/widget/avatar`

**Module:** WidgetModule  
**Purpose:** Upload an avatar image (Image type). Stores to MinIO `trustnow-widget-assets` bucket, sets `widget_configs.avatar_image_url` to the CDN URL, sets `widget_configs.avatar_type = 'image'`.

```typescript
// POST /agents/:id/widget/avatar
// Content-Type: multipart/form-data
// Field: file (binary image)

// Validation:
// - Max file size: 2MB (2,097,152 bytes)
// - Accepted MIME types: image/jpeg, image/png, image/webp, image/gif
// - Recommended resolution hint: 172×172px (not enforced — just displayed in UI)

// Logic:
// 1. Validate file size + MIME type
// 2. Generate storage key: widget-avatars/{tenant_id}/{agent_id}/{uuid}.{ext}
// 3. Upload to MinIO bucket 'trustnow-widget-assets'
// 4. Generate CDN URL: https://cdn.trustnow.ai/widget-assets/{key}
// 5. UPDATE widget_configs SET avatar_image_url = {cdn_url}, avatar_type = 'image'
// 6. Return cdn_url

// Response 200
{
  avatar_url: string   // CDN URL e.g. 'https://cdn.trustnow.ai/widget-assets/...'
}

// Response 413 — file too large
{ error: "File size exceeds 2MB limit." }

// Response 415 — unsupported type
{ error: "Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image." }
```

---

#### `GET /agents/:id/widget/shareable-url`

**Module:** WidgetModule  
**Purpose:** Returns the public shareable page URL for this agent — the standalone page where anyone can interact with the agent without embedding.

```typescript
// GET /agents/:id/widget/shareable-url
// No request body

// Logic:
// 1. Confirm agent exists + belongs to tenant
// 2. Confirm agent status is not 'archived'
// 3. Return shareable URL

// Response 200
{
  shareable_url: string,   // e.g. 'https://app.trustnow.ai/agent/agent_XXXXXXXX'
  is_live: boolean         // true if agent has a live branch with traffic > 0
}
```

**Shareable URL format:** `https://app.trustnow.ai/agent/{agent_id}` — publicly accessible, no login required.  
This page renders the widget with the agent's current `widget_configs` and the agent's published (Live) configuration.  
**If agent has no Live branch:** page shows "This agent is not yet available. Check back soon." with no widget.

---

#### `GET /agents/:id/widget`

**Module:** WidgetModule  
**Purpose:** Returns current widget configuration for populating the Widget tab UI.

```typescript
// GET /agents/:id/widget
// Response 200: full widget_configs row as JSON
// Response 404: { error: "Widget config not found" } — happens if never PUT'd; frontend creates defaults
```

---

**EXCEED ELEVENLABS — Widget tab additions:**
ElevenLabs provides one embed code snippet. TRUSTNOW must additionally provide:
1. **Framework-specific code tabs**: JavaScript (raw) | React | Vue | Angular — each showing the correct import/usage pattern for that framework
2. **Version pinning** option in embed code: ability to pin to a specific widget JS version (e.g. `embed@v1.2.0`) so clients are not auto-upgraded
3. **CSP (Content Security Policy) helper**: show the exact `script-src`, `connect-src`, `frame-src` policy strings the client site needs to allow the widget. BPO clients' IT security teams always ask for this.

---

**ARCH-001 FLAG — New architectural component: TRUSTNOW Widget CDN Bundle**  
The `<trustnow-agent>` Web Component (`cdn.trustnow.ai/widget/embed.js`) is a **separate build artifact** from the main platform frontend. It requires:
- Dedicated Vite/Rollup build pipeline outputting a single-file Web Component bundle
- CDN deployment (CloudFront + S3 or MinIO with edge caching)
- Semantic versioning + changelog
- CORS headers: `Access-Control-Allow-Origin: *` (widget must load on any client domain)
- CSP compatibility: no `eval()`, no inline scripts (strict CSP compliant)
- This is Layer 5 (CX OS) — client-facing delivery layer
See ARCH-001 §Widget CDN Component (to be added).

---

### 6.2H — Advanced Tab (Tab 10) Backend Service Specs (CO-BROWSING §4)

#### Conversation Retention Purge Job

The `conversations_retention_days` field requires a background purge service. Without this, setting a retention period in the UI has no effect.

```typescript
// NestJS Scheduled Task — runs daily at 03:00 UTC
// File: src/scheduler/retention-purge.job.ts
@Cron('0 3 * * *')
async purgeExpiredConversations() {
  // 1. Find all agent_configs where conversations_retention_days > 0
  const agents = await this.db.query(`
    SELECT DISTINCT agent_id, conversations_retention_days
    FROM agent_configs
    WHERE conversations_retention_days > 0
  `);

  for (const agent of agents) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - agent.conversations_retention_days);

    // 2. Find expired conversations for this agent
    const expired = await this.db.query(`
      SELECT conversation_id, recording_url
      FROM conversations
      WHERE agent_id = $1 AND started_at < $2
    `, [agent.agent_id, cutoff]);

    for (const conv of expired) {
      // 3. Delete audio from MinIO if present
      if (conv.recording_url) {
        await this.minioService.deleteObject(conv.recording_url);
      }
      // 4. Delete conversation record (cascades to transcript, feedback, etc.)
      await this.db.query(
        'DELETE FROM conversations WHERE conversation_id = $1',
        [conv.conversation_id]
      );
    }

    this.logger.log(
      `Retention purge: agent=${agent.agent_id} deleted=${expired.length} conversations`
    );
  }
}
```

**Purge scope per deleted conversation:**
- `conversations` row (and all FK-cascaded child rows)
- MinIO recording audio file (if `store_call_audio` was true)
- TimescaleDB MIS aggregations (if conversation data fed into them — leave aggregates, delete raw)
- Qdrant vectors if the conversation generated any KB embeddings from call content

**Log to `audit_log`:** Every purge batch must generate an audit log entry: `{action: 'retention_purge', agent_id, count, cutoff_date, purged_at}`

---

#### Audio Format Auto-Selection for SIP Agents

When an agent has a SIP trunk assigned (via Phone Numbers), the platform must auto-set the correct audio format without requiring manual configuration.

```typescript
// AgentsModule — called when a SIP trunk is assigned to an agent
async onSipTrunkAssigned(agent_id: string, trunk_id: string) {
  // SIP/PSTN audio is always μ-law 8000 Hz
  await this.db.query(`
    UPDATE agent_configs
    SET user_input_audio_format = 'ulaw_8000'
    WHERE agent_id = $1
  `, [agent_id]);

  // Emit WebSocket event so UI shows "Auto-configured for SIP" badge
  this.wsGateway.emit(agent_id, {
    type: 'config_auto_updated',
    field: 'user_input_audio_format',
    value: 'ulaw_8000',
    reason: 'SIP trunk assigned — μ-law 8000 Hz required for SIP/PSTN'
  });
}

// Similarly: when SIP trunk is removed, revert to WebRTC default
async onSipTrunkRemoved(agent_id: string) {
  await this.db.query(`
    UPDATE agent_configs
    SET user_input_audio_format = 'pcm_16000'
    WHERE agent_id = $1
  `, [agent_id]);
}
```

---

#### PII Redaction Service (TRUSTNOW EXCEED ELEVENLABS — CO-BROWSING §4.7 extension)

ElevenLabs has no PII redaction. TRUSTNOW adds it as a BPO compliance feature.

```typescript
// PII Redaction runs post-call on the transcript, before it is stored in PostgreSQL
// Triggered when: agent_configs.pii_redaction_enabled = true AND call ends

// PII patterns to redact (UK/US/AU/IN coverage for BPO markets):
const PII_PATTERNS = [
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, label: '[CARD_NUMBER]' },
  { pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, label: '[SSN]' },                    // US SSN
  { pattern: /\b[A-Z]{2}\d{6}[A-Z]\b/gi, label: '[NI_NUMBER]' },                    // UK NI
  { pattern: /\b0[17]\d{9}\b/g, label: '[PHONE_NUMBER]' },                           // UK mobile
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, label: '[EMAIL]' },
  { pattern: /\b(0[1-9]|[12]\d|3[01])[\/\-](0[1-9]|1[012])[\/\-](19|20)\d{2}\b/g, label: '[DOB]' },
  { pattern: /\b\d{4,}\b(?=.*account)/gi, label: '[ACCOUNT_NUMBER]' },               // contextual
  { pattern: /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, label: '[POSTCODE]' },  // UK postcode
];

async redactPii(transcript_json: TranscriptJson): Promise<TranscriptJson> {
  return transcript_json.map(turn => ({
    ...turn,
    text: PII_PATTERNS.reduce(
      (text, {pattern, label}) => text.replace(pattern, label),
      turn.text
    )
  }));
}
```

**PII redaction scope:** Applied to `transcript_json` BEFORE writing to `conversations` table. The raw (unredacted) transcript is never persisted to disk when `pii_redaction_enabled = true`. Audio recordings are separate — if both `pii_redaction_enabled` AND `store_call_audio = false`, no data containing PII is retained.

**DTO addition for `UpdateAgentConfigDto`:**
```typescript
pii_redaction_enabled?: boolean;             // Tab 10 Privacy — TRUSTNOW BPO extension
soft_timeout_message?: string;               // filler message during LLM wait
soft_timeout_message_localized?: Record<string, string>;  // per-language
```

---

### 6.2I — SecurityModule Endpoint Contracts (CO-BROWSING §5)

#### `POST /api/auth/session-token`

**Module:** SecurityModule / AuthModule  
**Purpose:** The widget JWT session token endpoint. When `authentication_enabled = true` on an agent, the `<trustnow-agent>` Web Component cannot connect directly. Instead, the caller's session must be validated by the **client's backend**, which calls TRUSTNOW to obtain a short-lived signed JWT, then passes it to the widget.

**Full flow (confirmed live §5.1):**
```
1. Caller loads client website → <trustnow-agent agent-id="X"> renders
2. Widget JS detects authentication_enabled = true
3. Widget JS calls: Client's backend → POST /trustnow-proxy/session (client-defined endpoint)
4. Client backend authenticates the caller (their own login/session)
5. Client backend calls: POST https://api.trustnow.ai/api/auth/session-token
6. TRUSTNOW signs and returns: { token, expires_at }
7. Client backend returns token to widget JS
8. Widget JS presents token in WebSocket handshake header: Authorization: Bearer <token>
9. TRUSTNOW WebSocket gateway validates token → accepts connection
```

```typescript
// POST /api/auth/session-token
// Called by client's BACKEND only — not from browser directly (would expose API key)
// Authenticated by: API key (x-api-key header) OR tenant JWT

export class CreateSessionTokenDto {
  agent_id: string;              // which agent this session is for
  user_id?: string;              // caller's user identifier (passed through to conversation record)
  user_metadata?: Record<string, string>;  // arbitrary caller context (name, account, etc.)
                                           // injected into agent's dynamic variables
  ttl_seconds?: number;          // token lifetime, default 300 (5 mins), max 3600
}

// Response 200
{
  token: string,          // signed JWT (RS256 or HS256 using agent's jwt_config)
  expires_at: string,     // ISO timestamp
  agent_id: string
}

// Response 401 — invalid API key
// Response 403 — agent not found or not owned by this tenant
// Response 422 — authentication_enabled is false for this agent (token not needed)
```

**JWT payload:**
```json
{
  "sub": "{user_id}",
  "agent_id": "{agent_id}",
  "tenant_id": "{tenant_id}",
  "metadata": { "name": "John Smith", "account": "ACC123" },
  "iat": 1712000000,
  "exp": 1712000300
}
```

**Security:** Token is single-use — once consumed by a WebSocket connection, it cannot be reused. Enforced via Redis: `SETNX session_token:{token_hash} 1 EX {ttl}`. Second use returns 401.

---

#### `PUT /agents/:id/security` (Security tab save)

**Module:** SecurityModule  
**Purpose:** Save all Security tab configuration fields in a single call.

```typescript
export class UpdateAgentSecurityDto {
  // Authentication
  authentication_enabled?: boolean;

  // Guardrails (card-based — §5.2)
  guardrails_focus_enabled?: boolean;
  guardrails_manipulation_enabled?: boolean;
  guardrails_prompt_injection?: boolean;        // sub-toggle within Manipulation drawer
  guardrails_content_enabled?: boolean;
  guardrails_custom_prompt?: string;            // Custom card — free text guardrail

  // Allowlist (§5.3)
  allowed_hosts?: string[];                     // domains that may connect to this agent

  // Overrides (§5.4)
  allowed_overrides?: Array<
    'first_message' | 'system_prompt' | 'llm' | 'voice' |
    'voice_speed' | 'voice_stability' | 'voice_similarity' | 'text_only'
  >;

  // Webhooks (§5.5)
  conversation_initiation_webhook_enabled?: boolean;
  conversation_initiation_webhook_url?: string;
  post_call_webhook_url?: string;
  post_call_webhook_secret?: string;            // HMAC secret for payload signing
}

// Logic: UPSERT auth_policies on conflict (agent_id). Also UPDATE agent_configs
// for the guardrails fields (guardrails live on agent_configs not auth_policies).
// Return: { updated_at: string }
```

**Field distribution — Security tab fields live on two tables:**

| Field | Table |
|-------|-------|
| `authentication_enabled` | `auth_policies` |
| `allowed_hosts` | `auth_policies` |
| `allowed_overrides` | `auth_policies` |
| `conversation_initiation_webhook_url` | `auth_policies` |
| `post_call_webhook_url` | `auth_policies` |
| `post_call_webhook_secret` | `auth_policies` |
| `guardrails_*` | `agent_configs` |

The `PUT /agents/:id/security` endpoint must write to both tables transactionally.

---

#### `POST /agents/:id/webhooks/post-call` (Create Webhook helper — "Create Webhook" button)

**Module:** WebhooksModule  
**Purpose:** When the user clicks `Create Webhook` on the Post-call Webhook section, this opens a guided webhook configuration dialog (test connection + save). This endpoint tests and registers the webhook.

```typescript
// POST /agents/:id/webhooks/post-call
export class CreatePostCallWebhookDto {
  url: string;              // Webhook URL (must be HTTPS)
  secret?: string;          // Optional HMAC secret — if provided, payloads are signed
  test?: boolean;           // When true: send a test POST to the URL, do not save
}

// Logic when test=true:
// 1. Send a test payload to dto.url with a synthetic conversation summary
// 2. Return: { success: boolean, http_status: number, response_time_ms: number }

// Logic when test=false (save):
// 1. Validate URL is reachable (optional pre-check)
// 2. UPSERT auth_policies: post_call_webhook_url = dto.url, post_call_webhook_secret = dto.secret
// 3. Return: { saved: true, url: dto.url }
```

**Test payload (same structure as live post-call payload):**
```json
{
  "type": "post_call_webhook_test",
  "agent_id": "{agent_id}",
  "conversation_id": "test_conv_000",
  "duration_s": 0,
  "call_successful": true,
  "transcript": [],
  "timestamp": "{ISO now}"
}
```

---

#### `DELETE /agents/:id/webhooks/post-call`

```typescript
// Removes post_call_webhook_url and post_call_webhook_secret from auth_policies
// Response 200: { deleted: true }
```

---

**EXCEED ELEVENLABS — Security tab additions:**

ElevenLabs security is basic (JWT + allowlist + guardrails). TRUSTNOW BPO clients need significantly stronger security controls:

1. **Webhook signature verification UI:** When `post_call_webhook_secret` is set, show a code snippet in the UI showing exactly how to verify the `X-TRUSTNOW-Signature` header in the client's webhook receiver. Copy-paste ready. ElevenLabs documents this in docs only — TRUSTNOW surfaces it inline.

2. **Allowlist validation state:** For each host in the allowlist, show a live "reachable" indicator (green dot = TRUSTNOW can reach the host, red = unreachable). Helps diagnose misconfigurations before they affect live callers.

3. **Guardrail activity log:** Show a count badge on each guardrail card: "Triggered 12 times (last 7 days)". Clicking opens a filtered conversation list showing only conversations where that guardrail fired. Maps to `guardrail_triggered` client event stored in conversations table.

4. **Override audit trail:** When a client uses an override (e.g., passes `text_only=true` at embed time), log which overrides were actually applied to each conversation. Visible in the conversation detail Metadata panel. BPO compliance teams need to know if callers were put into text-only mode and why.

---

### 6.2J — ToolsModule Endpoint Contracts (CO-BROWSING §6)

#### Tools CRUD

```typescript
// POST /tools — create a new tool (Webhook or Client)
export class CreateToolDto {
  agent_id: string;                            // which agent this tool belongs to
  name: string;                                // required, max 100 chars
  description: string;                         // required — passed to LLM
  type: 'webhook' | 'client' | 'integration';

  // Webhook-only fields
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;                                // supports {{env.VAR}} interpolation
  auth_connection_id?: string;
  headers?: Record<string, string>;
  response_timeout_s?: number;                 // default 20

  // Client-only fields
  wait_for_response?: boolean;                 // default false

  // All types
  disable_interruptions?: boolean;             // default false
  pre_tool_speech?: 'auto' | 'force';          // default 'auto'
  execution_mode?: string;                     // default 'immediate'
  tool_call_sound?: string;                    // default null
  input_schema?: object;                       // JSON Schema for parameters
  dynamic_variable_assignments?: object;
  response_mocks?: object[];
}

// Response 201: { tool_id, agent_id, name, type, created_at }
// Side effect: appends tool_id to agent_configs.tools_config_json.attached_tool_ids

// GET /tools?agent_id=:id — list all tools for an agent
// Response 200: Tool[]

// PUT /tools/:id — update a tool (all CreateToolDto fields optional)
// Response 200: { tool_id, updated_at }

// DELETE /tools/:id — delete a tool
// Side effect: removes tool_id from agent_configs.tools_config_json.attached_tool_ids
// Response 200: { deleted: true }
```

#### `PUT /agents/:id/tools/system` — System Tool Toggles

**Purpose:** Toggle individual system tools on/off. Updates `agent_configs.tools_config_json.system_tools`.

```typescript
export class UpdateSystemToolsDto {
  // All optional — only provided keys are updated (PATCH semantics)
  end_conversation?: boolean;
  detect_language?: boolean;
  skip_turn?: boolean;
  transfer_to_agent?: boolean;
  transfer_to_number?: boolean;
  play_keypad_touch_tone?: boolean;
  voicemail_detection?: boolean;
}

// Logic:
// 1. Load current tools_config_json.system_tools
// 2. Merge provided fields
// 3. UPDATE agent_configs SET tools_config_json = jsonb_set(...) WHERE agent_id = :id
// 4. Return updated system_tools object + active_count

// Response 200
{
  system_tools: Record<string, boolean>,
  active_count: number   // count of true values — drives the "N active tools" badge in UI
}
```

#### MCP Server CRUD

```typescript
// POST /mcp-servers — create a custom MCP server
export class CreateMcpServerDto {
  agent_id?: string;           // null = workspace-level server (shared across agents)
  name: string;
  description?: string;
  server_type: 'sse' | 'streamable_http';
  server_url: string;          // supports {{env.VAR}} interpolation
  auth_connection_id?: string;
  headers?: Record<string, string>;
  // Note: terms_accepted handled separately by POST /mcp-servers/accept-terms
}

// Response 201: { mcp_server_id, name, server_type, created_at }

// GET /mcp-servers?agent_id=:id — list MCP servers available to this agent
// Returns: workspace-level servers (agent_id IS NULL) + agent-specific servers

// DELETE /mcp-servers/:id
// Response 200: { deleted: true }
```

#### `POST /mcp-servers/accept-terms` — MCP Terms Acceptance

**Purpose:** Records workspace-level MCP terms acceptance (shown once per workspace).

```typescript
// POST /mcp-servers/accept-terms
// No body needed — user accepting is the authenticated user

// Logic:
// 1. UPDATE tenants SET settings_json = jsonb_set(settings_json, '{mcp_terms_accepted}', 'true')
//                      WHERE tenant_id = context.tenant_id
// 2. Also set mcp_terms_accepted_at = now(), mcp_terms_accepted_by = context.user_id
// 3. Return confirmation

// Response 200: { accepted: true, accepted_at: string }
// Response 409: { error: "Terms already accepted by this workspace" }
```

**Frontend gate:** Before showing the MCP "Add server" flow, the frontend calls `GET /tenants/me` (or checks workspace settings) to see if `settings_json.mcp_terms_accepted = true`. If false → show terms modal. Once accepted → never show again.

---

**EXCEED ELEVENLABS — Tools tab additions:**

ElevenLabs tools are agent-scoped only. TRUSTNOW must add:

1. **Workspace tool library:** Tools created for Agent A can be copied/reused in Agent B. Route: `GET /tools?scope=workspace` — shows all tools across all agents in the tenant. Agent admins can "clone to this agent" from the workspace library. Critical for BPO clients who maintain a standardised CRM tool across all agents.

2. **Tool test runner (in-drawer):** A `Test` button inside the tool creation drawer sends a test HTTP request to the webhook URL with a sample payload, shows the response (status code + body + latency) without saving the tool. ElevenLabs requires saving before testing — TRUSTNOW tests before save. Route: `POST /tools/test` with the CreateToolDto payload + `{ test_payload: object }`.

3. **Tool version history:** Track changes to tool configuration (URL, method, parameters) per tool, per agent. Show "Last modified by {user} on {date}" in the tool list. Route: `GET /tools/:id/history`. Critical for BPO audit trails — a change to a CRM tool URL could silently break production.

4. **Partition-aware URL validation:** When the agent is on Partition B (on-prem), validate that webhook URLs resolve to private IP ranges only. Display a green ✓ badge ("Private endpoint") or red ✗ ("Public endpoint — not allowed on Partition B"). Prevents on-prem agents from accidentally calling external APIs.

---

### 6.2K — KnowledgeBaseModule Endpoint Contracts (CO-BROWSING §8)

**Architectural note (§8.2 confirmed live):** KB documents are workspace-level assets. `knowledge_base_docs` has `tenant_id` only. Agent attachment is via `agent_knowledge_base` junction table. This is a key architectural distinction from the earlier assumption that KB docs were agent-scoped.

---

#### `POST /kb/documents` — Create KB Document (3 types)

```typescript
export class CreateKbDocumentDto {
  // Required for all types
  name: string;
  type: 'url' | 'file' | 'text';

  // type='url' — web crawl
  source_url?: string;           // triggers async crawl job via BullMQ

  // type='file' — handled by multipart upload (separate POST /kb/documents/upload)
  // file is uploaded via POST /kb/documents/upload, returns a temp_file_id
  temp_file_id?: string;         // from the upload endpoint

  // type='text' — inline text
  content?: string;

  // Optional
  visibility?: 'private' | 'workspace' | 'public';  // default 'workspace'
}

// Response 201
{
  kb_doc_id: string,
  name: string,
  type: string,
  status: 'pending' | 'indexing',  // immediate status — indexing starts async
  created_at: string
}

// After creation: async RAG indexing pipeline fires:
//   text extraction → chunking → embedding → Qdrant upsert → status = 'ready'
// On failure: status = 'failed', error stored
// Real-time status pushed via WebSocket: { type: 'kb_indexing_update', kb_doc_id, status }
```

#### `POST /kb/documents/upload` — File Upload (pre-step for type='file')

```typescript
// Multipart POST — Content-Type: multipart/form-data
// Accepted: PDF, DOCX, TXT, CSV, MD
// Max size: 50MB per file

// Response 200
{
  temp_file_id: string,   // pass this to POST /kb/documents as temp_file_id
  filename: string,
  size_bytes: number,
  mime_type: string,
  expires_at: string      // temp files auto-deleted after 1 hour if not committed
}
```

#### `GET /kb/documents` — List Workspace KB Documents

```typescript
// GET /kb/documents?tenant_id=<from_context>&search=<query>&type=<filter>
// Returns all KB docs for this tenant, regardless of which agents use them
// Used by: "Add document" dropdown in Tab 4 (shows existing workspace docs for reuse)

// Response 200: { docs: KbDocument[], total: number }
// Each KbDocument includes: kb_doc_id, name, type, status, visibility,
//   created_by, created_at, last_indexed_at, dependent_agent_count
```

#### `GET /kb/documents/:id` — KB Document Detail

```typescript
// Response 200
{
  kb_doc_id: string,
  name: string,
  type: string,
  status: string,
  visibility: string,
  source_url?: string,
  chunk_count: number,
  last_indexed_at: string,
  created_by: string,
  // Dependent agents (§8.2 — confirmed live: shown in detail panel)
  dependent_agents: Array<{ agent_id: string, agent_name: string }>,
  dependent_branches: Array<{ agent_id: string, agent_name: string, branch_id: string, branch_name: string }>
}
```

#### `POST /agents/:id/kb/attach` — Attach KB Doc to Agent

```typescript
export class AttachKbDocDto {
  kb_doc_id: string;
  branch_id?: string;  // null = attach to all branches
}
// Inserts into agent_knowledge_base junction table
// Response 200: { attached: true, kb_doc_id, agent_id }
```

#### `DELETE /agents/:id/kb/:kb_doc_id` — Detach KB Doc from Agent

```typescript
// Removes from agent_knowledge_base junction table
// Does NOT delete the kb_doc (it may be used by other agents)
// Response 200: { detached: true }
```

#### `PUT /agents/:id/kb/rag-config` — Save RAG Configuration

```typescript
export class UpdateRagConfigDto {
  rag_enabled?: boolean;
  rag_embedding_model?: 'english' | 'multilingual';
  rag_character_limit?: number;
  rag_chunk_limit?: number;
  rag_vector_distance_limit?: number;
  rag_num_candidates_enabled?: boolean;
  rag_num_candidates_value?: number;
  rag_query_rewrite_enabled?: boolean;
  rag_query_rewrite_prompt?: string;
}
// Updates agent_configs RAG fields for this agent
// Response 200: { updated_at: string }
```

#### `POST /kb/documents/:id/reindex` — Trigger Re-indexing

```typescript
// Re-runs the RAG indexing pipeline for this KB doc
// Used by "Re-index" action in KB item overflow menu
// Response 202: { job_id: string, status: 'queued' }
```

---

**EXCEED ELEVENLABS — KB tab additions:**

1. **Dependent agents warning on KB edit:** When a KB document is modified (re-indexed, renamed, deleted), the platform warns: "This KB document is used by N agents: [agent list]. Modifying it will affect all of them." ElevenLabs shows dependent agents in the detail panel but has no action guard. TRUSTNOW blocks deletion if `dependent_agent_count > 0` unless the user confirms.

2. **KB version snapshots:** When a KB doc is re-indexed, the previous version is snapped to a `kb_doc_versions` table. Agent admins can roll back to a previous KB version. Critical for BPO compliance: "What was the agent's KB saying on the date of this call?"

3. **KB analytics:** Per-KB document: "Retrieved in N% of conversations this week" — from `agent_response_metadata` client events that include KB retrieval data. Shows which KB docs are actually being used in answers vs which are never retrieved.

4. **Scheduled re-index:** For type='url' KB docs, allow setting a re-crawl schedule (daily/weekly). ElevenLabs requires manual re-indexing. TRUSTNOW automates it for clients whose knowledge base changes frequently.

---

### 6.2L — AnalysisModule Endpoint Contracts (CO-BROWSING §9)

#### Evaluation Criteria CRUD

```typescript
// POST /agents/:id/criteria — add a new evaluation criterion
export class CreateCriterionDto {
  name: string;          // e.g. "Did the agent collect the caller's name?"
  description?: string;
  llm_prompt: string;    // e.g. "Given this transcript, did the agent collect the caller's full name? Answer YES or NO only."
}
// Response 201: { criteria_id, name, created_at }

// GET /agents/:id/criteria — list all criteria for this agent
// Response 200: Criterion[]

// PUT /agents/:id/criteria/:criteria_id — update a criterion
// DELETE /agents/:id/criteria/:criteria_id — delete a criterion
// Response 200: { deleted: true }
// Side effect: future conversations won't be evaluated against deleted criteria
// Historic conversations retain their criteria_results (not retroactively re-evaluated)
```

#### Data Collection Specs CRUD

```typescript
// POST /agents/:id/data-specs — add a data extraction spec
export class CreateDataSpecDto {
  field_name: string;       // e.g. "customer_intent"
  field_type?: 'string' | 'boolean' | 'number';  // default 'string'
  extraction_prompt: string; // e.g. "Extract the customer's primary reason for calling"
  is_required?: boolean;     // default false
}
// Response 201: { spec_id, field_name, created_at }

// GET /agents/:id/data-specs
// PUT /agents/:id/data-specs/:spec_id
// DELETE /agents/:id/data-specs/:spec_id
```

#### Analysis Language

```typescript
// PUT /agents/:id/analysis-language
export class UpdateAnalysisLanguageDto {
  analysis_language: string;  // 'auto' or language code e.g. 'en', 'hi'
}
// Updates agents.analysis_language
// Response 200: { analysis_language }
```

#### Conversations (Analysis Tab + Global Monitor — CO-BROWSING §9 + §15)

```typescript
// GET /conversations — workspace-level global conversation history (§15)
// GET /conversations?agent_id=:id — agent-scoped (§9 Analysis tab)
//
// ALL QUERY FILTERS (confirmed live — 12 global + 1 agent-scoped):
// ?agent_id=       UUID   — filter by specific agent (§15 "Agent" chip — NOT on Analysis tab)
// ?branch_id=      UUID   — filter by branch (Analysis tab pre-applies this)
// ?date_after=     ISO    — conversations starting after this datetime
// ?date_before=    ISO    — conversations starting before this datetime
// ?call_status=    'successful'|'failed'
// ?criteria=       criteria_id — filter by evaluation criteria result
// ?data=           field_name:value — filter by data collection value
// ?duration_min=   number — minimum duration in seconds
// ?duration_max=   number — maximum duration in seconds
// ?rating_min=     number — minimum CSAT rating (1-5)
// ?rating_max=     number — maximum CSAT rating (1-5)
// ?has_comments=   boolean — has QM annotations
// ?tools_used=     tool_id — filter conversations where this tool was invoked
// ?language=       language code — detected conversation language
// ?user_id=        string — caller user ID
// ?channel=        'widget'|'phone'|'whatsapp'
// ?search=         string — full-text search on transcript
// ?sort=           'date_asc'|'date_desc' (default: date_desc)
// ?page=           number (default: 1)
// ?limit=          number (default: 20, max: 100)
//
// Response 200:
{
  conversations: Array<{
    conversation_id: string,
    agent_id: string,
    agent_name: string,           // joined — shown in global view Agent column
    branch_id: string | null,
    branch_name: string | null,   // joined — shown as branch badge
    channel: string,
    started_at: string,
    duration_s: number,
    turn_count: number,
    call_successful: boolean | null,
    environment: string
  }>,
  total: number,
  page: number,
  limit: number,
  has_more: boolean               // for infinite scroll "Loading..." pattern
}

// GET /conversations/:id — full detail (same for both views)
// Returns: all conversations fields + ai_summary + evaluation_results +
//          data_collection_results + client_data + applied_overrides

// GET /conversations/:id/turns — per-turn latency data (Transcription sub-tab)
// Returns: conversation_turns[] sorted by turn_index

// GET /conversations/:id/share-link — generate shareable link (§15.4 ↗ icon)
// Returns: { share_url: string, expires_at: string | null }
// share_url format: https://app.trustnow.ai/conversations/{conversation_id}?token={share_token}
// share_token: short-lived signed JWT (24h TTL) allowing unauthenticated read of this conversation
// Used by supervisors sharing specific conversations with clients or QA teams
```

**Column settings (TT icon — §15.2):** The `TT` icon top-right of the search bar opens a column visibility toggle panel. Columns that can be shown/hidden: Agent | Branch | Duration | Messages | Status | Channel | Cost | Language. Per-user preference, stored in `user_preferences` JSONB on `users` table. No backend endpoint needed — frontend localStorage is acceptable for column preferences.

---

#### Post-Call Background Job Pipeline (§9.3–§9.4)

All three post-call analysis jobs run **asynchronously** after `how_call_ended` is set. They are BullMQ jobs queued when the session ends.

```typescript
// Job 1: AI Summary Generation (§9.3.1)
// Queue: 'post-call-summary'
async function generateAiSummary(conversation_id: string) {
  const turns = await db.query(
    'SELECT speaker, text FROM conversation_turns WHERE conversation_id = $1 ORDER BY turn_index',
    [conversation_id]
  );
  const transcript = turns.map(t => `${t.speaker}: ${t.text}`).join('\n');
  const summary = await llm.complete({
    model: 'claude-haiku',   // cheap + fast — summary doesn't need Sonnet
    prompt: `Summarise this customer service conversation in 2-3 sentences. Be neutral and factual.\n\n${transcript}`,
    max_tokens: 300
  });
  await db.query(
    'UPDATE conversations SET ai_summary = $1 WHERE conversation_id = $2',
    [summary, conversation_id]
  );
}

// Job 2: Evaluation Criteria Scoring (§9.4)
// Queue: 'post-call-criteria'
async function evaluateCriteria(conversation_id: string, agent_id: string) {
  const [criteria, transcript] = await Promise.all([
    db.query('SELECT * FROM evaluation_criteria WHERE agent_id = $1', [agent_id]),
    db.query('SELECT transcript_json FROM conversations WHERE conversation_id = $1', [conversation_id])
  ]);
  if (!criteria.length) return;  // no criteria configured — skip

  const results: Record<string, boolean> = {};
  for (const criterion of criteria) {
    const response = await llm.complete({
      model: 'claude-haiku',
      prompt: `${criterion.llm_prompt}\n\nTranscript:\n${JSON.stringify(transcript.transcript_json)}\n\nAnswer YES or NO only.`,
      max_tokens: 5
    });
    results[criterion.criteria_id] = response.trim().toUpperCase() === 'YES';
  }
  const all_pass = Object.values(results).every(v => v === true);
  await db.query(
    'UPDATE conversations SET evaluation_results = $1, call_successful = $2 WHERE conversation_id = $3',
    [results, all_pass, conversation_id]
  );
}

// Job 3: Data Extraction (§9.4)
// Queue: 'post-call-data-extraction'
async function extractDataPoints(conversation_id: string, agent_id: string) {
  const [specs, transcript] = await Promise.all([
    db.query('SELECT * FROM data_collection_specs WHERE agent_id = $1', [agent_id]),
    db.query('SELECT transcript_json FROM conversations WHERE conversation_id = $1', [conversation_id])
  ]);
  if (!specs.length) return;

  const extracted: Record<string, unknown> = {};
  for (const spec of specs) {
    const response = await llm.complete({
      model: 'claude-haiku',
      prompt: `${spec.extraction_prompt}\n\nTranscript:\n${JSON.stringify(transcript.transcript_json)}\n\nExtract the value only. If not found, return "NOT_FOUND".`,
      max_tokens: 100
    });
    extracted[spec.field_name] = response.trim() === 'NOT_FOUND' ? null : response.trim();
  }
  await db.query(
    'UPDATE conversations SET data_collection_results = $1 WHERE conversation_id = $2',
    [extracted, conversation_id]
  );
}
```

**EXCEED ELEVENLABS — Analysis tab additions:**

1. **QM Supervisor Review Workflow:** ElevenLabs has evaluation criteria (pass/fail) but no supervisor workflow. TRUSTNOW adds: when `call_successful = false`, flag conversation for supervisor review. Supervisor sees a "Needs Review" badge in the conversation list. Supervisor can add a manual QM score (1-5), annotate turns with the bell icon 🔔, and mark as "Reviewed". Maps to new `qm_reviews` table: `(review_id, conversation_id, supervisor_id, score, notes, reviewed_at)`.

2. **Agent coaching flags:** When a conversation fails evaluation criteria, the system auto-generates a coaching note for the agent: "In this conversation, [criterion X] was not met. Consider [recommendation]." BPO supervisors can then share the coaching note with the agent team. ElevenLabs has no coaching workflow at all.

3. **Cost trending charts:** Alongside per-call cost (credits + USD), show a weekly cost trend sparkline in the Analysis tab header — "This week: $X.XX (+N% vs last week)". BPO operations teams manage per-agent cost budgets and need this at-a-glance.

4. **Batch re-evaluation:** When evaluation criteria are added or changed, TRUSTNOW allows retroactive re-evaluation of past conversations. "Re-evaluate last 100 conversations" button — queues 100 `post-call-criteria` jobs. ElevenLabs has no retroactive re-evaluation.

---

### 6.2M — PhoneNumbersModule Endpoint Contracts (CO-BROWSING §10)

**Module context:** The Phone Numbers sidebar (Deploy → Phone Numbers) manages SIP trunk assignments. FreeSWITCH (Task 7) handles the actual SIP signalling — this module only manages the configuration database and the TRUSTNOW SIP endpoint details.

**TRUSTNOW SIP endpoint (equivalent of ElevenLabs `sip.rtc.elevenlabs.io`):**
```
sip:sip.rtc.trustnow.ai:5060;transport=tcp   (standard)
sip:sip.rtc.trustnow.ai:5061;transport=tls   (encrypted — recommended)
```
Full call URI: `sip:+19991234567@sip.rtc.trustnow.ai:5060`

---

#### `GET /phone-numbers` — List all phone numbers for tenant

```typescript
// Response 200
{
  phone_numbers: Array<{
    phone_number_id: string,
    label: string,
    phone_number: string,        // E.164
    agent_id: string | null,
    agent_name: string | null,   // joined from agents table
    status: 'active' | 'paused' | 'archived',
    sip_transport: 'tcp' | 'tls',
    media_encryption: 'disabled' | 'allowed' | 'required'
  }>
}
```

#### `POST /phone-numbers` — Import a phone number from SIP trunk (8-step wizard submit)

```typescript
export class CreatePhoneNumberDto {
  // Step 2 — Basic config
  label: string;
  phone_number: string;           // E.164 — validated with regex /^\+[1-9]\d{6,14}$/

  // Step 3 — Inbound transport + encryption
  sip_transport: 'tcp' | 'tls';                           // default 'tls'
  media_encryption: 'disabled' | 'allowed' | 'required';  // default 'required'

  // Step 4 — Outbound settings
  outbound_address?: string;        // SIP provider hostname — no sip: prefix
  outbound_transport?: 'tcp' | 'tls';
  outbound_encryption?: 'disabled' | 'allowed' | 'required';

  // Step 5 — Custom SIP headers
  custom_sip_headers?: Array<{ name: string; value: string }>;

  // Step 6 — Authentication (mutual exclusive: digest OR ACL)
  sip_username?: string;            // Digest auth — if provided, sip_password required
  sip_password?: string;            // Stored encrypted; never returned in GET responses

  // Post-wizard — agent assignment (can be set later)
  agent_id?: string;
}

// Logic:
// 1. Validate phone_number is valid E.164
// 2. Validate unique within tenant
// 3. Encrypt sip_password using Vault KV secret (path: trustnow/{tenant_id}/sip/{phone_number_id})
// 4. Insert phone_numbers row
// 5. If agent_id provided: verify agent belongs to tenant
// 6. Trigger FreeSWITCH dialplan reload via ESL: `api reloadxml` (adds new DID route)
// Response 201: { phone_number_id, phone_number, label, status: 'active' }
```

#### `PUT /phone-numbers/:id` — Update phone number config

```typescript
// Same fields as CreatePhoneNumberDto — all optional (partial update)
// On sip_password change: re-encrypt and update Vault secret
// On agent_id change: reload FreeSWITCH dialplan
// Response 200: { updated_at }
```

#### `PUT /phone-numbers/:id/assign` — Assign agent to number

```typescript
export class AssignAgentDto {
  agent_id: string | null;   // null = unassign
}
// Updates phone_numbers.agent_id
// Triggers FreeSWITCH dialplan reload: routes calls to this DID to the assigned agent
// Triggers agent_configs audio format auto-set to ulaw_8000 (§6.2H)
// Response 200: { agent_id, agent_name }
```

#### `DELETE /phone-numbers/:id` — Remove phone number

```typescript
// Soft-delete: SET status = 'archived' (not hard delete — audit trail)
// Removes DID from FreeSWITCH dialplan via ESL reload
// Response 200: { archived: true }
```

#### `GET /phone-numbers/sip-endpoint` — Return TRUSTNOW SIP endpoint details for display in UI

```typescript
// No auth required beyond tenant membership
// Returns the SIP endpoint details shown in the Phone Numbers setup guide

// Response 200
{
  sip_endpoint: {
    standard: 'sip:sip.rtc.trustnow.ai:5060;transport=tcp',
    tls: 'sip:sip.rtc.trustnow.ai:5061;transport=tls',
    static_ip: {                         // Enterprise only — check tenant.plan_tier
      us: 'sip-static.rtc.trustnow.ai',
      eu: 'sip-static.rtc.eu.trustnow.ai',
      in: 'sip-static.rtc.in.trustnow.ai'
    }
  },
  supported_codecs: ['G711/8kHz (PCMU)', 'G722/16kHz'],
  transport_protocols: ['TCP', 'TLS'],
  udp_supported: false,
  rtp_port_range: '10000-60000',
  tls_minimum: 'TLS 1.2'
}
```

---

**EXCEED ELEVENLABS — Phone Numbers additions:**

ElevenLabs provides one shared SIP endpoint globally. TRUSTNOW must exceed this for BPO:

1. **Geographic SIP endpoints:** Three regional SIP endpoints — US (`sip.rtc.trustnow.ai`), EU (`sip.rtc.eu.trustnow.ai`), India (`sip.rtc.in.trustnow.ai`). BPO clients route UK/EU calls to the EU endpoint for GDPR data residency. India endpoint serves Exotel and Tata/BSNL SIP trunks.

2. **SIP trunk test call:** A `Test connection` button in the Phone Numbers setup wizard sends a test SIP INVITE to the configured outbound address and reports: 200 OK (success), 503 (unreachable), or timeout. ElevenLabs requires placing a real call to verify — TRUSTNOW tests before going live.

3. **Call routing rules per number:** Beyond "one number → one agent", TRUSTNOW supports routing rules per DID: time-of-day routing (business hours → Agent A, after-hours → Agent B), DNIS-based routing, caller ID-based routing (VIP callers → priority queue). These are BPO-standard requirements.

4. **Concurrent call capacity indicator:** Each phone number row shows current concurrent call count and a capacity meter. When approaching FreeSWITCH channel limit, show amber warning: "Approaching capacity — N/M concurrent calls". Critical for BPO operations teams managing SLA.

---

### 6.2N — BatchCallModule Endpoint Contracts (CO-BROWSING §11)

---

#### `GET /batch-calls` — List batch calls for tenant

```typescript
// Response 200
{
  batch_calls: Array<{
    batch_call_id: string,
    name: string,
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed',
    total_recipients: number,
    calls_completed: number,
    calls_failed: number,
    calls_pending: number,
    scheduled_at: string | null,
    started_at: string | null,
    created_at: string
  }>
}
```

#### `POST /batch-calls` — Create a batch call

```typescript
export class CreateBatchCallDto {
  name?: string;                  // default 'Untitled Batch'
  agent_id: string;
  phone_number_id: string;        // must belong to this tenant
  ringing_timeout_s?: number;     // default 60
  concurrency_limit?: number;     // null = auto
  scheduled_at?: string;          // ISO datetime — null = run immediately
  timezone?: string;              // e.g. 'Asia/Calcutta'
  compliance_acknowledged: boolean;  // MUST be true — blocked otherwise
  // recipients supplied via multipart form-data: recipients_file (CSV/XLS)
}

// Logic:
// 1. Validate compliance_acknowledged === true — HTTP 422 if false
// 2. Validate agent_id + phone_number_id belong to tenant
// 3. Parse CSV/XLS file:
//    a. Validate 'phone_number' column exists — HTTP 422 if missing
//    b. Extract special columns: language, first_message, system_prompt, voice_id → overrides JSONB
//    c. Remaining columns → dynamic_variables JSONB
//    d. Validate all phone_numbers are E.164 format
//    e. Deduplicate phone numbers within batch
// 4. Calculate effective concurrency:
//    if concurrency_limit IS NULL:
//      effective = MIN(workspace_concurrency_limit × 0.5, agent_concurrency_limit × 0.7)
//    else:
//      effective = concurrency_limit
// 5. Insert batch_calls row + bulk insert batch_call_recipients
// 6. If scheduled_at is null: enqueue BatchCallWorker job immediately
//    If scheduled_at is set: schedule job via BullMQ delayed queue
// Response 201: { batch_call_id, name, status: 'pending', total_recipients }
```

#### `GET /batch-calls/:id` — Batch call detail + progress

```typescript
// Response 200: full batch_calls row + progress percentages
{
  batch_call_id: string,
  name: string,
  status: string,
  agent_id: string,
  agent_name: string,
  phone_number: string,
  total_recipients: number,
  calls_completed: number,
  calls_failed: number,
  calls_pending: number,
  progress_pct: number,          // (completed + failed) / total × 100
  scheduled_at: string | null,
  started_at: string | null,
  completed_at: string | null,
  concurrency_limit: number | null,
  effective_concurrency: number  // resolved auto value
}
```

#### `GET /batch-calls/:id/recipients` — List recipients with call status

```typescript
// Supports pagination: ?page=1&limit=100
// Response 200: { recipients: BatchCallRecipient[], total, page, limit }
// Each recipient: phone_number, dynamic_variables, overrides, status, conversation_id
// conversation_id allows linking to full conversation detail (Analysis tab)
```

#### `POST /batch-calls/:id/cancel` — Cancel a pending or running batch

```typescript
// Only cancellable when status = 'pending' or 'running'
// Logic:
// 1. SET batch_calls.status = 'cancelled'
// 2. SET batch_call_recipients.status = 'cancelled' WHERE status = 'pending'
// 3. If running: signal BullMQ worker to stop after current call (graceful stop)
// 4. In-progress calls complete naturally — not dropped mid-call
// Response 200: { cancelled: true, calls_cancelled: number }
```

#### `POST /batch-calls/test-call` — Single test call before submitting batch

```typescript
export class TestCallDto {
  agent_id: string,
  phone_number_id: string,
  recipient_phone_number: string,  // E.164 — the test recipient's number
  dynamic_variables?: Record<string, string>  // optional — test with sample variables
}
// Initiates a single real outbound call to verify the setup before the full batch
// Response 202: { test_call_id: string }  — monitor via conversation record
```

---

#### BatchCallWorker (BullMQ Worker)

The core execution engine — runs as a separate NestJS worker process.

```typescript
// Queue: 'batch-calls'
// Each job processes ONE batch_call_id

@Processor('batch-calls')
class BatchCallWorker {
  async process(job: Job<{ batch_call_id: string }>) {
    const batch = await this.db.getBatchCall(job.data.batch_call_id);

    // Effective concurrency
    const limit = batch.concurrency_limit ??
      Math.min(
        workspace.concurrency_limit * 0.5,
        agent.concurrency_limit * 0.7
      );

    // Process recipients in waves of `limit` concurrent calls
    const pending = await this.db.getPendingRecipients(batch.batch_call_id);
    for (const chunk of chunks(pending, limit)) {
      await Promise.all(chunk.map(r => this.makeOutboundCall(batch, r)));
    }
  }

  async makeOutboundCall(batch, recipient) {
    // 1. Build call config: merge agent config + overrides from recipient
    // 2. Inject dynamic_variables into agent context
    // 3. Initiate SIP INVITE via FreeSWITCH ESL:
    //    originate {origination_uuid=X,sip_h_X-TRUSTNOW-BATCH=batch_id}
    //      sofia/gateway/trustnow_trunk/+15551234567
    //      &bridge(trustnow_agent)
    // 4. On answer: AI pipeline starts (STT → LLM → TTS) with dynamic_variables injected
    // 5. On hang-up: UPDATE batch_call_recipients SET status = 'completed', conversation_id = ...
    //               UPDATE batch_calls SET calls_completed += 1 (atomic counter)
    // 6. On no-answer/error: status = 'failed', calls_failed += 1
  }
}
```

---

**CSV Processing Pipeline (§11.8 confirmed):**

```typescript
// Steps executed synchronously before batch is committed:
// 1. Upload CSV to MinIO: batch-uploads/{tenant_id}/{batch_call_id}.csv
// 2. Parse with PapaParse (Node.js):
//    - Validate 'phone_number' column present
//    - Validate all phone_numbers match /^\+[1-9]\d{6,14}$/
//    - Extract special columns: language|first_message|system_prompt|voice_id → overrides
//    - All other columns → dynamic_variables
// 3. Deduplicate on phone_number within batch
// 4. Bulk INSERT batch_call_recipients (single transaction)
// 5. UPDATE batch_calls.total_recipients = row_count
```

---

**EXCEED ELEVENLABS — Batch Calling additions:**

ElevenLabs batch calling is basic: upload CSV → send. TRUSTNOW adds:

1. **DNC (Do Not Call) list enforcement:** Before queuing any recipient, check their phone number against a `dnc_numbers` table per tenant. Numbers on the DNC list are automatically excluded with status `dnc_excluded`. BPO compliance teams manage the DNC list (add numbers, bulk import from CSV, auto-expire after N days). ElevenLabs has no DNC checking.

2. **Calling hours enforcement:** Per-batch configuration of permitted calling hours by timezone (e.g., 9am–8pm Mon-Fri in recipient's timezone). Recipients scheduled outside permitted hours are queued to the next valid window. Maps to `batch_calls.allowed_hours_json`. TRAI/TCPA compliance requirement.

3. **Retry logic:** For `failed` (no answer) recipients, configure automatic retry: up to 3 attempts, minimum 2 hours between retries. `batch_call_recipients.retry_count INTEGER DEFAULT 0` + `next_retry_at TIMESTAMPTZ`. ElevenLabs marks no-answer as permanently failed.

4. **Per-batch cost estimate:** Before submitting, show: "Estimated cost: £X.XX (based on avg call duration of Xm Xs at £X.XX/min per call × N recipients)." Helps BPO clients budget campaigns before committing.

5. **Batch pause/resume:** `POST /batch-calls/:id/pause` stops sending new calls while in-progress calls finish. `POST /batch-calls/:id/resume` continues from where it stopped. Useful for mid-campaign compliance checks.

---

### 6.2O — WorkflowModule Endpoint Contracts (CO-BROWSING §12)

**Architecture note:** Workflow definitions are stored in `workflow_nodes` + `workflow_edges` tables, not in `agent_configs.workflow_definition_json` JSONB. The JSONB approach was abandoned — querying conditions, KB attachments per node, and validation all require relational structure.

---

#### `GET /agents/:id/workflow` — Load full workflow for canvas rendering

```typescript
// Response 200 — full workflow graph for the canvas
{
  nodes: Array<{
    node_id: string,
    node_type: 'start' | 'subagent' | 'say' | 'agent_transfer' | 'phone_transfer' | 'tool' | 'end',
    label: string,
    position_x: number,
    position_y: number,
    // Subagent fields
    conversation_goal?: string,
    override_prompt?: boolean,
    voice_id?: string | null,
    llm_model?: string | null,
    eagerness?: string | null,
    spelling_patience?: string | null,
    speculative_turn_enabled?: boolean | null,
    config?: object      // type-specific fields
  }>,
  edges: Array<{
    edge_id: string,
    source_node_id: string,
    target_node_id: string,
    condition_label: string,
    condition_type: 'unconditional' | 'llm_evaluated' | 'tool_output',
    priority: number
  }>,
  global_settings: {
    prevent_infinite_loops: boolean
  },
  validation_errors: Array<{
    node_id: string,
    message: string   // e.g. "Agent ID cannot be empty"
  }>
}
```

#### `PUT /agents/:id/workflow` — Save full workflow (complete replace)

```typescript
export class SaveWorkflowDto {
  nodes: CreateWorkflowNodeDto[];
  edges: CreateWorkflowEdgeDto[];
  global_settings?: {
    prevent_infinite_loops?: boolean;
  };
}

export class CreateWorkflowNodeDto {
  node_id?: string;         // omit for new nodes — backend generates UUID
  node_type: string;
  label?: string;
  position_x: number;
  position_y: number;
  // Subagent fields (all optional — null = use agent default)
  conversation_goal?: string;
  override_prompt?: boolean;
  voice_id?: string | null;
  llm_model?: string | null;
  eagerness?: string | null;
  spelling_patience?: string | null;
  speculative_turn_enabled?: boolean | null;
  config?: object;
}

export class CreateWorkflowEdgeDto {
  edge_id?: string;
  source_node_id: string;
  target_node_id: string;
  condition_label?: string;
  condition_type?: 'unconditional' | 'llm_evaluated' | 'tool_output';
  priority?: number;
}

// Logic:
// 1. DELETE all workflow_nodes + workflow_edges for agent_id + branch_id
// 2. INSERT new nodes (with new UUIDs for any without node_id)
// 3. INSERT new edges (resolving node_ids)
// 4. Run validation — check for: orphaned nodes, missing agent IDs on transfers, loops
// 5. Return { saved: true, validation_errors: [] }

// Response 200: { saved: true, validation_errors: [] }
// Response 422: { error: 'Workflow save failed', validation_errors: [...] }
```

**Auto-save behaviour:** The frontend debounces workflow saves by 2 seconds after the last canvas change. Does NOT require explicit "Save" click — behaves like a document editor.

#### `GET /agents/:id/workflow/templates` — List workflow templates

```typescript
// Returns the 4 pre-built templates (confirmed §12.3):
// 'qualification_flow' | 'authentication_flow' | 'enterprise_tier_escalation' | 'business_hours_router'
// Each template includes a full nodes + edges definition ready to load into canvas

// Response 200: { templates: WorkflowTemplate[] }
// Each: { template_id, name, description, icon, nodes, edges }
```

#### `POST /agents/:id/workflow/load-template` — Apply a template to the canvas

```typescript
export class LoadWorkflowTemplateDto {
  template_id: string;  // one of the 4 template IDs
}
// Replaces current workflow with template nodes/edges
// Response 200: same shape as GET /agents/:id/workflow
```

---

**Workflow Template Seed Data (Task 6 — required before UI build):**

Seed 4 workflow templates matching the ElevenLabs templates exactly (confirmed §12.3). Store in a `workflow_templates` table: `(template_id, name, description, icon, nodes_json, edges_json)`.

| Template | BPO Equivalent | Seed priority |
|----------|---------------|---------------|
| Qualification Flow | Standard inbound routing (qualify → skill route) | P0 |
| Authentication Flow | Caller verification before sensitive actions | P0 |
| Enterprise Tier Escalation | Tiered SLA routing (enterprise vs standard) | P0 |
| Business Hours Router | IVR hours routing → human agent out-of-hours | P0 |

All 4 are P0 — they are the core BPO contact centre patterns.

---

**EXCEED ELEVENLABS — Workflow tab additions:**

ElevenLabs workflow is functional but generic. TRUSTNOW adds BPO-specific capability:

1. **BPO workflow template library:** Expand beyond the 4 base templates with 10+ BPO-specific templates: Debt Collection Flow (identify → verify → negotiate payment arrangement → confirm), Insurance FNOL Flow (capture incident → triage → assign handler → send confirmation), Appointment Reminder Flow (confirm → reschedule → cancel options). These are the workflows BPO clients need on day 1.

2. **Workflow validation badge:** The agent page header shows an `Errors` badge (red) when the workflow has validation issues (e.g., disconnected nodes, empty agent transfer). TRUSTNOW makes this actionable: clicking the badge opens a panel listing all validation errors with jump-to-node links. ElevenLabs shows the badge but not a structured error list.

3. **Node performance metrics:** Each Subagent node shows a mini-chart on hover: avg duration at this step (Xs), % of conversations that reach this node, % that exit via each edge. This lets BPO designers see where callers drop off and optimise the flow. ElevenLabs has no per-node analytics.

4. **Workflow version history:** Each time a workflow is saved, snapshot the nodes/edges JSON to a `workflow_versions` table. Show "Last changed by {user} on {date}" above the canvas. "Restore this version" available for up to 30 days. Critical for BPO clients who iterate workflows and need to roll back when a change breaks conversion rates.

---

### 6.2P — BranchesModule Endpoint Contracts (CO-BROWSING §13)

**Traffic routing invariant:** All `live` branches for an agent must sum to exactly 100% traffic. Enforce this constraint at the database level with a partial `CHECK` or application-level validation. A branch with `traffic_split = 0` can be live (receives 0% traffic — useful for a "shadow" branch collecting analytics without serving real callers).

---

#### `GET /agents/:id/branches` — List all branches

```typescript
// Response 200
{
  branches: Array<{
    branch_id: string,
    name: string,
    description: string | null,
    traffic_split: number,     // 0-100
    status: 'draft' | 'live' | 'paused' | 'archived',
    is_protected: boolean,
    parent_branch_id: string | null,
    created_by: string,         // user email/name
    created_at: string,
    updated_at: string,
    latest_version_number: number | null
  }>
}
```

#### `POST /agents/:id/branches` — Create a new branch

```typescript
export class CreateBranchDto {
  name: string;            // required — max 100 chars
  description?: string;
  // New branch is always cloned from the current active (Live) branch config
  // Starts with traffic_split = 0, status = 'draft'
}

// Logic:
// 1. Clone full agent_configs snapshot from current live branch
// 2. INSERT agent_branches row: { name, description, traffic_split: 0, status: 'draft', parent_branch_id: source_branch_id }
// 3. Clone workflow_nodes + workflow_edges for new branch_id
// 4. Clone agent_knowledge_base attachments for new branch_id
// Response 201: { branch_id, name, status: 'draft', traffic_split: 0 }
```

#### `PUT /agents/:id/branches/:branch_id` — Update branch metadata

```typescript
export class UpdateBranchDto {
  name?: string;
  description?: string;
}
// Only updates metadata — not config (config is edited via all other tabs while branchId is active)
// Response 200: { updated_at }
```

#### `PUT /agents/:id/branches/:branch_id/traffic` — Set traffic split

```typescript
export class UpdateBranchTrafficDto {
  traffic_split: number;    // 0.00–100.00
  status?: 'live' | 'paused';
}

// Validation:
// 1. If setting status = 'live': check sum of all live branches ≤ 100%
//    If would exceed 100%: HTTP 422 "Traffic split would exceed 100%"
// 2. If setting to 0%: allowed — branch receives no traffic but remains 'live'
// Response 200: { traffic_split, status }
```

**Traffic routing algorithm (§13.7 confirmed):**
```
rand = random(0, 100)
cumulative = 0
for branch in sorted_live_branches_by_id:
  cumulative += branch.traffic_split
  if rand < cumulative:
    return branch.branch_id
```

#### `POST /agents/:id/branches/:branch_id/protect` — Enable branch protection

```typescript
// Sets is_protected = true — subsequent edits to this branch require a prior
// POST /agents/:id/branches/:branch_id/unlock call
// Response 200: { is_protected: true }
```

#### `POST /agents/:id/branches/:branch_id/unlock` — Unlock a protected branch

```typescript
// Sets is_protected = false — allows editing until re-protected
// Audit log entry created: { action: 'branch_unlocked', branch_id, user_id }
// Response 200: { is_protected: false }
```

#### `GET /agents/:id/branches/:branch_id/versions` — Version history (clock icon)

```typescript
// Response 200
{
  versions: Array<{
    version_id: string,
    version_number: number,
    published_by: string,    // user name/email
    published_at: string,
    notes: string | null
  }>
}
```

#### `POST /agents/:id/branches/:branch_id/versions/:version_id/restore` — Roll back to a version

```typescript
// Restores agent_configs to the snapshot stored in branch_versions.snapshot
// Creates a new branch_version entry with notes: "Restored from v{N}"
// Response 200: { restored: true, new_version_number: N+1 }
```

#### `DELETE /agents/:id/branches/:branch_id` — Archive a branch

```typescript
// Soft delete: SET status = 'archived'
// Cannot archive the last live branch (would leave agent with no traffic)
// Cannot archive a protected branch (must unlock first)
// Response 200: { archived: true }
```

---

**EXCEED ELEVENLABS — Branches additions:**

ElevenLabs branches support A/B traffic splits. TRUSTNOW adds:

1. **Language variant branches:** First-class support for language-specific branches. When creating a branch, option to tag it as a `language_variant` with a language code (e.g. `hi` for Hindi). The traffic router preferentially routes callers whose `Accept-Language` or detected language matches the branch tag. E.g. Main = English (70%), Hindi branch = Hindi (30%). BPO clients in India need this for multilingual deployments without separate agents.

2. **Canary deployment flow:** When a new branch is created and set to 5% traffic, show a guided UI: "Monitor for 24h → Auto-promote to 50% if success rate ≥ previous branch → Auto-promote to 100% after another 24h." BPO operators don't need to manually adjust traffic splits during a canary rollout.

3. **Branch comparison view:** Side-by-side analytics for two branches: calls / avg duration / success rate / cost per call. Click "Declare winner" → auto-sets the winning branch to 100% and archives the loser. ElevenLabs has no built-in branch comparison or winner declaration.

4. **Branch change log:** Each branch row shows a "N changes" chip (e.g. "3 changes since last publish"). Clicking opens a diff view: what changed in system prompt, tools, KB, voice since the last published version. BPO compliance teams need an audit trail of exactly what changed before any live deployment.

---

### 6.2Q — TestsModule Endpoint Contracts (CO-BROWSING §14)

**Two access levels (§14.1):**
- `/tests` — workspace-level test library (Monitor → Tests sidebar)
- `/agents/:id/tests` — agent-scoped attachment and run management (Tab 7)

---

#### Workspace Tests CRUD

```typescript
// GET /tests — list all workspace tests
// Query params: ?type=next_reply|tool_invocation|simulation&folder_id=&search=
// Response 200: { tests: AgentTest[], total: number }

// POST /tests — create a new test
export class CreateTestDto {
  name: string;
  test_type: 'next_reply' | 'tool_invocation' | 'simulation';
  folder_id?: string;
  agent_id?: string;              // if provided + attach_to_agent=true: creates attachment
  attach_to_agent?: boolean;      // default true when created from inside agent Tests tab

  // Next Reply
  conversation?: Array<{ role: 'user' | 'agent'; content: string }>;
  expected_criteria?: string;
  success_examples?: string[];
  failure_examples?: string[];

  // Tool Invocation
  tool_type?: 'workflow_transition' | 'tool_call';
  target_agent_id?: string;
  target_node_id?: string;
  should_invoke?: boolean;

  // Simulation
  user_scenario?: string;
  success_criteria?: string;
  max_turns?: number;             // default 5
  mock_all_tools?: boolean;

  // Shared
  dynamic_variables?: Record<string, string>;
}
// Response 201: { test_id, name, test_type }

// GET /tests/:id — get full test detail
// PUT /tests/:id — update test
// DELETE /tests/:id — delete test + all attachments
```

#### Agent Test Attachments (Tab 7)

```typescript
// GET /agents/:id/tests — list tests attached to this agent
// Response 200: { tests: AgentTest[], past_runs: TestRun[] }
// past_runs = most recent 10 runs across all attached tests

// POST /agents/:id/tests/attach
export class AttachTestDto {
  test_id: string;    // attach existing workspace test
}
// Inserts into agent_test_attachments
// Response 200: { attached: true }

// DELETE /agents/:id/tests/:test_id — detach (does not delete the test)
// Response 200: { detached: true }
```

#### Test Execution

```typescript
// POST /tests/:id/run — run a test against an agent
export class RunTestDto {
  agent_id: string;
  branch_id?: string;   // default: current live branch
}

// Logic by test_type:
// 'next_reply':
//   1. Build conversation from test.conversation[] as LLM history
//   2. Call agent LLM with conversation + agent system prompt
//   3. Get agent's actual next response
//   4. Call evaluation LLM (Claude Haiku) with:
//      prompt = "Given this expected criteria: {expected_criteria}\n
//                Success examples: {success_examples}\n
//                Failure examples: {failure_examples}\n
//                Actual response: {actual_response}\n
//                Did the actual response pass? Answer PASS or FAIL only."
//   5. status = PASS or FAIL based on eval response

// 'tool_invocation':
//   1. Run agent with test conversation
//   2. Check if target tool/node was invoked: binary check
//   3. status = (tool_was_invoked === should_invoke) ? PASS : FAIL

// 'simulation':
//   1. Spawn simulated user LLM (Claude Haiku) with user_scenario as persona
//   2. Run multi-turn conversation: simulated user ↔ agent (up to max_turns)
//   3. Evaluate full transcript against success_criteria
//   4. status = PASS or FAIL

// Response 202: { run_id }  — async, poll GET /test-runs/:run_id for status

// GET /test-runs/:run_id — check run status + results
// Response 200: { run_id, status, result_detail, duration_ms }
```

#### Test Templates

```typescript
// GET /tests/templates — list the 5 seed templates
// Response 200: { templates: AgentTest[] }
// Returns the workspace templates (is_template=true) for the "Add test" dropdown

// POST /tests/templates/:id/clone — clone a template into workspace
// Creates a new agent_tests row with is_template=false, inheriting all template fields
// Response 201: { test_id }
```

#### Test Folders

```typescript
// POST /test-folders — create a folder
export class CreateTestFolderDto { name: string }
// Response 201: { folder_id, name }

// PUT /test-folders/:id — rename
// DELETE /test-folders/:id — delete (moves contents to root)
```

---

**Test Template Seed Data (Task 6):**

Seed 5 templates matching the ElevenLabs defaults (§14.3). Set `is_template = true`, `created_by = system`. These appear in every tenant's "Add test" dropdown.

| # | Name | Type | Key conversation |
|---|------|------|-----------------|
| 1 | Can read knowledge base | next_reply | User: "What cities does [airline] fly to from New York?" |
| 2 | Empathy for Delayed Flight Test | next_reply | User: "My flight is delayed by 3 hours, I'm really frustrated" |
| 3 | Greeting Response Test | next_reply | User: (empty — test agent's opening greeting) |
| 4 | Workflow Node Transition Test | tool_invocation | User: "I need to pay my outstanding balance" → should_invoke Billing node |
| 5 | Multi-Turn Lost Baggage Conversation Test | next_reply | Multi-turn: lost luggage scenario |

---

**EXCEED ELEVENLABS — Tests tab additions:**

ElevenLabs tests are manual and run on-demand. TRUSTNOW adds:

1. **Automated regression test suite on every Publish:** When an agent is published (Publish button), automatically run all attached tests as a pre-deployment gate. If any test fails → block publish with: "3 tests failed. Fix issues or override to force publish." ElevenLabs requires manual test execution. TRUSTNOW makes testing mandatory as a quality gate.

2. **Test suites (folders as test suites):** Folders in the test library double as runnable test suites. "Run all tests in this folder" executes all tests against the agent in parallel. Shows aggregate pass rate: "9 / 10 tests passed". Essential for BPO clients with 50+ test cases per agent.

3. **"Create test from this conversation" shortcut:** In the Analysis tab Transcription sub-tab, a "Create test from this conversation" button appears below each conversation. Pre-fills the Next Reply test form with the actual conversation as context. BPO QA teams identify failing real conversations and instantly convert them to regression tests — ElevenLabs only suggests this with an info banner, doesn't automate it.

4. **Scheduled test runs:** Configure a test suite to run on a schedule (daily at 09:00). Sends Slack/email notification if any tests fail overnight. BPO clients with 24/7 agents need automated overnight quality monitoring.

---

### 6.2R — WhatsAppModule Endpoint Contracts (CO-BROWSING §16)

**Meta platform prerequisites (§16.1):**
- TRUSTNOW must register as a WhatsApp Business Solution Provider (BSP) with Meta, OR implement Meta Embedded Signup (Facebook OAuth) so clients authorise TRUSTNOW to manage their WhatsApp Business Accounts
- Each connected WhatsApp account gets a `meta_waba_id` + `phone_number_id` + `access_token`
- Inbound webhooks are configured in Meta's WhatsApp Cloud API dashboard pointing to TRUSTNOW's webhook endpoint

---

#### `GET /whatsapp/accounts` — List connected WhatsApp accounts

```typescript
// Response 200
{
  accounts: Array<{
    wa_account_id: string,
    phone_number: string,          // E.164
    display_name: string,
    agent_id: string | null,
    agent_name: string | null,
    status: 'active' | 'paused' | 'disconnected',
    respond_with_audio: boolean
  }>
}
```

#### `POST /whatsapp/accounts/connect` — OAuth callback after Meta Facebook login

```typescript
// Called after the Facebook OAuth redirect completes
// The frontend receives the OAuth code from Meta and passes it here
export class ConnectWhatsAppDto {
  oauth_code: string;     // from Meta OAuth redirect
  waba_id: string;        // WhatsApp Business Account ID selected by user
  phone_number_id: string;
}

// Logic:
// 1. Exchange oauth_code for long-lived access token via Meta Graph API
// 2. Encrypt access token and store (Vault path: trustnow/{tenant_id}/whatsapp/{wa_account_id})
// 3. Fetch phone number details from Meta API (number, display name)
// 4. INSERT whatsapp_accounts row
// 5. Register TRUSTNOW webhook URL with Meta WhatsApp Cloud API for this account:
//    POST https://graph.facebook.com/v19.0/{phone_number_id}/subscribed_apps
// Response 201: { wa_account_id, phone_number, display_name }
```

#### `PUT /whatsapp/accounts/:id` — Update account settings

```typescript
export class UpdateWhatsAppAccountDto {
  agent_id?: string | null;      // assign/unassign agent
  respond_with_audio?: boolean;  // audio vs text-only responses
  status?: 'active' | 'paused';
}
// Response 200: { updated_at }
```

#### `DELETE /whatsapp/accounts/:id` — Disconnect account

```typescript
// 1. Deregister TRUSTNOW webhook from Meta API
// 2. Revoke access token
// 3. SET status = 'disconnected' (soft delete)
// Response 200: { disconnected: true }
```

#### `POST /whatsapp/accounts/:id/outbound-message` — Send outbound WhatsApp message

```typescript
export class SendWhatsAppMessageDto {
  recipient_wa_id: string;        // WhatsApp user ID of recipient
  template_name: string;          // pre-approved Meta message template name
  template_parameters?: string[]; // variable values for the template
  agent_id?: string;              // override account's default agent for this conversation
}
// Calls Meta Graph API: POST /messages with template payload
// Response 202: { message_id, status: 'sent' }
```

#### `POST /whatsapp/accounts/:id/outbound-call` — Initiate outbound WhatsApp call

```typescript
export class InitiateWhatsAppCallDto {
  recipient_wa_id: string;
  permission_template_name: string;  // call permission request template (Meta requirement)
  agent_id?: string;
}
// Logic:
// 1. Send call permission request template via Meta API
// 2. Meta delivers template to user's WhatsApp
// 3. User approves → Meta sends callback event to TRUSTNOW webhook
// 4. TRUSTNOW webhook handler (POST /whatsapp/webhook) receives approval
// 5. Initiates WebRTC call via WhatsApp Cloud API
// Response 202: { permission_request_sent: true }
```

#### `POST /whatsapp/webhook` — Inbound webhook from Meta (all WhatsApp events)

```typescript
// Called by Meta WhatsApp Cloud API for ALL events:
// - Incoming messages (text/audio/image/document/location/contact)
// - Incoming calls
// - Message status updates (delivered/read)
// - Call permission approvals
// - Account status changes

// Signature verification: X-Hub-Signature-256 header checked against app secret
// Route events to:
//   message → WhatsApp message handler → agent conversation
//   call_initiated → WhatsApp call handler → agent call session
//   call_permission_granted → initiate outbound call
//   status_update → update message/call status in DB

// Response 200: { status: 'ok' } — Meta requires 200 within 5 seconds
```

**Inbound message → Agent pipeline:**
```
Meta webhook POST → WhatsAppModule
  → if type = 'audio': transcribe via STT (Deepgram) → text
  → inject into agent conversation (same pipeline as widget text channel)
  → LLM generates response
  → if respond_with_audio = true: TTS → send audio via Meta API
  → if respond_with_audio = false: send text via Meta API
  → inject system__caller_id = sender's wa_id
  → inject system__called_number = account phone_number_id
```

---

**EXCEED ELEVENLABS — WhatsApp additions:**

ElevenLabs provides basic WhatsApp messaging. TRUSTNOW adds:

1. **Multi-account management:** BPO clients often manage WhatsApp Business Accounts on behalf of multiple end clients (e.g. a BPO managing WhatsApp for 5 brands). TRUSTNOW's accounts table supports multiple `whatsapp_accounts` per tenant. Each account shows the end-client brand name and can have a different agent assigned. ElevenLabs supports multiple accounts but with no brand labelling.

2. **Message template library:** A dedicated "Templates" section in the WhatsApp account settings shows all approved Meta message templates for that account (fetched from Meta API). Agent admins can see template names, approval status, and parameter slots. Removes the need to switch to Meta Business Manager to look up template names during outbound campaign setup.

3. **WhatsApp conversation continuity:** On WhatsApp, the same phone number may message again hours later — this should resume the same conversation thread (not start a new one) within a configurable session window (e.g. 24 hours). `conversations.wa_thread_id` + session TTL logic. ElevenLabs starts a new conversation for every new message.

4. **Handover to human agent via WhatsApp:** When the AI triggers a human handoff, TRUSTNOW can transfer the WhatsApp thread to a human agent's WhatsApp Business Manager inbox rather than just terminating. Uses Meta's Agent Handover Protocol. Critical for BPO clients who want seamless AI-to-human escalation on WhatsApp.

---

### 6.2S — SettingsModule Endpoint Contracts (CO-BROWSING §17)

**Scope:** All endpoints in this module operate at workspace (tenant) level — not agent level.

**Auto-save pattern (§17.1 confirmed):** The Settings page auto-saves without a manual Save button. Frontend debounces `PUT /workspace/settings` by 1 second after any field change.

---

#### Workspace Settings

```typescript
// GET /workspace/settings — load current workspace settings
// Response 200
{
  conversation_initiation_webhook_url: string | null,
  conversation_initiation_webhook_auth: object,
  post_call_webhook_url: string | null,
  post_call_webhook_secret: string | null,    // masked: "••••••••" if set, null if not
  post_call_webhook_auth: object
}

// PUT /workspace/settings — update workspace settings (auto-save, partial update)
export class UpdateWorkspaceSettingsDto {
  conversation_initiation_webhook_url?: string | null;
  conversation_initiation_webhook_auth?: object;
  post_call_webhook_url?: string | null;
  post_call_webhook_secret?: string | null;
  post_call_webhook_auth?: object;
}
// UPSERT workspace_settings on conflict (tenant_id)
// Response 200: { updated_at }

// POST /workspace/settings/webhooks/test — test a webhook (same pattern as agent webhooks)
export class TestWorkspaceWebhookDto {
  webhook_type: 'initiation' | 'post_call';
  url: string;
}
// Sends synthetic payload to URL, returns { success: boolean, http_status: number, response_time_ms: number }
```

**Webhook fallback logic (§17.8 confirmed):**
```typescript
// Executed by AI Pipeline at call start and call end
function resolveWebhook(agent_config, workspace_settings, event_type) {
  const agent_url = event_type === 'initiation'
    ? agent_config.conversation_initiation_webhook_url
    : agent_config.post_call_webhook_url;

  // Agent-level takes priority; workspace default is fallback
  return agent_url ?? workspace_settings[`${event_type === 'initiation' ? 'conversation_initiation' : 'post_call'}_webhook_url`];
}
```

---

#### Workspace Secrets

```typescript
// GET /workspace/secrets — list all secrets (names only — values never returned)
// Response 200
{
  secrets: Array<{
    secret_id: string,
    name: string,           // e.g. 'CRM_TOKEN'
    created_by: string,     // user email
    created_at: string
    // value is NEVER included — write-once, cannot be retrieved
  }>
}

// POST /workspace/secrets — create a new secret
export class CreateSecretDto {
  name: string;    // validated: alphanumeric + underscores only, max 100 chars
  value: string;   // the actual secret value — encrypted immediately on receipt
}
// Logic:
// 1. Validate name matches /^[A-Z0-9_]+$/ (uppercase convention)
// 2. Check no existing secret with same name for this tenant (UNIQUE constraint)
// 3. Encrypt value via Vault KV: path = trustnow/{tenant_id}/secrets/{name}
// 4. Store vault_path reference in workspace_secrets.value_enc
// Response 201: { secret_id, name }
// Note: value is NOT returned in the response

// DELETE /workspace/secrets/:id — delete a secret
// Deletes from Vault + workspace_secrets table
// WARNING: any tools referencing {{secret.NAME}} will fail after deletion
// Response 200: { deleted: true }
```

---

#### Workspace Auth Connections

```typescript
// GET /workspace/auth-connections — list auth connections (config masked)
// Response 200
{
  connections: Array<{
    auth_id: string,
    name: string,
    auth_type: 'oauth2' | 'api_key' | 'bearer' | 'basic',
    created_at: string
    // config_enc is NEVER returned — sensitive credentials
  }>
}

// POST /workspace/auth-connections — create auth connection
export class CreateAuthConnectionDto {
  name: string;
  auth_type: 'oauth2' | 'api_key' | 'bearer' | 'basic';
  config: {
    // oauth2
    client_id?: string;
    client_secret?: string;
    token_url?: string;
    scope?: string;
    // api_key / bearer
    token?: string;
    header_name?: string;    // default 'Authorization' for bearer, 'X-API-Key' for api_key
    // basic
    username?: string;
    password?: string;
  };
}
// Encrypt config → store reference
// Response 201: { auth_id, name, auth_type }

// DELETE /workspace/auth-connections/:id
// Warning check: if any tools reference this auth_id, return HTTP 409:
// { error: "Cannot delete: N tools use this auth connection. Update tools first." }
// Response 200: { deleted: true }
```

---

**EXCEED ELEVENLABS — Settings additions:**

ElevenLabs Settings has 4 sections. TRUSTNOW extends with:

1. **Workspace-level PII redaction default:** A toggle in Settings: "Enable PII redaction for all new agents by default" — sets the default value of `pii_redaction_enabled` when a new agent is created. BPO clients creating 50+ agents want to set this once at workspace level rather than per-agent. Stored in `tenants.settings_json.default_pii_redaction`.

2. **Secret usage audit:** Each secret in the list shows "Used by N tools" — clicking opens a panel listing which tools reference this secret. Before deleting a secret, the admin sees exactly what breaks. ElevenLabs shows no usage information.

3. **Auth connection health check:** Each auth connection has a `Test` button — fires a test request using the stored credentials. Returns `✅ Valid` or `❌ Expired/Invalid`. OAuth2 connections auto-refresh when possible. BPO clients' CRM OAuth tokens expire — this surfaces it before it breaks live calls.

4. **Webhook payload inspector:** The last N webhook deliveries (initiation + post-call) are shown in Settings with: timestamp / HTTP status / response time / payload preview. Helps diagnose webhook failures without needing external tooling. Stored in `webhook_deliveries` log table.

---

### 6.2T — ApiKeysModule Endpoint Contracts (CO-BROWSING §18)

**Key format:** `sk-tn_{32 random chars}` — total ~42 chars. `sk-tn_` prefix is TRUSTNOW-specific (ElevenLabs uses `xi-api-key` header). TRUSTNOW API keys use `x-api-key` header.

**One-time reveal pattern:** The actual key value is generated server-side, returned **once** in the creation response, and never stored. Only the SHA-256 hash is persisted. This mirrors GitHub, Stripe, and ElevenLabs key management.

---

#### `GET /api-keys` — List all API keys for tenant

```typescript
// Response 200 — key_hash and full key are NEVER returned
{
  api_keys: Array<{
    key_id: string,
    name: string,
    key_prefix: string,          // e.g. 'sk-tn_ab' — for display identification
    restrict_key: boolean,
    monthly_credit_limit: number | null,
    permissions: Record<string, string | null>,
    last_used_at: string | null,
    created_by: string,          // user email
    created_at: string,
    is_active: boolean
  }>
}
```

#### `POST /api-keys` — Create a new API key

```typescript
export class CreateApiKeyDto {
  name?: string;                    // if omitted: auto-generate fun name (adjective + animal)
  restrict_key?: boolean;           // default true
  monthly_credit_limit?: number;    // null = unlimited
  permissions?: Record<string, 'read' | 'write' | 'access' | null>;
}

// Logic:
// 1. Generate key: 'sk-tn_' + crypto.randomBytes(24).toString('base64url')
// 2. key_prefix = first 8 chars (e.g. 'sk-tn_ab')
// 3. key_hash = SHA-256(full_key)
// 4. INSERT api_keys row (store hash + prefix, NOT the key itself)
// 5. Return full key in response — THIS IS THE ONLY TIME IT IS RETURNED

// Response 201
{
  key_id: string,
  name: string,
  key: string,          // ⚠ ONLY TIME the full key is returned — show to user immediately
  key_prefix: string,
  created_at: string
}
```

#### `PUT /api-keys/:id` — Update key name, permissions, or credit limit

```typescript
export class UpdateApiKeyDto {
  name?: string;
  restrict_key?: boolean;
  monthly_credit_limit?: number | null;
  permissions?: Record<string, 'read' | 'write' | 'access' | null>;
}
// Cannot change the key value itself — delete and recreate to rotate
// Response 200: { updated_at }
```

#### `DELETE /api-keys/:id` — Revoke (deactivate) an API key

```typescript
// Sets is_active = false (soft delete — preserves audit trail)
// All subsequent requests using this key receive HTTP 401
// Response 200: { revoked: true }
```

#### API Key validation middleware (AuthModule)

```typescript
// Applied to ALL /api/* routes
// Header: x-api-key: sk-tn_abcd1234...

async validateApiKey(key: string): Promise<ApiKeyContext> {
  const hash = SHA256(key);
  const api_key = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true',
    [hash]
  );
  if (!api_key) throw new UnauthorizedException('Invalid or revoked API key');

  // Check monthly credit limit
  if (api_key.monthly_credit_limit !== null) {
    const used = await getMonthlyCreditsUsed(api_key.key_id);
    if (used >= api_key.monthly_credit_limit) {
      throw new ForbiddenException('Monthly credit limit exceeded');
    }
  }

  // Check endpoint permission
  const endpoint = resolveEndpointScope(request.path, request.method);
  if (api_key.restrict_key) {
    const allowed = api_key.permissions[endpoint];
    if (!allowed) throw new ForbiddenException('Key does not have permission for this endpoint');
  }

  // Update last_used_at (async — don't block the request)
  db.query('UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1', [api_key.key_id])
    .catch(() => {});  // fire-and-forget

  return { tenant_id: api_key.tenant_id, key_id: api_key.key_id };
}
```

---

**TRUSTNOW API Permission Scopes (§18.5 mapped from ElevenLabs):**

| Scope | Access levels | Covers endpoints |
|-------|--------------|-----------------|
| `agents` | read / write | CRUD on agents, agent configs, all tabs |
| `tts` | access | POST /tts/synthesise |
| `stt` | access | POST /stt/transcribe |
| `conversations` | read / write | GET/DELETE /conversations |
| `workspace` | read / write | GET/PUT /workspace/settings |
| `analytics` | access | GET /analytics/* |
| `phone_numbers` | read / write | CRUD on /phone-numbers |
| `batch_calls` | read / write | CRUD on /batch-calls |
| `whatsapp` | read / write | CRUD on /whatsapp/accounts |
| `kb` | read / write | CRUD on /kb/documents |
| `tools` | read / write | CRUD on /tools |
| `tests` | read / write | CRUD on /tests, /test-runs |
| `voices` | read / write | CRUD on /voices |

---

**EXCEED ELEVENLABS — API Keys additions:**

ElevenLabs API Keys have a static permission matrix. TRUSTNOW adds:

1. **Key usage analytics:** Each key row shows "N API calls this month" + sparkline. Drilling in shows: calls per day, top endpoints called, average latency. BPO clients building CRM integrations need to monitor their API key usage to detect over-use or unexpected calls.

2. **Key rotation wizard:** "Rotate key" button on any key — generates a new key value, returns it once, then deactivates the old key after a configurable grace period (e.g. 24 hours). This allows zero-downtime key rotation: update the integration, confirm it's working, the old key auto-revokes. ElevenLabs requires manual delete-and-recreate with no grace period.

3. **IP allowlist per key:** Optional field on key creation: restrict the key to calls from specific IP ranges (CIDRs). BPO clients with on-premise CRM systems only call from known corporate IP ranges — this prevents key theft from being exploitable. Stored in `api_keys.allowed_ips TEXT[]`.

---

### 6.2U — WebhookEndpointsModule Endpoint Contracts (CO-BROWSING §19)

**Important scope distinction (§19.1):**
- **This module:** Platform-level event webhooks (voice removal, transcription complete) — at `/api/webhooks`
- **§6.2I / §6.2S:** Conversation webhooks (initiation + post-call) — on auth_policies and workspace_settings
- These are two separate systems. Do not conflate them.

**TRUSTNOW header name:** `X-TRUSTNOW-Signature` (equivalent of ElevenLabs' `ElevenLabs-Signature`)

---

#### `GET /api/webhooks` — List webhook endpoints

```typescript
// Response 200
{
  endpoints: Array<{
    endpoint_id: string,
    url: string,
    description: string | null,
    events: string[],         // e.g. ['voice.removal', 'transcription.completed']
    is_active: boolean,
    created_at: string
    // secret_enc is NEVER returned
  }>
}
```

#### `POST /api/webhooks` — Add endpoint

```typescript
export class CreateWebhookEndpointDto {
  url: string;             // required, must be HTTPS
  description?: string;
  events: string[];        // at least one required
                           // valid values: 'voice.removal' | 'transcription.completed'
                           // + TRUSTNOW extensions (see §6.2U below)
}

// Logic:
// 1. Validate URL is HTTPS
// 2. Generate HMAC shared secret: crypto.randomBytes(32).toString('hex')
// 3. Encrypt secret → store in endpoint.secret_enc
// 4. INSERT webhook_endpoints row
// 5. Return endpoint + secret (ONE-TIME — secret never returned again)

// Response 201
{
  endpoint_id: string,
  url: string,
  secret: string,          // ⚠ ONLY TIME secret is returned — show in UI immediately
  events: string[]
}
```

#### `PUT /api/webhooks/:id` — Update endpoint

```typescript
export class UpdateWebhookEndpointDto {
  url?: string;
  description?: string;
  events?: string[];
  is_active?: boolean;
}
// Cannot rotate the secret via PUT — use POST /api/webhooks/:id/rotate-secret
// Response 200: { updated_at }
```

#### `DELETE /api/webhooks/:id` — Delete endpoint

```typescript
// Hard delete — removes endpoint and stops all future deliveries
// Preserves webhook_delivery_log rows for audit (FK: endpoint_id → SET NULL on delete)
// Response 200: { deleted: true }
```

#### `POST /api/webhooks/:id/rotate-secret` — Rotate HMAC secret

```typescript
// Generates a new shared secret, returns it once
// Old secret is immediately invalid
// Response 200: { new_secret: string }  — show to user immediately
```

---

#### TRUSTNOW Platform Event Catalogue

The ElevenLabs events (voice.removal, transcription.completed) are baseline. TRUSTNOW extends with BPO-relevant events:

| Event token | When it fires | BPO use case |
|-------------|--------------|-------------|
| `voice.removal` | A voice assigned to an agent is scheduled for removal | Alert operators before production voice is deprecated |
| `transcription.completed` | Async STT job finishes (batch audio processing) | Notify when large audio file transcription is ready |
| `agent.published` | Any agent in the workspace is published live | Notify CI/CD pipeline to run regression tests |
| `agent.error` | Agent encounters a runtime error during a call | Real-time alerting for BPO supervisors |
| `batch_call.completed` | A batch call campaign finishes | Notify CRM to process results |
| `batch_call.failed` | A batch call campaign fails with errors | Alert BPO ops for intervention |
| `knowledge_base.indexed` | A KB document finishes RAG indexing | Notify when updated KB is ready to serve |

---

#### Webhook delivery service (background)

```typescript
// Triggered by platform events — NOT an HTTP endpoint, runs as an event handler

async function deliverWebhookEvent(event_type: string, tenant_id: string, data: object) {
  // 1. Find all active endpoints subscribed to this event for this tenant
  const endpoints = await db.query(
    `SELECT * FROM webhook_endpoints
     WHERE tenant_id = $1 AND is_active = true AND $2 = ANY(events)`,
    [tenant_id, event_type]
  );

  for (const endpoint of endpoints) {
    const payload = { event: event_type, timestamp: new Date().toISOString(), data };
    const secret = await vault.getSecret(endpoint.secret_path);
    const signature = 'sha256=' + HMAC_SHA256(JSON.stringify(payload), secret);

    // POST with retry (3 attempts, exponential backoff: 5s / 25s / 125s)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-TRUSTNOW-Signature': signature },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000)   // 10s timeout
        });
        await db.insert('webhook_delivery_log', {
          endpoint_id: endpoint.endpoint_id, event_type, payload, tenant_id,
          http_status: res.status, success: res.ok, duration_ms, attempt_number: attempt
        });
        if (res.ok) break;  // success — no retry needed
      } catch (err) {
        await db.insert('webhook_delivery_log', {
          endpoint_id: endpoint.endpoint_id, event_type, payload, tenant_id,
          http_status: null, success: false, attempt_number: attempt
        });
        if (attempt < 3) await sleep(5 ** attempt * 1000);  // 5s, 25s
      }
    }
  }
}
```

---

**EXCEED ELEVENLABS — Webhooks additions:**

ElevenLabs has 2 platform events. TRUSTNOW adds:

1. **7 BPO-relevant events** (agent.published, agent.error, batch_call.completed, batch_call.failed, knowledge_base.indexed) as listed above. BPO clients integrate TRUSTNOW into their CI/CD, alerting, and CRM systems — they need rich event coverage.

2. **Delivery log in UI:** Each endpoint row shows "Last delivery: 200 OK (245ms) — 2 minutes ago" or "Last delivery: ❌ 503 — 4 hours ago (3 retries failed)". Click → opens full delivery log with payload previews and retry button. ElevenLabs has no delivery log in the UI.

3. **Event filtering:** When an endpoint receives events, an optional `filter` field (JSONPath expression) reduces noise — e.g. "only fire `agent.error` when the agent_id is in [list]". Prevents webhook floods when many agents are deployed. ElevenLabs has no event filtering.

---

### 6.2V — EnvVarsModule Endpoint Contracts (CO-BROWSING §20)

---

#### `GET /env-vars` — List all environment variables

```typescript
// Response 200
{
  variables: Array<{
    var_id: string,
    name: string,                  // e.g. 'MY_API_URL'
    var_type: 'string' | 'number' | 'boolean',
    environments_configured: number,  // count of environment rows set
    updated_at: string
    // values are NOT returned in list — use GET /env-vars/:id for full detail
  }>
}
```

#### `GET /env-vars/:id` — Get variable with all environment values

```typescript
// Response 200
{
  var_id: string,
  name: string,
  var_type: string,
  values: Array<{
    environment: string,   // 'production' | 'staging' | 'development' | custom
    value: string
  }>
}
```

#### `POST /env-vars` — Create a new environment variable

```typescript
export class CreateEnvVarDto {
  name: string;                          // snake_case, validated: /^[a-zA-Z][a-zA-Z0-9_]*$/
  var_type?: 'string' | 'number' | 'boolean';  // default 'string'
  values: Array<{
    environment: string;
    value: string;
  }>;  // at least one value required; production should always be set
}

// Logic:
// 1. Validate name format
// 2. Check UNIQUE(tenant_id, name) — HTTP 409 if duplicate
// 3. INSERT environment_variables row
// 4. INSERT environment_variable_values for each value in dto.values
// 5. Return { var_id, name, values }
// Response 201: { var_id, name, var_type, values }
```

#### `PUT /env-vars/:id` — Update variable (name, type, values)

```typescript
export class UpdateEnvVarDto {
  name?: string;
  var_type?: string;
  values?: Array<{ environment: string; value: string }>;
}
// For values: UPSERT on conflict(var_id, environment) — update value, or insert new env row
// Response 200: { updated_at }
```

#### `DELETE /env-vars/:id`

```typescript
// CASCADE deletes all environment_variable_values rows
// Warning: any agent configs referencing {{env.VAR_NAME}} will fail after deletion
// Response 200: { deleted: true }
```

---

#### Variable Resolution Service (Platform Engine — §20.4)

The resolution service is called at **conversation initiation time** whenever a `{{env.VAR_NAME}}` token is found in an agent config field.

```typescript
async function resolveEnvVars(
  text: string,
  tenant_id: string,
  environment: string   // 'production' | 'staging' | 'development'
): Promise<string> {

  // Find all {{env.VAR_NAME}} tokens in the text
  const tokens = text.match(/\{\{env\.([A-Za-z][A-Za-z0-9_]*)\}\}/g) ?? [];

  for (const token of tokens) {
    const varName = token.replace('{{env.', '').replace('}}', '');

    // 1. Find variable by name for this tenant
    const variable = await db.query(
      'SELECT var_id FROM environment_variables WHERE tenant_id = $1 AND name = $2',
      [tenant_id, varName]
    );
    if (!variable) throw new Error(`Environment variable '${varName}' not found`);

    // 2. Look for value in current environment
    let value = await db.query(
      'SELECT value FROM environment_variable_values WHERE var_id = $1 AND environment = $2',
      [variable.var_id, environment]
    );

    // 3. Fall back to production if no env-specific value (§20.4 confirmed)
    if (!value) {
      value = await db.query(
        'SELECT value FROM environment_variable_values WHERE var_id = $1 AND environment = $2',
        [variable.var_id, 'production']
      );
    }

    if (!value) throw new Error(`Variable '${varName}' has no value for environment '${environment}' and no production fallback`);

    text = text.replace(token, value.value);
  }
  return text;
}
```

**Where resolution runs:**
- `system_prompt` — resolved before first LLM call
- `first_message` — resolved before TTS
- Tool webhook `url` and `headers` — resolved before each tool invocation
- MCP server `server_url` — resolved at connection time

---

#### Variable Injection Reference (§20.7 — For Platform Engineer reference)

| Type | Syntax | Where defined | When resolved | Use case |
|------|--------|--------------|--------------|---------|
| **Environment Variables** | `{{env.NAME}}` | ElevenAPI → Env Vars | Conversation start | Config values per environment |
| **Dynamic Variables** | `{{variable_name}}` | Passed at call initiation (SIP headers, API params) | Call start | Per-caller personalisation |
| **Workspace Secrets** | `{{secret.NAME}}` | ElevenAgents Settings → Workspace Secrets | Tool execution | API keys, passwords |
| **System Variables** | `{{system__caller_id}}` | Auto-injected by platform | Call start | Caller ID, called number, WhatsApp WA ID |

All four types coexist in the same text fields. Resolution order: env vars → dynamic vars → secrets → system vars.

---

**EXCEED ELEVENLABS — Environment Variables additions:**

ElevenLabs supports 3 fixed environments (production/staging/development). TRUSTNOW adds:

1. **Custom environment names:** BPO clients managing multiple client deployments on the same platform create named environments per client: "client_a_prod", "client_b_uat", "client_b_staging". Stored as free-form strings in `environment_variable_values.environment`. No validation beyond unique constraint per variable.

2. **Variable usage scanner:** A `Where used` button on each variable → scans all agent configs, tool definitions, and MCP server URLs for `{{env.VAR_NAME}}` references. Returns a list: "Used in 3 agents, 7 tool configs". Prevents accidental deletion of variables that are actively in production. ElevenLabs has no usage tracking.

3. **Bulk export/import:** Export all environment variables for a workspace as a JSON file (for environment migration or backup). Import a JSON file to restore or replicate variables. BPO clients manage multiple TRUSTNOW instances (prod/staging) and need to sync variable sets.

---

### 6.2W — StandaloneTTSModule Endpoint Contracts (CO-BROWSING §21)

**Scope note:** This module covers the **standalone async TTS tool** (ElevenCreative → Text to Speech). It is completely separate from the realtime conversation TTS pipeline (Task 9 `tts_adapter.py`). Do not confuse the two.

| | Standalone TTS (this module) | Realtime TTS (Task 9) |
|--|------------------------------|----------------------|
| Use | IVR prompts, on-hold messages, bulk audio | Live conversation turns |
| Latency requirement | None — async | < 500ms TTFB |
| Model | eleven_multilingual_v2 / eleven_v3 | eleven_flash_v2_5 only |
| Max input | 5,000 chars | One turn (typically < 200 chars) |
| Storage | MinIO `trustnow-tts-generations` | Not stored (streamed) |

---

#### `POST /tts/generate` — Generate a TTS audio file

```typescript
export class GenerateTtsDto {
  text: string;                      // required, max 5,000 chars
  voice_id: string;                  // required
  model_id?: string;                 // default 'eleven_multilingual_v2'
  stability?: number;                // 0.0–1.0, default 0.5
  similarity_boost?: number;         // 0.0–1.0, default 0.75
  style_exaggeration?: number;       // 0.0–1.0, default 0.0
  speed?: number;                    // 0.5–2.0, default 1.0
  use_speaker_boost?: boolean;       // default true (uses extra credits)
  language_override?: string;        // ISO language code, null = auto
  output_format?: string;            // default 'mp3_128000'
}

// Logic:
// 1. Validate text length ≤ 5,000 chars
// 2. Check tenant credit balance
// 3. Call ElevenLabs TTS API (Partition A) or Piper (Partition B):
//    POST /v1/text-to-speech/{voice_id} with voice_settings
// 4. Store audio file in MinIO: tts-generations/{tenant_id}/{generation_id}.mp3
// 5. INSERT tts_generations row with all params + storage_path + credits_used
// 6. Return generation_id + pre-signed download URL (1h TTL)

// Response 201
{
  generation_id: string,
  download_url: string,        // pre-signed MinIO URL, 1h TTL
  duration_s: number,
  credits_used: number
}
```

#### `GET /tts/history` — List generation history

```typescript
// GET /tts/history?page=1&limit=20
// Returns tts_generations for this tenant, newest first
// Response 200: { generations: TtsGeneration[], total }
// Each: generation_id, text (first 100 chars), voice name (joined), model_id, duration_s, created_at
```

#### `GET /tts/history/:id/download` — Get fresh download URL

```typescript
// Generates a new pre-signed MinIO URL for a past generation (original URLs expire after 1h)
// Response 200: { download_url: string }
```

#### `DELETE /tts/history/:id` — Delete a generation

```typescript
// Deletes from MinIO + tts_generations row
// Response 200: { deleted: true }
```

---

**EXCEED ELEVENLABS — Standalone TTS additions:**

1. **IVR prompt builder:** A structured form for generating telephony-ready IVR audio files: menu items (key press → description), greeting, hold message, error message. Generates correctly formatted audio: G711 μ-law 8kHz for SIP (auto-converted using the same `ulaw_encode()` pipeline as Task 9), or WAV for IP PBX systems. ElevenLabs generates generic MP3 — TRUSTNOW generates telephony-ready audio.

2. **Bulk generation (batch TTS):** Upload a CSV with two columns: `filename` and `text`. System generates all files and delivers them as a ZIP download. BPO clients need hundreds of IVR prompt variations (per product, per language, per campaign). ElevenLabs TTS is single-text only.

3. **Agent voice preview:** From any agent's Tab 1 (Voices panel), a `Preview` button generates a short TTS sample using the current voice + first 200 chars of the system prompt. Lets agent admins hear exactly how the agent will sound before publishing. Stored in `tts_generations` as `generation_type = 'preview'`.

---

### 6.2X — AsyncSTTModule Endpoint Contracts (CO-BROWSING §22)

**Scope note:** This module covers the **standalone async STT tool** (ElevenCreative → Speech to Text). It is completely separate from the realtime STT in the conversation pipeline (Task 9 `stt_adapter.py`).

| | Standalone STT (this module) | Realtime STT (Task 9) |
|--|------------------------------|----------------------|
| Input | Uploaded file / YouTube URL / any media URL | Live audio stream (WebSocket/WebRTC) |
| Latency | None — async job (seconds to minutes) | < 200ms per turn |
| Model | Scribe v2 (ElevenLabs) / Deepgram batch | Deepgram Nova-2 / FasterWhisper |
| Max input | 1,000 MB file | One spoken turn |
| Output | Full transcript JSON + SRT + plain text | Turn text (no timestamps) |
| Storage | MinIO `trustnow-stt-transcripts` | Not stored (passed to LLM) |

---

#### `POST /stt/transcribe` — Submit transcription job

```typescript
// Multipart form-data for source_type='upload'
// JSON body for source_type='youtube' or 'url'
export class CreateTranscriptionDto {
  source_type: 'upload' | 'youtube' | 'url';
  source_url?: string;            // for youtube/url types
  // file provided as multipart for upload type — max 1,000MB
  title?: string;                 // auto-generated from filename if omitted
  language_override?: string;     // null = Detect; ISO code for forced language
  tag_audio_events?: boolean;     // default true
  include_subtitles?: boolean;    // default false
  no_verbatim?: boolean;          // default false
  keyterms?: string[];            // domain vocabulary hints
}

// Logic:
// 1. Validate input (file ≤ 1000MB, URL is accessible)
// 2. For upload: store file in MinIO tts-transcripts/{tenant_id}/{transcript_id}.{ext}
// 3. INSERT stt_transcripts row with status='pending'
// 4. Queue async BullMQ job: 'stt-transcribe' with transcript_id
// 5. Return transcript_id immediately (client polls or receives WS notification)

// Response 202 (accepted, processing async)
{ transcript_id: string, status: 'pending' }
```

#### Async transcription job

```typescript
// Queue: 'stt-transcribe'
@Processor('stt-transcribe')
async function processTranscription(job: Job<{ transcript_id: string }>) {
  const tx = await db.getTranscript(job.data.transcript_id);
  await db.updateStatus(tx.transcript_id, 'processing');

  // Call ElevenLabs Scribe v2 API (Partition A) or Deepgram batch (Partition A alternative)
  const response = await elevenLabsClient.speechToText({
    audio: tx.source_type === 'upload' ? await minio.getStream(tx.storage_path) : null,
    youtube_url: tx.source_type === 'youtube' ? tx.source_url : null,
    url: tx.source_type === 'url' ? tx.source_url : null,
    model_id: 'scribe_v2',
    language_code: tx.language_override,        // null = auto-detect
    tag_audio_events: tx.tag_audio_events,
    diarize: true,                               // TRUSTNOW EXCEED: always diarize
    timestamps_granularity: 'word',
    additional_formats: tx.include_subtitles ? ['srt'] : [],
    biased_keywords: tx.keyterms
  });

  await db.update('stt_transcripts', {
    status: 'completed',
    transcript_json: response.transcript,
    plain_text: response.text,
    srt_content: response.srt ?? null,
    language_detected: response.language_code,
    duration_seconds: response.duration,
    credits_used: response.credits_consumed
  }, { transcript_id: tx.transcript_id });

  // Push WebSocket notification
  wsGateway.emit(tx.tenant_id, { type: 'transcription_complete', transcript_id: tx.transcript_id });
}
```

#### `GET /stt/transcripts` — List transcripts

```typescript
// GET /stt/transcripts?search=&status=&page=&limit=
// Response 200: { transcripts: SttTranscript[], total }
// Each: transcript_id, title, source_type, status, language_detected, duration_seconds, created_at
```

#### `GET /stt/transcripts/:id` — Get full transcript

```typescript
// Response 200: full stt_transcripts row
// Includes: transcript_json (with word timestamps), plain_text, srt_content
```

#### `GET /stt/transcripts/:id/export` — Export in various formats

```typescript
// GET /stt/transcripts/:id/export?format=txt|pdf|docx|srt|json
// Returns the transcript formatted appropriately, as a download

// txt: plain_text field as a .txt file
// json: transcript_json as a .json file
// srt: srt_content as a .srt file (only if include_subtitles was true)
// pdf: formatted PDF with title, timestamps, speaker labels
// docx: Word document with same formatting as PDF
```

#### `PUT /stt/transcripts/:id` — Rename transcript

```typescript
export class UpdateTranscriptDto { title: string }
// Response 200: { updated_at }
```

#### `DELETE /stt/transcripts/:id`

```typescript
// Deletes from MinIO (if upload type) + stt_transcripts row
// Response 200: { deleted: true }
```

---

**EXCEED ELEVENLABS — Async STT additions:**

ElevenLabs Scribe has speaker diarization as an option. TRUSTNOW makes it standard and adds more:

1. **Speaker diarization always ON:** TRUSTNOW always diarises (labels Speaker 1, Speaker 2 etc.) — output shows `Speaker 1: "..."` and `Speaker 2: "..."` in the transcript. Critical for call recording QA where you need to separate agent speech from caller speech. ElevenLabs has diarisation as an optional extra.

2. **Auto-transcribe call recordings:** A toggle in the Privacy section of Tab 10 (Advanced): "Auto-transcribe recordings with async STT." When ON, every completed call recording is automatically submitted to `POST /stt/transcribe` with `source_type='upload'`. Creates a searchable transcript alongside the conversation record.

3. **PII redaction on transcripts:** When `pii_redaction_enabled = true` on the agent AND a recording is auto-transcribed, the same PII patterns from §6.2H are applied to the transcript before storage. Produces a clean, auditable, GDPR-compliant record.

4. **Transcript search index:** `plain_text` field indexed in PostgreSQL with `tsvector` full-text search. `GET /stt/transcripts?search=` uses `to_tsvector('english', plain_text) @@ to_tsquery(...)`. BPO compliance teams search across hundreds of transcripts for specific phrases, agent scripts, or customer complaints.

---

### Final Schema Summary — CO-BROWSING Translation Complete

All 22 CO-BROWSING-DATA-001.md sections have been translated. Complete list of **new tables added** across Steps 1–21:

| Table | Step | Purpose |
|-------|------|---------|
| `agent_branches` | 12 | Branch management (A/B testing) |
| `agent_knowledge_base` | 7 | KB attachment junction table |
| `agent_test_attachments` | 13 | Test attachment junction table |
| `agent_tests` | 13 | QA test definitions |
| `api_keys` | 17 | Platform API key management |
| `batch_calls` | 10 | Outbound batch calling campaigns |
| `batch_call_recipients` | 10 | Per-recipient status in batch |
| `branch_versions` | 12 | Branch publish history |
| `conversation_turns` | 8 | Per-turn latency and transcript |
| `data_collection_specs` | 8 | Post-call data extraction specs |
| `environment_variable_values` | 19 | Per-env variable values |
| `environment_variables` | 19 | Env var definitions |
| `evaluation_criteria` | 8 | Post-call success criteria |
| `knowledge_base_docs` | 7 | Workspace-level KB documents (corrected from agent-scoped) |
| `phone_numbers` | 9 | SIP trunk phone numbers |
| `stt_transcripts` | 21 | Async STT transcript jobs |
| `test_folders` | 13 | Test library folder organisation |
| `test_runs` | 13 | Test execution records |
| `tts_generations` | 20 | Standalone TTS generation history |
| `webhook_delivery_log` | 18 | Webhook delivery audit log |
| `webhook_endpoints` | 18 | Platform event webhook subscriptions |
| `whatsapp_accounts` | 15 | WhatsApp Business Account connections |
| `workflow_edges` | 11 | Workflow directed edges |
| `workflow_nodes` | 11 | Workflow canvas nodes |
| `workflow_versions` | 12 | Workflow version snapshots |
| `workspace_auth_connections` | 16 | Reusable tool auth configs |
| `workspace_secrets` | 16 | Encrypted workspace secrets |
| `workspace_settings` | 16 | Workspace-level webhook defaults |

**28 new tables** added across the full translation. Combined with the existing schema from Tasks 1–9, the TRUSTNOW platform schema is now complete.

---

Read RUNBOOK.md and confirm Task 6 is ✅ COMPLETE before starting.

```bash
# Create FreeSWITCH config directory structure
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
mkdir -p $ROOT/config/freeswitch/{dialplan,sip_profiles,autoload_configs,sounds/music}

# Pull the FreeSWITCH Docker image (community maintained, Debian Bookworm base)
docker pull ghcr.io/signalwire/freeswitch:v1.10

# If ghcr.io is not accessible, fall back to:
# docker pull drachtio/freeswitch:1.10.9
```

Create the docker-compose file:

```bash
cat > $ROOT/config/freeswitch/docker-compose.yml << 'EOF'
version: "3.9"
services:
  trustnow-freeswitch:
    image: ghcr.io/signalwire/freeswitch:v1.10
    container_name: trustnow-freeswitch
    network_mode: host
    restart: unless-stopped
    volumes:
      - /opt/trustnowailabs/trustnow-ai-worker-stack/config/freeswitch:/etc/freeswitch
      - /opt/trustnowailabs/trustnow-ai-worker-stack/data/recordings:/var/lib/freeswitch/recordings
      - /opt/trustnowailabs/trustnow-ai-worker-stack/config/freeswitch/sounds:/usr/share/freeswitch/sounds/music/default
    environment:
      - FREESWITCH_ESL_PASSWORD=CHANGE_THIS_IN_VAULT
    cap_add:
      - SYS_NICE
      - NET_ADMIN
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
EOF
```

Store the ESL password in Vault before starting the container:

```bash
source $ROOT/vault-env.sh
ESL_PASS=$(openssl rand -hex 32)
vault kv put secret/trustnow/freeswitch esl_password="$ESL_PASS"
echo "ESL password stored in Vault at secret/trustnow/freeswitch"
```

---

### §7.2 — FreeSWITCH Core Configuration Files

**§7.2.1 — vars.xml (global variables)**

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
cat > $ROOT/config/freeswitch/vars.xml << 'EOF'
<include>
  <X-PRE-PROCESS cmd="set" data="default_password=CHANGE_THIS_IN_VAULT"/>
  <X-PRE-PROCESS cmd="set" data="domain=172.25.10.142"/>
  <X-PRE-PROCESS cmd="set" data="domain_name=$${domain}"/>
  <X-PRE-PROCESS cmd="set" data="local_ip_v4=172.25.10.142"/>
  <X-PRE-PROCESS cmd="set" data="external_rtp_ip=172.25.10.142"/>
  <X-PRE-PROCESS cmd="set" data="external_sip_ip=172.25.10.142"/>
  <X-PRE-PROCESS cmd="set" data="rtp_start_port=16384"/>
  <X-PRE-PROCESS cmd="set" data="rtp_end_port=32768"/>
  <X-PRE-PROCESS cmd="set" data="recordings_dir=/var/lib/freeswitch/recordings"/>
  <X-PRE-PROCESS cmd="set" data="trustnow_esl_password=CHANGE_THIS_IN_VAULT"/>
</include>
EOF
```

Substitute real ESL password from Vault:

```bash
ESL_PASS=$(vault kv get -field=esl_password secret/trustnow/freeswitch)
sed -i "s/CHANGE_THIS_IN_VAULT/${ESL_PASS}/g" $ROOT/config/freeswitch/vars.xml
```

**§7.2.2 — freeswitch.xml (master config)**

```bash
cat > $ROOT/config/freeswitch/freeswitch.xml << 'EOF'
<?xml version="1.0"?>
<document type="freeswitch/xml">
  <X-PRE-PROCESS cmd="include" data="vars.xml"/>
  <section name="configuration" description="Various Configuration">
    <X-PRE-PROCESS cmd="include" data="autoload_configs/*.xml"/>
  </section>
  <section name="dialplan" description="Dialplan">
    <X-PRE-PROCESS cmd="include" data="dialplan/*.xml"/>
  </section>
  <section name="directory" description="User Directory">
  </section>
</document>
EOF
```

---

### §7.3 — ESL (Event Socket Layer) Configuration

The NestJS Platform API subscribes to all call events via ESL. ESL must listen on 127.0.0.1:8021 (localhost only — never exposed externally).

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
ESL_PASS=$(vault kv get -field=esl_password secret/trustnow/freeswitch)

cat > $ROOT/config/freeswitch/autoload_configs/event_socket.conf.xml << EOF
<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="127.0.0.1"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="${ESL_PASS}"/>
    <param name="apply-inbound-acl" value="loopback.auto"/>
  </settings>
</configuration>
EOF
```

---

### §7.4 — Sofia SIP Profile

Sofia handles SIP signalling on :5060 (UDP/TCP) and :5061 (TLS). The profile binds to the server IP.

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack

cat > $ROOT/config/freeswitch/sip_profiles/internal.xml << 'EOF'
<profile name="internal">
  <settings>
    <param name="debug" value="0"/>
    <param name="sip-ip" value="172.25.10.142"/>
    <param name="rtp-ip" value="172.25.10.142"/>
    <param name="ext-sip-ip" value="172.25.10.142"/>
    <param name="ext-rtp-ip" value="172.25.10.142"/>
    <param name="sip-port" value="5060"/>
    <param name="tls" value="true"/>
    <param name="tls-sip-port" value="5061"/>
    <param name="tls-cert-dir" value="/etc/freeswitch/ssl"/>
    <param name="rtp-timer-name" value="soft"/>
    <param name="codec-prefs" value="PCMU,PCMA,G722"/>
    <param name="inbound-codec-negotiation" value="generous"/>
    <param name="rtp-start-port" value="16384"/>
    <param name="rtp-end-port" value="32768"/>
    <param name="record-path" value="/var/lib/freeswitch/recordings"/>
    <param name="record-format" value="%s.wav"/>
    <param name="manage-presence" value="false"/>
    <param name="sip-options-respond-503-on-busy" value="true"/>
    <param name="session-timeout" value="1800"/>
    <param name="dtmf-type" value="rfc2833"/>
    <!-- Pass CID in User-to-User header on transfers (BRD-CC-008) -->
    <param name="pass-callee-id" value="true"/>
  </settings>
  <gateways/>
</profile>
EOF
```

Copy TLS certificates into FreeSWITCH config (uses the existing self-signed certs):

```bash
mkdir -p $ROOT/config/freeswitch/ssl
cp $ROOT/ssl/trustnow.crt $ROOT/config/freeswitch/ssl/agent.pem
cp $ROOT/ssl/trustnow.key $ROOT/config/freeswitch/ssl/agent.pem
cat $ROOT/ssl/trustnow.crt $ROOT/ssl/trustnow.key > $ROOT/config/freeswitch/ssl/agent.pem
chmod 600 $ROOT/config/freeswitch/ssl/agent.pem
```

---

### §7.5 — Music on Hold Configuration

MOH plays to the caller during AI processing latency gaps and while awaiting handoff. Global default MOH is configured here; per-tenant overrides are wired in Task 12.

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack

cat > $ROOT/config/freeswitch/autoload_configs/local_stream.conf.xml << 'EOF'
<configuration name="local_stream.conf" description="Stream Files from Disk">
  <directory name="default" path="/usr/share/freeswitch/sounds/music/default">
    <param name="rate" value="8000"/>
    <param name="shuffle" value="true"/>
    <param name="channels" value="1"/>
    <param name="interval" value="10"/>
    <param name="timer-name" value="soft"/>
  </directory>
</configuration>
EOF
```

---

### §7.6 — Call Recording + CID Dialplan (BRD-L5-REC-002, BRD-CC-008)

This dialplan does three things on every inbound call:
1. Generates the CID by calling the Platform API session initiation endpoint
2. Starts recording the call, naming the file by CID
3. Routes the call to the AI pipeline WebSocket bridge

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack

cat > $ROOT/config/freeswitch/dialplan/trustnow_inbound.xml << 'EOF'
<include>
  <context name="trustnow_inbound">

    <!-- Inbound call handler: generate CID, start recording, bridge to AI pipeline -->
    <extension name="trustnow_ai_handler">
      <condition field="destination_number" expression="^(\d+)$">

        <!-- Step 1: Generate CID via Platform API -->
        <action application="curl" data="http://127.0.0.1:3001/api/sessions/initiate method=POST content-type=application/json body={'caller_ani':'${caller_id_number}','agent_id':'${destination_number}'}"/>
        <action application="set" data="trustnow_cid=${curl_response_data}"/>

        <!-- Step 2: Set User-to-User header for SIP transfers (BRD-CC-008) -->
        <action application="set" data="sip_h_User-to-User=${trustnow_cid};encoding=ascii"/>

        <!-- Step 3: Start call recording — file named by CID -->
        <action application="record_session" data="/var/lib/freeswitch/recordings/${trustnow_cid}.wav"/>

        <!-- Step 4: Log CID to channel variable for ESL event subscriptions -->
        <action application="export" data="trustnow_cid=${trustnow_cid}"/>

        <!-- Step 5: Bridge to AI pipeline (LiveKit WebRTC via REFER or direct audio inject) -->
        <action application="answer"/>
        <action application="playback" data="local_stream://default"/>
        <action application="socket" data="127.0.0.1:8084 async full"/>

      </condition>
    </extension>

    <!-- Human handoff transfer — internal TRUSTNOW queue (Option B) -->
    <extension name="trustnow_queue_transfer">
      <condition field="destination_number" expression="^queue-(.+)$">
        <action application="set" data="sip_h_User-to-User=${trustnow_cid};encoding=ascii"/>
        <action application="set" data="queue_name=$1"/>
        <action application="socket" data="127.0.0.1:8084 async full"/>
      </condition>
    </extension>

    <!-- External SIP transfer — Option A handoff to PBX/CCaaS -->
    <extension name="trustnow_sip_transfer">
      <condition field="destination_number" expression="^transfer-(.+)$">
        <action application="set" data="sip_h_User-to-User=${trustnow_cid};encoding=ascii"/>
        <action application="transfer" data="$1 XML trustnow_inbound"/>
      </condition>
    </extension>

  </context>
</include>
EOF
```

---

### §7.7 — modules.conf.xml (enable required modules)

```bash
cat > $ROOT/config/freeswitch/autoload_configs/modules.conf.xml << 'EOF'
<configuration name="modules.conf" description="Modules">
  <modules>
    <load module="mod_sofia"/>
    <load module="mod_commands"/>
    <load module="mod_dptools"/>
    <load module="mod_event_socket"/>
    <load module="mod_local_stream"/>
    <load module="mod_native_file"/>
    <load module="mod_tone_stream"/>
    <load module="mod_curl"/>
    <load module="mod_xml_curl"/>
    <load module="mod_logfile"/>
    <load module="mod_console"/>
    <load module="mod_cdr_csv"/>
  </modules>
</configuration>
EOF
```

---

### §7.8 — Start FreeSWITCH Container

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
cd $ROOT/config/freeswitch
docker compose up -d
docker logs trustnow-freeswitch --tail=50
```

**VERIFY:**
```bash
# Container running
docker ps | grep trustnow-freeswitch

# SIP port listening
ss -ulnp | grep 5060
ss -tlnp | grep 5060

# ESL port listening (localhost only)
ss -tlnp | grep 8021

# No errors in logs
docker logs trustnow-freeswitch 2>&1 | grep -i "error\|critical\|FAILED" | tail -20
```

Expected: container Up, 5060 listening, 8021 listening on 127.0.0.1 only, no critical errors in logs.

---

### §7.9 — LiveKit Server (WebRTC SFU — BRD §11.4)

Each conversation = one LiveKit Room, named by CID. Participants: caller (browser WebRTC) + AI pipeline (audio injection). Room created at session initiation, destroyed at session end.

**§7.9.1 — Install LiveKit binary**

```bash
cd /tmp
# Use the pinned stable release
LIVEKIT_VERSION=v1.7.2
wget -q https://github.com/livekit/livekit/releases/download/${LIVEKIT_VERSION}/livekit_linux_amd64.tar.gz
tar -xzf livekit_linux_amd64.tar.gz
sudo mv livekit /usr/local/bin/livekit
sudo chmod +x /usr/local/bin/livekit
livekit --version
rm livekit_linux_amd64.tar.gz
```

**§7.9.2 — Vault secrets for LiveKit**

```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/vault-env.sh

LK_KEY_ID="trustnow-livekit-key"
LK_SECRET=$(openssl rand -hex 32)

vault kv put secret/trustnow/livekit \
  key_id="$LK_KEY_ID" \
  key_secret="$LK_SECRET"

echo "LiveKit credentials stored in Vault at secret/trustnow/livekit"
```

**§7.9.3 — LiveKit config.yaml**

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
mkdir -p $ROOT/config/livekit

LK_KEY_ID=$(vault kv get -field=key_id secret/trustnow/livekit)
LK_SECRET=$(vault kv get -field=key_secret secret/trustnow/livekit)

cat > $ROOT/config/livekit/config.yaml << EOF
port: 7880
bind_addresses:
  - 0.0.0.0
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
  node_ip: 172.25.10.142
keys:
  ${LK_KEY_ID}: ${LK_SECRET}
logging:
  level: info
  pion_level: error
room:
  auto_create: true
  empty_timeout: 300
  departure_timeout: 20
EOF

chmod 600 $ROOT/config/livekit/config.yaml
```

**§7.9.4 — LiveKit systemd service**

```bash
sudo bash -c "cat > /etc/systemd/system/livekit.service << 'EOF'
[Unit]
Description=TRUSTNOW LiveKit WebRTC SFU
After=network.target

[Service]
User=trustnow
ExecStart=/usr/local/bin/livekit --config /opt/trustnowailabs/trustnow-ai-worker-stack/config/livekit/config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable livekit
sudo systemctl start livekit
sudo systemctl status livekit
```

**VERIFY:**
```bash
# Service active
systemctl is-active livekit

# Port 7880 listening
ss -tlnp | grep 7880

# Health check
curl -s http://127.0.0.1:7880/
# Expected: livekit version string or empty 200

# LiveKit JWT token test (uses livekit-cli if installed, or curl)
LK_KEY_ID=$(vault kv get -field=key_id secret/trustnow/livekit)
LK_SECRET=$(vault kv get -field=key_secret secret/trustnow/livekit)
echo "LiveKit key_id=$LK_KEY_ID — VERIFY matches config.yaml"
```

---

### §7.10 — NestJS EslService (Platform API subscribes to FreeSWITCH events)

Create the telephony module directory in the Platform API:

```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/telephony
```

**File: `services/platform-api/src/telephony/esl.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'net';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EslService extends EventEmitter2 implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EslService.name);
  private client: net.Socket;
  private connected = false;
  private buffer = '';
  private readonly ESL_HOST = '127.0.0.1';
  private readonly ESL_PORT = 8021;

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private async connect(): Promise<void> {
    this.client = new net.Socket();

    this.client.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.client.on('error', (err) => {
      this.logger.error(`ESL connection error: ${err.message}`);
      this.connected = false;
      setTimeout(() => this.connect(), 5000); // reconnect after 5s
    });

    this.client.on('close', () => {
      this.logger.warn('ESL connection closed — reconnecting in 5s');
      this.connected = false;
      setTimeout(() => this.connect(), 5000);
    });

    return new Promise((resolve) => {
      this.client.connect(this.ESL_PORT, this.ESL_HOST, () => {
        this.logger.log('ESL connected to FreeSWITCH');
        this.connected = true;
        resolve();
      });
    });
  }

  private processBuffer(): void {
    const parts = this.buffer.split('\n\n');
    for (let i = 0; i < parts.length - 1; i++) {
      this.handleMessage(parts[i]);
    }
    this.buffer = parts[parts.length - 1];
  }

  private handleMessage(message: string): void {
    if (message.includes('Content-Type: auth/request')) {
      const eslPass = process.env.FREESWITCH_ESL_PASSWORD || '';
      this.send(`auth ${eslPass}\n\n`);
      this.send('events plain CHANNEL_ANSWER CHANNEL_HANGUP CHANNEL_BRIDGE DTMF DETECTED_SPEECH\n\n');
      this.logger.log('ESL authenticated — subscribed to TRUSTNOW call events');
      return;
    }

    if (message.includes('Event-Name: CHANNEL_ANSWER')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      if (cid) {
        this.emit('CHANNEL_ANSWER', { cid, channelUuid });
        this.logger.log(`CHANNEL_ANSWER — CID: ${cid}`);
      }
    }

    if (message.includes('Event-Name: CHANNEL_HANGUP')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      const cause = this.extractHeader(message, 'Hangup-Cause');
      if (cid) {
        this.emit('CHANNEL_HANGUP', { cid, channelUuid, cause });
        this.logger.log(`CHANNEL_HANGUP — CID: ${cid}, cause: ${cause}`);
      }
    }

    if (message.includes('Event-Name: CHANNEL_BRIDGE')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      if (cid) {
        this.emit('CHANNEL_BRIDGE', { cid, channelUuid });
        this.logger.log(`CHANNEL_BRIDGE (handoff) — CID: ${cid}`);
      }
    }

    if (message.includes('Event-Name: DETECTED_SPEECH')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      if (cid) {
        this.emit('DETECTED_SPEECH', { cid });
      }
    }
  }

  private extractHeader(message: string, header: string): string | null {
    const match = message.match(new RegExp(`^${header}: (.+)$`, 'm'));
    return match ? match[1].trim() : null;
  }

  send(command: string): void {
    if (this.connected) {
      this.client.write(command);
    }
  }

  transferCall(channelUuid: string, destination: string, cid: string): void {
    // Option A: SIP transfer with CID in UUI header (BRD-CC-008)
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: set\nexecute-app-arg: sip_h_User-to-User=${cid};encoding=ascii\n\n`);
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: transfer\nexecute-app-arg: ${destination}\n\n`);
  }

  playMoh(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: playback\nexecute-app-arg: local_stream://default\n\n`);
  }

  stopMoh(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: stop_playback\nexecute-app-arg: \n\n`);
  }

  startRecording(channelUuid: string, cid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: record_session\nexecute-app-arg: /var/lib/freeswitch/recordings/${cid}.wav\n\n`);
  }

  stopRecording(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: stop_record_session\nexecute-app-arg: all\n\n`);
  }

  private disconnect(): void {
    if (this.client) {
      this.client.destroy();
    }
  }
}
```

---

### §7.11 — NestJS HandoffModule (Dual Protocol — BRD-L4-004, BRD-L4-005)

**File: `services/platform-api/src/telephony/handoff.controller.ts`**

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HandoffService } from './handoff.service';

export class ExecuteHandoffDto {
  cid: string;
  handoff_type: 'A' | 'B';          // A = SIP transfer, B = internal queue
  target?: string;                   // Option A: SIP URI / phone number
  agent_id?: string;                 // Option B: preferred agent_id (optional)
  transcript: any[];                 // Full conversation transcript
  context: Record<string, any>;      // All session context
  channel_uuid: string;              // FreeSWITCH channel UUID
}

@ApiTags('Handoff')
@Controller('handoff')
@UseGuards(JwtAuthGuard)
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute human handoff — Option A (SIP) or Option B (internal queue)' })
  async execute(@Body() dto: ExecuteHandoffDto) {
    return this.handoffService.execute(dto);
  }
}
```

**File: `services/platform-api/src/telephony/handoff.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EslService } from './esl.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ExecuteHandoffDto } from './handoff.controller';

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    private readonly eslService: EslService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async execute(dto: ExecuteHandoffDto): Promise<{ status: string; queue_position?: number }> {
    this.logger.log(`Handoff execute — CID: ${dto.cid}, type: ${dto.handoff_type}`);

    if (dto.handoff_type === 'A') {
      return this.executeOptionA(dto);
    } else {
      return this.executeOptionB(dto);
    }
  }

  // Option A — Integration-Layer Transfer: SIP transfer to external PBX/CCaaS
  // CID passed in SIP UUI header (BRD-CC-008, BRD-L4-004)
  private async executeOptionA(dto: ExecuteHandoffDto): Promise<{ status: string }> {
    if (!dto.target) {
      throw new Error('Option A handoff requires a target SIP URI or phone number');
    }

    // Play MOH to caller while transfer is in progress
    this.eslService.playMoh(dto.channel_uuid);

    // Issue SIP transfer with CID in UUI header via ESL
    this.eslService.transferCall(dto.channel_uuid, dto.target, dto.cid);

    // Record handoff event in Redis session
    await this.redis.hset(`session:${dto.cid}`, {
      handoff_type: 'A',
      handoff_target: dto.target,
      handoff_at: new Date().toISOString(),
    });

    this.logger.log(`Option A handoff issued — CID: ${dto.cid} → ${dto.target}`);
    return { status: 'transfer_issued' };
  }

  // Option B — Internal TRUSTNOW Agent Console: push to Redis queue
  // Human Agent Desktop subscribes via WebSocket (BRD-L4-005)
  private async executeOptionB(dto: ExecuteHandoffDto): Promise<{ status: string; queue_position: number }> {
    const queueKey = 'trustnow:handoff:queue';
    const contextKey = `trustnow:handoff:context:${dto.cid}`;

    // Build complete handoff payload for the Human Agent Desktop
    const handoffPayload = {
      cid: dto.cid,
      channel_uuid: dto.channel_uuid,
      timestamp: new Date().toISOString(),
      transcript: dto.transcript,
      context: dto.context,
      preferred_agent_id: dto.agent_id || null,
    };

    // Store full context so agent desktop can retrieve it
    await this.redis.setex(contextKey, 3600, JSON.stringify(handoffPayload));

    // Push CID to handoff queue (FIFO)
    const queueLength = await this.redis.rpush(queueKey, dto.cid);

    // Play MOH to caller while awaiting human agent pickup
    this.eslService.playMoh(dto.channel_uuid);

    // Publish WebSocket notification to Human Agent Desktop (Task 12)
    await this.redis.publish('trustnow:handoff:notify', JSON.stringify({
      cid: dto.cid,
      queue_position: queueLength,
      preferred_agent_id: dto.agent_id || null,
    }));

    // Record handoff event in Redis session
    await this.redis.hset(`session:${dto.cid}`, {
      handoff_type: 'B',
      handoff_queue_position: queueLength,
      handoff_at: new Date().toISOString(),
    });

    this.logger.log(`Option B handoff queued — CID: ${dto.cid}, queue position: ${queueLength}`);
    return { status: 'queued', queue_position: queueLength };
  }
}
```

**File: `services/platform-api/src/telephony/telephony.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EslService } from './esl.service';
import { HandoffService } from './handoff.service';
import { HandoffController } from './handoff.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [HandoffController],
  providers: [EslService, HandoffService],
  exports: [EslService, HandoffService],
})
export class TelephonyModule {}
```

Register `TelephonyModule` in `app.module.ts` alongside the existing 13 modules:

```typescript
// In app.module.ts imports array, add:
import { TelephonyModule } from './telephony/telephony.module';
// ... add TelephonyModule to @Module({ imports: [..., TelephonyModule] })
```

Add environment variable to the Platform API systemd service:

```bash
sudo systemctl edit trustnow-platform-api --force
# Add under [Service]:
# Environment=FREESWITCH_ESL_PASSWORD=<value from vault>
```

Read from Vault and inject:

```bash
ESL_PASS=$(vault kv get -field=esl_password secret/trustnow/freeswitch)
sudo mkdir -p /etc/systemd/system/trustnow-platform-api.service.d
sudo bash -c "cat > /etc/systemd/system/trustnow-platform-api.service.d/esl.conf << EOF
[Service]
Environment=FREESWITCH_ESL_PASSWORD=${ESL_PASS}
EOF"
sudo systemctl daemon-reload
sudo systemctl restart trustnow-platform-api
```

Install required npm packages:

```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api
npm install @nestjs/event-emitter
```

---

### §7.12 — AI Pipeline: handoff_service.py

This module is called from the AI pipeline turn loop when the agent decides a handoff is required. It calls the NestJS HandoffModule via REST.

**File: `services/ai-pipeline/handoff_service.py`**

```python
"""
handoff_service.py — TRUSTNOW AI Pipeline Handoff Helper
Called from the agent turn loop when handoff conditions are met.
Makes a REST call to the NestJS HandoffModule (POST /handoff/execute).
"""
import httpx
import asyncio
import logging
from typing import Optional, List, Dict, Any, Literal

logger = logging.getLogger(__name__)

PLATFORM_API_URL = "http://127.0.0.1:3001"

# Handoff trigger conditions (BRD §7.3.1)
HANDOFF_TRIGGERS = {
    "confidence_threshold",   # LLM confidence below configured floor
    "caller_request",         # Caller explicitly asked for human
    "keyword_detection",      # Trigger keyword detected in transcript
    "intent_mapping",         # Intent classifier maps to escalation intent
    "sme_escalation",         # Agent flagged query as requiring SME
    "max_duration_exceeded",  # Call exceeded configured max duration
}


async def execute_handoff(
    cid: str,
    channel_uuid: str,
    handoff_type: Literal["A", "B"],
    transcript: List[Dict[str, Any]],
    context: Dict[str, Any],
    target: Optional[str] = None,
    agent_id: Optional[str] = None,
    trigger: str = "caller_request",
    jwt_token: str = "",
) -> Dict[str, Any]:
    """
    Execute human handoff via Platform API.

    Args:
        cid: Conversation ID
        channel_uuid: FreeSWITCH channel UUID (from ESL CHANNEL_ANSWER event)
        handoff_type: "A" = SIP transfer to external PBX/CCaaS
                      "B" = internal TRUSTNOW Agent Console queue
        transcript: Full conversation transcript up to handoff point
        context: Full session context (agent_id, tenant_id, language, data_collection results, etc.)
        target: SIP URI or phone number (Option A only)
        agent_id: Preferred human agent ID (Option B, optional)
        trigger: Which condition triggered the handoff (for audit log)
        jwt_token: Platform API JWT for authentication
    """
    payload = {
        "cid": cid,
        "channel_uuid": channel_uuid,
        "handoff_type": handoff_type,
        "transcript": transcript,
        "context": {**context, "handoff_trigger": trigger},
        "target": target,
        "agent_id": agent_id,
    }

    logger.info(f"Handoff initiated — CID: {cid}, type: {handoff_type}, trigger: {trigger}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{PLATFORM_API_URL}/api/handoff/execute",
                json=payload,
                headers={"Authorization": f"Bearer {jwt_token}"},
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Handoff result — CID: {cid}: {result}")
            return result
    except httpx.HTTPError as e:
        logger.error(f"Handoff HTTP error — CID: {cid}: {e}")
        raise
    except Exception as e:
        logger.error(f"Handoff unexpected error — CID: {cid}: {e}")
        raise


def check_handoff_conditions(
    transcript: List[Dict[str, Any]],
    agent_config: Dict[str, Any],
    session_state: Dict[str, Any],
) -> Optional[str]:
    """
    Check whether any handoff trigger condition is met.
    Returns the trigger name if handoff should occur, else None.
    Called from the agent turn loop after each LLM response.
    """
    latest_turn = transcript[-1] if transcript else {}
    caller_text = latest_turn.get("caller", "").lower()

    # Caller explicitly requested human
    human_request_phrases = [
        "speak to a human", "speak to someone", "real person", "talk to an agent",
        "transfer me", "human agent", "customer service", "representative",
    ]
    if any(phrase in caller_text for phrase in human_request_phrases):
        return "caller_request"

    # Keyword detection — checks agent_config.guardrails
    escalation_keywords = agent_config.get("guardrails_escalation_keywords", [])
    if any(kw.lower() in caller_text for kw in escalation_keywords):
        return "keyword_detection"

    # Max duration exceeded
    max_duration_s = agent_config.get("max_duration_value", 1800)
    elapsed_s = session_state.get("elapsed_seconds", 0)
    if elapsed_s >= max_duration_s:
        return "max_duration_exceeded"

    return None  # No handoff needed
```

Install httpx in AI pipeline venv if not already present:

```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install httpx
deactivate
```

---

### §7.13 — Build & Restart Platform API

```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api
npm run build
sudo systemctl restart trustnow-platform-api
sleep 5
sudo systemctl status trustnow-platform-api
```

---

### §7.14 — Full Verification (Run Every Check — Report All Results)

```bash
echo "=== TASK 7 VERIFICATION ==="

echo "--- Check 1: FreeSWITCH container ---"
docker ps --filter name=trustnow-freeswitch --format "{{.Names}} {{.Status}}"
# Expected: trustnow-freeswitch Up

echo "--- Check 2: SIP ports ---"
ss -ulnp | grep 5060 && echo "UDP 5060 OK" || echo "FAIL: UDP 5060 not listening"
ss -tlnp | grep 5060 && echo "TCP 5060 OK" || echo "WARN: TCP 5060 not listening (UDP primary)"

echo "--- Check 3: ESL port (localhost only) ---"
ss -tlnp | grep 8021 && echo "ESL 8021 OK" || echo "FAIL: ESL 8021 not listening"
# Verify NOT externally accessible:
ss -tlnp | grep 8021 | grep -v "127.0.0.1" && echo "FAIL: ESL exposed externally" || echo "ESL restricted to localhost OK"

echo "--- Check 4: LiveKit service ---"
systemctl is-active livekit && echo "LiveKit active OK" || echo "FAIL: LiveKit not active"
ss -tlnp | grep 7880 && echo "LiveKit :7880 OK" || echo "FAIL: LiveKit :7880 not listening"

echo "--- Check 5: LiveKit UDP range ---"
# UDP 50000-60000 should be available (UFW already permits this range)
sudo ufw status | grep "50000:60000" && echo "UFW UDP 50000-60000 OK" || echo "WARN: Check UFW rules"

echo "--- Check 6: Vault secrets ---"
source /opt/trustnowailabs/trustnow-ai-worker-stack/vault-env.sh
vault kv get secret/trustnow/freeswitch | grep esl_password && echo "FreeSWITCH Vault secret OK"
vault kv get secret/trustnow/livekit | grep key_id && echo "LiveKit Vault secret OK"

echo "--- Check 7: Platform API restart + health ---"
curl -s http://127.0.0.1:3001/health | grep '"status":"ok"' && echo "Platform API health OK" || echo "FAIL: Platform API not healthy"

echo "--- Check 8: Handoff endpoint registered ---"
curl -s http://127.0.0.1:3001/api/docs-json | python3 -c "import sys,json; d=json.load(sys.stdin); print('handoff/execute' if '/handoff/execute' in str(d) else 'FAIL: handoff route not found')"

echo "--- Check 9: ESL connection from Platform API ---"
# Check platform API logs for ESL authentication success
sudo journalctl -u trustnow-platform-api --no-pager -n 50 | grep "ESL authenticated" && echo "ESL auth OK" || echo "WARN: ESL auth line not yet visible — check logs manually"

echo "--- Check 10: FreeSWITCH logs — no critical errors ---"
docker logs trustnow-freeswitch 2>&1 | grep -iE "CRIT|FATAL|ERROR" | grep -v "^#" | tail -10
echo "Review above — expected: no CRIT/FATAL errors"

echo "--- Check 11: Recording directory ---"
ls -la /opt/trustnowailabs/trustnow-ai-worker-stack/data/recordings/ && echo "Recording dir OK"

echo "--- Check 12: handoff_service.py import ---"
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
python3 -c "from handoff_service import execute_handoff, check_handoff_conditions; print('handoff_service import OK')"
deactivate

echo "=== END TASK 7 VERIFICATION ==="
```

All 12 checks must pass (or have acceptable explanations) before updating RUNBOOK.md.

---

### §7.15 — RUNBOOK.md Update

After all verifications pass, append a Task 7 entry to RUNBOOK.md in the COMPLETED TASKS section with the date, a description of everything done, and the verification pass results (12/12). Follow the same format as all previous task entries.

---

### §7.16 — Post-Task Notes & Deferrals

- **DEFERRED-009 — SBC/SRTP perimeter hardening:** Session Border Controller and SRTP media encryption are required before production go-live but are deferred to the pre-go-live hardening phase. Do not block Task 7 completion on this.
- **Per-tenant MOH:** Global MOH is configured here. Tenant-specific hold music will be wired in Task 12 (Human Agent Desktop) when tenant profile management is built.
- **LiveKit SDK in AI pipeline:** The LiveKit Python SDK (`livekit` package) will be integrated into the AI pipeline turn loop in Task 9 when the full conversation runtime is built. Task 7 installs and verifies the LiveKit server only.
- **FreeSWITCH dialplan curl integration:** The `mod_curl` call to Platform API `/api/sessions/initiate` in the inbound dialplan requires the sessions endpoint to be built in Task 9. The dialplan is installed here; the endpoint it calls is wired in Task 9.

---

---

## TASK ADDENDUM — PRE-TASK-8 BACKFILL (CO-BROWSING TRANSLATION ADDITIONS)

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK ADDENDUM

Read RUNBOOK.md and confirm Task 7 is marked COMPLETE before starting this addendum.

**Context:** After Task 7 was completed, the Master Architect completed a full co-browsing translation of CO-BROWSING-DATA-001.md v3.0 (22 sections). This added 28 new database tables, 21 new NestJS endpoint modules (§6.2D through §6.2X), two new AI pipeline services, and a FreeSWITCH outbound gateway requirement. All of this must be built and verified before Task 8 begins. Task 8 depends on these APIs being live.

**Execute the four addendum tasks below in strict sequence: 4A → 5A → 6A → 7A.**

**Full autonomy on all four tasks — no confirmation needed between steps. Report back only when all four addendum tasks are complete or if something fails.**

---

### ADDENDUM 4A — Database Schema Backfill

**Objective:** Verify the live PostgreSQL instance has all 28 new tables added during the co-browsing translation. Run migrations for any that are missing.

---

#### Step 4A.1 — Audit existing schema

```bash
source /opt/trustnowailabs/trustnow-ai-worker-stack/config/vault/vault-env.sh
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)

psql "postgresql://trustnow_app:$PG_PASS@127.0.0.1:5433/trustnow_platform" -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;" 2>&1 | tee /tmp/schema_audit.txt

echo "--- Schema audit complete. Review missing tables below. ---"
```

**Expected tables from the co-browsing translation — verify each exists:**
```
agent_branches             agent_knowledge_base        agent_test_attachments
agent_tests                api_keys                    batch_calls
batch_call_recipients      branch_versions             conversation_turns
data_collection_specs      environment_variable_values environment_variables
evaluation_criteria        knowledge_base_docs         phone_numbers
stt_transcripts            test_folders                test_runs
tts_generations            webhook_delivery_log        webhook_endpoints
whatsapp_accounts          workflow_edges              workflow_nodes
workflow_versions          workspace_auth_connections  workspace_secrets
workspace_settings
```

---

#### Step 4A.2 — Create migration file for missing tables

```bash
MIGRATION=/opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/migrations/002_cobrowsing_additions.sql

cat > $MIGRATION << 'MIGRATION_EOF'
-- TRUSTNOW Migration 002: Co-browsing translation additions
-- Run ONLY for tables that are confirmed missing from Step 4A.1 audit.
-- Each CREATE TABLE is wrapped in IF NOT EXISTS to be idempotent.

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
  recipient_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_call_id   UUID NOT NULL REFERENCES batch_calls(batch_call_id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
  phone_number    VARCHAR(20) NOT NULL,
  dynamic_variables JSONB DEFAULT '{}',
  overrides       JSONB DEFAULT '{}',
  status          VARCHAR(20) DEFAULT 'pending',
  conversation_id UUID REFERENCES conversations(conversation_id),
  attempted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
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
-- Full-text search index for transcript content
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
MIGRATION_EOF

echo "Migration file written to $MIGRATION"
```

---

#### Step 4A.3 — Verify three schema corrections in the live DB

```bash
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)

psql "postgresql://trustnow_app:$PG_PASS@127.0.0.1:5433/trustnow_platform" << 'EOF'
-- Correction 1: knowledge_base_docs must NOT have agent_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'knowledge_base_docs' AND column_name = 'agent_id';
-- Expected: 0 rows. If 1 row returned → run: ALTER TABLE knowledge_base_docs DROP COLUMN agent_id;

-- Correction 2: agent_configs must NOT have workflow_definition_json column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'agent_configs' AND column_name = 'workflow_definition_json';
-- Expected: 0 rows. If 1 row returned → run: ALTER TABLE agent_configs DROP COLUMN workflow_definition_json;

-- Correction 3: agent_configs.rag_enabled default must be true
SELECT column_default FROM information_schema.columns
WHERE table_name = 'agent_configs' AND column_name = 'rag_enabled';
-- Expected: 'true'. If 'false' → run: ALTER TABLE agent_configs ALTER COLUMN rag_enabled SET DEFAULT true;
EOF
```

---

#### Step 4A.4 — Apply migration and verify

```bash
PG_PASS=$(vault kv get -field=app_password secret/trustnow/platform/postgres)

# Apply migration (idempotent — safe to run even if some tables already exist)
psql "postgresql://trustnow_app:$PG_PASS@127.0.0.1:5433/trustnow_platform" \
  -f /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/migrations/002_cobrowsing_additions.sql \
  2>&1 | tee /tmp/migration_002.log

# Verify all 28 tables now exist
psql "postgresql://trustnow_app:$PG_PASS@127.0.0.1:5433/trustnow_platform" -c "
SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: ≥ 47 tables (19 original + 28 new)
```

**✅ Addendum 4A complete when:** Migration runs with no ERROR lines in `/tmp/migration_002.log` and table count ≥ 47.

---

---

### ADDENDUM 5A — AI Pipeline Backfill (Two New Services)

**Objective:** Add `resolveEnvVars()` and the PII Redaction service to the FastAPI AI pipeline. Both are required before any BPO client deployment.

---

#### Step 5A.1 — Add `resolveEnvVars()` resolution service

**File:** `services/ai-pipeline/src/env_var_service.py` (new file)

```python
# env_var_service.py
# Resolves {{env.VAR_NAME}} tokens in agent config text fields at conversation start.
# Called from: system_prompt resolution, first_message resolution,
#              tool webhook URL/header resolution, MCP server_url resolution.

import re
import asyncpg
from typing import Optional

ENV_VAR_PATTERN = re.compile(r'\{\{env\.([A-Za-z][A-Za-z0-9_]*)\}\}')


async def resolve_env_vars(
    text: str,
    tenant_id: str,
    environment: str,   # 'production' | 'staging' | 'development' | custom
    db_pool: asyncpg.Pool
) -> str:
    """
    Replace all {{env.VAR_NAME}} tokens in text with their resolved values.
    Falls back to production value if no override exists for the current environment.
    Raises ValueError if a referenced variable has no production value.
    """
    tokens = ENV_VAR_PATTERN.findall(text)
    if not tokens:
        return text

    async with db_pool.acquire() as conn:
        for var_name in set(tokens):  # deduplicate
            # Look up variable
            var = await conn.fetchrow(
                "SELECT var_id FROM environment_variables "
                "WHERE tenant_id = $1 AND name = $2",
                tenant_id, var_name
            )
            if not var:
                raise ValueError(f"Environment variable '{var_name}' not found for tenant {tenant_id}")

            # Try current environment first, fall back to production
            value_row = await conn.fetchrow(
                "SELECT value FROM environment_variable_values "
                "WHERE var_id = $1 AND environment = $2",
                var['var_id'], environment
            )
            if not value_row:
                value_row = await conn.fetchrow(
                    "SELECT value FROM environment_variable_values "
                    "WHERE var_id = $1 AND environment = 'production'",
                    var['var_id']
                )
            if not value_row:
                raise ValueError(
                    f"Variable '{var_name}' has no value for environment "
                    f"'{environment}' and no production fallback."
                )

            text = text.replace(f'{{{{env.{var_name}}}}}', value_row['value'])

    return text
```

**Wire into `main.py`:** At conversation initiation (before first LLM call), resolve env vars in:
- `agent_configs.system_prompt`
- `agent_configs.first_message`
- Each tool's `url` and `headers` values
- Each MCP server's `server_url`

```python
# In session_init() or equivalent in main.py, after loading agent_configs:
from env_var_service import resolve_env_vars

environment = agent_configs.get('environment', 'production')
system_prompt = await resolve_env_vars(
    agent_configs['system_prompt'], tenant_id, environment, db_pool
)
first_message = await resolve_env_vars(
    agent_configs['first_message'], tenant_id, environment, db_pool
)
# Repeat for each tool URL/header and each MCP server_url
```

---

#### Step 5A.2 — Add PII Redaction service

**File:** `services/ai-pipeline/src/pii_redaction_service.py` (new file)

```python
# pii_redaction_service.py
# Redacts PII from transcript text before storage.
# Called AFTER conversation_turns is populated, BEFORE writing to conversations.transcript_json.
# Only active when agent_configs.pii_redaction_enabled = True.

import re
from typing import Any

# PII patterns — extend as required for regional compliance (TRAI, GDPR, TCPA)
PII_PATTERNS = [
    # UK/IN mobile numbers: +447xxx or 07xxx or +919xxx
    (re.compile(r'\b(\+44|0)7\d{9}\b'), '[PHONE_NUMBER]'),
    (re.compile(r'\b(\+91)?[6-9]\d{9}\b'), '[PHONE_NUMBER]'),
    # Generic international E.164
    (re.compile(r'\+[1-9]\d{6,14}\b'), '[PHONE_NUMBER]'),
    # Payment card numbers (16-digit, with or without spaces/dashes)
    (re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'), '[CARD_NUMBER]'),
    # UK National Insurance
    (re.compile(r'\b[A-Z]{2}\d{6}[A-D]\b', re.IGNORECASE), '[NI_NUMBER]'),
    # Date of birth patterns: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    (re.compile(r'\b\d{1,2}[/\-]\d{1,2}[/\-]\d{4}\b'), '[DOB]'),
    (re.compile(r'\b\d{4}[/\-]\d{1,2}[/\-]\d{1,2}\b'), '[DOB]'),
    # Sort codes (UK banking): 12-34-56
    (re.compile(r'\b\d{2}[\-]\d{2}[\-]\d{2}\b'), '[SORT_CODE]'),
    # Bank account numbers (UK: 8 digits)
    (re.compile(r'\b\d{8}\b'), '[ACCOUNT_NUMBER]'),
    # Email addresses
    (re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL]'),
]


def redact_pii(text: str) -> str:
    """Apply all PII patterns to a text string. Returns redacted version."""
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def redact_transcript_json(transcript_json: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Redact PII from all text fields in a conversation turns array.
    transcript_json is a list of {speaker, text, ...} objects.
    Returns a new list with text fields redacted — does not mutate input.
    """
    redacted = []
    for turn in transcript_json:
        turn_copy = dict(turn)
        if 'text' in turn_copy and turn_copy['text']:
            turn_copy['text'] = redact_pii(turn_copy['text'])
        redacted.append(turn_copy)
    return redacted
```

**Wire into conversation storage pipeline in `main.py`:**

```python
# In session_end_handler() or wherever transcript is written to DB:
from pii_redaction_service import redact_transcript_json

if agent_configs.get('pii_redaction_enabled', False):
    transcript_json = redact_transcript_json(transcript_json)
    # plain_text for stt_transcripts also needs redaction if present
```

---

#### Step 5A.3 — Restart AI pipeline and smoke test

```bash
# Restart FastAPI service
cd /opt/trustnowailabs/trustnow-ai-worker-stack
docker compose restart ai-pipeline   # or: sudo systemctl restart trustnow-ai-pipeline

# Wait for startup
sleep 5

# Smoke test: env var resolution (unit test)
python3 << 'EOF'
import asyncio
import asyncpg
import os

async def test_resolve():
    # Simple pattern-only test (no DB needed for syntax check)
    import sys
    sys.path.insert(0, 'services/ai-pipeline/src')
    from env_var_service import ENV_VAR_PATTERN
    tokens = ENV_VAR_PATTERN.findall("Hello {{env.MY_API_URL}} and {{env.CRM_TOKEN}}")
    assert tokens == ['MY_API_URL', 'CRM_TOKEN'], f"Pattern test failed: {tokens}"
    print("✅ env_var_service: pattern matching OK")

asyncio.run(test_resolve())
EOF

# Smoke test: PII redaction
python3 << 'EOF'
import sys
sys.path.insert(0, 'services/ai-pipeline/src')
from pii_redaction_service import redact_pii

result = redact_pii("My phone is 07912345678 and my card is 4111 1111 1111 1111")
assert '[PHONE_NUMBER]' in result, "Phone not redacted"
assert '[CARD_NUMBER]' in result, "Card not redacted"
assert '07912345678' not in result, "Raw phone still present"
print(f"✅ pii_redaction_service: redaction OK → {result}")
EOF
```

**✅ Addendum 5A complete when:** Both smoke tests print ✅ and the AI pipeline container is running (`docker compose ps | grep ai-pipeline`).

---

---

### ADDENDUM 6A — NestJS Platform API: 21 New Modules

**Objective:** Build all 21 new NestJS endpoint modules added during the co-browsing translation (§6.2D through §6.2X). These are the APIs that Task 8 frontend will call.

---

#### Step 6A.0 — Updated execution sequence

The Task 6 execution sequence previously referenced only §6.2A, §6.2B, §6.2C. Now read and implement ALL of the following in sequence. Each section in IMPL-001 is a complete contract — spec is written, implement it directly.

```
§6.2D — Agent Creation APIs (wizard + blank, two distinct paths)
§6.2E — Agent Templates (seed 48 templates at Tier 1 launch)
§6.2F — Additional AgentsModule (translate-first-message, soft gate count)
§6.2G — WidgetModule (embed spec, CSAT, shareable page)
§6.2H — AdvancedTab backend (PII cron, retention purge cron, 3 BullMQ jobs)
§6.2I — SecurityModule (auth policies, guardrails, overrides, webhooks)
§6.2J — ToolsModule (webhook/client/integration/MCP, system tool toggles)
§6.2K — KnowledgeBaseModule (workspace-level docs, junction table, RAG config)
§6.2L — AnalysisModule (post-call jobs: summary + criteria + data-extraction)
§6.2M — PhoneNumbersModule (8-step SIP wizard, dialplan reload via ESL)
§6.2N — BatchCallModule (BatchCallWorker, CSV pipeline, concurrency formula)
§6.2O — WorkflowModule (node/edge CRUD, auto-save debounce, 4 template seeds)
§6.2P — BranchesModule (traffic split invariant, protect/unlock, version restore)
§6.2Q — TestsModule (3 test types, async execution, 5 template seeds)
§6.2R — WhatsAppModule (Meta OAuth, webhook handler, inbound message pipeline)
§6.2S — SettingsModule (workspace webhooks, secrets, auth connections)
§6.2T — ApiKeysModule (key generation + SHA-256 hash, scope middleware)
§6.2U — WebhookEndpointsModule (platform events, HMAC signing, retry delivery)
§6.2V — EnvVarsModule (CRUD + resolveEnvVars() wired to AI pipeline)
§6.2W — StandaloneTTSModule (generate, MinIO storage, history)
§6.2X — AsyncSTTModule (Scribe v2 jobs via BullMQ, transcript library)
```

---

#### Step 6A.1 — Module registration and package additions

```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api

# Add packages needed by new modules
npm install @nestjs/bull bull crypto-js papaparse @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install nodemailer axios form-data
npm install --save-dev @types/papaparse

# Verify build still passes after installs
npm run build 2>&1 | tail -20
```

---

#### Step 6A.2 — Build modules in sequence

Build each module by reading its spec section in IMPL-001. Follow the same NestJS pattern used for the 13 existing modules: `nest generate module`, `nest generate service`, `nest generate controller`. Each module's DTOs, service logic, and controller routes are fully specified in §6.2D through §6.2X.

**Critical notes for specific modules:**

**§6.2H — AdvancedTab / Post-Call Pipeline:**
- The 3 BullMQ workers (`post-call-summary`, `post-call-criteria`, `post-call-data-extraction`) must be registered in `app.module.ts` as `BullModule.registerQueue(...)` entries.
- The retention purge cron uses `@nestjs/schedule` — install if not already present: `npm install @nestjs/schedule`.
- PII patterns live in `pii-redaction.service.ts` — same patterns as `pii_redaction_service.py` in Addendum 5A (single source of truth is the AI pipeline for storage-side; NestJS version applies to any API-side text processing).

**§6.2N — BatchCallModule:**
- `BatchCallWorker` is a **separate NestJS worker process** — not the main Platform API app. Create `services/platform-api/src/workers/batch-call.worker.ts` that bootstraps with only the `BullModule` and `BatchCallWorker` processor. K8s Deployment for this worker is documented in Task 3 addendum (see §7A below).
- The FreeSWITCH ESL `originate` command in `BatchCallWorker.makeOutboundCall()` requires the outbound SIP gateway `trustnow_trunk` to be configured — this is done in Addendum 7A.

**§6.2T — ApiKeysModule:**
- The `validateApiKey()` middleware must be registered in `app.module.ts` as a global middleware: `consumer.apply(ApiKeyMiddleware).forRoutes('*')` with exclusion for Keycloak-JWT routes.
- Key generation: `crypto.randomBytes(24).toString('base64url')` prefixed with `sk-tn_`.
- Key hash: `crypto.createHash('sha256').update(rawKey).digest('hex')`.

**§6.2R — WhatsAppModule:**
- The `POST /whatsapp/webhook` endpoint must be **excluded from Keycloak JWT auth** — Meta calls it without a JWT. Use `@SkipAuth()` decorator or equivalent.
- Signature verification: compare `X-Hub-Signature-256` header against `sha256=` + `HMAC-SHA256(rawBody, appSecret)`. Use raw body — not parsed JSON.
- This endpoint must return HTTP 200 within 5 seconds. All processing is async (BullMQ).

**§6.2O — WorkflowModule:**
- Auto-save: frontend debounces `PUT /agents/:id/workflow` by 2 seconds. The endpoint must do a full DELETE + re-INSERT of `workflow_nodes` and `workflow_edges` within a single DB transaction.
- Seed 4 workflow templates from §6.2O template table into `workflow_templates` table (create this table in a supplementary migration if not already present).

---

#### Step 6A.3 — Register all new routes in Kong

```bash
KONG_ADMIN="http://127.0.0.1:8001"

# For each new module route group, add Kong service + route.
# Use the same pattern as the existing 13 modules.
# Key new route groups to add:

declare -A ROUTES=(
  ["batch-calls"]="/batch-calls"
  ["whatsapp"]="/whatsapp"
  ["workspace-settings"]="/workspace"
  ["api-keys"]="/api-keys"
  ["webhooks-platform"]="/api/webhooks"
  ["env-vars"]="/env-vars"
  ["tts-standalone"]="/tts"
  ["stt-standalone"]="/stt"
  ["phone-numbers"]="/phone-numbers"
  ["workflow"]="/agents/{agent_id}/workflow"
  ["branches"]="/agents/{agent_id}/branches"
  ["tests"]="/tests"
  ["conversations-global"]="/conversations"
)

for name in "${!ROUTES[@]}"; do
  curl -s -X POST "$KONG_ADMIN/services" \
    --data "name=$name" \
    --data "url=http://127.0.0.1:3001"
  curl -s -X POST "$KONG_ADMIN/services/$name/routes" \
    --data "paths[]=${ROUTES[$name]}"
  echo "✅ Registered: $name → ${ROUTES[$name]}"
done
```

---

#### Step 6A.4 — Verification

```bash
# Build
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api
npm run build 2>&1 | grep -E "error|Error|ERROR" | head -20
# Expected: 0 errors

# Restart NestJS
pm2 restart platform-api || sudo systemctl restart trustnow-platform-api

# Wait for startup
sleep 8

# Smoke test every new module (one representative endpoint each)
BASE="http://127.0.0.1:3001"
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/realms/trustnow_dev/protocol/openid-connect/token \
  -d "grant_type=password&client_id=trustnow-platform&username=admin@trustnow.ai&password=$(vault kv get -field=password secret/trustnow/platform/keycloak_admin)" \
  | jq -r '.access_token')

declare -a ENDPOINTS=(
  "GET /batch-calls"
  "GET /whatsapp/accounts"
  "GET /workspace/settings"
  "GET /api-keys"
  "GET /api/webhooks"
  "GET /env-vars"
  "GET /tts/history"
  "GET /stt/transcripts"
  "GET /phone-numbers"
  "GET /tests"
  "GET /conversations"
)

for ep in "${ENDPOINTS[@]}"; do
  METHOD=$(echo $ep | cut -d' ' -f1)
  PATH=$(echo $ep | cut -d' ' -f2)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X $METHOD "$BASE$PATH" \
    -H "Authorization: Bearer $TOKEN")
  echo "$STATUS — $METHOD $PATH"
done
# Expected: all 200 (or 404 if empty data — but not 500 or connection refused)
```

**✅ Addendum 6A complete when:** Build produces 0 errors, PM2/systemd shows platform-api running, and all smoke test endpoints return 200 or 404 (not 500).

---

---

### ADDENDUM 7A — FreeSWITCH Outbound SIP Gateway

**Objective:** Configure the FreeSWITCH outbound SIP gateway (`trustnow_trunk`) required by the BatchCallWorker's `originate sofia/gateway/trustnow_trunk/+E164` command. Without this, Addendum 6A batch calling will fail at the FreeSWITCH layer.

**Context:** Task 7 configured inbound SIP. The co-browsing translation (§6.2N BatchCallModule) requires an outbound gateway. The gateway configuration is dynamically updated by PhoneNumbersModule when a client imports a SIP trunk number. This addendum implements the static framework; the dynamic per-tenant gateway is wired by §6.2M.

---

#### Step 7A.1 — Add Sofia outbound SIP profile gateway template

```bash
ROOT=/opt/trustnowailabs/trustnow-ai-worker-stack
FSDIR=$ROOT/config/freeswitch

# Create an outbound gateway directory for dynamic per-tenant gateways
mkdir -p $FSDIR/sip_profiles/external

# Create the external Sofia SIP profile that loads gateway configs
cat > $FSDIR/sip_profiles/external.xml << 'EOF'
<profile name="external">
  <settings>
    <param name="debug" value="0"/>
    <param name="sip-trace" value="no"/>
    <param name="context" value="public"/>
    <param name="rtp-timeout-sec" value="300"/>
    <param name="rtp-hold-timeout-sec" value="1800"/>
    <param name="dtmf-duration" value="2000"/>
    <param name="codec-prefs" value="$${global_codec_prefs}"/>
    <param name="inbound-codec-negotiation" value="generous"/>
    <param name="nonce-ttl" value="60"/>
    <param name="auth-calls" value="false"/>
    <param name="inbound-late-negotiation" value="true"/>
    <param name="apply-nat-acl" value="nat.auto"/>
    <param name="rtp-start-port" value="16384"/>
    <param name="rtp-end-port" value="32768"/>
    <param name="tls" value="false"/>
    <param name="pass-callee-id" value="true"/>
  </settings>
  <gateways>
    <!-- Dynamic gateways are loaded from sip_profiles/external/*.xml -->
    <!-- Created by PhoneNumbersModule (§6.2M) when a SIP trunk is imported -->
    <!-- Manually add a test gateway here for verification: -->
    <!--
    <gateway name="trustnow_trunk_test">
      <param name="username" value="REPLACE_WITH_SIP_USER"/>
      <param name="password" value="REPLACE_WITH_SIP_PASSWORD"/>
      <param name="proxy" value="REPLACE_WITH_SIP_PROVIDER_HOST"/>
      <param name="register" value="true"/>
      <param name="caller-id-in-from" value="true"/>
    </gateway>
    -->
  </gateways>
</profile>
EOF

echo "External SIP profile created."
```

---

#### Step 7A.2 — Wire PhoneNumbersModule to create gateway configs via ESL

In `PhoneNumbersModule` (`§6.2M`), the `POST /phone-numbers` and `PUT /phone-numbers/:id/assign-agent` handlers already call `api reloadxml` via ESL. Extend them to also write a gateway config file before reloading:

```typescript
// In phone-numbers.service.ts — called when a phone number is created/updated

async upsertFreeSwitchGateway(phoneNumber: PhoneNumber): Promise<void> {
  const gatewayName = `trustnow_tenant_${phoneNumber.tenant_id.replace(/-/g, '_').substring(0, 8)}`;
  const gatewayPath = `/opt/trustnowailabs/trustnow-ai-worker-stack/config/freeswitch/sip_profiles/external/${gatewayName}.xml`;

  const gatewayXml = `<include>
  <gateway name="${gatewayName}">
    <param name="username" value="${phoneNumber.sip_username ?? ''}"/>
    <param name="password" value="${await this.vaultService.getSecret(`trustnow/${phoneNumber.tenant_id}/sip/${phoneNumber.phone_number_id}`)}"/>
    <param name="proxy" value="${phoneNumber.outbound_address}"/>
    <param name="register" value="${phoneNumber.sip_username ? 'true' : 'false'}"/>
    <param name="transport" value="${phoneNumber.outbound_transport}"/>
    <param name="caller-id-in-from" value="true"/>
  </gateway>
</include>`;

  require('fs').writeFileSync(gatewayPath, gatewayXml);
  await this.eslService.sendApiCommand('reloadxml');
  await this.eslService.sendApiCommand(`sofia profile external rescan`);
}
```

---

#### Step 7A.3 — Verification

```bash
# Verify external profile is loaded by FreeSWITCH
docker exec $(docker ps -q --filter name=freeswitch) \
  fs_cli -x "sofia status" | grep -i external
# Expected: external profile listed

# Verify ESL can trigger a gateway rescan
docker exec $(docker ps -q --filter name=freeswitch) \
  fs_cli -x "sofia profile external rescan"
# Expected: "+OK reloading XML"

# Verify an originate command is syntactically accepted (will fail at network level — that is expected)
docker exec $(docker ps -q --filter name=freeswitch) \
  fs_cli -x "originate sofia/gateway/trustnow_trunk_test/+12025550001 &echo"
# Expected: any error except "INVALID_PROFILE" — "NO_ROUTE_DESTINATION" or "NORMAL_TEMPORARY_FAILURE" is acceptable
# (gateway config is correct even if no actual SIP trunk is registered yet)
```

**✅ Addendum 7A complete when:** `sofia status` shows external profile loaded, `reloadxml` returns +OK, and originate does not return `INVALID_PROFILE`.

---

---

### ADDENDUM COMPLETION CHECKLIST

Before marking Task Addendum complete and moving to Task 8, verify every item:

| # | Item | Verification |
|---|------|-------------|
| 4A-1 | Migration 002 applied with 0 errors | Check `/tmp/migration_002.log` — grep "ERROR" returns 0 lines |
| 4A-2 | All 28 new tables present in DB | `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'` ≥ 47 |
| 4A-3 | `knowledge_base_docs` has no `agent_id` column | Query returns 0 rows |
| 4A-4 | `agent_configs` has no `workflow_definition_json` column | Query returns 0 rows |
| 4A-5 | `rag_enabled` default is `true` | Query returns 'true' |
| 5A-1 | `env_var_service.py` deployed + smoke test passes | Prints ✅ env_var_service: pattern matching OK |
| 5A-2 | `pii_redaction_service.py` deployed + smoke test passes | Prints ✅ pii_redaction_service: redaction OK |
| 5A-3 | AI pipeline container restarted and healthy | `docker compose ps ai-pipeline` shows Up |
| 6A-1 | New npm packages installed + build passes 0 errors | `npm run build` output |
| 6A-2 | All 21 modules (§6.2D–§6.2X) implemented and registered in app.module.ts | Code review + `grep -r 'Module' src/app.module.ts` |
| 6A-3 | All new Kong routes registered | Endpoint smoke tests return 200/404, no 500 |
| 6A-4 | BatchCallWorker process created as separate worker | `services/platform-api/src/workers/batch-call.worker.ts` exists |
| 6A-5 | ApiKeyMiddleware registered globally | `POST /agents` with an api-key header but no JWT returns 401 (not 500) |
| 7A-1 | `sip_profiles/external.xml` created | `cat $ROOT/config/freeswitch/sip_profiles/external.xml` |
| 7A-2 | FreeSWITCH external profile loaded | `sofia status` shows external profile |
| 7A-3 | `upsertFreeSwitchGateway()` in PhoneNumbersService | Code present in `phone-numbers.service.ts` |

**Update RUNBOOK.md:** Mark Task Addendum COMPLETE, then report back to Master Architect. Do NOT start Task 8 until the full checklist above is confirmed.

---

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 8

Read RUNBOOK.md and confirm **Task Addendum is marked COMPLETE** (not just Tasks 5, 6, 7) before starting. Task Addendum delivers 21 new API modules and the schema backfill that every Task 8 component will call — do not start without it. Then read `UI-SPEC-001.md §6.4 (Agent Config Module)` IN FULL before writing a single component — every field, every tab, every toggle is specified there with exact labels, defaults, and behaviour. Also read `UI-SPEC-001.md §6.1` (global layout/sidebar), `§6.3` (Agent List), `§6.5` (Voice Picker), `§6.6` (Voice Library), `§6.7` (KB page), `§6.8` (Tools page). Build to the spec — do not guess field names or layouts.

**CRITICAL — read before writing any frontend code:**
- `UI-SPEC-001.md §6.4` tabs 1–10: every co-browsing observation is captured there. Tab 1 alone has ~40 fields.
- `FULL-SCOPE-IMPL-001.md §3.1` agent_configs schema: every column the UI must read/write is defined there.
- Task 6 NestJS endpoints power this UI — AgentsModule, WidgetModule, VoicesModule, LLMProvidersModule, KnowledgeBaseModule, ToolsModule.
- Do not use `Play DTMF` anywhere — the correct system tool name is `Play keypad touch tone` (observed live on ElevenLabs platform).

**Execution sequence:**
- §8.1 — Frontend scaffold (Next.js + shadcn/ui + dnd-kit)
- §8.2 — Global layout: sidebar (Configure/Monitor/Deploy groups), top bar, breadcrumb — per UI-SPEC §6.1
- §8.3 — Home/Dashboard page — per UI-SPEC §6.2
- §8.4 — Agent List page — per UI-SPEC §6.3
- §8.5 — Agent Config Module: all 10 tabs — per UI-SPEC §6.4 (full spec below)
- §8.6 — Voice Picker side sheet — per UI-SPEC §6.5
- §8.7 — Voice Library page — per UI-SPEC §6.6
- §8.8 — Knowledge Base global page — per UI-SPEC §6.7
- §8.9 — Tools global page — per UI-SPEC §6.8
- §8.10 — Verification

After all verifications pass — update RUNBOOK.md. Then report back to Architect.

**Prerequisite: Task Addendum complete (Tasks 4A + 5A + 6A + 7A all verified).**

---

### 8.1 — Frontend Scaffold (Next.js — BRD §11.1)
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-slider
npm install @radix-ui/react-toggle-group @radix-ui/react-switch @radix-ui/react-select
npm install zustand @tanstack/react-query socket.io-client
npm install livekit-client recharts lucide-react
npm install @dnd-kit/core @dnd-kit/sortable
npx shadcn-ui@latest init
```

---

### 8.2 — Agent Configuration Module: 10 Tabs

**Read UI-SPEC-001.md §6.4 completely before building any tab. What follows is a summary reference — the full field-by-field spec is in UI-SPEC-001.md.**

| Tab | Component | Key co-browsing additions vs previous spec | UI-SPEC ref |
|-----|-----------|-------------------------------------------|-------------|
| 1 — Agent | AgentConfigTab | Page header with Live N% badge + Public/Draft toggle + Variables button; System prompt with Default personality toggle + Set timezone button; First message with Interruptible toggle + Translate to all button; Voices with **Expressive Mode** feature card (Enable/Dismiss); Language with **Hinglish Mode** toggle + language grouping; LLM with **Backup LLM** (Default/Custom/Disabled) + **Temperature slider** + **Thinking Budget** toggle + **Limit token usage** field; full 22-model LLM picker with real latency/cost | §6.4 TAB 1 |
| 2 — Workflow | WorkflowTab | **Full visual node canvas** (not a list) — dot-grid, drag-and-drop nodes, 4 Templates (Qualification/Authentication/Enterprise Escalation/Business Hours Router), Prevent infinite loops toggle | §6.4 TAB 2 |
| 3 — Branches | BranchesTab | Table: Name + Draft/Live dual badges + Traffic Split % + Live badge + Created by + Updated + history icon | §6.4 TAB 3 |
| 4 — Knowledge Base | KnowledgeBaseTab | **Configure RAG** button → right panel: Enable toggle, English/Multilingual embedding, Character limit 50K, Chunk limit 20, Vector distance slider, Number of candidates toggle, Query rewrite toggle | §6.4 TAB 4 |
| 5 — Analysis | AnalysisTab | Full filter chip set (12 filters); Conversation detail with Overview/Transcription/Client data; **TTS latency + ASR latency per turn**; Evaluation criteria + Data collection config panel; metadata: call cost in credits, LLM cost, environment badge | §6.4 TAB 5 |
| 6 — Tools | ToolsTab | Sub-tabs: **Tools \| MCP**; system tool name is "Play keypad touch tone" (not "Play DTMF"); MCP server management | §6.4 TAB 6 |
| 7 — Tests | TestsTab | Test types: **Next Reply** and **Tool Invocation** only; 5 ElevenLabs default templates pre-seeded; Create Folder + Create test buttons | §6.4 TAB 7 |
| 8 — Widget | WidgetTab | **Feedback collection** toggle (ON default); Interface toggles in exact order: Chat mode, Send text on call, Realtime transcript, Language dropdown, Mute + **Expanded behavior** dropdown; Markdown links: allowed domains + **Include www. variants** + **Allow HTTP links**; Avatar: **Orb\|Link\|Image** 3-way (not just Orb/Image) | §6.4 TAB 8 |
| 9 — Security | SecurityTab | **Guardrails Alpha**: Focus + Manipulation; **Overrides**: 8 toggles (First message, System prompt, LLM, Voice, Voice speed, Voice stability, Voice similarity, Text only); **Conversation Initiation Client Data Webhook**; **Post-call Webhook** with "Create Webhook" button; Allowlist with red warning when empty | §6.4 TAB 9 |
| 10 — Advanced | AdvancedTab | ASR: **Filter background speech** (Alpha) toggle + ASR model dropdown + audio format dropdown; Conversational: **Eagerness** (Normal/High/Low) + **Speculative turn** toggle + Take turn after silence (7s) + End after silence (-1) + Max duration (600s) + duration message + **Soft timeout** field | §6.4 TAB 10 |

### 8.3 — LLM Picker (BRD-L5-AGM-008 + co-browsing spec)

Combobox grouped by provider. Must display per model (from `llm_models` table):
- Provider group header
- Model display name + badge (New / Experimental)
- Latency p50 in ms
- Cost per minute in $/min
- Search bar
- "Detailed costs" link at bottom

On model selection — opens sub-panel:
- **Backup LLM**: Default | Custom | Disabled (3-way segmented control)
- **Temperature slider**: "More deterministic ↔ More expressive"
- **Thinking Budget toggle**: "Control internal reasoning tokens"
- **Limit token usage**: number input (-1 = no limit)

### 8.4 — Web Widget Publisher (BRD-L5-AGM-WG-001 to WG-009)
- Embed code: `<trustnow-agent agent-id="xxx"></trustnow-agent>` + CDN script tag
- Widget JS served from Nginx `/widget/` CDN route
- Custom domain CNAME support for white-label enterprise clients
- Feedback collection: 1-5 star + text comment after call ends (toggle ON by default)
- Real-time live preview: actual floating widget rendered at bottom-right of Widget tab

---

## TASK 9 — CONVERSATIONAL AI AGENTS (BRD §6.1)

**Prerequisite: Task 8 complete.**

---

### ▶ PLATFORM ENGINEER — CO-BROWSE FINDINGS: READ BEFORE WRITING ANY TURN LOOP CODE

A live voice call was conducted on the TRUSTNOW ElevenLabs account (28 March 2026, 4:22 duration, 28 messages). The following requirements are derived directly from observed behaviour and MUST be implemented exactly as specified here. Do not deviate.

**Live latency measurements observed:**
| Turn type | LLM latency | TTS latency | ASR latency |
|-----------|------------|------------|------------|
| First message (no LLM) | — | 261 ms | — |
| Short agent turn | 431–652 ms | 104–184 ms | — |
| Long agent turn | 2.0 s | 104–173 ms | — |
| User turn (ASR) | — | — | 120–234 ms |

**Barge-in confirmed live:** User said "wait, wait, wait, let me interrupt you" mid-agent TTS. Agent stopped immediately. Interrupted turn committed as truncated. New STT began. LLM responded to new input with full topic switch — zero residue from interrupted response.

**Agent cannot self-terminate:** The agent told the caller "I am an AI agent, so there isn't a traditional call to disconnect. You can simply close your browser window." This confirms: **the LLM must NEVER attempt to end the call via conversation text.** Call termination must be triggered exclusively by the platform (FreeSWITCH ESL signal) based on: max duration timer, silence timeout exhaustion, or explicit handoff. The platform engineer must implement `platform_end_call(cid, reason)` as a separate ESL-driven function completely independent of the LLM response path.

---

### §9.1 — Conversational Agent Runtime — Complete Turn Loop

**Two distinct code paths — first message vs conversation turns:**

#### Path 1 — Session Start / First Message (NO LLM CALL)

The first message is pre-configured text. It MUST NOT go through the LLM. It is synthesised directly to TTS at session connect — this is why the first-message TTS latency (261ms) is lower than any subsequent agent turn.

```python
# In session_manager.py — called on CHANNEL_ANSWER ESL event
async def start_session(cid: str, agent_config: dict, channel_uuid: str):
    """
    Called immediately when FreeSWITCH CHANNEL_ANSWER fires.
    Generates CID, starts recording, plays first message via TTS only (no LLM).
    """
    t_start = time.monotonic()

    # 1. Store session state in Redis
    await redis.hset(f"session:{cid}", mapping={
        "agent_id": agent_config["agent_id"],
        "tenant_id": agent_config["tenant_id"],
        "channel_uuid": channel_uuid,
        "partition": agent_config["partition"],  # A or B
        "language": agent_config["language"],
        "started_at": datetime.utcnow().isoformat(),
        "turn_count": 0,
        "llm_cost_usd": 0.0,
        "transcript": json.dumps([]),
        "silence_tier": 0,  # tracks which silence re-prompt tier we are on
    })
    await redis.expire(f"session:{cid}", 7200)  # 2h max session

    # 2. Synthesise first_message via TTS — NO LLM CALL
    first_message = agent_config.get("first_message", "")
    if not first_message:
        # If no first_message configured: wait for caller to speak first
        await set_listening_state(cid)
        return

    t_tts_start = time.monotonic()
    audio_chunks = await tts_adapter.synthesise(
        text=first_message,
        voice_id=agent_config["voice_id"],
        partition=agent_config["partition"],
        output_format="ulaw_8000" if agent_config["channel"] == "sip" else "pcm_16000",
    )
    tts_latency_ms = int((time.monotonic() - t_tts_start) * 1000)

    # 3. Stream audio to caller via LiveKit / FreeSWITCH
    await stream_audio_to_caller(cid, channel_uuid, audio_chunks, agent_config["partition"])

    # 4. Append first message to transcript (no LLM or ASR latency for this turn)
    await append_transcript_turn(cid, {
        "role": "agent",
        "text": first_message,
        "timestamp_s": 0.0,
        "tts_latency_ms": tts_latency_ms,
        "llm_latency_ms": None,   # no LLM on first message
        "asr_latency_ms": None,
        "interrupted": False,
    })

    # 5. Start silence timeout watchdog — begins counting from end of first message
    await start_silence_watchdog(cid, agent_config)

    # 6. Enter listening state
    await set_listening_state(cid)
```

#### Path 2 — Conversation Turn Loop (STT → LLM → TTS)

Every subsequent turn after the first message follows this pipeline:

```python
# In turn_loop.py — main conversation turn handler
async def handle_user_turn(cid: str, audio_bytes: bytes, agent_config: dict):
    """
    Called when VAD confirms end-of-speech.
    Implements: STT → RAG (optional) → LLM → TTS → audio output
    Records latency for every stage.
    Publishes real-time transcript update to Redis pub/sub for frontend streaming.
    """
    session = await redis.hgetall(f"session:{cid}")
    turn_number = int(session.get("turn_count", 0)) + 1
    turn_start_ts = await get_elapsed_seconds(cid)

    # ── STAGE 1: ASR (Speech-to-Text) ────────────────────────────────────────
    t_asr_start = time.monotonic()
    transcript_text = await stt_adapter.transcribe(
        audio=audio_bytes,
        partition=agent_config["partition"],
        language=agent_config["language"],
    )
    asr_latency_ms = int((time.monotonic() - t_asr_start) * 1000)

    if not transcript_text.strip():
        # Empty transcription — treat as silence, reset watchdog
        await reset_silence_watchdog(cid, agent_config)
        return

    # Append user turn to transcript immediately (real-time streaming to frontend)
    await append_transcript_turn(cid, {
        "role": "user",
        "text": transcript_text,
        "timestamp_s": turn_start_ts,
        "asr_latency_ms": asr_latency_ms,
        "llm_latency_ms": None,
        "tts_latency_ms": None,
        "interrupted": False,
    })
    # Publish to Redis for real-time transcript streaming to frontend widget
    await redis.publish(f"transcript:{cid}", json.dumps({
        "role": "user", "text": transcript_text, "asr_latency_ms": asr_latency_ms
    }))

    # Reset silence watchdog — user spoke, restart the timer
    await reset_silence_watchdog(cid, agent_config)
    # Reset silence re-prompt tier counter
    await redis.hset(f"session:{cid}", "silence_tier", 0)

    # ── STAGE 2: RAG Retrieval (optional) ────────────────────────────────────
    rag_context = ""
    if agent_config.get("rag_enabled") and agent_config.get("kb_docs_attached"):
        rag_context = await rag_pipeline.retrieve(
            query=transcript_text,
            tenant_id=agent_config["tenant_id"],
            agent_id=agent_config["agent_id"],
            top_k=agent_config.get("rag_top_k", 5),
        )

    # ── STAGE 3: LLM Completion ───────────────────────────────────────────────
    full_transcript = json.loads(session.get("transcript", "[]"))
    messages = build_llm_messages(
        system_prompt=agent_config["system_prompt"],
        transcript=full_transcript,
        rag_context=rag_context,
    )

    t_llm_start = time.monotonic()
    llm_response = await llm_complete(
        messages=messages,
        model=agent_config["llm_model"],
        backup_model=agent_config.get("backup_llm_model"),
        temperature=agent_config.get("llm_temperature", 0.7),
        max_tokens=agent_config.get("llm_max_tokens", -1),
        cid=cid,
    )
    llm_latency_ms = int((time.monotonic() - t_llm_start) * 1000)

    # Check handoff conditions BEFORE generating TTS (§7.12 handoff_service.py)
    from handoff_service import check_handoff_conditions
    handoff_trigger = check_handoff_conditions(full_transcript + [{"user": transcript_text}], agent_config, session)
    if handoff_trigger:
        await execute_platform_handoff(cid, session, agent_config, handoff_trigger, full_transcript)
        return

    # ── STAGE 4: TTS Synthesis + Streaming ───────────────────────────────────
    agent_turn_text = llm_response["text"]
    t_tts_start = time.monotonic()

    # Subscribe to barge-in interrupt channel BEFORE starting TTS stream
    interrupt_sub = await redis.subscribe(f"interrupt:{cid}")

    audio_completed = True
    async for audio_chunk in tts_adapter.synthesise_stream(
        text=agent_turn_text,
        voice_id=agent_config["voice_id"],
        partition=agent_config["partition"],
        output_format="ulaw_8000" if agent_config["channel"] == "sip" else "pcm_16000",
    ):
        # Check for barge-in interrupt signal on every chunk
        interrupt_signal = await interrupt_sub.get_nowait()
        if interrupt_signal:
            # Barge-in detected — stop TTS immediately
            await stop_audio_stream(cid)
            audio_completed = False
            break
        await stream_audio_chunk_to_caller(cid, audio_chunk)

    tts_latency_ms = int((time.monotonic() - t_tts_start) * 1000)  # TTFA metric
    await redis.unsubscribe(f"interrupt:{cid}")

    # ── STAGE 5: Record turn to transcript ───────────────────────────────────
    agent_turn = {
        "role": "agent",
        "text": agent_turn_text if audio_completed else agent_turn_text + " [interrupted]",
        "timestamp_s": turn_start_ts,
        "llm_latency_ms": llm_latency_ms,
        "tts_latency_ms": tts_latency_ms,
        "asr_latency_ms": None,
        "interrupted": not audio_completed,
    }
    await append_transcript_turn(cid, agent_turn)

    # Publish agent turn to Redis for real-time frontend streaming
    await redis.publish(f"transcript:{cid}", json.dumps({
        "role": "agent",
        "text": agent_turn_text,
        "llm_latency_ms": llm_latency_ms,
        "tts_latency_ms": tts_latency_ms,
        "streaming": not audio_completed,  # True while TTS is still playing
    }))

    # ── STAGE 6: Cost recording ───────────────────────────────────────────────
    llm_cost = llm_response.get("cost_usd", 0.0)
    await redis.hincrbyfloat(f"session:{cid}", "llm_cost_usd", llm_cost)
    await redis.hincrby(f"session:{cid}", "turn_count", 1)
    await redis.hincrby(f"session:{cid}", "llm_turns", 1)

    # ── STAGE 7: Back to listening ────────────────────────────────────────────
    if audio_completed:
        await start_silence_watchdog(cid, agent_config)
    # If interrupted, new user turn already in progress — watchdog not needed
```

---

### §9.2 — Barge-In / Interrupt Policy (Confirmed Live — Co-Browse 28 Mar 2026)

**Observed behaviour:** Caller interrupted mid-agent-TTS twice during the live call. In both cases:
1. TTS stopped within one audio chunk of the DETECTED_SPEECH event (sub-200ms perceived response)
2. The partial agent response was committed to transcript with `[interrupted]` marker
3. The LLM context for the next turn included the truncated agent response — the LLM does NOT retry the interrupted response; it processes the new user input as-is
4. Language context and conversation flow continued cleanly after interruption

**Interrupt modes (configurable per agent — Tab 10 Advanced):**
- `allow` — any caller speech immediately stops TTS playback, STT begins capturing (default)
- `smart` — only stop TTS if caller speech exceeds 300ms (filters short affirmatives like "uh-huh", "mm" that should not interrupt)
- `none` — TTS plays to completion before STT activates (compliance scripts)

**Implementation — barge-in signal chain:**

```python
# In esl_service.ts — DETECTED_SPEECH event fires the interrupt signal
if (message.includes('Event-Name: DETECTED_SPEECH')) {
    const cid = this.extractHeader(message, 'variable_trustnow_cid');
    const speechDuration = parseInt(this.extractHeader(message, 'Speech-Duration') || '0');
    if (cid) {
        // Publish to Redis — AI pipeline subscribes per active CID
        await redisClient.publish(`interrupt:${cid}`, JSON.stringify({
            speech_duration_ms: speechDuration,
            timestamp: Date.now(),
        }));
        this.emit('DETECTED_SPEECH', { cid, speechDuration });
    }
}

# In turn_loop.py — interrupt consumer (runs concurrently with TTS stream)
async def barge_in_listener(cid: str, agent_config: dict) -> bool:
    """Returns True if barge-in should stop TTS, False otherwise."""
    interrupt_mode = agent_config.get("interrupt_sensitivity", "allow")
    sub = await redis.subscribe(f"interrupt:{cid}")
    signal = await sub.get(timeout=0.05)  # 50ms poll
    if not signal:
        return False
    if interrupt_mode == "none":
        return False
    if interrupt_mode == "smart":
        payload = json.loads(signal)
        return payload.get("speech_duration_ms", 0) >= 300
    return True  # "allow" mode — any speech = interrupt
```

---

### §9.3 — Silence Re-Prompt System (Multi-Tier — Confirmed Live)

**Observed live:** When caller is silent, ElevenLabs fires 3 distinct re-prompt tiers before ending the call. Each tier is a full LLM → TTS turn. TRUSTNOW must implement identical behaviour.

**3-tier silence re-prompt architecture:**

```python
# In silence_watchdog.py
SILENCE_TIERS = [
    {
        "tier": 1,
        "wait_s": 20,       # Observed: ~20s after first message before first re-prompt
        "prompt": "The caller hasn't responded. Generate a brief, natural re-engagement question. Max 1 sentence.",
    },
    {
        "tier": 2,
        "wait_s": 25,       # Observed: ~25s after tier-1 re-prompt
        "prompt": "Still no response. Generate a gentle acknowledgement that the caller may be busy, offer to continue when ready. Max 2 sentences.",
    },
    {
        "tier": 3,
        "wait_s": 20,       # Observed: ~20s after tier-2 re-prompt
        "prompt": "Final attempt. Generate a brief farewell message indicating you'll be here when they're ready.",
        "is_final": True,   # After tier 3: trigger platform_end_call()
    },
]

async def silence_watchdog(cid: str, agent_config: dict):
    """
    Runs as a background asyncio task per session.
    Fires LLM-generated re-prompts at configured silence intervals.
    After final tier: triggers platform_end_call() via FreeSWITCH ESL.
    Cancelled immediately when user speaks (reset_silence_watchdog called).
    """
    tier = int(await redis.hget(f"session:{cid}", "silence_tier") or 0)

    for silence_config in SILENCE_TIERS[tier:]:
        await asyncio.sleep(silence_config["wait_s"])

        # Check if user spoke while we were sleeping (watchdog was reset)
        current_tier = int(await redis.hget(f"session:{cid}", "silence_tier") or 0)
        if current_tier != tier:
            return  # User spoke — watchdog reset from outside, exit

        # Generate re-prompt via LLM
        session = await redis.hgetall(f"session:{cid}")
        transcript = json.loads(session.get("transcript", "[]"))
        re_prompt = await llm_complete_internal(silence_config["prompt"], transcript, agent_config)

        # Play re-prompt via TTS
        await play_agent_turn(cid, re_prompt, agent_config)

        tier += 1
        await redis.hset(f"session:{cid}", "silence_tier", tier)

        if silence_config.get("is_final"):
            # Final tier exhausted — end the call via platform (NOT via LLM text)
            await platform_end_call(cid, reason="silence_timeout")
            return

async def platform_end_call(cid: str, reason: str = "agent_decision"):
    """
    Terminate the call via FreeSWITCH ESL.
    This is the ONLY legitimate way for the platform to end a call.
    The LLM must NEVER attempt to end a call through conversation text.
    Reason values: silence_timeout | max_duration | handoff_complete | agent_decision
    """
    session = await redis.hgetall(f"session:{cid}")
    channel_uuid = session.get("channel_uuid")

    # Signal FreeSWITCH to hang up
    esl_client.send(
        f"sendmsg {channel_uuid}\n"
        f"call-command: execute\n"
        f"execute-app-name: hangup\n"
        f"execute-app-arg: NORMAL_CLEARING\n\n"
    )

    # Record how_call_ended in Redis session (flushed to PostgreSQL at session end)
    await redis.hset(f"session:{cid}", "how_call_ended", reason)

    # Flush session to PostgreSQL
    await session_manager.flush_session(cid)
```

**`how_call_ended` values (from live observation + BRD):**
- `client_ended_call` — caller clicked hangup / closed browser (CHANNEL_HANGUP from caller side)
- `silence_timeout` — 3-tier silence watchdog exhausted
- `max_duration` — call exceeded `agent_config.max_duration_value` seconds
- `agent_decision` — agent triggered end via `end_call` system tool (Tools-Assisted / Autonomous)
- `handoff_complete` — Option B internal handoff accepted by human agent

---

### §9.4 — Voice Activity Detection (VAD) Parameters

VAD governs when the system considers the caller has finished speaking. Configurable per agent in Tab 10 (Advanced tab). Live-observed default performance: ASR latency 120–234ms, confirming Deepgram Nova-2 (Partition A) operates well within the <200ms target for most turns.

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| End-of-speech silence | 800ms | 300–3000ms | Silence after which caller is considered done speaking |
| Minimum speech duration | 100ms | 50–500ms | Minimum audio to be treated as intentional speech |
| Noise floor threshold | -40dBFS | -60 to -20 | Below this = silence regardless of duration |
| Max utterance duration | 60s | 10–300s | Maximum single caller utterance |
| STT start timeout | 10s | 5–60s | Silence at call start before tier-1 silence re-prompt |

**Implementation:** Partition A (Deepgram): use `endpointing` parameter = configured silence threshold in ms. Partition B (FasterWhisper): use `silero-vad` with threshold mapped to configured values.

---

### §9.5 — Transcript JSON Schema Per Turn (Live-Confirmed)

Every turn in `conversations.transcript_json` MUST conform to this schema. Both `llm_latency_ms` and `tts_latency_ms` are required on agent turns. `asr_latency_ms` is required on user turns. These are displayed in the Analysis tab transcription view and the Preview screen.

```python
# Transcript turn schema — enforced on every append_transcript_turn() call
AGENT_TURN_SCHEMA = {
    "role": "agent",                # always "agent"
    "text": str,                    # full response text (may end with " [interrupted]")
    "timestamp_s": float,           # seconds from call start (M:SS displayed in UI)
    "llm_latency_ms": int | None,   # None only for first_message (no LLM call)
    "tts_latency_ms": int,          # always present; TTFA metric
    "asr_latency_ms": None,         # always None for agent turns
    "interrupted": bool,            # True if barge-in cut this turn short
}

USER_TURN_SCHEMA = {
    "role": "user",
    "text": str,                    # STT transcription
    "timestamp_s": float,
    "llm_latency_ms": None,         # always None for user turns
    "tts_latency_ms": None,         # always None for user turns
    "asr_latency_ms": int,          # STT transcription latency
    "interrupted": False,           # users don't get interrupted
}

# LLM latency display rule (matching ElevenLabs UI behaviour observed live):
# < 1000ms → display as "LLM 453 ms"
# ≥ 1000ms → display as "LLM 2.0 s" (one decimal place in seconds)
def format_latency_display(latency_ms: int) -> str:
    if latency_ms < 1000:
        return f"LLM {latency_ms} ms"
    return f"LLM {latency_ms / 1000:.1f} s"
```

---

### §9.6 — Real-Time Transcript Streaming (Live-Confirmed)

The frontend receives transcript updates during the live call — not post-call. Every turn must be published to Redis pub/sub immediately. The frontend widget and the Preview screen both subscribe to this channel.

```python
# Redis channel: transcript:{cid}
# Frontend subscribes via WebSocket (platform API proxies the Redis pub/sub)

# Message format published on every turn:
{
    "event": "transcript_turn",
    "cid": "cid_...",
    "turn": {
        "role": "agent" | "user",
        "text": "...",                  # full text
        "timestamp_s": 34.5,
        "llm_latency_ms": 453,         # agent turns only
        "tts_latency_ms": 106,         # agent turns only
        "asr_latency_ms": 234,         # user turns only
        "streaming": True,             # True while TTS still playing (shows "..." tail in UI)
        "interrupted": False,
    }
}

# When TTS finishes: publish streaming=False update to close the "..." tail
{
    "event": "transcript_turn_complete",
    "cid": "cid_...",
    "role": "agent",
    "final_text": "...",               # complete text (same as during streaming usually)
}
```

---

### §9.7 — Text + Voice Simultaneous Mode (Live-Confirmed)

During a live voice call, the text chat input is active and functional. Text messages submitted during a voice call are:
1. Injected into the LLM context as a user turn (with `source: "text"` tag in transcript)
2. The agent responds via TTS (not text-only)
3. Both the text message and the voice response appear in the transcript

The `conversations.text_only` flag (seen in Metadata panel: `Text-only: No`) indicates whether the session was purely text. A mixed session (voice + text) also sets `text_only = false`.

---

### §9.8 — Latency vs Quality Presets

Three presets selectable per agent (Tab 1 dropdown above LLM picker):

| Preset | LLM | STT | TTS | Target TTFA | Use Case |
|--------|-----|-----|-----|------------|---------|
| **Fast** | gpt-4o-mini / claude-haiku | FasterWhisper `base` or Deepgram Nova-2 | Piper or ElevenLabs turbo | <500ms | High-volume IVR deflection |
| **Balanced** | gpt-4o / gemini-flash | FasterWhisper `medium` or Deepgram Nova-2 | ElevenLabs Flash v2.5 | <800ms | Standard contact centre (default) |
| **High Quality** | claude-sonnet / gpt-4o | FasterWhisper `large-v3` or Deepgram Nova-3 | ElevenLabs Flash v2.5 multilingual | <1200ms | Complex autonomous workflows |

Live-observed TTFA (Partition A, Balanced preset): **261ms first message, 106–184ms TTS on subsequent turns, 453–652ms LLM.** Total perceived latency per turn: ~600–900ms — within target.

Preset auto-populates Tab 1 selectors; agent admin can override individually. Stored as `agent_configs.latency_preset` alongside individual selections.

---

### §9.9 — Speculative Turn (ElevenLabs Best Practice)

When `agent_config.speculative_turn_enabled = true`, the AI pipeline begins generating an LLM response during silence — before end-of-speech is fully confirmed. If the caller stops speaking and the speculative response was correct, it is used. If the caller continues speaking, the speculative generation is discarded.

```python
# In turn loop — after VAD threshold approaching but before full confidence:
if agent_config.speculative_turn_enabled and vad_confidence > 0.7:
    speculative_task = asyncio.create_task(llm_complete(partial_transcript))
    # If caller confirms end-of-speech → use speculative result
    # If caller continues → cancel speculative_task
```

**Eagerness mapping to VAD thresholds:**
| Eagerness | End-of-speech silence | Behaviour |
|---|---|---|
| `high` | 400ms | Very quick response — fast-paced interactions |
| `normal` | 800ms | Balanced — standard contact centre (default) |
| `low` | 1200ms | Agent waits longer — complex queries |

---

## TASK 10 — TOOLS-ASSISTED AI AGENTS (BRD §6.2)

**Prerequisite: Task 9 complete.**

### 9.5 — Speculative Turn (ElevenLabs Best Practice — reduces perceived latency)

When `agent_config.speculative_turn_enabled = true`, the AI pipeline begins generating an LLM response during silence — before end-of-speech is fully confirmed. If the caller stops speaking and the speculative response was correct, it is used. If the caller continues speaking, the speculative generation is discarded.

```python
# In turn loop — after VAD threshold is approaching but before full confidence:
if agent_config.speculative_turn_enabled and vad_confidence > 0.7:
    # Start speculative LLM generation in parallel with final VAD detection
    speculative_task = asyncio.create_task(llm_complete(partial_transcript))
    # If caller confirms end-of-speech → use speculative result
    # If caller continues → cancel speculative_task
```

**Eagerness mapping to VAD thresholds:**
| Eagerness setting | End-of-speech silence | Behaviour |
|---|---|---|
| `high` | 400ms | Agent responds very quickly — suits fast-paced interactions |
| `normal` (default) | 800ms | Balanced for standard customer service |
| `low` | 1200ms | Agent waits longer — suits complex queries where caller may pause to think |

### 9.6 — Post-Call Webhook (ElevenLabs Best Practice)

After every call ends and session is flushed to PostgreSQL, if `agent.post_call_webhook_url` is set, fire a POST request with the complete call summary. This enables automation (CRM updates, ticketing, n8n workflows):

```python
# In session_manager.py — after PostgreSQL flush
async def fire_post_call_webhook(agent, conversation):
    if not agent.post_call_webhook_url:
        return
    payload = {
        "conversation_id": str(conversation.conversation_id),
        "agent_id": str(agent.agent_id),
        "tenant_id": str(agent.tenant_id),
        "duration_s": conversation.duration_s,
        "transcript": conversation.transcript_json,
        "turn_count": conversation.turn_count,
        "language_detected": conversation.language_detected,
        "call_successful": conversation.call_successful,
        "how_call_ended": conversation.how_call_ended,
        "total_cost": float(conversation.total_cost),
        "handoff_occurred": conversation.handoff_occurred,
        "evaluation_results": conversation.evaluation_results,
        "data_collection_results": conversation.data_collection_results,
    }
    async with httpx.AsyncClient() as client:
        await client.post(agent.post_call_webhook_url, json=payload, timeout=10)
    # Log to Kafka audit regardless of webhook success
    await audit_producer.publish("post_call_webhook_fired", agent.agent_id, payload)
```

### 9.7 — Evaluation Criteria Engine (ElevenLabs Best Practice)

Each agent can define evaluation criteria — rules that determine whether a conversation was "Successful" or not. These are configured in the Analysis tab. The evaluation runs after each conversation ends.

```python
# Evaluation criteria examples stored in agent_configs.evaluation_criteria_json:
# [
#   {"name": "resolved_query", "prompt": "Did the agent fully resolve the caller's query?"},
#   {"name": "no_escalation_needed", "prompt": "Was escalation to a human avoided?"},
#   {"name": "correct_info", "prompt": "Did the agent provide accurate information?"}
# ]

async def evaluate_conversation(conversation, agent_config):
    if not agent_config.evaluation_criteria_json:
        conversation.call_successful = True  # default if no criteria
        return
    # Run each criterion through LLM with full transcript
    results = {}
    for criterion in agent_config.evaluation_criteria_json:
        result = await llm_evaluate(conversation.transcript_json, criterion["prompt"])
        results[criterion["name"]] = result  # True/False
    conversation.evaluation_results = results
    conversation.call_successful = all(results.values())
```

### 9.8 — Data Collection Engine (ElevenLabs Best Practice)

Agents can define custom data points to extract from conversation transcripts automatically. Configured in the Analysis tab.

```python
# Data collection spec stored in agent_configs.data_collection_json:
# [
#   {"name": "customer_intent", "description": "Primary reason for the call"},
#   {"name": "account_number", "description": "Account number mentioned by caller"},
#   {"name": "issue_resolved", "type": "boolean"}
# ]

async def collect_data_from_transcript(conversation, agent_config):
    if not agent_config.data_collection_json:
        return
    extracted = {}
    for spec in agent_config.data_collection_json:
        value = await llm_extract(conversation.transcript_json, spec["description"])
        extracted[spec["name"]] = value
    conversation.data_collection_results = extracted
```

### 9.9 — Workflow Node Types (ElevenLabs Best Practice — for Task 8 Workflow Builder)

When building the visual workflow engine in Task 8, implement these node types matching ElevenLabs' architecture:

| Node type | Purpose | Fields |
|-----------|---------|--------|
| Start | Entry point of every workflow — one per agent | — |
| Conversation | AI conversation turn with system prompt override | system_prompt, voice_id override |
| Tool Call | Execute a specific tool | tool_id, input_mapping, output_mapping |
| Condition | Branch based on variable or tool result | condition_expression, true_path, false_path |
| Transfer | Transfer to agent queue or number | transfer_target, transfer_type |
| End | Terminate the call | end_message |

**4 built-in workflow templates (matching live ElevenLabs platform):**
1. **Qualification Flow** — Route users to specialised support based on their needs (Conversation → Condition → multiple Transfer nodes)
2. **Authentication Flow** — Collect user details, authenticate, guide through next steps (Conversation → Tool Call → Condition → Conversation)
3. **Enterprise Tier Escalation** — Route enterprise users to priority support (Condition → Transfer to priority queue OR standard queue)
4. **Business Hours Router** — Route to human agents during business hours only (Tool Call: check_business_hours → Condition → Conversation OR Transfer)

  -- NOTE: workflow_definition_json JSONB removed — workflow is stored in dedicated
  -- workflow_nodes + workflow_edges tables (confirmed §12.9). agent_configs.kb_docs_attached
  -- and similar list fields remain as lightweight arrays.
- Webhook: HTTP client with auth (API key/Bearer/OAuth2), configurable timeout, retry with backoff
- Client-side tool: WebSocket message to frontend widget JavaScript
- Integration connector: platform-managed connectors (CRM, ERP, ticketing)
- MCP: Model Context Protocol server connection
- Result injection: tool result appended to LLM context before next turn — seamless to caller

**System tool handlers:** `end_call`, `detect_language`, `skip_turn`, `transfer_to_agent`, `transfer_to_number`, `play_dtmf`, `voicemail_detection`

### 10.2 — Tool Execution Standards — LOCKED (GAPS-DOC: must-not-miss)

These standards apply to ALL tool types (webhook, integration, MCP) without exception. They must be implemented as a shared execution layer that all tool types pass through — not reimplemented per tool type.

**Idempotency:**
- Every POST/PUT/PATCH tool call MUST include an idempotency key in the request header: `X-Idempotency-Key: {cid}-{tool_id}-{turn_number}`
- This prevents duplicate side effects if a tool call is retried after a network timeout
- Integration connectors must document whether they honour idempotency keys (required for P0 connectors)

**Retry policy:**
- Max 3 attempts per tool call
- Backoff: 1s → 2s → 4s (exponential with jitter ±200ms)
- Retry on: connection timeout, 429 (rate limit), 503 (service unavailable)
- Do NOT retry on: 400 (bad request), 401 (auth failure), 403 (forbidden), 404 (not found)

**Circuit breaker:**
- Per tool (not per tenant): if >50% of calls to a tool fail in a 60s window, open circuit for 120s
- While circuit is open: return cached last-known result if available, else return graceful failure to LLM
- Circuit state stored in Redis key `circuit:{tool_id}:{state}` with TTL

**Audit fields — every tool execution records to audit_logs:**
- `cid` — conversation ID
- `tool_id` — which tool was called
- `tool_type` — webhook/client/integration/mcp
- `input_params` — sanitised input (strip secrets)
- `output_result` — sanitised result
- `latency_ms` — execution time
- `success` — boolean
- `error_code` — if failed
- `attempt_number` — retry count

**Secrets scope per tool:**
- Every tool's credentials stored at `secret/trustnow/{tenant_id}/tools/{tool_id}/credentials`
- Retrieved from Vault at execution time — NEVER cached in Redis or application memory
- Tool credentials are tenant-scoped — no tool can access another tenant's credentials

### 10.3 — Tool Sandboxing / Permission Boundaries (GAPS-DOC: must-not-miss)

Tool execution is bounded by three independent controls:

1. **Tenant scope:** A tool configured by Tenant A can only execute within Tenant A's agent sessions. Tool configurations are RLS-isolated in the `tools` table (`tenant_id` RLS policy).

2. **Agent scope:** A tool attached to Agent X cannot be invoked by Agent Y even within the same tenant. Tool attachment is recorded in `agent_configs.tools_config_json` — the tool execution engine validates `agent_id` on every invocation.

3. **Execution isolation:** Tool execution runs in a separate async task with its own timeout budget. A tool that hangs (e.g., an external API that never responds) cannot block the main conversation turn loop — the timeout fires independently and the circuit breaker opens.

---

## TASK 11 — FULLY AUTONOMOUS AI WORKERS (BRD §6.3)

**Prerequisite: Task 10 complete.**

### 11.1 — Master AI Worker: 10-Step Orchestration Engine (BRD §6.3.1)
Implement full flow: Greeting → Intent Capture → Authentication → Eligibility Check → Dues Check → Payment Gating → Task Delegation → Progress Tracking (MOH) → Result Consolidation → Final Response

### 11.2 — SME AI Workers (BRD §6.3.2)
Each SME: own Qdrant KB collection, own system prompt, own tool set, own LLM context
Domains: Billing, Provisioning, Technical Support, Banking/Finance, Retail, Healthcare (extensible)

### 11.3 — Auth Policy Engine (BRD §6.3.3 — P0)
Configurable per agent. All mechanisms: OTP (SMS/email), Voice biometrics, ANI/DNIS, PIN/Passcode, KBA, SSO/OAuth, Custom webhook

### 11.4 — Payment Gating (BRD §6.3.4 — P0)
Webhook → client payment system → payment link dispatch → inbound webhook completion monitoring → proceed on confirmed clearance. Timeout + retry configurable per tenant.

### 11.5 — Human-in-the-Loop (HITL) Approvals (GAPS-DOC: biggest must-add for Autonomous Workers)

For high-risk actions with financial, legal, or irreversible consequences, the Master AI Worker must pause and route to a supervisor for approval before executing. This is non-negotiable for regulated industries.

**High-risk action triggers (configurable per agent, defaults below):**
- Refund or credit exceeding tenant-configured threshold (e.g., > $100)
- Card block or account freeze actions
- Plan downgrades or service cancellations
- Address changes on financial accounts
- Any action the SME Worker flags with `requires_human_approval: true`

**HITL flow:**
1. Master Worker identifies high-risk action during SME task delegation
2. Places caller on hold with MOH
3. Publishes `hitl_approval_required` event to Kafka `trustnow.conversation.events` with CID + action details
4. Human Agent Desktop (supervisor view) receives WebSocket notification — displays approval request with full context
5. Supervisor reviews and clicks Approve or Reject within configured timeout (default 120s)
6. Decision published back via Redis pub/sub `hitl_decision:{CID}`
7. Master Worker receives decision:
   - Approve → executes action, informs caller, continues workflow
   - Reject → informs caller action cannot be completed at this time, offers alternatives
   - Timeout → treated as Reject, caller offered escalation to human agent

**HITL configuration per agent (Tab 9 Security → HITL subsection):**
- Enable/disable HITL
- Risk threshold amount (for financial actions)
- Approval timeout (seconds)
- Timeout action: reject / transfer to human / end call

### 11.6 — Saga / Compensation Semantics (GAPS-DOC: must-not-miss for multi-step SME work)

When the Master Worker delegates tasks to multiple SME Workers, partial failures must be handled gracefully. The saga pattern defines how to handle and compensate for partial success.

**Saga execution model:**
- SME tasks are executed sequentially by default (safe) or in parallel if configured (faster, higher risk)
- Each SME task records its result in Redis `session:{CID}.sme_results.{sme_domain}` before the next step begins
- If a step fails, the orchestrator evaluates the compensation strategy before proceeding

**Compensation strategies (configurable per SME task definition):**
- `rollback` — attempt to undo the completed steps (e.g., reverse a provisional booking)
- `skip` — mark the failed step as skipped, continue with remaining steps and note the skip in final response
- `halt` — stop the entire workflow, transfer to human with full context and a summary of what was completed and what failed
- `retry` — retry the failed step up to N times before applying fallback strategy

**Idempotency across SMEs:**
- Each SME task call includes a saga idempotency token: `{CID}-{saga_step_number}-{sme_domain}`
- If an SME task must be retried, the same token ensures the external system does not double-execute
- Completed saga steps are stored in Redis with their results — if the Master Worker restarts (pod crash), it reads completed steps from Redis and resumes from the last incomplete step

### 11.7 — Caller Progress Update Policy (GAPS-DOC: must-not-miss)

During long-running SME background work, the Master Worker must actively manage the caller's experience. Silence while on hold erodes confidence. This policy governs when and how the Master Worker communicates with the caller during background processing.

**Progress update triggers (all configurable per agent):**
| Event | Default Action |
|-------|---------------|
| Hold begins | TTS: "I'm just checking that for you now. Please bear with me for a moment." then MOH starts |
| Every 20s on hold | TTS: Brief update — "Still working on this for you, just another moment." then MOH resumes |
| SME task completed (background) | Update Redis `session:{CID}.progress` — used in next update message |
| Hold > 60s | TTS: More substantive update — "This is taking slightly longer than usual. I'm still working on it and haven't forgotten you." |
| Hold > 120s | TTS: "I appreciate your patience. Let me check if I can offer you an alternative while this completes." → offer: continue waiting / transfer to agent / callback |

**Update message generation:**
- Progress messages are LLM-generated using a lightweight prompt (not the full agent system prompt) to keep latency low
- Each update references what specifically is being worked on (e.g., "checking your account balance" not "working on your request")
- Tone matches the agent's configured voice personality

### 11.8 — Caller Experience Standards (BRD §6.3.5 — NON-NEGOTIABLE)
- Natural, human-like conversation throughout — no robotic IVR feel
- Hold music (FreeSWITCH MOH, configurable per tenant) during background AI processing
- Smooth hold ↔ active conversation transitions with progress updates per §11.7
- Seamless human handoff with full context transfer including completed steps, failed steps, and next best action

---

## TASK 12 — HUMAN AGENT DESKTOP (BRD §8.4)

**Prerequisite: Task 11 complete.**

### 12.1 — Desktop Features (enterprise contact centre grade)
<!-- GAP-002 FIXED: Canonical path is /agent-desktop/ (standalone app). NOT /app/agent-desktop. Consistent with UI-SPEC-001.md. -->
Next.js standalone application at `/agent-desktop/` (separate from Platform Admin Console at `/app/`):
- Live call controls: answer, hold, mute, transfer, conference, end (via FreeSWITCH ESL)
- Real-time transcript stream (WebSocket from AI pipeline, CID-keyed)
- Context panel: caller identity, interaction history, AI conversation summary, CID display
- CRM-panel layout: caller profile, account details, interaction notes
- Disposition codes: post-interaction classification (configurable per tenant)
- Wrap-up timer: configurable post-call window
- Internal chat: agent-to-agent and agent-to-supervisor
- Queue panel: waiting interactions, priority, estimated wait times
- Agent availability status: available, busy, break, wrap-up, offline
- Supervisor monitoring: live view all agents, call states, queue depths
- Supervisor barge-in and whisper coaching
- Recording playback: MinIO pre-signed URL, timeline markers for hold/transfer/tool events

---

## TASK 13 — MIS, REPORTING & ANALYTICS (BRD §8.5)

**Prerequisite: Task 12 complete.**

### 13.1 — Real-Time Dashboard
- Active calls counter: from Redis `active_calls:global` + `active_calls:{tenant_id}` (BRD-CC-005)
- Live queue depths from Agent Fabric queue state in Redis
- SLA breach alerts via Prometheus AlertManager + TimescaleDB continuous aggregates

### 13.2 — Historical Reporting (all from TimescaleDB)
- Per-agent, per-tenant, per-interaction reports
- LLM cost breakdown: model, input tokens, output tokens, calculated cost (LiteLLM)
- STT/TTS cost per interaction
- Export: CSV, PDF, GraphQL reporting API (BRD-L5-MIS-006 P1)

---

## TASK 14 — CALL RECORDING & QUALITY MANAGEMENT (BRD §8.6)

**Prerequisite: Task 13 complete.**

### 14.1 — Recording Pipeline
- FreeSWITCH records → temp local file → AES-256 encrypt → upload to MinIO `trustnow-recordings`
- File naming: `{tenant_id}/{agent_id}/{YYYY-MM-DD}/{CID}.wav`
- Metadata sidecar: `{CID}.json`
- Retention: automated purge job reads retention policy per tenant from DB; default 90 days recordings, 1 year transcripts

### 14.2 — Quality Management (NICE/VERINT-Comparable Benchmark)
- Configurable scoring criteria per tenant
- Automated QM scoring applied to all interactions (Kafka consumer)
- Manual review workflow: QA reviewer assignment, completion tracking
- Playback with event markers (hold, transfer, tool calls)
- Annotation tools: mark, score, comment on recording timeline
- Performance dashboards: quality scores by agent, queue, interaction type, period

---

## TASK 15 — LANDING PAGE & FRONTEND BUILD (BRD §10)

**Prerequisite: Task 14 complete.**

### 15.1 — Landing Page (BRD §10 — LOCKED SPEC)
File: `/app/page.tsx`
- Background: `#1A0A4C` (deep dark purple)
- Header: TRUSTNOW logo top-left; Login + Signup (red fill) top-right → Keycloak OAuth2 flow
- Navigation: AI Agents · Enterprise Integration · Resources · Contact us
- Hero: "TRUSTNOW AI WORKER STACK" — white/cyan bold centered
- Three pillars (teal circle icons, horizontal layout, connected by line):
  - Pillar 1: "Conversational AI Agents"
  - Pillar 2: "Tools Enabled AI Agent Orchestration"
  - Pillar 3: "Fully Autonomous AI Workers"
- Tagline: "Multi-tenant. Enterprise Grade. AI Agents aligned to client organisation structure. Policy driven. Audited. Governed. Fully Autonomous and handoff to human when required."
- Footer: red/purple animated wave/mesh decoration

---

## TASK 16 — END-TO-END INTEGRATION TESTING

**Prerequisite: Tasks 1–15 complete.**

### 16.1 — Concurrency Test (BRD-CC-001 to CC-010)
- Simulate 50 simultaneous calls to one agent
- Verify: 50 unique CIDs, 50 independent Redis sessions, 50 independent Kafka streams
- Verify: kill one session → others unaffected (BRD-CC-006)
- Verify: live dashboard shows correct concurrent count (BRD-CC-005)

### 16.2 — Partition Switching Test (BRD §4.3)
- Agent A on Partition A → verify Deepgram + ElevenLabs + LiteLLM cloud model routes
- Agent B on Partition B → verify FasterWhisper + Ollama + Piper — AND verify zero external HTTP calls made (check network logs)
- Run `test_mixed_partition.py` from FULL-SCOPE-IMPL-001.md §5.4.9 — verify both agents run simultaneously within same tenant with no cross-contamination
- Verify Partition B data sovereignty: run Partition B session with Wireshark/tcpdump monitoring — confirm zero outbound API traffic to any external host during the call

### 16.3 — Human Handoff Test (BRD §7.3)
- Option A: CID in SIP UUI header on transfer verified
- Option B: full context payload delivered to Human Agent Desktop, CID preserved

### 16.4 — Multi-Tenancy Test (BRD-L5-MT-003)
- Two tenants, cross-tenant DB query → blocked by RLS
- Keycloak realm isolation → Tenant A token rejected by Tenant B endpoints

### 16.5 — KB/RAG Test (BRD-L5-AGM-012 to 015)
- Upload PDF, URL, TXT → indexing completed in Qdrant
- Make call → RAG retrieval verified in LLM context

### 16.6 — Auth Policy Engine Test (BRD §6.3.3)
- OTP flow end-to-end
- ANI lookup
- Custom webhook auth

---

### 16.7 — Agent Wizard → Live Call E2E (CO-BROWSING §1 + §7)

Tests the complete guided creation path from wizard submission to a live conversation. Validates that the LLM-generated system prompt is correctly stored and used.

**Steps:**
1. `POST /agents/wizard` with `{agent_type: 'conversational', industry: 'healthcare_medical', use_case: 'telehealth_support', agent_name: 'Test Agent', main_goal: 'Help patients with appointment scheduling'}` → assert `agent_id` returned and `system_prompt` is non-empty (LLM generation ran)
2. `POST /agents/:id/publish` → assert branch goes live
3. Initiate a WebRTC test call to the published agent → assert conversation created with `agent_id` and `branch_id` correct
4. Assert `conversations.system_prompt_used` (or equivalent) contains the wizard-generated prompt — NOT the blank default
5. Assert `agents.creation_path = 'guided'` in DB

**Validates:** §6.2D-B (wizard endpoint), agent_templates seed data, LLM generation service, publish flow, conversation creation

---

### 16.8 — Post-Call Background Jobs Pipeline E2E (CO-BROWSING §9)

Tests that all 3 BullMQ post-call jobs fire and complete correctly after a call ends.

**Steps:**
1. Configure an agent with: 1 evaluation criterion + 1 data collection spec + `analysis_language = 'auto'`
2. Complete a test call (via WebSocket test client) — call must have ≥ 3 turns
3. Assert `how_call_ended` is set in `conversations`
4. Wait up to 30 seconds for async jobs:
   - Assert `conversations.ai_summary` is non-null and non-empty (Job 1: summary generation)
   - Assert `conversations.evaluation_results` contains the criterion's UUID as a key (Job 2: criteria evaluation)
   - Assert `conversations.data_collection_results` contains the spec's field_name as a key (Job 3: data extraction)
5. Assert all 3 BullMQ queues (`post-call-summary`, `post-call-criteria`, `post-call-data-extraction`) show 0 failed jobs

**Validates:** §6.2L post-call pipeline, BullMQ job execution, LLM evaluation calls, conversation record updates

---

### 16.9 — PII Redaction Pre-Storage E2E (CO-BROWSING §4 + BRD-CB-004)

Tests that PII is stripped from transcripts before writing to PostgreSQL when `pii_redaction_enabled = true`.

**Steps:**
1. Create agent with `pii_redaction_enabled = true`
2. Complete a test call where the simulated caller speaks: "My phone number is 07912 345678 and my date of birth is 01/01/1985"
3. Query `conversations.transcript_json` directly in PostgreSQL
4. Assert the transcript contains `[PHONE_NUMBER]` — NOT `07912 345678`
5. Assert the transcript contains `[DOB]` — NOT `01/01/1985`
6. Create second agent with `pii_redaction_enabled = false`, repeat — assert raw values ARE stored

**Validates:** §6.2H PII Redaction Service, transcript storage pipeline, regex pattern correctness

---

### 16.10 — Environment Variables + Workspace Secrets in Tool Execution E2E (CO-BROWSING §20 + §17)

Tests that `{{env.VAR}}` and `{{secret.KEY}}` are correctly resolved before a tool webhook fires.

**Steps:**
1. `POST /env-vars` → create variable `TEST_WEBHOOK_URL` with value `https://webhook.site/{unique-id}` for production
2. `POST /workspace/secrets` → create secret `TEST_API_TOKEN` with value `Bearer test-abc-123`
3. Create a webhook tool with `url = "{{env.TEST_WEBHOOK_URL}}"` and header `Authorization: {{secret.TEST_API_TOKEN}}`
4. Attach tool to agent, complete a test call that invokes the tool
5. Check webhook.site — assert the request arrived at the correct URL
6. Assert the `Authorization` header value in the received request is `Bearer test-abc-123` (not the literal string `{{secret.TEST_API_TOKEN}}`)
7. Assert neither raw value appears in `tools.url` or `tools.headers` columns in DB (confirm no plaintext leakage)

**Validates:** §6.2V EnvVarsModule resolution, §6.2S WorkspaceSecrets resolution, tool execution pipeline, Vault integration

---

### 16.11 — API Key Middleware: Scope Enforcement + Credit Limit E2E (CO-BROWSING §18)

Tests the API key validation middleware end-to-end, not just the key creation endpoint.

**Steps:**
1. `POST /api-keys` → create key with `restrict_key: true`, permissions: `{conversations: 'read', agents: null}`
2. **Positive test:** `GET /conversations` with `x-api-key: {key}` header → assert HTTP 200
3. **Negative test (wrong scope):** `POST /agents` with same key → assert HTTP 403 `"Key does not have permission for this endpoint"`
4. **Negative test (revoked):** `DELETE /api-keys/:id` → `GET /conversations` with same key → assert HTTP 401
5. **Credit limit test:** Create a second key with `monthly_credit_limit: 1` → invoke an endpoint that consumes credits → invoke again → assert HTTP 429 on second invocation
6. Assert `api_keys.last_used_at` is updated after each valid use

**Validates:** §6.2T ApiKeysModule, Kong gateway header forwarding, AuthModule middleware, credit tracking

---

### 16.12 — Batch Calling E2E: CSV → Calls → Conversations (CO-BROWSING §11)

Tests the full batch calling pipeline from CSV submission to completed conversation records.

**Steps:**
1. Import a SIP test number via `POST /phone-numbers`
2. Create and publish a test agent
3. `POST /batch-calls` with a CSV of 3 test numbers, `send_immediately: true`, compliance_acknowledged: true
4. Assert `batch_calls.status = 'running'` within 5 seconds
5. Assert `batch_call_recipients` rows exist with status transitions: `pending → in_progress → completed`
6. For each completed recipient: assert `conversation_id` is set and a `conversations` record exists
7. Assert `batch_calls.calls_completed = 3` and `status = 'completed'`
8. Assert dynamic variables from CSV columns are present in `conversations.client_data`

**Validates:** §6.2N BatchCallModule, BatchCallWorker (BullMQ), FreeSWITCH ESL originate, conversation pipeline, dynamic variable injection

---

### 16.13 — Branch Traffic Routing Invariant E2E (CO-BROWSING §13)

Tests that the traffic split algorithm correctly routes calls to branches and enforces the 100% invariant.

**Steps:**
1. Create an agent with Main branch at 100% live
2. `POST /agents/:id/branches` → create Variant A branch (inherits from Main)
3. `PUT /agents/:id/branches/{variant_a}/traffic` → `{ traffic_split: 30, status: 'live' }` — assert HTTP 200
4. `PUT /agents/:id/branches/{main}/traffic` → `{ traffic_split: 70 }` — assert HTTP 200
5. **Invariant test:** `PUT /agents/:id/branches/{variant_a}/traffic` → `{ traffic_split: 80 }` — assert HTTP 422 `"Traffic split would exceed 100%"`
6. Simulate 100 calls to the agent — count which branch handled each (via `conversations.branch_id`)
7. Assert Main handled 65–75 calls and Variant A handled 25–35 (within ±5% tolerance of 70/30 split)

**Validates:** §6.2P BranchesModule, traffic routing algorithm, conversation branch_id tagging, 100% invariant enforcement

---

### 16.14 — Platform Webhook Delivery + HMAC Verification E2E (CO-BROWSING §19)

Tests the full platform webhook event delivery flow with signature verification.

**Steps:**
1. Stand up a test HTTP server (Node.js `http.createServer`) on localhost listening for POST requests
2. `POST /api/webhooks` → create endpoint pointing to test server, subscribe to `agent.published`
3. Publish an agent → assert the test server receives a POST within 5 seconds
4. Verify `X-TRUSTNOW-Signature` header: compute `HMAC-SHA256(payload_body, shared_secret)` and compare — assert match
5. Assert `webhook_delivery_log` row created with `http_status = 200` and `success = true`
6. **Retry test:** Configure test server to return 503 on first call → assert TRUSTNOW retries → assert `webhook_delivery_log` shows `attempt_number = 2` on success
7. Delete the webhook → publish another agent → assert no POST received

**Validates:** §6.2U WebhookEndpointsModule, event emission on publish, HMAC signing, BullMQ retry logic, delivery log

---

### 16.15 — Widget Embed → Conversation → CSAT E2E (CO-BROWSING §3)

Tests the full widget deployment lifecycle: embed script loads → conversation starts → CSAT submitted.

**Steps:**
1. Create and publish an agent with `feedback_enabled = true`
2. Load a test HTML page containing:
   ```html
   <trustnow-agent agent-id="{agent_id}"></trustnow-agent>
   <script src="https://cdn.trustnow.ai/widget/embed.js" async></script>
   ```
3. Assert the `<trustnow-agent>` custom element renders (not just script loaded)
4. Assert no CSP violations in browser console (no `eval()`, no inline scripts)
5. Programmatically initiate a conversation via the widget's public API
6. Assert a `conversations` record is created in DB with `channel = 'widget'`
7. Submit CSAT: `POST /widget/feedback` with `{conversation_id, rating: 4, comment: "Test feedback"}`
8. Assert `conversations.rating = 4` and `conversations.feedback_text = "Test feedback"` in DB

**Validates:** Widget CDN bundle (L5-03), §6.2G WidgetModule, conversation channel tracking, CSAT collection, CSP compliance

---

### 16.16 — Conversations Retention Purge Cron E2E (CO-BROWSING §4)

Tests that the retention purge job deletes expired conversations and their MinIO recordings.

**Steps:**
1. Create an agent with `conversations_retention_days = 1`
2. Insert a test conversation record directly in DB with `started_at = NOW() - INTERVAL '2 days'` and a dummy `recording_url` pointing to a MinIO test object
3. Create the MinIO test object at that path
4. Trigger the retention purge job manually (or wait for the 03:00 UTC cron — use manual trigger in test mode)
5. Assert the conversation record no longer exists in `conversations`
6. Assert the MinIO object at `recording_url` no longer exists
7. Assert `audit_logs` contains a `retention_purge` entry for this agent_id

**Validates:** §6.2H retention purge cron, MinIO cleanup, cascade deletes, audit logging

---

## Test Coverage Gap Summary

The 10 new tests above (§16.7–§16.16) cover the following new modules from the co-browsing translation:

| New Test | Modules Covered |
|----------|----------------|
| 16.7 Wizard → Live Call | §6.2D-B, agent_templates, publish flow |
| 16.8 Post-Call Jobs Pipeline | §6.2L (all 3 BullMQ jobs) |
| 16.9 PII Redaction | §6.2H PII service, transcript storage |
| 16.10 Env Vars + Secrets in Tools | §6.2V, §6.2S, tool execution |
| 16.11 API Key Scope + Credits | §6.2T, AuthModule middleware |
| 16.12 Batch Calling E2E | §6.2N, BatchCallWorker, FreeSWITCH |
| 16.13 Branch Traffic Routing | §6.2P, routing algorithm |
| 16.14 Platform Webhook Delivery | §6.2U, HMAC, retry logic |
| 16.15 Widget → Conversation → CSAT | §6.2G, CDN bundle, CSP |
| 16.16 Retention Purge Cron | §6.2H cron, MinIO cleanup |

**Modules NOT given a dedicated E2E test** (adequately covered by task-level isolation tests):
- §6.2E Agent Templates seed data — verified by 16.7 indirectly
- §6.2F Translate-first-message — unit test in Task 6
- §6.2K KB/RAG endpoints — covered by existing §16.5
- §6.2M Phone Numbers CRUD — covered by 16.12 as prerequisite
- §6.2O Workflow canvas save/load — frontend + single module, unit test in Task 8
- §6.2Q Tests module execution — self-contained, unit test in Task 6
- §6.2R WhatsApp — requires Meta account; manual test only (see note below)
- §6.2W Standalone TTS — single-service test, Task 8 isolation
- §6.2X Async STT — single-service test, Task 8 isolation

**WhatsApp note:** §6.2R (WhatsApp) cannot be automated in Task 16 without a live Meta Business Account and test WhatsApp number. Document as a **manual go-live gate test** instead: "Before first BPO client deployment, verify WhatsApp inbound message → agent response flow using the TRUSTNOW test WhatsApp account."

---

## COMPLETE BRD-TO-INFRASTRUCTURE COMPONENT MAP

| BRD Requirement | BRD ID | Infrastructure / Service | Task |
|----------------|--------|--------------------------|------|
| LiteLLM LLM abstraction LOCKED | BRD-L1-005 | LiteLLM Docker :4000 | 2A.12 |
| All 7+ LLM providers (OpenAI/Anthropic/Google/Qwen/Mistral/Meta) | §4.1.1 | LiteLLM config.yaml model list | 2A.12 |
| Cloud STT: Deepgram primary | §4.1.2 | deepgram-sdk in Python venv | 2A.11 |
| Cloud TTS: ElevenLabs primary | §4.1.3 | elevenlabs-sdk in Python venv | 2A.11 |
| On-Prem STT: FasterWhisper P0 | BRD-L1-006 | FasterWhisper in venv | 2B.3 |
| On-Prem LLM: Ollama P0 | BRD-L1-007 | Ollama service :11434 | 2B.4 |
| On-Prem TTS: Piper P0 | BRD-L1-008 | Piper in venv + voice models | 2B.5 |
| RAG orchestration LlamaIndex LOCKED | §11.3 | llama-index in venv | 2A.11 |
| Vector DB Qdrant PRIMARY LOCKED | §11.3 | Qdrant Docker :6333 | 2A.5 |
| PostgreSQL 16 + RLS multi-tenancy | BRD-L5-MT-003 | PostgreSQL 16 systemd | 2A.2 |
| pgvector lightweight vector ops | §11.5 | PostgreSQL pgvector extension | 2A.2 |
| uuid-ossp + pgcrypto | §9 Security | PostgreSQL extensions | 2A.2 |
| TimescaleDB MIS time-series | §12.5 | TimescaleDB PG extension | 2B.1 |
| Redis CID session state | BRD-CC-003 | Redis Stack Docker :6379 | 2A.3 |
| Kafka CID event streaming | BRD-CC-004 | Kafka Docker :9092 (5 topics) | 2A.4 |
| Kong API Gateway | §11.6 | Kong Docker :8000/:8443 | 2A.6 |
| Keycloak realm-per-tenant IAM | BRD-L5-RB-003 | Keycloak Docker :8080 | 2A.7 |
| MinIO recordings + KB + voices | BRD-L5-REC-002 | MinIO Docker :9000 (4 buckets) | 2A.8 |
| HashiCorp Vault secrets LOCKED | §11.6 | Vault systemd :8200 | 2A.9 |
| Node.js 20 LTS + NestJS | §11.1/11.2 | Node.js + NestJS CLI | 2A.10 |
| Python 3.11 + FastAPI | §11.3 | Python 3.11 venv | 2A.11 |
| Prometheus + Grafana + Loki | §11.6 + §9 | Docker Compose :9090/:3000 | 2A.13 |
| Nginx TLS + proxy + Widget CDN | §11.6 | Nginx systemd :80/:443 | 2B.2 |
| Elasticsearch + Kibana | §11.5 | Elasticsearch :9200 | 2B.6 |
| TLS certificates | §9 Security | OpenSSL / Certbot | 3.1 |
| GitHub CI/CD + ArgoCD GitOps | §11.6 | GitHub Actions + ArgoCD | 3.2 |
| Kubernetes + Helm | §11.6 | K3s + Helm | 3.3 |
| PostgreSQL full schema + RLS | BRD-L5-MT-003 | schema.sql + RLS policies + hypertables | 4.1 |
| CID generation service | BRD-CC-001 | cid_service.py | 4.2 |
| Kafka event pipeline | BRD-CC-004 | Producers + Consumers | 4.3 |
| FastAPI AI pipeline service | §11.3 | main.py + all endpoints | 5.1 |
| Voice Library service | BRD-L1-010 to 013 | voice_service.py | 5.2 |
| LlamaIndex RAG pipeline | §11.3 | ingestion_service.py + retrieval_service.py | 5.3 |
| NestJS Platform API (12 modules) | §11.2 | NestJS app | 6.1 |
| RBAC 6 roles per tenant | BRD-L5-RB-001 | NestJS guards + Keycloak | 6.3 |
| FreeSWITCH SIP + recording + MOH | §11.4 BRD-L4-001 | FreeSWITCH systemd | 7.1 |
| LiveKit WebRTC SFU | §11.4 BRD-L4-001 | LiveKit systemd :7880 | 7.2 |
| Human handoff dual protocol | BRD-L4-004/005 | Handoff service | 7.3 |
| Agent Config Module (10 tabs) | BRD-L5-AGM-001+ | Next.js frontend module | 8.1 |
| Web Widget Publisher | BRD-L5-AGM-WG-001+ | Widget JS + Nginx CDN | 8.4 |
| Conversational AI Agents | BRD-L3-CA-001+ | Agent runtime + turn loop | 9.1 |
| Tools-Assisted Agents | BRD-L3-TA-001+ | Tool execution engine | 10.1 |
| Master AI Worker 10-step | BRD-L3-AW-001+ | Master orchestration engine | 11.1 |
| SME AI Workers | BRD-L3-AW-002+ | SME worker instances | 11.2 |
| Auth Policy Engine | BRD-L3-AW-005 | Auth policy service | 11.3 |
| Payment Gating | BRD-L3-AW-020 | Payment webhook service | 11.4 |
| Caller Experience (hold music, natural) | BRD §6.3.5 | FreeSWITCH MOH + AI pipeline | 11.5 |
| Human Agent Desktop | BRD-L5-HAD-001+ | Next.js agent-desktop module | 12.1 |
| MIS + Reporting dashboards | BRD-L5-MIS-001+ | Analytics service + TimescaleDB | 13.1 |
| Call Recording + QM scoring | BRD-L5-REC-001+ | Recording pipeline + QM service | 14.1 |
| Landing Page | BRD-L5-UI-001 | Next.js landing page | 15.1 |
| Concurrent session isolation | BRD-CC-001 to CC-010 | CID+Redis+Kafka+PostgreSQL+K8s HPA | All |

---

## COMPLETE PORT REFERENCE

| Port | Service | Access | BRD Ref |
|------|---------|--------|---------|
| 22/tcp | SSH admin | Public | §9 Security |
| 80/tcp | Nginx HTTP | Public | §11.6 |
| 443/tcp | Nginx HTTPS (TLS) | Public | §11.6 |
| 5060/tcp+udp | SIP signalling (FreeSWITCH) | Public | BRD-L4-001 |
| 5061/tcp | SIP TLS (FreeSWITCH) | Public | BRD-L4-001 |
| 7880/tcp | LiveKit API | Public | BRD-L4-001 |
| 7881/tcp | LiveKit RTC | Public | BRD-L4-001 |
| 8000/tcp | Kong HTTP proxy | Public | §11.6 |
| 8443/tcp | Kong HTTPS proxy | Public | §11.6 |
| 16384-32768/udp | RTP media (FreeSWITCH) | Public | BRD-L4-001 |
| 50000-60000/udp | LiveKit UDP media | Public | BRD-L4-001 |
| 3000/tcp | Grafana dashboard | Localhost | §11.6 |
| 3001/tcp | NestJS Platform API | Localhost (via Kong) | §11.2 |
| 3100/tcp | Loki log aggregation | Localhost | §11.6 |
| 4000/tcp | LiteLLM proxy | Localhost | BRD-L1-005 |
| 5432/tcp | PostgreSQL (direct — internal only) | Localhost | BRD-L5-MT-003 |
| 5433/tcp | PgBouncer (app connection pool — use this in all app code) | Localhost | GAP-006 HA foundation |
| 5601/tcp | Kibana | Localhost | §11.5 |
| 6333/tcp | Qdrant Vector DB | Localhost | BRD-L5-AGM-012 |
| 6334/tcp | Qdrant gRPC | Localhost | BRD-L5-AGM-012 |
| 6379/tcp | Redis Stack | Localhost | BRD-CC-003 |
| 8001/tcp | Kong admin API | Localhost | §11.6 |
| 8002/tcp | FastAPI AI Pipeline (GAP-001 FIXED — was :8000, now :8002) | Localhost (via Kong) | §11.3 |
| 8080/tcp | Keycloak IAM | Localhost | BRD-L5-RB-003 |
| 8200/tcp | HashiCorp Vault | Localhost | §11.6 |
| 9000/tcp | MinIO API | Localhost | BRD-L5-REC-002 |
| 9001/tcp | MinIO Console | Localhost | BRD-L5-REC-002 |
| 9090/tcp | Prometheus | Localhost | §11.6 |
| 9092/tcp | Kafka broker | Localhost | BRD-CC-004 |
| 9200/tcp | Elasticsearch | Localhost | §11.5 |
| 11434/tcp | Ollama LLM API | Localhost | BRD-L1-007 |

---

## DOCKER vs KUBERNETES DEPLOYMENT BOUNDARY (GAP-012 CLARIFICATION)

This table defines which services run as Docker containers on the host and which run as Kubernetes pods. This is the authoritative reference for the current single-server build.

| Service | Runtime | Reason |
|---------|---------|--------|
| PostgreSQL 16 | systemd (native) | Stateful — direct filesystem access, managed by OS |
| PgBouncer | systemd (native) | Co-located with PostgreSQL, low-overhead |
| Redis Stack | Docker container | Stateful, simple Docker volume mount |
| Kafka + Zookeeper | Docker Compose | Stateful, multi-service compose definition |
| Qdrant | Docker container | Stateful, Docker volume mount |
| Kong | Docker container | Infrastructure service |
| Keycloak | Docker container | Infrastructure service |
| MinIO | Docker container | Stateful, Docker volume mount |
| HashiCorp Vault | systemd (native) | Secrets backend — never containerised |
| Ollama | systemd (native) | GPU-accessible, model file management |
| Elasticsearch | systemd (native) | Stateful, large memory footprint |
| Kibana | systemd (native) | Co-located with Elasticsearch |
| Nginx | systemd (native) | Host-level reverse proxy + TLS termination |
| Prometheus | Docker Compose | Monitoring |
| Grafana | Docker Compose | Monitoring |
| Loki | Docker Compose | Monitoring |
| NestJS Platform API | **Kubernetes pod** (trustnow-platform namespace) | Stateless — horizontally scalable |
| FastAPI AI Pipeline | **Kubernetes pod** (trustnow-ai-pipeline namespace) | Stateless — horizontally scalable, HPA-managed |
| Conversational Agent Runtime | **Kubernetes pod** (trustnow-ai-pipeline namespace) | Stateless |
| Tools-Assisted Agent Runtime | **Kubernetes pod** (trustnow-ai-pipeline namespace) | Stateless |
| Master AI Worker | **Kubernetes pod** (trustnow-ai-pipeline namespace) | Stateless |
| SME AI Workers | **Kubernetes pod** (trustnow-ai-pipeline namespace) | Stateless, scale per domain |
| Kafka Consumers (3) | **Kubernetes pod** (trustnow-platform namespace) | Stateless workers |
| Next.js Frontend | **Kubernetes pod** (trustnow-platform namespace) | Stateless |
| Human Agent Desktop | **Kubernetes pod** (trustnow-platform namespace) | Stateless |

**Networking rule:** All Docker containers + systemd services use `--network host` or localhost binding. Kubernetes pods communicate with Docker infrastructure services via `172.17.0.1` (Docker bridge) or `localhost` (host network access from pod).

---

## DEFERRED GAP REGISTER PLACEHOLDERS

The following gaps from TRUSTNOW-GAP-REGISTER v1.1 are deferred to later build stages. They are recorded here as mandatory placeholders so they are not forgotten when we reach those stages.

---

### DEFERRED-001 — AlertManager Deployment (GAP-003 — P0 PRE-GO-LIVE BLOCKER)
**Belongs to: Task 13 (MIS & Reporting)**
**GAPS-DOC NOTE: This is explicitly P0 pre-go-live — do NOT mark Task 13 complete without AlertManager deployed and verified.**
**Gap:** Docs mention SLA breach alerting but AlertManager is not deployed. No real on-call alerting exists.
**When reached:** Task 13 must include AlertManager deployment, SLA alert rules, routing (email/Slack), and runbook links. Do not mark Task 13 complete without AlertManager verified.

---

### DEFERRED-002 — OpenTelemetry Tracing Backend (GAP-004 — P0 PRE-GO-LIVE BLOCKER)
**Belongs to: Task 13 (MIS & Reporting) + pre-go-live**
**GAPS-DOC NOTE: This is explicitly P0 pre-go-live — Grafana-grade observability without end-to-end tracing is not enterprise-ready.**
**Gap:** CID propagation is designed throughout the stack but no tracing backend (OTEL Collector + Tempo or Jaeger) is deployed.
**When reached:** Standardise on OpenTelemetry SDK instrumentation in all services. Deploy OTEL Collector + Grafana Tempo. All traces searchable by `cid`, `tenant_id`, `agent_id`. This delivers end-to-end call trace visibility from FreeSWITCH through STT/LLM/TTS to session end.

---

### DEFERRED-003 — Capacity Model + Scale Test Plan (GAP-005 — P0)
**Belongs to: Pre-go-live / Enterprise deployment phase**
**Gap:** 1000s concurrent sessions is the target but p95/p99 latency budgets, per-pod concurrency assumptions, GPU/CPU sizing, and staged scale test plan are not defined.
**When reached:** Define p95/p99 latency budgets per AI processing stage (STT < 400ms, LLM first-token < 600ms, TTS < 300ms, end-to-end round-trip < 1400ms). Define Kubernetes HPA thresholds per service. Execute staged load test: 50 → 200 → 500 → 1000+ concurrent sessions with SLOs and rollback criteria.

---

### DEFERRED-004 — Production HA/DR Topology (GAP-006 — P0)
**Belongs to: Enterprise deployment phase (dedicated multi-server/VM)**
**Gap:** Single-server build is correct for current phase. Enterprise HA requires a fully specified multi-server reference topology.
**When reached:** Define and implement:
- PostgreSQL HA: Patroni primary-replica + VIP (point PgBouncer at VIP)
- Redis HA: Redis Sentinel or Redis Cluster
- Kafka HA: 3-broker cluster in KRaft mode
- MinIO HA: distributed mode or AWS S3 with Object Lock
- Keycloak HA: 2+ nodes behind load balancer
- Vault HA: 3-node Raft cluster
- FreeSWITCH HA: active-passive + SBC
- LiveKit HA: multi-node + TURN
- Full DR plan: RPO/RTO targets, backup schedules, restore runbooks, quarterly game days

---

### DEFERRED-005 — Security & Compliance Pack (GAP-007 — P0)
**Belongs to: Task 14 (Recording & QM) + pre-go-live**
**Gap:** Enterprise contact centres in regulated industries require explicit compliance controls beyond what is currently specified.
**When reached — mandatory controls to implement:**
- PII masking/redaction in transcripts: card numbers, OTPs, bank account numbers, SSNs — configurable per tenant
- Audio redaction: silence or beep-replace sensitive audio segments during recording
- Recording consent: per-tenant consent policy (IVR disclosure) + evidence trail in audit_logs
- Key management: per-tenant encryption key hierarchy in Vault, rotation schedule, access audit evidence
- Telephony security: SIP-TLS + SRTP mandatory before production traffic; anti-fraud controls on inbound ANI

---

### DEFERRED-006 — Integration Adapter Catalog + Contract Standards (GAP-009 — P0)
**Belongs to: Task 10 (Tools-Assisted Agents)**
**Gap:** Tool execution exists but no standardised adapter catalog or integration contract.
**When reached:** Define and implement:
- Adapter catalog: CRM (Salesforce, HubSpot, Zendesk), ticketing (Jira, ServiceNow), billing, identity providers, payment gateways, CC platforms (Avaya, Genesys, Cisco)
- Contract standards: idempotency keys on all POST operations, retry with exponential backoff (3 attempts max), circuit breaker per tool, per-tool audit logging with before/after state + CID correlation, SLA/SLO per integration

---

### DEFERRED-007 — Keycloak Production Hardening (GAP-010 — P1)
**Belongs to: Pre-go-live**
**Gap:** Keycloak runs in `start-dev` mode. This is correct for build/test but MUST be changed before any external traffic.
**When reached:** Switch to `start` command (production mode). Configure: proper hostname, reverse proxy headers (X-Forwarded-*), HTTPS-only, realm export/import automation, HA deployment, backup/restore procedures.

---

### DEFERRED-008 — Elasticsearch Security (GAP-011 — P1)
**Belongs to: Pre-go-live**
**Gap:** `xpack.security.enabled=false`. Acceptable for single-server internal-only deployment. Must be secured before production.
**When reached:** Enable xpack security, configure TLS between nodes, create per-service credentials, restrict network access, enable audit logging.

---

### DEFERRED-009 — Telephony Perimeter Hardening (GAP-013 — P1)
**Belongs to: Task 7 (FreeSWITCH + LiveKit)**
**Gap:** SBC requirement, SIP-TLS/SRTP, admission control, and anti-fraud controls are not yet specified.
**When reached — mandatory before production SIP traffic:**
- Session Border Controller (SBC): Kamailio or commercial SBC in front of FreeSWITCH
- SIP-TLS on port 5061 for all external SIP
- SRTP for all media
- Inbound ANI allowlists per tenant
- Rate limiting on SIP INVITE
- Anomaly detection for toll fraud
- TURN server for WebRTC NAT traversal (Coturn recommended)

---

### DEFERRED-010 — Speech Analytics Primitives for QM Parity (GAP-016 — P1)
**Belongs to: Task 14 (Recording & QM)**
**Gap:** NICE/VERINT parity requires baseline speech analytics that feed QM scoring.
**When reached — implement before QM go-live:**
- Speaker diarization (identify Agent vs Caller turns in transcript)
- Keyword/phrase spotting (configurable per tenant, feeds compliance scoring)
- Overtalk and silence detection (with duration thresholds)
- Sentiment analysis per turn (Caller sentiment trend over call duration)
- Compliance phrase detection (mandatory disclosures, prohibited phrases)
- All analytics written to conversations table and surfaced in QM scoring templates

---

### DEFERRED-011 — MinIO + Qdrant Tenant Isolation Enforcement (GAP-015 — P1)
**Belongs to: Task 5 (RAG Pipeline) + Task 14 (Recording)**
**Gap:** Tenant isolation intent is correct but enforcement rules need explicit implementation.
**When reached:**
- MinIO: IAM policy per tenant, presigned URL TTL max 15 minutes, per-tenant path prefix enforced (`{tenant_id}/`), bucket-level event notifications
- Qdrant: confirm server-side collection access control, per-tenant collection naming (`kb_{tenant_id}_{agent_id}`) enforced at API layer

---

*IMPL-001.md v3.0 — Complete Implementation Manual — 16 Tasks + Task 4B — All Five Architecture Layers — Full BRD-1 v1.1 Scope + Gap Register Integration*
*TRUSTNOW CONFIDENTIAL — March 2026*
*Cross-reference: FULL-SCOPE-BRD.md (requirements), RUNBOOK.md (task status), TRUSTNOW-GAP-REGISTER v1.1 (gap tracking)*
