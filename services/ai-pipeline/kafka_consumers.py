"""
TRUSTNOW Kafka Event Consumers — BRD-CC-004
============================================
Consumer classes for each TRUSTNOW Kafka topic:
  - MISMetricsConsumer    — group trustnow-mis-consumer,       topic trustnow.mis.metrics
  - AuditLogConsumer      — group trustnow-audit-consumer,     topic trustnow.audit.log
  - RecordingConsumer     — group trustnow-recording-consumer, topic trustnow.call.recordings

All consumers:
  - auto-offset-reset = earliest
  - enable-auto-commit = true
  - reconnect with exponential backoff on failure

Usage (systemd / CLI):
    python kafka_consumers.py MISMetricsConsumer
    python kafka_consumers.py AuditLogConsumer
    python kafka_consumers.py RecordingConsumer
"""

import json
import logging
import os
import subprocess
import sys
import time
from typing import Optional

import psycopg2
from kafka import KafkaConsumer
from kafka.errors import KafkaError, NoBrokersAvailable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

KAFKA_BOOTSTRAP = "localhost:9092"
_BACKOFF_START = 5   # seconds
_BACKOFF_MAX = 60    # seconds


# ─────────────────────────────────────────────────────────────────────────────
# Vault helper
# ─────────────────────────────────────────────────────────────────────────────

def _vault_get(path: str, field: str) -> str:
    vault_addr = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
    vault_token = os.environ.get("VAULT_TOKEN", "")
    if not vault_token:
        init_file = "/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json"
        with open(init_file) as f:
            vault_token = json.load(f)["root_token"]
    result = subprocess.run(
        ["vault", "kv", "get", f"-field={field}", path],
        capture_output=True, text=True,
        env={**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token},
    )
    if result.returncode != 0:
        raise RuntimeError(f"vault kv get {path} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def _pg_connect():
    pg_pass = _vault_get("secret/trustnow/platform/postgres", "app_password")
    return psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        dbname="trustnow_platform",
        user="trustnow_app",
        password=pg_pass,
    )


def _make_consumer(topic: str, group_id: str) -> KafkaConsumer:
    return KafkaConsumer(
        topic,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id=group_id,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Consumer classes
# ─────────────────────────────────────────────────────────────────────────────

class MISMetricsConsumer:
    """
    Reads trustnow.mis.metrics.
    Writes aggregated call_metrics events into the conversations table
    (updates handle_time / duration on the matched conversation row).
    """

    TOPIC = "trustnow.mis.metrics"
    GROUP = "trustnow-mis-consumer"
    logger = logging.getLogger("MISMetricsConsumer")

    def run(self):
        backoff = _BACKOFF_START
        while True:
            try:
                self.logger.info("Connecting to Kafka %s → %s", KAFKA_BOOTSTRAP, self.TOPIC)
                consumer = _make_consumer(self.TOPIC, self.GROUP)
                backoff = _BACKOFF_START
                self.logger.info("Listening on %s (group=%s)", self.TOPIC, self.GROUP)
                for message in consumer:
                    self._handle(message.value)
            except (KafkaError, NoBrokersAvailable) as exc:
                self.logger.error("Kafka error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)
            except Exception as exc:
                self.logger.error("Unexpected error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)

    def _handle(self, event: dict):
        cid = event.get("cid")
        payload = event.get("payload", {})
        duration_s = payload.get("duration_s")
        self.logger.info("MIS metrics event: cid=%s duration_s=%s", cid, duration_s)
        if cid and duration_s is not None:
            try:
                conn = _pg_connect()
                with conn, conn.cursor() as cur:
                    cur.execute(
                        "UPDATE conversations SET handle_time_s = %s WHERE conversation_id = %s",
                        (duration_s, cid),
                    )
                conn.close()
            except Exception as exc:
                self.logger.warning("DB update failed for cid=%s: %s", cid, exc)


class AuditLogConsumer:
    """
    Reads trustnow.audit.log.
    Writes each event to PostgreSQL audit_logs (INSERT-only — DB enforces this via triggers).
    """

    TOPIC = "trustnow.audit.log"
    GROUP = "trustnow-audit-consumer"
    logger = logging.getLogger("AuditLogConsumer")

    def run(self):
        backoff = _BACKOFF_START
        while True:
            try:
                self.logger.info("Connecting to Kafka %s → %s", KAFKA_BOOTSTRAP, self.TOPIC)
                consumer = _make_consumer(self.TOPIC, self.GROUP)
                backoff = _BACKOFF_START
                self.logger.info("Listening on %s (group=%s)", self.TOPIC, self.GROUP)
                for message in consumer:
                    self._handle(message.value)
            except (KafkaError, NoBrokersAvailable) as exc:
                self.logger.error("Kafka error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)
            except Exception as exc:
                self.logger.error("Unexpected error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)

    def _handle(self, event: dict):
        cid = event.get("cid")
        tenant_id = event.get("tenant_id")
        event_type = event.get("event_type")
        payload = event.get("payload", {})
        self.logger.info("Audit event: type=%s cid=%s", event_type, cid)
        try:
            conn = _pg_connect()
            with conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO audit_logs (
                        log_id, tenant_id, conversation_id,
                        event_type, actor, resource, action, metadata, timestamp
                    ) VALUES (
                        gen_random_uuid(), %s, %s,
                        %s, %s, %s, %s, %s, NOW()
                    )
                    """,
                    (
                        tenant_id,
                        cid,
                        event_type,
                        payload.get("actor", "system"),
                        payload.get("resource", "unknown"),
                        payload.get("action", "unknown"),
                        json.dumps(payload),
                    ),
                )
            conn.close()
        except Exception as exc:
            self.logger.warning("DB insert failed for cid=%s: %s", cid, exc)


class RecordingConsumer:
    """
    Reads trustnow.call.recordings.
    Logs recording completion events (full MinIO upload logic in Task 14).
    """

    TOPIC = "trustnow.call.recordings"
    GROUP = "trustnow-recording-consumer"
    logger = logging.getLogger("RecordingConsumer")

    def run(self):
        backoff = _BACKOFF_START
        while True:
            try:
                self.logger.info("Connecting to Kafka %s → %s", KAFKA_BOOTSTRAP, self.TOPIC)
                consumer = _make_consumer(self.TOPIC, self.GROUP)
                backoff = _BACKOFF_START
                self.logger.info("Listening on %s (group=%s)", self.TOPIC, self.GROUP)
                for message in consumer:
                    self._handle(message.value)
            except (KafkaError, NoBrokersAvailable) as exc:
                self.logger.error("Kafka error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)
            except Exception as exc:
                self.logger.error("Unexpected error: %s — retry in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, _BACKOFF_MAX)

    def _handle(self, event: dict):
        cid = event.get("cid")
        payload = event.get("payload", {})
        storage_path = payload.get("storage_path", "unknown")
        self.logger.info(
            "Recording event: cid=%s path=%s (MinIO upload: Task 14)", cid, storage_path
        )


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

_CONSUMERS = {
    "MISMetricsConsumer": MISMetricsConsumer,
    "AuditLogConsumer": AuditLogConsumer,
    "RecordingConsumer": RecordingConsumer,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in _CONSUMERS:
        print(f"Usage: python kafka_consumers.py [{' | '.join(_CONSUMERS)}]")
        sys.exit(1)
    consumer_class = _CONSUMERS[sys.argv[1]]
    consumer_class().run()
