# IMPL-001.md — TRUSTNOW Autonomous AI Stack
## Complete Implementation Manual — All Tasks, All Layers
### Document ID: IMPL-001 v2.0 | March 2026
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v1.0 | March 2026 | Initial baseline — Task 1 OS Hardening + Task 2 First Batch infra only |
| v1.1 | March 2026 | Added Task 2 Second Batch (FasterWhisper, Ollama, Piper, TimescaleDB, Nginx) |
| v2.0 | March 2026 | Complete rewrite — full BRD scope alignment. Added Tasks 3–16 covering all five architecture layers, full application build, CI/CD, Kubernetes, voice pipeline, Agent Config Module, Human Agent Desktop, MIS, Recording/QM. Updated all component maps, port reference, and verification checklists. Removed incorrect deferrals. Aligned to FULL-SCOPE-BRD.md. |

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
      - targets: ['localhost:8000']
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
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Widget CDN — serves embeddable widget JS (BRD-L5-AGM-WG-001)
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

**Prerequisite: Task 3 complete.**

### 4.1 — PostgreSQL Schema with Full RLS (BRD-L5-MT-003, BRD-CC-001)

Create schema at: `/opt/trustnowailabs/trustnow-ai-worker-stack/services/platform-api/src/database/schema.sql`

**Entities to implement:**
- `tenants` — tenant_id (uuid PK), name, plan_tier, default_partition, settings_json, created_at, status
- `users` — user_id, tenant_id (FK+RLS), email, name, role_id, status, last_login, mfa_enabled
- `roles` — role_id, tenant_id, name (6 standard roles), permissions_json
- `agents` — agent_id, tenant_id (RLS), name, type (conversational/tools_assisted/autonomous), status, partition, created_by, current_version_id
- `agent_configs` — config_id, agent_id, version, system_prompt, first_message, voice_id, primary_language, additional_languages[], llm_model_id, stt_provider_id, tts_provider_id, tools_config_json, kb_docs_attached[], widget_config_id, auth_policy_id, handoff_policy_id
- `agent_versions` — version_id, agent_id, config_snapshot_json, published_by, published_at
- `voices` — voice_id, tenant_id (null=global), name, description, gender, language_tags[], trait_tags[], provider, sample_audio_url, is_global
- `llm_providers` — provider_id, name, type (cloud/onprem), base_url, auth_type
- `llm_models` — model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, supported_languages[], status
- `stt_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `tts_providers` — provider_id, name, type (cloud/onprem), base_url, supported_languages[]
- `knowledge_base_docs` — doc_id, tenant_id (RLS), name, type (url/pdf/docx/txt/csv), source_url, storage_path, status (pending/indexing/ready/error), chunk_count, vector_collection_ref, last_indexed_at
- `tools` — tool_id, tenant_id (RLS), name, type (webhook/client/integration/mcp/system), description, config_json
- `widget_configs` — widget_id, agent_id, embed_code, feedback_enabled, interface_settings_json, avatar_config_json, terms_config_json, styling_config_json, allowed_domains[]
- `auth_policies` — policy_id, agent_id, tenant_id (RLS), methods_enabled[], allowed_numbers[], ip_allowlist[], jwt_config_json
- `handoff_policies` — policy_id, agent_id, tenant_id (RLS), handoff_type, transfer_target, escalation_triggers[], pre_handoff_tts_message
- `conversations` — conversation_id (CID uuid PK), agent_id, tenant_id (RLS), channel, status, started_at, ended_at, duration_s, recording_url, transcript_json, llm_cost, tts_cost, stt_cost, total_cost, language_detected, handoff_occurred, rating, feedback_text
- `audit_logs` — log_id, tenant_id (RLS), user_id, action, resource_type, resource_id, before_json, after_json, ip_address, timestamp (INSERT ONLY — no UPDATE/DELETE)
- `recordings` — recording_id, conversation_id (CID), tenant_id (RLS), storage_path, duration_s, format, encryption_key_ref, retention_until

**TimescaleDB hypertables:**
```sql
SELECT create_hypertable('conversations', 'started_at');
SELECT create_hypertable('audit_logs', 'timestamp');
```

### 4.2 — CID Generation Service (BRD-CC-001)

File: `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/cid_service.py`

**Requirements:**
- Generate UUID v4 at call answer / WebSocket open — BEFORE any AI processing begins
- Atomically: write CID to Redis `session:{CID}`, write to PostgreSQL conversations, publish `call_started` to Kafka with CID as partition key
- Return CID — propagate to every downstream system
- On session end: flush Redis state to PostgreSQL, delete Redis key, publish `call_ended`

### 4.3 — Kafka Producers & Consumers

**Producers:**
- `ConversationEventProducer` → `trustnow.conversation.events` (CID = partition key)
- `AuditLogProducer` → `trustnow.audit.log`
- `RecordingEventProducer` → `trustnow.call.recordings`
- `MISMetricsProducer` → `trustnow.mis.metrics`

**Consumers:**
- `MISMetricsConsumer` → reads `trustnow.mis.metrics` → writes to TimescaleDB
- `AuditLogConsumer` → reads `trustnow.audit.log` → writes to PostgreSQL audit_logs (immutable insert only)
- `RecordingConsumer` → reads `trustnow.call.recordings` → confirms MinIO storage

---

## TASK 5 — AI PIPELINE (STT → LLM → TTS SERVICES)

**Prerequisite: Task 4 complete.**

### 5.1 — FastAPI AI Pipeline Service

File: `/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/main.py`

**Key endpoints:**
- `POST /stt/transcribe` — route to Deepgram (Partition A) or FasterWhisper (Partition B)
- `POST /llm/complete` — route through LiteLLM proxy, record cost per turn
- `POST /tts/synthesise` — route to ElevenLabs (Partition A) or Piper (Partition B)
- `POST /rag/retrieve` — query Qdrant KB collection for agent
- `GET/POST /session/{cid}/state` — Redis session state CRUD
- `POST /session/{cid}/end` — end session, flush to DB, publish Kafka event

**Design rules:**
- Every endpoint receives and propagates CID (BRD-CC-004)
- Every LLM call records cost via `litellm.completion_cost()` to Redis session (BRD-L5-MIS-003)
- Partition routing reads agent config from Redis cache → falls back to PostgreSQL
- Async/await throughout — FastAPI + asyncio handles N concurrent sessions (BRD-CC-002)

### 5.2 — Voice Library Service (BRD-L1-010/011/012/013)
- `GET /voices` — list voices (global + tenant-private, RBAC-filtered)
- `POST /voices/{id}/preview` — stream TTS sample audio
- `POST /voices` — upload voice to tenant-private library (stored in MinIO trustnow-voice-samples)
- `DELETE /voices/{id}` — remove voice from tenant-private library

### 5.3 — RAG Pipeline (LlamaIndex + Qdrant — LOCKED)
- `DocumentIngestionService` — LlamaIndex chunking + embedding → Qdrant collection `kb_{tenant_id}_{agent_id}`
- `RAGRetrievalService` — query Qdrant at inference time, inject top-K chunks into LLM context
- Embedding: OpenAI `text-embedding-3-small` (Partition A) / `sentence-transformers/all-MiniLM-L6-v2` (Partition B)
- Supported formats: PDF, DOCX, TXT, CSV, URL (web scraping)

---

## TASK 6 — PLATFORM API (NestJS CONTROL PLANE)

**Prerequisite: Task 5 complete.**

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
| AgentsModule | BRD-L5-AGM-001 to 011 | POST /agents, GET /agents, PUT /agents/:id/config, POST /agents/:id/publish |
| KnowledgeBaseModule | BRD-L5-AGM-012 to 015 | POST /kb/documents, GET /kb/documents, POST /agents/:id/kb/attach |
| ToolsModule | BRD-L5-AGM-016 to 020 | POST /tools, PUT /agents/:id/tools/system |
| WidgetModule | BRD-L5-AGM-WG-001 to 009 | PUT /agents/:id/widget, GET /agents/:id/widget/embed |
| VoicesModule | BRD-L1-010 to 013 | GET /voices, POST /voices/:id/preview |
| LLMProvidersModule | BRD-L1-005 | GET /llm-providers/models (with latency + cost/min) |
| ConversationsModule | BRD-L5-MIS-002 | GET /conversations, GET /conversations/:id/recording |
| AnalyticsModule | BRD-L5-MIS-001 to 005 | GET /analytics/summary (TimescaleDB aggregations) |
| AuditModule | BRD-L5-RB-004 | Internal — immutable insert to audit_logs on all changes |

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

### 7.1 — FreeSWITCH Installation (BRD §11.4 — Layer 4)
```bash
sudo apt-get install -y gnupg2 wget lsb-release
wget -O - https://files.freeswitch.org/repo/deb/debian-release/fsstretch-archive-keyring.asc | sudo apt-key add -
sudo apt-get update && sudo apt-get install -y freeswitch freeswitch-mod-sofia \
  freeswitch-mod-commands freeswitch-mod-dptools freeswitch-mod-event-socket \
  freeswitch-mod-native-file freeswitch-mod-tone-stream freeswitch-mod-python3
sudo systemctl enable freeswitch && sudo systemctl start freeswitch
```

**FreeSWITCH configuration requirements:**
- ESL (Event Socket Layer) enabled — platform API subscribes to all call events
- MOH (Music on Hold) configured per tenant (BRD §6.3.5 — hold music during AI processing)
- Call recording via `record` app → `/opt/trustnowailabs/.../data/recordings/{CID}.wav`
- SIP profile on 5060/5061
- CID in SIP UUI header on transfers: `User-to-User: {cid};encoding=ascii` (BRD-CC-008)

### 7.2 — LiveKit Server (WebRTC SFU — BRD §11.4)
```bash
wget https://github.com/livekit/livekit/releases/latest/download/livekit_linux_amd64.tar.gz
tar -xzf livekit_linux_amd64.tar.gz && sudo mv livekit /usr/local/bin/

mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/livekit
cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/livekit/config.yaml << 'EOF'
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
keys:
  CHANGE_THIS_KEY_ID: CHANGE_THIS_SECRET_IN_VAULT
logging:
  level: info
EOF

sudo bash -c 'cat > /etc/systemd/system/livekit.service << EOF
[Unit]
Description=TRUSTNOW LiveKit WebRTC Server
After=network.target
[Service]
User=trustnow
ExecStart=/usr/local/bin/livekit --config /opt/trustnowailabs/trustnow-ai-worker-stack/config/livekit/config.yaml
Restart=always
[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable livekit && sudo systemctl start livekit
```

**LiveKit room model:** Each conversation = one LiveKit Room named by CID. Participants: caller (WebRTC) + AI pipeline (audio inject/receive). Room created at session initiation, destroyed at session end.

### 7.3 — Human Handoff Configuration (Dual Protocol — BRD §7.3)

**Option A — Integration-Layer Transfer (PBX/CCaaS — BRD-L4-004):**
- FreeSWITCH `transfer` app routes call to SIP URI
- CID passed in SIP UUI header (BRD-CC-008)
- Configured via Tools tab → Transfer to number system tool

**Option B — Internal TRUSTNOW Agent Console (BRD-L4-005):**
- Call transferred to internal Redis queue
- Human Agent Desktop subscribes via WebSocket
- CID + full conversation context delivered to accepting agent
- Configured via Tools tab → Transfer to agent system tool

**Handoff trigger conditions (BRD §7.3.1):** confidence threshold, caller request, keyword detection, intent mapping, SME escalation flag, max duration exceeded

---

## TASK 8 — AGENT CONFIGURATION MODULE (BRD §8.3)

**Prerequisite: Task 7 complete.**

### 8.1 — Frontend Scaffold (Next.js — BRD §11.1)
```bash
cd /opt/trustnowailabs/trustnow-ai-worker-stack/services
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
npm install @radix-ui/react-dialog @radix-ui/react-tabs zustand @tanstack/react-query
npm install socket.io-client livekit-client recharts @tremor/react lucide-react
npx shadcn-ui@latest init
```

### 8.2 — Agent Configuration Module: 10 Tabs

| Tab | Component Name | Core Features | BRD Ref |
|-----|----------------|--------------|---------|
| 1 — Agent | AgentConfigTab | System Prompt (variable injection), First Message (TTS preview), Voice Picker (Explore/My Voices/Default), Language (28+ langs+flags), LLM Picker (provider groups, latency ms, cost $/min), Partition badge | BRD-L5-AGM-004 to 008 |
| 2 — Workflow | WorkflowTab | Shell placeholder | BRD-L5-AGM-009 |
| 3 — Branches | BranchesTab | Shell placeholder | BRD-L5-AGM-009 |
| 4 — Knowledge Base | KnowledgeBaseTab | RAG toggle, Document list (name/type/size/status), Add dialog (URL/File/Text), Re-index, Quota display, Global KB link | BRD-L5-AGM-012 to 015 |
| 5 — Analysis | AnalysisTab | KPI cards: calls, avg duration, total cost, avg cost, total LLM cost — date filter, granularity | BRD-L5-MIS-001 |
| 6 — Tools | ToolsTab | Custom tools list + Add dropdown (Webhook/Client/Integration/MCP); System tools panel: End conversation, Detect language, Skip turn, Transfer to agent, Transfer to number, Play DTMF, Voicemail detection — each with sub-config | BRD-L5-AGM-016 to 020 |
| 7 — Tests | TestsTab | Shell placeholder | BRD-L5-AGM-009 |
| 8 — Widget | WidgetTab | Embed code + copy; Interface toggles (Chat mode, Send text on call, Realtime transcript, Language dropdown, Mute, Expanded behavior, Action indicator, Show CID, Hide audio tags); Markdown links domain allowlist; Avatar (Orb/Link/Image + colour pickers); T&C gate (markdown editor + local storage key); Styling (Tiny/Compact/Full, Placement 4 options, 7 colour tokens); Live preview | BRD-L5-AGM-WG-001 to 009 |
| 9 — Security | SecurityTab | Auth Policy Engine: OTP (SMS/email), Voice biometrics, ANI/DNIS lookup, PIN/Passcode, KBA, SSO/OAuth, Custom webhook — all independently toggleable | BRD-L3-AW-005 |
| 10 — Advanced | AdvancedTab | TTS fine-tuning, turn-taking, silence detection, timeout overrides, interruption handling | BRD-L5-AGM-009 |

### 8.3 — LLM Picker Requirements (BRD-L5-AGM-008)
Must display per model:
- Provider group header
- Model display name + badge (New/Experimental)
- Latency p50 in ms
- Cost per minute in $/min (from LiteLLM pricing dictionary)
- Partition type badge (Cloud / On-Prem)
- Search bar
- "Detailed costs" link

### 8.4 — Web Widget Publisher (BRD-L5-AGM-WG-001 to WG-009)
- Embed code: `<trustnow-agent agent-id="xxx"></trustnow-agent>` + CDN script tag
- Widget JS served from Nginx `/widget/` CDN route
- Custom domain CNAME support for white-label enterprise clients
- Feedback collection: 1-5 star + text comment after call ends

---

## TASK 9 — CONVERSATIONAL AI AGENTS (BRD §6.1)

**Prerequisite: Task 8 complete.**

### 9.1 — Conversational Agent Runtime
Turn loop: STT (Deepgram/FasterWhisper) → RAG retrieval (optional) → LLM (LiteLLM) → TTS (ElevenLabs/Piper) → audio output to caller

- Session initiation: CID generated atomically (Redis + PostgreSQL + Kafka)
- Each turn: cost recorded to Redis session, published to Kafka
- Session end: Redis → PostgreSQL flush, recording finalised, `call_ended` Kafka event
- All N concurrent sessions isolated per BRD-CC-003 (no shared state)

---

## TASK 10 — TOOLS-ASSISTED AI AGENTS (BRD §6.2)

**Prerequisite: Task 9 complete.**

### 10.1 — Tool Execution Engine
- Webhook: HTTP client with auth (API key/Bearer/OAuth2), configurable timeout, retry with backoff
- Client-side tool: WebSocket message to frontend widget JavaScript
- Integration connector: platform-managed connectors (CRM, ERP, ticketing)
- MCP: Model Context Protocol server connection
- Result injection: tool result appended to LLM context before next turn — seamless to caller

**System tool handlers:** `end_call`, `detect_language`, `skip_turn`, `transfer_to_agent`, `transfer_to_number`, `play_dtmf`, `voicemail_detection`

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

### 11.5 — Caller Experience Standards (BRD §6.3.5 — NON-NEGOTIABLE)
- Natural, human-like conversation throughout — no robotic IVR feel
- Hold music (FreeSWITCH MOH, configurable per tenant) during background AI processing
- Smooth hold ↔ active conversation transitions
- Seamless human handoff with full context transfer

---

## TASK 12 — HUMAN AGENT DESKTOP (BRD §8.4)

**Prerequisite: Task 11 complete.**

### 12.1 — Desktop Features (enterprise contact centre grade)
Next.js module at `/app/agent-desktop`:
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
- Agent A on Partition A → verify Deepgram + ElevenLabs + LiteLLM cloud
- Agent B on Partition B → verify FasterWhisper + Ollama + Piper

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
| 5432/tcp | PostgreSQL | Localhost | BRD-L5-MT-003 |
| 5601/tcp | Kibana | Localhost | §11.5 |
| 6333/tcp | Qdrant Vector DB | Localhost | BRD-L5-AGM-012 |
| 6334/tcp | Qdrant gRPC | Localhost | BRD-L5-AGM-012 |
| 6379/tcp | Redis Stack | Localhost | BRD-CC-003 |
| 8000/tcp | FastAPI AI Pipeline | Localhost (via Kong) | §11.3 |
| 8001/tcp | Kong admin API | Localhost | §11.6 |
| 8080/tcp | Keycloak IAM | Localhost | BRD-L5-RB-003 |
| 8200/tcp | HashiCorp Vault | Localhost | §11.6 |
| 9000/tcp | MinIO API | Localhost | BRD-L5-REC-002 |
| 9001/tcp | MinIO Console | Localhost | BRD-L5-REC-002 |
| 9090/tcp | Prometheus | Localhost | §11.6 |
| 9092/tcp | Kafka broker | Localhost | BRD-CC-004 |
| 9200/tcp | Elasticsearch | Localhost | §11.5 |
| 11434/tcp | Ollama LLM API | Localhost | BRD-L1-007 |

---

*IMPL-001.md v2.0 — Complete Implementation Manual — 16 Tasks — All Five Architecture Layers — Full BRD-1 v1.1 Scope*
*TRUSTNOW CONFIDENTIAL — March 2026*
*Cross-reference: FULL-SCOPE-BRD.md for requirements; RUNBOOK.md for task completion status*
