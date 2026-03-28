# IMPL-001.md — TRUSTNOW Autonomous AI Stack
## Complete Implementation Manual — All Tasks, All Layers
### Document ID: IMPL-001 v3.1 | March 2026
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v1.0 | March 2026 | Initial baseline — Task 1 OS Hardening + Task 2 First Batch infra only |
| v1.1 | March 2026 | Added Task 2 Second Batch (FasterWhisper, Ollama, Piper, TimescaleDB, Nginx) |
| v2.0 | March 2026 | Complete rewrite — full BRD scope alignment. Added Tasks 3–16 covering all five architecture layers, full application build, CI/CD, Kubernetes, voice pipeline, Agent Config Module, Human Agent Desktop, MIS, Recording/QM. Updated all component maps, port reference, and verification checklists. Removed incorrect deferrals. Aligned to FULL-SCOPE-BRD.md. |
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
- `tenants` — tenant_id (uuid PK default uuid_generate_v4()), name, plan_tier, default_partition, settings_json, created_at, status
- `users` — user_id, tenant_id (FK+RLS), email, name, role_id, status, last_login, mfa_enabled
- `roles` — role_id, tenant_id (RLS), name (6 standard roles), permissions_json
- `agents` — agent_id, tenant_id (RLS), name, type (conversational/tools_assisted/autonomous), status, partition, created_by, current_version_id, post_call_webhook_url, environment (production/staging)
- `agent_configs` — config_id, agent_id, version,
  -- Core
  system_prompt, default_personality_enabled BOOLEAN DEFAULT false, timezone_override VARCHAR(50),
  first_message, first_message_interruptible BOOLEAN DEFAULT true,
  -- Voice
  voice_id, expressive_mode_enabled BOOLEAN DEFAULT false,
  additional_voices JSONB DEFAULT '[]',  -- array of {voice_id, language}
  -- Language
  primary_language, additional_languages[], hinglish_mode_enabled BOOLEAN DEFAULT false,
  language_groups JSONB DEFAULT '[]',  -- e.g. [{name:"Hindi & Tamil", languages:["hi","ta"]}]
  -- LLM
  llm_model_id, backup_llm_policy VARCHAR(20) DEFAULT 'default', -- default|custom|disabled
  backup_llm_model_id UUID REFERENCES llm_models(model_id),
  llm_temperature NUMERIC(3,2) DEFAULT 0.5,
  llm_thinking_budget_enabled BOOLEAN DEFAULT false,
  llm_max_tokens INTEGER DEFAULT -1,
  -- STT/TTS
  stt_provider_id, tts_provider_id,
  -- Conversation behaviour
  eagerness VARCHAR(10) DEFAULT 'normal',  -- low|normal|high
  speculative_turn_enabled BOOLEAN DEFAULT false,
  take_turn_after_silence_ms INTEGER DEFAULT 7000,
  end_conversation_after_silence_s INTEGER DEFAULT -1,
  max_conversation_duration_s INTEGER DEFAULT 600,
  max_conversation_duration_message TEXT DEFAULT 'Conversation ended, goodbye!',
  soft_timeout_s INTEGER DEFAULT -1,
  filter_background_speech_enabled BOOLEAN DEFAULT false,
  asr_model VARCHAR(50) DEFAULT 'original',
  user_input_audio_format VARCHAR(30) DEFAULT 'pcm_16000',
  -- Guardrails
  guardrails_focus_enabled BOOLEAN DEFAULT false,
  guardrails_focus_config JSONB,
  guardrails_manipulation_enabled BOOLEAN DEFAULT false,
  -- Overrides (what callers can override per-conversation)
  allowed_overrides TEXT[] DEFAULT '{}', -- first_message|system_prompt|llm|voice|voice_speed|voice_stability|voice_similarity|text_only
  -- RAG
  rag_enabled BOOLEAN DEFAULT false,
  rag_embedding_model VARCHAR(30) DEFAULT 'multilingual',  -- english|multilingual
  rag_character_limit INTEGER DEFAULT 50000,
  rag_chunk_limit INTEGER DEFAULT 20,
  rag_vector_distance_limit NUMERIC(4,3) DEFAULT 0.5,
  rag_num_candidates_enabled BOOLEAN DEFAULT false,
  rag_num_candidates INTEGER DEFAULT 100,
  rag_query_rewrite_enabled BOOLEAN DEFAULT false,
  -- Other
  tools_config_json, kb_docs_attached[], widget_config_id, auth_policy_id, handoff_policy_id
- `agent_versions` — version_id, agent_id, config_snapshot_json, published_by, published_at, traffic_split_pct INTEGER DEFAULT 100, is_live BOOLEAN DEFAULT false
- `agent_templates` — template_id, agent_type (conversational/tools_assisted/autonomous), industry VARCHAR(50), use_case VARCHAR(80), system_prompt_template TEXT, first_message_template TEXT, suggested_voice_id, suggested_llm_model_id, suggested_tools TEXT[], created_at
  -- 17 industries × up to 13 use cases each. Seed minimum 21 templates for launch (7 industries × 3 use cases).
  -- Template placeholders: {{agent_name}}, {{company_name}}, {{industry}}, {{use_case}}, {{main_goal}}, {{website_content}}
- `voices` — voice_id, tenant_id (null=global), name, description, gender, language_tags[], trait_tags[], provider, sample_audio_url, is_global
- `llm_providers` — provider_id, name, type (cloud/onprem), base_url, auth_type
- `llm_models` — model_id, provider_id (FK), model_name, display_name, latency_p50_ms, cost_per_min (numeric), context_window_tokens, supported_languages[], status
- `stt_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `tts_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `knowledge_base_docs` — doc_id, tenant_id (RLS), agent_id, name, type (url/pdf/docx/txt/csv), source_url, storage_path, status (pending/indexing/ready/error), chunk_count, vector_collection_ref, last_indexed_at
- `tools` — tool_id, tenant_id (RLS), name, type (webhook/client/integration/mcp/system), description, config_json
- `widget_configs` — widget_id, agent_id, embed_code,
  feedback_enabled BOOLEAN DEFAULT true,  -- 1-5 star post-call rating
  interface_settings_json,  -- chat_mode, send_text_on_call, realtime_transcript, language_dropdown, mute_button
  expanded_behavior VARCHAR(20) DEFAULT 'starts_expanded',  -- starts_expanded|starts_collapsed
  avatar_type VARCHAR(10) DEFAULT 'orb',  -- orb|link|image
  avatar_config_json,
  terms_config_json,
  styling_config_json,
  allowed_domains[],
  include_www_variants BOOLEAN DEFAULT true,
  allow_http_links BOOLEAN DEFAULT false
- `auth_policies` — policy_id, agent_id, tenant_id (RLS), methods_enabled[], allowed_numbers[], ip_allowlist[], jwt_config_json,
  conversation_initiation_webhook_url TEXT,  -- for Twilio/SIP trunk client data fetch
  post_call_webhook_url TEXT,  -- fires after call_ended event
  allowed_overrides TEXT[] DEFAULT '{}'  -- per-conversation config overrides permitted
- `handoff_policies` — policy_id, agent_id, tenant_id (RLS), handoff_type, transfer_target, escalation_triggers[], pre_handoff_tts_message
- `conversations` — conversation_id (CID uuid PK), agent_id, tenant_id (RLS), channel, status, started_at TIMESTAMPTZ NOT NULL, ended_at, duration_s, recording_url, transcript_json, llm_cost, tts_cost, stt_cost, total_cost, language_detected, handoff_occurred, rating, feedback_text,
  -- ElevenLabs-parity fields (from live platform observation)
  call_cost_credits INTEGER,  -- ElevenLabs credits consumed
  llm_credits INTEGER,
  environment VARCHAR(20) DEFAULT 'production',  -- production|staging
  is_preview BOOLEAN DEFAULT false,  -- true for preview/test calls (discounted credit rate, not billed at production rate)
  how_call_ended VARCHAR(50),  -- client_navigated_away|agent_ended|silence_timeout|max_duration|error
  user_id VARCHAR(255),  -- caller user ID if auth passed
  branch_id UUID REFERENCES agent_versions(version_id),  -- which A/B branch handled this call
  tts_latency_ms_avg INTEGER,  -- avg TTS latency across turns
  asr_latency_ms_avg INTEGER,  -- avg ASR latency across turns
  turn_count INTEGER,
  call_successful BOOLEAN,  -- evaluation criteria result
  evaluation_results JSONB,  -- per-criteria results
  data_collection_results JSONB  -- extracted data points from transcript
- `audit_logs` — log_id, tenant_id (RLS), user_id, action, resource_type, resource_id, before_json, after_json, ip_address, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `recordings` — recording_id, conversation_id (CID FK), tenant_id (RLS), storage_path, duration_s, format, encryption_key_ref, retention_until

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
| AgentsModule | BRD-L5-AGM-001 to 011 | POST /agents, GET /agents, GET /agents/:id, PUT /agents/:id/config, POST /agents/:id/publish, GET /agents/:id/branches, POST /agents/:id/branches, PUT /agents/:id/branches/:branchId/traffic |
| KnowledgeBaseModule | BRD-L5-AGM-012 to 015 | POST /kb/documents, GET /kb/documents, POST /agents/:id/kb/attach, PUT /agents/:id/kb/rag-config |
| ToolsModule | BRD-L5-AGM-016 to 020 | POST /tools, GET /tools, PUT /tools/:id, DELETE /tools/:id, PUT /agents/:id/tools/system, GET /tools/mcp, POST /tools/mcp |
| WidgetModule | BRD-L5-AGM-WG-001 to 009 | PUT /agents/:id/widget, GET /agents/:id/widget/embed |
| VoicesModule | BRD-L1-010 to 013 | GET /voices, POST /voices/:id/preview, POST /voices/design, POST /voices/clone, GET /voices/languages/:code/top-picks |
| LLMProvidersModule | BRD-L1-005 | GET /llm-providers/models (with latency + cost/min), GET /llm-providers |
| ConversationsModule | BRD-L5-MIS-002 | GET /conversations, GET /conversations/:id, GET /conversations/:id/transcript, GET /conversations/:id/recording, GET /agents/:id/preview-history (list preview conversations with auto-names) |
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

  // Conversational behaviour — ALL NEW from co-browsing
  eagerness?: 'low' | 'normal' | 'high';
  speculative_turn_enabled?: boolean;
  take_turn_after_silence_ms?: number;      // default 7000
  end_conversation_after_silence_s?: number;  // default -1
  max_conversation_duration_s?: number;     // default 600
  max_conversation_duration_message?: string;
  soft_timeout_s?: number;                  // default -1
  filter_background_speech_enabled?: boolean;
  asr_model?: string;
  user_input_audio_format?: string;

  // Guardrails — NEW from co-browsing
  guardrails_focus_enabled?: boolean;
  guardrails_focus_config?: object;
  guardrails_manipulation_enabled?: boolean;

  // Overrides — NEW from co-browsing
  allowed_overrides?: string[];   // 'first_message'|'system_prompt'|'llm'|'voice'|'voice_speed'|'voice_stability'|'voice_similarity'|'text_only'

  // RAG — NEW from co-browsing
  rag_enabled?: boolean;
  rag_embedding_model?: 'english' | 'multilingual';
  rag_character_limit?: number;       // default 50000
  rag_chunk_limit?: number;           // default 20
  rag_vector_distance_limit?: number;
  rag_num_candidates_enabled?: boolean;
  rag_num_candidates?: number;
  rag_query_rewrite_enabled?: boolean;

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

### 6.2D — Agent Creation Wizard API (NEW — observed live from ElevenLabs co-browsing)

The "+New Agent" wizard (UI-SPEC §6.3A) requires a dedicated creation endpoint that combines all wizard inputs, generates a complete agent config via LLM, optionally crawls a website, and returns a fully pre-populated agent ready to publish.

```typescript
// AgentsModule — wizard creation endpoint
// POST /agents/wizard
export class CreateAgentWizardDto {
  agent_type: 'conversational' | 'tools_assisted' | 'autonomous';  // Step 1
  industry: string;          // Step 2 — e.g., 'healthcare_medical'
  use_case: string;          // Step 3 — e.g., 'telehealth_support'
  agent_name: string;        // Step 4 — required
  main_goal: string;         // Step 4 — required, free text
  website_url?: string;      // Step 4 — optional, triggers async URL crawl
  kb_doc_ids?: string[];     // Step 3 — pre-selected KB doc IDs
  chat_only?: boolean;       // Step 4 — text-only mode toggle
}
```

**Wizard endpoint logic:**
1. Look up `agent_templates` where `agent_type + industry + use_case` match
2. Call LLM (Claude Sonnet) with template + `{agent_name, main_goal, website_content}` → generate `system_prompt` + `first_message`
3. Create `agents` row + `agent_configs` row with all generated content + template defaults
4. If `kb_doc_ids` provided: attach docs to agent
5. If `website_url` provided: spawn async crawl job → create KB doc → attach → update agent config (non-blocking)
6. Return `{agent_id, config, redirect_url: /app/agents/{id}?tab=agent}`

**Website personalisation note:** The website URL crawl runs asynchronously post-creation. The agent is immediately usable. Tab 4 (KB) shows "Personalising from your website..." progress indicator until crawl completes (~30–60s for typical sites).

### 6.2E — Agent Templates — Seed Data (REQUIRED for wizard to function)

Seed the `agent_templates` table with minimum 21 templates at launch. Priority industries and use cases for BPO/contact centre:

```sql
-- Priority seed templates (21 minimum for launch)
-- Format: (agent_type, industry, use_case, system_prompt_template, first_message_template)

-- Healthcare × 3 use cases
INSERT INTO agent_templates (agent_type, industry, use_case, system_prompt_template, first_message_template, ...) VALUES
('conversational', 'healthcare_medical', 'telehealth_support',
  'You are {{agent_name}}, a professional telehealth support agent for {{company_name}}. Your goal: {{main_goal}}. You help patients with medical queries, appointment scheduling, and health guidance. Always recommend consulting a qualified doctor for medical decisions.',
  'Hello! I am {{agent_name}} from {{company_name}}. I am here to assist with your healthcare needs. How may I help you today?'),
('conversational', 'healthcare_medical', 'appointment_scheduling', ...),
('conversational', 'healthcare_medical', 'patient_intake', ...),

-- Finance × 3 use cases
('conversational', 'finance_banking', 'customer_support', ...),
('conversational', 'finance_banking', 'lead_qualification', ...),
('conversational', 'finance_banking', 'answering_service', ...),

-- Retail × 3 use cases
('conversational', 'retail_ecommerce', 'customer_support', ...),
('conversational', 'retail_ecommerce', 'outbound_sales', ...),
('conversational', 'retail_ecommerce', 'lead_qualification', ...),

-- Education × 3
-- Hospitality × 3
-- Technology × 3
-- Professional Services × 3
;
```

Full template content to be written as a separate `seed-agent-templates.sql` file during Task 6. Each template's system_prompt_template should be 800–1500 chars, professional, role-specific, with `{{placeholders}}` for the wizard inputs.

### 6.3 — RBAC: Six Standard Tenant Roles (BRD-L5-RB-001)
- `platform_admin` — TRUSTNOW ops, full platform visibility
- `tenant_admin` — Full tenant control including billing/users/settings
- `agent_admin` — Create/edit/publish agents, manage KB and tools
- `supervisor` — View conversations, monitoring, barge-in
- `operator` — Limited agent configuration, no billing
- `auditor` — Read-only access to audit logs and recordings

---


## TASK 7 — TELEPHONY (FreeSWITCH + LiveKit)

**Prerequisite: Task 6 complete + TLS certificates in place.**

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 7

Read RUNBOOK.md and confirm Task 6 is ✅ COMPLETE before starting. Run the standard session start health check (`uname -r && uptime && df -h && free -h`) and report server state. Then proceed through §7.1–§7.14 in sequence without skipping steps. Run every VERIFY block before moving to the next section. If anything fails, stop and report immediately — do not attempt to work around errors.

This task builds the telephony layer (Layer 4): FreeSWITCH for SIP/PSTN and LiveKit for WebRTC. It also builds the dual-protocol human handoff service as a NestJS module and a Python helper. After all verifications pass, update RUNBOOK.md and report back to Architect.

**Files created in this task:**
- `config/freeswitch/` — All FreeSWITCH configuration (bind-mounted into container)
- `config/livekit/config.yaml` — LiveKit configuration
- `services/platform-api/src/telephony/` — NestJS EslService + HandoffModule
- `services/ai-pipeline/handoff_service.py` — Python handoff helper (AI pipeline side)
- `config/freeswitch/docker-compose.yml` — FreeSWITCH container definition

---

### §7.1 — FreeSWITCH Installation (Docker — Ubuntu 24.04 Compatible)

FreeSWITCH packages are no longer available via a public apt repo for Ubuntu 24.04 Noble. Use the official Docker image — consistent with the rest of the stack.

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

## TASK 8 — AGENT CONFIGURATION MODULE (BRD §8.3)

---

### ▶ PLATFORM ENGINEER — SESSION START INSTRUCTIONS FOR TASK 8

Read RUNBOOK.md and confirm Tasks 5, 6, and 7 are COMPLETE before starting. Task 8 is the first major frontend task. Read `UI-SPEC-001.md §6.4 (Agent Config Module)` IN FULL before writing a single component — every field, every tab, every toggle is specified there with exact labels, defaults, and behaviour. Also read `UI-SPEC-001.md §6.1` (global layout/sidebar), `§6.3` (Agent List), `§6.5` (Voice Picker), `§6.6` (Voice Library), `§6.7` (KB page), `§6.8` (Tools page). Build to the spec — do not guess field names or layouts.

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

**Prerequisite: Tasks 5, 6, and 7 complete.**

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

### 9.1 — Conversational Agent Runtime
Turn loop: STT (Deepgram/FasterWhisper) → RAG retrieval (optional) → LLM (LiteLLM) → TTS (ElevenLabs/Piper) → audio output to caller

- Session initiation: CID generated atomically (Redis + PostgreSQL + Kafka)
- Each turn: cost recorded to Redis session, published to Kafka
- Session end: Redis → PostgreSQL flush, recording finalised, `call_ended` Kafka event
- All N concurrent sessions isolated per BRD-CC-003 (no shared state)

### 9.2 — Barge-In / Interrupt Policy (GAPS-DOC: must-not-miss for Conversational Agents)

When a caller speaks while the TTS audio is playing, the system must handle the interruption cleanly. This policy must be implemented in the AI pipeline turn loop and is configurable per agent via Tab 10 Advanced.

**Interrupt modes (configurable per agent):**
- `allow` — any caller speech immediately stops TTS playback, STT begins capturing
- `smart` — only stop TTS if caller speech exceeds 300ms (filters out short affirmative sounds like "uh-huh", "yes" that should not interrupt)
- `none` — TTS plays to completion before STT activates (use for formal compliance scripts)

**Implementation requirements:**
- FreeSWITCH ESL event `DETECTED_SPEECH` triggers interrupt signal to AI pipeline via Redis pub/sub `interrupt:{CID}`
- AI pipeline subscribes to interrupt channel per active CID — on interrupt: stop TTS stream, discard remaining audio buffer, begin new STT capture
- Interrupted TTS turn is logged in transcript as `[interrupted]` marker with timestamp
- Caller speech captured from interrupt point — LLM receives truncated previous AI turn + full caller utterance

### 9.3 — Voice Activity Detection (VAD) Parameters (GAPS-DOC: must-not-miss)

VAD governs when the system considers the caller has finished speaking and the AI's turn begins. These must be configurable per agent (Tab 10 Advanced) with the following locked defaults:

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| End-of-speech silence | 800ms | 300–3000ms | Silence duration after which caller is considered done speaking |
| Minimum speech duration | 100ms | 50–500ms | Minimum audio duration to be treated as intentional speech (filters clicks/noise) |
| Noise floor threshold | -40dBFS | -60 to -20 | Below this level, audio treated as silence regardless of duration |
| Max utterance duration | 60s | 10–300s | Maximum single caller utterance before forced end-of-speech |
| STT start timeout | 10s | 5–60s | Silence at call start before playing re-prompt or timeout action |

**Implementation:** FasterWhisper (Partition B) uses `silero-vad` for endpoint detection. Deepgram (Partition A) uses Deepgram's built-in endpointing API with `endpointing` parameter set to the configured silence threshold in milliseconds.

### 9.4 — Latency vs Quality Presets (GAPS-DOC: must-not-miss)

Three first-class agent presets selectable per agent in Tab 1 (shown as a preset dropdown above the LLM picker):

| Preset | LLM | STT | TTS | Use Case |
|--------|-----|-----|-----|---------|
| **Fast** | Fastest model in selected provider (e.g., gpt-4o-mini, claude-haiku) | `base` model (FasterWhisper) or Deepgram Nova-2 | Piper or ElevenLabs turbo | High-volume simple queries, IVR deflection |
| **Balanced** | Mid-tier model (e.g., gpt-4o, gemini-flash) | `medium` model | ElevenLabs standard | Default for most contact centre deployments |
| **High Quality** | Best model in selected provider (e.g., gpt-4o, claude-sonnet) | `large-v3` model | ElevenLabs multilingual v2 | Complex autonomous workflows, premium customer segments |

Selecting a preset auto-populates the LLM, STT, and TTS selectors in Tab 1 but the agent admin can override each individually after preset selection. The preset is stored as a metadata field in `agent_configs` alongside the individual selections.

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

Store workflow definition as JSONB in `agent_configs.workflow_definition_json` with schema: `{nodes: [{id, type, config, position}], edges: [{from, to, label}]}`
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
