"""
TRUSTNOW Kafka Event Producers — BRD-CC-004
============================================
Producer classes for each TRUSTNOW Kafka topic:
  - ConversationEventProducer  → trustnow.conversation.events  (CID as key)
  - AuditLogProducer           → trustnow.audit.log
  - RecordingEventProducer     → trustnow.call.recordings
  - MISMetricsProducer         → trustnow.mis.metrics
  - VoiceLibraryProducer       → trustnow.voice.library

All messages: JSON-serialised, fields: cid, tenant_id, timestamp, event_type, payload.

CLI test:
    python kafka_producers.py test
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from kafka import KafkaProducer
from kafka.errors import KafkaError


KAFKA_BOOTSTRAP = "localhost:9092"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_message(
    cid: str,
    tenant_id: str,
    event_type: str,
    payload: Dict[str, Any],
) -> bytes:
    msg = {
        "cid": cid,
        "tenant_id": tenant_id,
        "timestamp": _utc_now(),
        "event_type": event_type,
        "payload": payload,
    }
    return json.dumps(msg).encode("utf-8")


def _make_producer() -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        acks="all",
        retries=3,
        linger_ms=5,
    )


def _delivery_callback(topic: str, future):
    """Block on future and print delivery confirmation or raise."""
    try:
        record_metadata = future.get(timeout=10)
        print(
            f"  [DELIVERED] topic={record_metadata.topic} "
            f"partition={record_metadata.partition} "
            f"offset={record_metadata.offset} ✅"
        )
    except KafkaError as exc:
        raise RuntimeError(f"Delivery failed for topic {topic}: {exc}") from exc


# ─────────────────────────────────────────────────────────────────────────────
# Producer classes
# ─────────────────────────────────────────────────────────────────────────────

class ConversationEventProducer:
    """Publishes to trustnow.conversation.events. CID is always the Kafka message key."""

    TOPIC = "trustnow.conversation.events"

    def __init__(self):
        self._producer = _make_producer()

    def publish(
        self,
        cid: str,
        tenant_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        msg = _build_message(cid, tenant_id, event_type, payload or {})
        future = self._producer.send(
            self.TOPIC,
            key=cid.encode("utf-8"),
            value=msg,
        )
        _delivery_callback(self.TOPIC, future)

    def close(self):
        self._producer.flush()
        self._producer.close()


class AuditLogProducer:
    """Publishes to trustnow.audit.log."""

    TOPIC = "trustnow.audit.log"

    def __init__(self):
        self._producer = _make_producer()

    def publish(
        self,
        cid: str,
        tenant_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        msg = _build_message(cid, tenant_id, event_type, payload or {})
        future = self._producer.send(self.TOPIC, value=msg)
        _delivery_callback(self.TOPIC, future)

    def close(self):
        self._producer.flush()
        self._producer.close()


class RecordingEventProducer:
    """Publishes to trustnow.call.recordings."""

    TOPIC = "trustnow.call.recordings"

    def __init__(self):
        self._producer = _make_producer()

    def publish(
        self,
        cid: str,
        tenant_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        msg = _build_message(cid, tenant_id, event_type, payload or {})
        future = self._producer.send(self.TOPIC, value=msg)
        _delivery_callback(self.TOPIC, future)

    def close(self):
        self._producer.flush()
        self._producer.close()


class MISMetricsProducer:
    """Publishes to trustnow.mis.metrics."""

    TOPIC = "trustnow.mis.metrics"

    def __init__(self):
        self._producer = _make_producer()

    def publish(
        self,
        cid: str,
        tenant_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        msg = _build_message(cid, tenant_id, event_type, payload or {})
        future = self._producer.send(self.TOPIC, value=msg)
        _delivery_callback(self.TOPIC, future)

    def close(self):
        self._producer.flush()
        self._producer.close()


class VoiceLibraryProducer:
    """Publishes to trustnow.voice.library."""

    TOPIC = "trustnow.voice.library"

    def __init__(self):
        self._producer = _make_producer()

    def publish(
        self,
        cid: str,
        tenant_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        msg = _build_message(cid, tenant_id, event_type, payload or {})
        future = self._producer.send(self.TOPIC, value=msg)
        _delivery_callback(self.TOPIC, future)

    def close(self):
        self._producer.flush()
        self._producer.close()


# ─────────────────────────────────────────────────────────────────────────────
# CLI test
# ─────────────────────────────────────────────────────────────────────────────

def _run_test():
    print("=" * 60)
    print("KAFKA PRODUCERS TEST")
    print("=" * 60)

    test_cid = str(uuid.uuid4())
    test_tenant = str(uuid.uuid4())

    tests = [
        (
            "ConversationEventProducer → trustnow.conversation.events",
            ConversationEventProducer,
            "call_started",
            {"channel": "voice", "agent_id": str(uuid.uuid4())},
        ),
        (
            "AuditLogProducer → trustnow.audit.log",
            AuditLogProducer,
            "session_created",
            {"actor": "system", "resource": "conversation", "action": "create"},
        ),
        (
            "RecordingEventProducer → trustnow.call.recordings",
            RecordingEventProducer,
            "recording_started",
            {"storage_path": f"recordings/{test_cid}.wav", "format": "wav"},
        ),
        (
            "MISMetricsProducer → trustnow.mis.metrics",
            MISMetricsProducer,
            "call_metrics",
            {"duration_s": 0, "asr_latency_ms": 0, "llm_latency_ms": 0},
        ),
        (
            "VoiceLibraryProducer → trustnow.voice.library",
            VoiceLibraryProducer,
            "voice_selected",
            {"voice_id": str(uuid.uuid4()), "tts_provider": "elevenlabs"},
        ),
    ]

    passed = 0
    for label, ProducerClass, event_type, payload in tests:
        print(f"\n[TEST] {label}")
        try:
            producer = ProducerClass()
            producer.publish(test_cid, test_tenant, event_type, payload)
            producer.close()
            passed += 1
        except Exception as exc:
            print(f"  [FAIL] {exc}")

    print()
    print("=" * 60)
    if passed == len(tests):
        print(f"KAFKA PRODUCERS TEST: PASS  ({passed}/{len(tests)} topics delivered)")
    else:
        print(f"KAFKA PRODUCERS TEST: FAIL  ({passed}/{len(tests)} topics delivered)")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        _run_test()
    else:
        print("Usage: python kafka_producers.py test")
        sys.exit(1)
