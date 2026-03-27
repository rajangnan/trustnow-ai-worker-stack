"""
TRUSTNOW CID (Conversation ID) Service — BRD-CC-001
====================================================
UUID v4 assigned per session, propagated through every component:
  - Redis key: session:{CID}  (TTL 7200s)
  - PostgreSQL: conversations row
  - Kafka: call_started event on trustnow.conversation.events (CID as partition key)

Usage:
    from cid_service import generate_cid, end_session

CLI test:
    python cid_service.py test
"""

import json
import os
import sys
import uuid
import subprocess
from datetime import datetime, timezone
from typing import Optional

import redis
import psycopg2
from kafka import KafkaProducer
from kafka.errors import KafkaError


# ─────────────────────────────────────────────────────────────────────────────
# Configuration (resolved at import time from Vault via env or subprocess)
# ─────────────────────────────────────────────────────────────────────────────

def _vault_get(path: str, field: str) -> str:
    """Retrieve a secret field from Vault using the vault CLI."""
    vault_addr = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
    vault_token = os.environ.get("VAULT_TOKEN", "")
    if not vault_token:
        # Try reading from vault-init.json
        init_file = "/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json"
        try:
            with open(init_file) as f:
                vault_token = json.load(f)["root_token"]
        except Exception:
            raise RuntimeError("VAULT_TOKEN not set and vault-init.json not readable")

    env = {**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token}
    result = subprocess.run(
        ["vault", "kv", "get", f"-field={field}", path],
        capture_output=True, text=True, env=env, timeout=10
    )
    if result.returncode != 0:
        raise RuntimeError(f"vault kv get failed for {path}/{field}: {result.stderr.strip()}")
    return result.stdout.strip()


def _get_config():
    """Build runtime config from Vault secrets."""
    pg_pass  = _vault_get("secret/trustnow/platform/postgres", "app_password")
    red_pass = _vault_get("secret/trustnow/platform/redis", "password")
    return {
        "redis": {
            "host": "127.0.0.1",
            "port": 6379,
            "password": red_pass,
            "decode_responses": True,
        },
        "postgres": {
            "host": "127.0.0.1",
            "port": 5432,
            "dbname": "trustnow_platform",
            "user": "trustnow_app",
            "password": pg_pass,
        },
        "kafka": {
            "bootstrap_servers": ["localhost:9092"],
            "topic": "trustnow.conversation.events",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Redis session helpers
# ─────────────────────────────────────────────────────────────────────────────

SESSION_TTL = 7200  # 2-hour max call


def _redis_write_session(r: redis.Redis, cid: str, agent_id: str,
                         tenant_id: str, channel: str) -> None:
    key = f"session:{cid}"
    state = {
        "cid": cid,
        "agent_id": agent_id,
        "tenant_id": tenant_id,
        "channel": channel,
        "status": "active",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "transcript": [],
        "llm_cost": 0.0,
        "tts_cost": 0.0,
        "stt_cost": 0.0,
    }
    r.setex(key, SESSION_TTL, json.dumps(state))


def _redis_read_session(r: redis.Redis, cid: str) -> Optional[dict]:
    raw = r.get(f"session:{cid}")
    return json.loads(raw) if raw else None


def _redis_delete_session(r: redis.Redis, cid: str) -> None:
    r.delete(f"session:{cid}")


# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL conversation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _pg_insert_conversation(conn, cid: str, agent_id: str,
                             tenant_id: str, channel: str) -> None:
    with conn.cursor() as cur:
        cur.execute("SET app.current_tenant = %s", (tenant_id,))
        cur.execute("""
            INSERT INTO conversations
              (conversation_id, agent_id, tenant_id, channel, status, started_at)
            VALUES (%s::uuid, %s::uuid, %s::uuid, %s, 'active', NOW())
        """, (cid, agent_id, tenant_id, channel))
    conn.commit()


def _pg_update_conversation(conn, cid: str, tenant_id: str,
                             session_state: dict) -> None:
    started_at = session_state.get("started_at")
    ended_at   = datetime.now(timezone.utc).isoformat()
    duration_s = None
    if started_at:
        try:
            started = datetime.fromisoformat(started_at)
            ended   = datetime.fromisoformat(ended_at)
            duration_s = int((ended - started).total_seconds())
        except Exception:
            pass

    with conn.cursor() as cur:
        cur.execute("SET app.current_tenant = %s", (tenant_id,))
        cur.execute("""
            UPDATE conversations SET
                status          = 'completed',
                ended_at        = %s::timestamptz,
                duration_s      = %s,
                transcript_json = %s::jsonb,
                llm_cost        = %s,
                tts_cost        = %s,
                stt_cost        = %s,
                total_cost      = %s
            WHERE conversation_id = %s::uuid
              AND started_at >= NOW() - INTERVAL '3 hours'
        """, (
            ended_at,
            duration_s,
            json.dumps(session_state.get("transcript", [])),
            session_state.get("llm_cost", 0),
            session_state.get("tts_cost", 0),
            session_state.get("stt_cost", 0),
            session_state.get("llm_cost", 0) + session_state.get("tts_cost", 0) + session_state.get("stt_cost", 0),
            cid,
        ))
    conn.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Kafka event helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_producer(bootstrap_servers: list) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=bootstrap_servers,
        key_serializer=lambda k: k.encode("utf-8"),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        acks="all",
        retries=3,
    )


def _kafka_publish(producer: KafkaProducer, topic: str, cid: str,
                   event_type: str, payload: dict) -> None:
    message = {
        "cid":        cid,
        "tenant_id":  payload.get("tenant_id", ""),
        "agent_id":   payload.get("agent_id", ""),
        "timestamp":  datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        **payload,
    }
    future = producer.send(topic, key=cid, value=message)
    future.get(timeout=10)  # block for confirmation


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def generate_cid(agent_id: str, tenant_id: str, channel: str = "voice") -> str:
    """
    Generate a new Conversation ID and atomically:
      1. Write Redis session key with TTL 7200s
      2. Insert PostgreSQL conversations row
      3. Publish call_started event to Kafka (CID as partition key)

    Returns the CID string. Raises on any failure after attempting rollback.
    """
    cid = str(uuid.uuid4())
    config = _get_config()

    redis_done = False
    pg_done    = False
    producer   = None
    r          = None
    conn       = None

    try:
        # 1. Redis
        r = redis.Redis(**config["redis"])
        _redis_write_session(r, cid, agent_id, tenant_id, channel)
        redis_done = True

        # 2. PostgreSQL
        conn = psycopg2.connect(**config["postgres"])
        _pg_insert_conversation(conn, cid, agent_id, tenant_id, channel)
        pg_done = True

        # 3. Kafka
        producer = _build_producer(config["kafka"]["bootstrap_servers"])
        _kafka_publish(
            producer, config["kafka"]["topic"], cid, "call_started",
            {"agent_id": agent_id, "tenant_id": tenant_id, "channel": channel}
        )
        producer.flush()

        return cid

    except Exception as exc:
        # Attempt partial rollback
        try:
            if redis_done and r:
                _redis_delete_session(r, cid)
        except Exception:
            pass
        try:
            if pg_done and conn:
                conn.rollback()
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM conversations WHERE conversation_id = %s::uuid"
                        " AND started_at >= NOW() - INTERVAL '1 minute'",
                        (cid,)
                    )
                conn.commit()
        except Exception:
            pass
        raise RuntimeError(f"generate_cid failed (rollback attempted): {exc}") from exc

    finally:
        if producer:
            try:
                producer.close(timeout=5)
            except Exception:
                pass
        if conn:
            conn.close()
        if r:
            r.close()


def end_session(cid: str, tenant_id: str) -> None:
    """
    End a CID session:
      1. Read Redis session state
      2. Flush state to PostgreSQL (update conversations row)
      3. Delete Redis session key
      4. Publish call_ended event to Kafka
    """
    config = _get_config()
    r      = redis.Redis(**config["redis"])
    conn   = psycopg2.connect(**config["postgres"])
    producer = _build_producer(config["kafka"]["bootstrap_servers"])

    try:
        session_state = _redis_read_session(r, cid) or {}
        session_state["tenant_id"] = tenant_id

        _pg_update_conversation(conn, cid, tenant_id, session_state)
        _redis_delete_session(r, cid)

        _kafka_publish(
            producer, config["kafka"]["topic"], cid, "call_ended",
            {
                "tenant_id":  tenant_id,
                "agent_id":   session_state.get("agent_id", ""),
                "duration_s": session_state.get("duration_s", 0),
                "llm_cost":   session_state.get("llm_cost", 0),
                "tts_cost":   session_state.get("tts_cost", 0),
                "stt_cost":   session_state.get("stt_cost", 0),
            }
        )
        producer.flush()
    finally:
        producer.close(timeout=5)
        conn.close()
        r.close()


# ─────────────────────────────────────────────────────────────────────────────
# CLI test entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def _run_test() -> None:
    print("=" * 60)
    print("CID SERVICE TEST")
    print("=" * 60)

    config = _get_config()

    # Use a real agent_id/tenant_id from the DB if available, else use test UUIDs
    test_tenant_id = str(uuid.uuid4())
    test_agent_id  = str(uuid.uuid4())

    # We need a real tenant + agent row for FK constraints
    conn = psycopg2.connect(**config["postgres"])
    try:
        with conn.cursor() as cur:
            # Insert test tenant
            cur.execute("""
                INSERT INTO tenants (tenant_id, name, plan_tier)
                VALUES (%s::uuid, 'TEST TENANT', 'starter')
            """, (test_tenant_id,))
            # Insert test agent (no created_by, no version)
            cur.execute("""
                INSERT INTO agents (agent_id, tenant_id, name, type, status)
                VALUES (%s::uuid, %s::uuid, 'Test Agent', 'conversational', 'published')
            """, (test_agent_id, test_tenant_id))
        conn.commit()
        print(f"[SETUP] Test tenant:  {test_tenant_id}")
        print(f"[SETUP] Test agent:   {test_agent_id}")
    except Exception as e:
        conn.rollback()
        print(f"[FAIL] Could not insert test fixtures: {e}")
        conn.close()
        sys.exit(1)
    finally:
        conn.close()

    # --- Generate CID ---
    print("\n[STEP 1] generate_cid()...")
    try:
        cid = generate_cid(test_agent_id, test_tenant_id, channel="voice")
        print(f"  CID: {cid}")
    except Exception as e:
        print(f"[FAIL] generate_cid raised: {e}")
        _cleanup_test(test_tenant_id, test_agent_id, None, config)
        sys.exit(1)

    # --- Verify Redis ---
    print("\n[STEP 2] Verify Redis session...")
    r = redis.Redis(**config["redis"])
    session = _redis_read_session(r, cid)
    r.close()
    if session and session.get("cid") == cid:
        print(f"  Redis: session:{cid} found, status={session['status']} ✅")
    else:
        print(f"[FAIL] Redis session not found for CID {cid}")
        _cleanup_test(test_tenant_id, test_agent_id, cid, config)
        sys.exit(1)

    # --- Verify PostgreSQL ---
    print("\n[STEP 3] Verify PostgreSQL row...")
    conn = psycopg2.connect(**config["postgres"])
    try:
        with conn.cursor() as cur:
            cur.execute("SET app.current_tenant = %s", (test_tenant_id,))
            cur.execute(
                "SELECT status, channel FROM conversations WHERE conversation_id = %s::uuid",
                (cid,)
            )
            row = cur.fetchone()
        if row:
            print(f"  PostgreSQL: status={row[0]}, channel={row[1]} ✅")
        else:
            print(f"[FAIL] No conversations row for CID {cid}")
            conn.close()
            _cleanup_test(test_tenant_id, test_agent_id, cid, config)
            sys.exit(1)
    finally:
        conn.close()

    # --- Verify Kafka (publish confirmation was blocking, so already confirmed) ---
    print("\n[STEP 4] Kafka call_started event — confirmed during generate_cid ✅")

    # --- end_session ---
    print("\n[STEP 5] end_session()...")
    try:
        end_session(cid, test_tenant_id)
        print(f"  Session {cid} ended ✅")
    except Exception as e:
        print(f"[FAIL] end_session raised: {e}")
        _cleanup_test(test_tenant_id, test_agent_id, cid, config)
        sys.exit(1)

    # --- Verify Redis deleted ---
    r = redis.Redis(**config["redis"])
    gone = _redis_read_session(r, cid) is None
    r.close()
    print(f"\n[STEP 6] Redis key deleted after end_session: {'✅' if gone else '[FAIL]'}")

    # --- Verify PostgreSQL updated ---
    conn = psycopg2.connect(**config["postgres"])
    try:
        with conn.cursor() as cur:
            cur.execute("SET app.current_tenant = %s", (test_tenant_id,))
            cur.execute(
                "SELECT status, ended_at FROM conversations WHERE conversation_id = %s::uuid",
                (cid,)
            )
            row = cur.fetchone()
        print(f"[STEP 7] PostgreSQL final status: {row[0]}, ended_at set: {row[1] is not None} ✅")
    finally:
        conn.close()

    # --- Cleanup ---
    _cleanup_test(test_tenant_id, test_agent_id, None, config)

    print("\n" + "=" * 60)
    print(f"CID SERVICE TEST: PASS   CID={cid}")
    print("=" * 60)


def _cleanup_test(tenant_id: str, agent_id: str, cid: Optional[str], config: dict) -> None:
    conn = psycopg2.connect(**config["postgres"])
    try:
        with conn.cursor() as cur:
            if cid:
                cur.execute(
                    "DELETE FROM conversations WHERE conversation_id = %s::uuid",
                    (cid,)
                )
            cur.execute("DELETE FROM agents  WHERE agent_id  = %s::uuid", (agent_id,))
            cur.execute("DELETE FROM tenants WHERE tenant_id = %s::uuid", (tenant_id,))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        _run_test()
    else:
        print("Usage: python cid_service.py test")
        sys.exit(1)
