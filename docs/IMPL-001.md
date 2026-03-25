# IMPL-001.md — Server Readiness & Foundational Infrastructure
## TRUSTNOW Autonomous AI Stack — Implementation Manual
### Document ID: IMPL-001 v1.0 | March 2026

---

## PURPOSE

This is the authoritative build guide for Tasks 1 and 2 of the TRUSTNOW platform build. Every component is mapped back to its BRD-1 v1.1 requirement. Work sequentially — Task 1 must be fully complete and verified before Task 2 begins.

---

## SERVER SPECIFICATIONS

- **IP:** 172.25.10.142
- **OS:** Ubuntu 24.04.4 LTS
- **Kernel:** 6.8.0-106-generic
- **CPU:** 40 cores
- **RAM:** 125GB (122GB available)
- **Disk:** 98GB root volume (72GB free)
- **Swap:** 8GB
- **Users:** trustnow (primary admin), opsadmin (ops admin)
- **Project Root:** /opt/trustnowailabs/trustnow-ai-worker-stack/

---

## TASK 1 — OS HARDENING CHECKLIST

### 1.1 Pre-Hardening Audit
- [ ] Ubuntu version confirmed: Ubuntu 24.04.4 LTS
- [ ] Kernel confirmed: 6.8.0-106-generic
- [ ] Open ports documented (baseline)
- [ ] Running services documented
- [ ] 0 pending updates confirmed

**Verification command:**
```bash
lsb_release -a && uname -r && sudo ss -tulpn && sudo apt list --upgradable 2>/dev/null
```

---

### 1.2 Package Installation
Install all required security and base packages:
```bash
sudo apt install -y fail2ban ufw auditd logrotate rsyslog chrony acl libpam-pwquality unattended-upgrades curl wget git vim htop net-tools unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

**Checklist:**
- [ ] fail2ban installed
- [ ] ufw installed
- [ ] auditd installed
- [ ] chrony installed
- [ ] libpam-pwquality installed
- [ ] unattended-upgrades installed

---

### 1.3 UFW Firewall Configuration
**Policy: deny all inbound, allow specific ports only**

```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp comment 'SSH'

# Web / API
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# SIP signalling (FreeSWITCH) — BRD-L4-001
sudo ufw allow 5060/tcp comment 'SIP TCP'
sudo ufw allow 5060/udp comment 'SIP UDP'
sudo ufw allow 5061/tcp comment 'SIP TLS'

# RTP media (FreeSWITCH concurrent calls) — BRD-CC-002
sudo ufw allow 16384:32768/udp comment 'RTP media'

# LiveKit WebRTC — BRD-L4-001
sudo ufw allow 7880/tcp comment 'LiveKit API'
sudo ufw allow 7881/tcp comment 'LiveKit RTC'
sudo ufw allow 50000:60000/udp comment 'LiveKit UDP'

# Internal services (localhost only)
sudo ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL local'
sudo ufw allow from 127.0.0.1 to any port 6379 comment 'Redis local'
sudo ufw allow from 127.0.0.1 to any port 9092 comment 'Kafka local'
sudo ufw allow from 127.0.0.1 to any port 6333 comment 'Qdrant local'
sudo ufw allow from 127.0.0.1 to any port 4000 comment 'LiteLLM local'
sudo ufw allow from 127.0.0.1 to any port 8200 comment 'Vault local'

# Kong API Gateway
sudo ufw allow 8000/tcp comment 'Kong HTTP'
sudo ufw allow 8443/tcp comment 'Kong HTTPS'
sudo ufw allow from 127.0.0.1 to any port 8001 comment 'Kong admin local'

# Keycloak (internal — proxied via Kong/Nginx externally)
sudo ufw allow from 127.0.0.1 to any port 8080 comment 'Keycloak local'

sudo ufw --force enable
sudo ufw status verbose
```

**Port-to-BRD mapping:**
| Port | Service | BRD Requirement |
|------|---------|----------------|
| 22/tcp | SSH admin | §9 Security |
| 80, 443/tcp | HTTP/HTTPS | §8.3 Agent Module, Widget CDN |
| 5060-5061, 16384-32768 | SIP + RTP | BRD-L4-001 FreeSWITCH |
| 7880-7881, 50000-60000 | LiveKit WebRTC | BRD-L4-001 LiveKit |
| 5432 (local) | PostgreSQL | BRD-L5-MT-003 RLS |
| 6379 (local) | Redis | BRD-CC-003 CID session state |
| 9092 (local) | Kafka | BRD-CC-004 CID event streaming |
| 6333 (local) | Qdrant | BRD-L5-AGM-012 Vector DB |
| 4000 (local) | LiteLLM | BRD-L1-005 LLM abstraction |
| 8000, 8443 (public) | Kong | §11.6 API Gateway |
| 8080 (local) | Keycloak | BRD-L5-RB-003 IAM |
| 8200 (local) | Vault | §9 Secrets |

**Checklist:**
- [ ] UFW enabled
- [ ] Default deny inbound confirmed
- [ ] All required ports open
- [ ] Internal services localhost-only confirmed
- [ ] `sudo ufw status verbose` shows correct rules

---

### 1.4 Fail2ban Configuration
```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

sudo bash -c 'cat > /etc/fail2ban/jail.d/trustnow.conf << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF'

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

**Checklist:**
- [ ] fail2ban enabled and running
- [ ] SSH jail active
- [ ] `fail2ban-client status` shows sshd jail

---

### 1.5 Auditd — Immutable Audit Trail (BRD-L5-RB-004)
```bash
sudo systemctl enable auditd
sudo systemctl start auditd

sudo bash -c 'cat > /etc/audit/rules.d/trustnow.rules << EOF
-w /etc/passwd -p wa -k user-modify
-w /etc/shadow -p wa -k user-modify
-w /etc/sudoers -p wa -k sudo-modify
-w /etc/ssh/sshd_config -p wa -k ssh-config
-w /opt/trustnowailabs -p wa -k trustnow-files
-a always,exit -F arch=b64 -S execve -k exec-commands
EOF'

sudo augenrules --load
sudo systemctl restart auditd
sudo systemctl status auditd
```

**Checklist:**
- [ ] auditd enabled and running
- [ ] Audit rules loaded for critical files
- [ ] TRUSTNOW project directory monitored

---

### 1.6 Chrony NTP — Time Synchronisation
```bash
sudo systemctl enable chrony
sudo systemctl start chrony
chronyc tracking
```

**Why critical:** Accurate time required for JWT expiry, audit log timestamps, Kafka event ordering, distributed traces (BRD-CC-004).

**Checklist:**
- [ ] Chrony running
- [ ] System time offset < 1ms

---

### 1.7 Kernel Security + High-Concurrency Parameters (BRD-CC-002)
```bash
sudo bash -c 'cat >> /etc/sysctl.conf << EOF

# TRUSTNOW Network Security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.tcp_syncookies = 1

# TRUSTNOW High-Concurrency (BRD-CC-002 — N concurrent sessions per agent)
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65536
EOF'

sudo sysctl -p
sysctl fs.file-max
```

**Checklist:**
- [ ] Network security params applied
- [ ] `fs.file-max = 2097152` confirmed
- [ ] `sysctl -p` runs cleanly with no errors

---

### 1.8 TRUSTNOW Directory Structure
```bash
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/{services,data,logs,config,backups,ssl,docs}
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/data/{postgres,redis,kafka,qdrant,recordings,kb-docs,vault}
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/logs/{app,nginx,freeswitch,livekit}
sudo mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/{nginx,postgres,redis,kafka,kong,keycloak,litellm,monitoring,vault}
sudo chown -R trustnow:trustnow /opt/trustnowailabs
sudo chmod -R 750 /opt/trustnowailabs
sudo chmod 700 /opt/trustnowailabs/trustnow-ai-worker-stack/config
ls -la /opt/trustnowailabs/trustnow-ai-worker-stack/
```

**Directory-to-BRD mapping:**
| Directory | Purpose | BRD Ref |
|-----------|---------|---------|
| /services | Application service code | §11 Tech Stack |
| /data/postgres | PostgreSQL data — RLS multi-tenancy | BRD-L5-MT-003 |
| /data/redis | Redis — CID session state | BRD-CC-003 |
| /data/kafka | Kafka — CID event streams | BRD-CC-004 |
| /data/qdrant | Qdrant — KB/RAG embeddings | BRD-L5-AGM-012 |
| /data/recordings | Call recordings (MinIO mount) | BRD-L5-REC-001 |
| /data/kb-docs | KB source documents pre-indexing | BRD-L5-AGM-013 |
| /data/vault | Vault secrets storage | §9 Security |
| /logs | Centralised logs per service | §9 Observability |
| /config | All service config files (mode 700) | §9 Security |
| /ssl | TLS certificates and keys | §9 Security |
| /docs | BRD and implementation docs | Reference |

**Checklist:**
- [ ] All directories created
- [ ] Ownership: trustnow:trustnow
- [ ] Permissions: 750 (700 for config)

---

### 1.9 Task 1 Final Verification
Run all verification checks:
```bash
echo "=== KERNEL ===" && uname -r
echo "=== UFW ===" && sudo ufw status verbose
echo "=== FAIL2BAN ===" && sudo fail2ban-client status
echo "=== AUDITD ===" && sudo systemctl is-active auditd
echo "=== CHRONY ===" && chronyc tracking | grep offset
echo "=== FILE DESCRIPTORS ===" && sysctl fs.file-max
echo "=== DIRECTORY STRUCTURE ===" && ls -la /opt/trustnowailabs/trustnow-ai-worker-stack/
echo "=== OPEN PORTS ===" && sudo ss -tulpn
```

**Expected results:**
- Kernel: 6.8.0-106-generic ✅
- UFW: active, rules listed ✅
- Fail2ban: sshd jail active ✅
- auditd: active ✅
- Chrony: offset < 1ms ✅
- fs.file-max: 2097152 ✅
- Directory structure: all subdirs present ✅

---

## TASK 2 — FOUNDATIONAL INFRASTRUCTURE

### Installation Sequence (order is mandatory — dependencies flow downward)

| Seq | Component | Version | BRD Requirement |
|-----|-----------|---------|----------------|
| 2.1 | Docker Engine + Compose | 25.x + v2.x | §11.6 All services containerised |
| 2.2 | PostgreSQL 16 | 16.x | §11.5 Primary DB + RLS BRD-L5-MT-003 |
| 2.3 | Redis Stack | 7.x | §11.5 Session state BRD-CC-003 |
| 2.4 | Apache Kafka + Zookeeper | 3.x | §11.5 Event streaming BRD-CC-004 |
| 2.5 | Qdrant Vector DB | latest | §11.3 Vector DB BRD-L5-AGM-012 |
| 2.6 | Kong API Gateway | 3.x | §11.6 API Gateway |
| 2.7 | Keycloak | 24.x | §11.2 IAM BRD-L5-RB-003 |
| 2.8 | MinIO | latest | §11.4 Object storage BRD-L5-REC-002 |
| 2.9 | HashiCorp Vault | 1.16.x | §11.6 Secrets BRD-CC-004 |
| 2.10 | Node.js 20 LTS | 20.x | §11.1/11.2 Frontend + NestJS |
| 2.11 | Python 3.11 + venv | 3.11.x | §11.3 FastAPI AI pipeline |
| 2.12 | LiteLLM Proxy | latest | §4.4 LLM abstraction LOCKED BRD-L1-005 |
| 2.13 | Nginx | 1.25.x | §11.6 TLS termination + CDN |
| 2.14 | Prometheus + Grafana + Loki | latest | §11.6 + §9 Observability |
| 2.15 | Elasticsearch + Kibana | 8.x | §11.5 Full-text search + logging |

---

### 2.1 Docker Engine + Docker Compose
```bash
# Add Docker GPG key
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add users to docker group
sudo usermod -aG docker trustnow
sudo usermod -aG docker opsadmin

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version && docker compose version
sudo docker run hello-world
```

**Checklist:**
- [ ] docker --version shows 25.x+
- [ ] docker compose version shows v2.x
- [ ] hello-world container runs successfully
- [ ] trustnow user in docker group

---

### 2.2 PostgreSQL 16 (already installed — configure for TRUSTNOW)
```bash
# Verify PostgreSQL 16 is running (pre-installed by server team)
sudo systemctl status postgresql

# Enable RLS globally — CRITICAL for multi-tenancy (BRD-L5-MT-003)
sudo -u postgres psql -c "ALTER SYSTEM SET row_security = on;"
sudo systemctl restart postgresql

# Create TRUSTNOW database and roles
sudo -u postgres psql << EOF
CREATE DATABASE trustnow_platform;
CREATE ROLE trustnow_app LOGIN PASSWORD 'CHANGE_THIS_IN_VAULT';
CREATE ROLE trustnow_readonly LOGIN PASSWORD 'CHANGE_THIS_IN_VAULT';
GRANT CONNECT ON DATABASE trustnow_platform TO trustnow_app;
GRANT CONNECT ON DATABASE trustnow_platform TO trustnow_readonly;
\l
EOF

# Move data directory to TRUSTNOW path
sudo systemctl stop postgresql
sudo rsync -av /var/lib/postgresql/ /opt/trustnowailabs/trustnow-ai-worker-stack/data/postgres/
```

**CRITICAL NOTE — RLS:**
Row-Level Security is the mechanism enforcing strict data isolation between tenants. Every tenant-scoped table will have:
```sql
ALTER TABLE x ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON x USING (tenant_id = current_setting('app.current_tenant')::uuid);
```
This is non-negotiable per BRD-L5-MT-003.

**Checklist:**
- [ ] PostgreSQL 16 running
- [ ] row_security = on confirmed
- [ ] trustnow_platform database created
- [ ] trustnow_app role created

---

### 2.3 Redis Stack (CID Session State — BRD-CC-003)
```bash
# Create Redis config
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

# Run Redis Stack via Docker
docker run -d \
  --name trustnow-redis \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/config/redis/redis.conf:/usr/local/etc/redis/redis.conf \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/redis:/data \
  -p 127.0.0.1:6379:6379 \
  redis/redis-stack-server:latest \
  redis-server /usr/local/etc/redis/redis.conf

# Verify
docker exec trustnow-redis redis-cli -a CHANGE_THIS_IN_VAULT ping
```

**Redis Key Design for Concurrency (BRD-CC-003/004/005):**
| Key Pattern | Purpose |
|-------------|---------|
| `session:{CID}` | Active conversation state — message history, agent_id, tenant_id, LLM model, tool state |
| `active_calls:{tenant_id}` | Sorted set of active CIDs per tenant — feeds live dashboard |
| `active_calls:global` | Global active CID count across all tenants |
| `agent_config:{agent_id}` | Cached agent config (TTL 5 min) — avoids repeated DB reads on concurrent calls |

**Checklist:**
- [ ] Redis container running
- [ ] `redis-cli ping` returns PONG
- [ ] Bound to localhost only (127.0.0.1)

---

### 2.4 Apache Kafka (CID Event Streaming — BRD-CC-004)
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

# Wait for Kafka to start then create topics
sleep 20
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.conversation.events --partitions 12 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.audit.log --partitions 6 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.call.recordings --partitions 6 --replication-factor 1
docker exec trustnow-kafka kafka-topics --create --bootstrap-server localhost:9092 --topic trustnow.mis.metrics --partitions 6 --replication-factor 1

# Verify
docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Kafka Topics:**
| Topic | Purpose | CID Role |
|-------|---------|---------|
| trustnow.conversation.events | All conversation lifecycle events | CID = partition key — ordered processing |
| trustnow.audit.log | Platform audit events — config changes, logins | BRD-L5-RB-004 |
| trustnow.call.recordings | Recording completion events | BRD-L5-REC-001 |
| trustnow.mis.metrics | Real-time MIS metric events | BRD-L5-MIS-001 |

**Checklist:**
- [ ] Zookeeper running
- [ ] Kafka broker running
- [ ] 4 topics created and listed
- [ ] Bound to localhost only

---

### 2.5 Qdrant Vector Database (RAG/KB — BRD-L5-AGM-012, LOCKED)
```bash
docker run -d \
  --name trustnow-qdrant \
  --restart unless-stopped \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/data/qdrant:/qdrant/storage \
  -p 127.0.0.1:6333:6333 \
  -p 127.0.0.1:6334:6334 \
  qdrant/qdrant:latest

# Verify
curl http://localhost:6333/healthz
```

**Collection naming convention (multi-tenant isolation):**
`kb_{tenant_id}_{agent_id}` — created programmatically when agent first enables RAG.

**Checklist:**
- [ ] Qdrant container running
- [ ] Health check returns version JSON
- [ ] Bound to localhost only

---

### 2.6 Kong API Gateway
```bash
# Create Kong database
sudo -u postgres psql << EOF
CREATE DATABASE kong;
CREATE USER kong WITH PASSWORD 'CHANGE_THIS_IN_VAULT';
GRANT ALL PRIVILEGES ON DATABASE kong TO kong;
EOF

# Run Kong migrations
docker run --rm \
  --network host \
  -e KONG_DATABASE=postgres \
  -e KONG_PG_HOST=127.0.0.1 \
  -e KONG_PG_USER=kong \
  -e KONG_PG_PASSWORD=CHANGE_THIS_IN_VAULT \
  -e KONG_PG_DATABASE=kong \
  kong:latest kong migrations bootstrap

# Run Kong Gateway
docker run -d \
  --name trustnow-kong \
  --restart unless-stopped \
  --network host \
  -e KONG_DATABASE=postgres \
  -e KONG_PG_HOST=127.0.0.1 \
  -e KONG_PG_USER=kong \
  -e KONG_PG_PASSWORD=CHANGE_THIS_IN_VAULT \
  -e KONG_PG_DATABASE=kong \
  -e KONG_PROXY_ACCESS_LOG=/dev/stdout \
  -e KONG_ADMIN_ACCESS_LOG=/dev/stdout \
  -e KONG_PROXY_ERROR_LOG=/dev/stderr \
  -e KONG_PROXY_LISTEN=0.0.0.0:8000,0.0.0.0:8443 ssl \
  -e KONG_ADMIN_LISTEN=127.0.0.1:8001 \
  kong:latest

# Verify
curl http://localhost:8001/
```

**Checklist:**
- [ ] Kong container running
- [ ] Admin API reachable on localhost:8001
- [ ] Proxy listening on 8000/8443

---

### 2.7 Keycloak IAM (Realm-per-Tenant — BRD-L5-RB-003)
```bash
# Create Keycloak database
sudo -u postgres psql << EOF
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

# Verify
curl http://localhost:8080/health
```

**Realm strategy:**
- `trustnow-platform` = master realm for TRUSTNOW platform admins only
- `realm_{tenant_id}` = one realm per tenant (created on tenant onboarding)
- JWT tokens carry `tenant_id` + `role` claims validated by all services

**Checklist:**
- [ ] Keycloak container running
- [ ] Health endpoint returns UP
- [ ] Port 8080 accessible on localhost

---

### 2.8 MinIO Object Storage (BRD-L5-REC-002)
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

# Install MinIO client
curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Create buckets with encryption
mc alias set local http://localhost:9000 trustnow-admin CHANGE_THIS_IN_VAULT
mc mb local/trustnow-recordings
mc mb local/trustnow-kb-documents
mc mb local/trustnow-voice-samples
mc encrypt set sse-s3 local/trustnow-recordings
mc encrypt set sse-s3 local/trustnow-kb-documents

# Verify
mc ls local/
```

**Checklist:**
- [ ] MinIO container running
- [ ] 3 buckets created
- [ ] Encryption enabled on recordings and kb-documents buckets

---

### 2.9 HashiCorp Vault (Secrets Management)
```bash
# Install Vault
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
  address = "127.0.0.1:8200"
  tls_disable = 1
}
api_addr = "http://127.0.0.1:8200"
EOF

sudo systemctl enable vault
sudo systemctl start vault

# Verify
vault status
```

**Secret path convention:**
`secret/trustnow/{tenant_id}/{service}/{key_name}`

Examples:
- `secret/trustnow/platform/postgres/app_password`
- `secret/trustnow/{tenant_id}/llm/openai_api_key`
- `secret/trustnow/{tenant_id}/tts/elevenlabs_api_key`

**Checklist:**
- [ ] Vault installed and running
- [ ] Listening on localhost:8200
- [ ] `vault status` shows initialized state

---

### 2.10 Python 3.11 + AI Pipeline Virtual Environment
```bash
# Python 3.11 (Ubuntu 24.04 may have it already)
python3 --version

# If not 3.11:
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Create AI pipeline venv
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline
python3.11 -m venv /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv

# Install AI packages
source /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn litellm llama-index qdrant-client redis kafka-python opentelemetry-sdk
deactivate

# Verify
/opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python --version
```

**Checklist:**
- [ ] Python 3.11.x confirmed
- [ ] venv created at /services/ai-pipeline/venv
- [ ] litellm, llama-index, qdrant-client installed

---

### 2.11 LiteLLM Self-Hosted Proxy (LOCKED — BRD-L1-005)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm

cat > /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml << 'EOF'
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-5
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: gemini-flash
    litellm_params:
      model: gemini/gemini-2.5-flash
      api_key: os.environ/GOOGLE_API_KEY
litellm_settings:
  success_callback: ["prometheus"]
  cache: true
  cache_params:
    type: redis
    host: localhost
    port: 6379
EOF

docker run -d \
  --name trustnow-litellm \
  --restart unless-stopped \
  --network host \
  -v /opt/trustnowailabs/trustnow-ai-worker-stack/config/litellm/config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml --port 4000

# Verify
curl http://localhost:4000/health
```

**Checklist:**
- [ ] LiteLLM container running
- [ ] Health endpoint returns OK
- [ ] Listening on localhost:4000

---

### 2.12 Observability Stack (Prometheus + Grafana + Loki)
```bash
mkdir -p /opt/trustnowailabs/trustnow-ai-worker-stack/config/monitoring

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

**Checklist:**
- [ ] Prometheus running on localhost:9090
- [ ] Grafana running on localhost:3000
- [ ] Loki running on localhost:3100

---

### 2.13 Task 2 Master Verification Checklist

Run this complete verification:
```bash
echo "=== DOCKER ===" && docker --version && docker compose version
echo "=== POSTGRESQL ===" && sudo systemctl is-active postgresql && sudo -u postgres psql -c '\l' | grep trustnow
echo "=== REDIS ===" && docker exec trustnow-redis redis-cli -a CHANGE_THIS_IN_VAULT ping
echo "=== KAFKA ===" && docker exec trustnow-kafka kafka-topics --list --bootstrap-server localhost:9092
echo "=== QDRANT ===" && curl -s http://localhost:6333/healthz | head -c 100
echo "=== KONG ===" && curl -s http://localhost:8001/ | python3 -c "import sys,json; d=json.load(sys.stdin); print('Kong version:', d.get('version','unknown'))"
echo "=== KEYCLOAK ===" && curl -s http://localhost:8080/health | head -c 100
echo "=== MINIO ===" && mc ls local/
echo "=== VAULT ===" && vault status | grep Initialized
echo "=== LITELLM ===" && curl -s http://localhost:4000/health | head -c 100
echo "=== PROMETHEUS ===" && curl -s http://localhost:9090/-/healthy
echo "=== PYTHON ===" && /opt/trustnowailabs/trustnow-ai-worker-stack/services/ai-pipeline/venv/bin/python --version
echo "=== UFW ===" && sudo ufw status | head -3
echo "=== ALL CONTAINERS ===" && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## BRD-TO-INFRASTRUCTURE COMPONENT MAP

| BRD Requirement | BRD ID | Infrastructure Component | Task |
|----------------|--------|------------------------|------|
| LiteLLM LLM abstraction LOCKED | BRD-L1-005 | LiteLLM Docker on :4000 | 2.11 |
| RAG orchestration LlamaIndex LOCKED | §11.3 | Python venv: llama-index | 2.10 |
| Vector DB Qdrant PRIMARY LOCKED | §11.3 | Qdrant Docker on :6333 | 2.5 |
| PostgreSQL 16 + RLS | BRD-L5-MT-003 | PostgreSQL 16 systemd | 2.2 |
| Redis session state + CID store | BRD-CC-003 | Redis Stack Docker :6379 | 2.3 |
| Kafka CID partition key | BRD-CC-004 | Kafka Docker :9092 | 2.4 |
| Kong API Gateway | §11.6 | Kong Docker :8000/:8443 | 2.6 |
| Keycloak realm-per-tenant | BRD-L5-RB-003 | Keycloak Docker :8080 | 2.7 |
| MinIO recordings + KB docs | BRD-L5-REC-002 | MinIO Docker :9000 | 2.8 |
| HashiCorp Vault secrets | §11.6 | Vault systemd :8200 | 2.9 |
| FastAPI AI pipeline | §11.3 | Python 3.11 + venv | 2.10 |
| Prometheus + Grafana + Loki | §11.6 | Docker Compose :9090/:3000 | 2.12 |
| Concurrent session isolation | BRD-CC-001 to CC-010 | Redis + Kafka + PostgreSQL | 2.2-2.4 |
| Encryption at rest AES-256 | §9 Security | MinIO SSE + Vault + pgcrypto | 2.2/2.8/2.9 |

---

## COMPONENTS DEFERRED TO TASK 3

| Component | Reason | BRD Ref |
|-----------|--------|---------|
| FreeSWITCH | Requires TLS cert + SIP trunk config first | BRD-L4-001 |
| LiveKit | Requires TLS cert first | BRD-L4-001 |
| Elasticsearch | RAM-heavy — install after base stack stable | §11.5 |
| Ollama (on-prem LLM) | Requires GPU driver setup | §4.2 BRD-L1-007 |

---

*IMPL-001.md — Generated from IMPL-001 v1.0 Server Readiness & Foundational Infrastructure Manual — March 2026*
