"""
TRUSTNOW AI Pipeline — Human-in-the-Loop (HITL) Approval Service — Task 11 §11.5
==================================================================================
High-risk actions (refunds > threshold, account freezes, plan cancellations, etc.)
must pause execution and route to a supervisor for approval before proceeding.

HITL flow:
  1. Master Worker identifies high-risk action during SME task delegation
  2. Places caller on MOH via progress_tracker
  3. Publishes `hitl_approval_required` event to Kafka topic trustnow.conversation.events
  4. Human Agent Desktop (supervisor view) shows approval request via WebSocket
  5. Supervisor clicks Approve or Reject → NestJS HITL controller
  6. NestJS publishes decision to Redis pub/sub `hitl_decision:{CID}`
  7. Master Worker receives decision and proceeds accordingly

Decision outcomes:
  approve   → execute the action, inform caller, continue workflow
  reject    → inform caller action cannot be completed, offer alternatives
  timeout   → treated as reject, caller offered escalation to human agent

HITL configuration per agent (agent_config.hitl_config):
  enabled             bool    (default True)
  risk_threshold_gbp  float   (default 100.0 — refunds above this trigger HITL)
  approval_timeout_s  int     (default 120)
  timeout_action      str     'reject' | 'transfer' | 'end_call' (default 'reject')

Redis keys:
  hitl_decision:{cid}         — set by NestJS when supervisor decides
  hitl_pending:{cid}          — metadata about the pending request (for supervisor UI)

Kafka topic:
  trustnow.conversation.events — event_type: hitl_approval_required | hitl_resolved

Functions:
  request_hitl_approval()     — main entry: publish event + await decision
  resolve_hitl()              — called from NestJS HITL controller via Redis pub/sub
  is_hitl_required()          — check if action needs HITL based on agent config
  get_pending_hitl()          — return pending request metadata for supervisor UI
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis

from kafka_producers import ConversationEventProducer

logger = logging.getLogger("trustnow.hitl_service")

HITL_DECISION_TTL = 300  # seconds — how long to keep decision in Redis

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_kafka_producer: Optional[ConversationEventProducer] = None


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_kafka_producer(p: ConversationEventProducer) -> None:
    global _kafka_producer
    _kafka_producer = p


# ─────────────────────────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class HitlDecision:
    decision: str                        # 'approve' | 'reject' | 'timeout'
    cid: str
    supervisor_id: Optional[str] = None
    supervisor_email: Optional[str] = None
    notes: Optional[str] = None
    elapsed_s: float = 0.0
    decided_at: Optional[str] = None


@dataclass
class HitlRequest:
    cid: str
    tenant_id: str
    agent_id: str
    action_type: str                     # e.g. 'refund', 'account_freeze', 'plan_cancellation'
    action_description: str
    amount: Optional[float] = None
    currency: str = "GBP"
    risk_level: str = "high"             # 'high' | 'critical'
    context: Dict[str, Any] = field(default_factory=dict)
    saga_step: Optional[int] = None
    sme_domain: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# Main entry — request HITL approval and await decision
# ─────────────────────────────────────────────────────────────────────────────

async def request_hitl_approval(
    cid: str,
    tenant_id: str,
    agent_id: str,
    agent_config: Dict[str, Any],
    action_type: str,
    action_description: str,
    amount: Optional[float] = None,
    currency: str = "GBP",
    risk_level: str = "high",
    context: Optional[Dict[str, Any]] = None,
    saga_step: Optional[int] = None,
    sme_domain: Optional[str] = None,
) -> HitlDecision:
    """
    Pause execution and route to supervisor for approval.

    Returns HitlDecision with decision='approve'|'reject'|'timeout'.
    Caller should be placed on MOH by Master Worker before calling this.
    """
    start = time.monotonic()
    hitl_cfg = agent_config.get("hitl_config") or {}
    timeout_s: int = int(hitl_cfg.get("approval_timeout_s", 120))

    # Clear any stale decision for this CID
    await _redis.delete(f"hitl_decision:{cid}")

    # Build the HITL request
    req = HitlRequest(
        cid=cid,
        tenant_id=tenant_id,
        agent_id=agent_id,
        action_type=action_type,
        action_description=action_description,
        amount=amount,
        currency=currency,
        risk_level=risk_level,
        context=context or {},
        saga_step=saga_step,
        sme_domain=sme_domain,
    )

    # Store pending request in Redis so supervisor UI can fetch it
    pending_data = json.dumps({
        "cid": req.cid,
        "tenant_id": req.tenant_id,
        "agent_id": req.agent_id,
        "action_type": req.action_type,
        "action_description": req.action_description,
        "amount": req.amount,
        "currency": req.currency,
        "risk_level": req.risk_level,
        "context": req.context,
        "saga_step": req.saga_step,
        "sme_domain": req.sme_domain,
        "created_at": req.created_at,
        "timeout_s": timeout_s,
    })
    await _redis.setex(f"hitl_pending:{cid}", timeout_s + 60, pending_data)

    # Publish Kafka event — Human Agent Desktop subscribes to this
    await _publish_hitl_event(req, event_type="hitl_approval_required")
    logger.info(
        "[%s] hitl_service: approval required — action=%s amount=%s timeout=%ds",
        cid, action_type, amount, timeout_s,
    )

    # Await supervisor decision via Redis
    decision_data = await _await_hitl_decision(cid=cid, timeout_s=timeout_s)
    elapsed = time.monotonic() - start

    if decision_data:
        decision = HitlDecision(
            decision=decision_data.get("decision", "reject"),
            cid=cid,
            supervisor_id=decision_data.get("supervisor_id"),
            supervisor_email=decision_data.get("supervisor_email"),
            notes=decision_data.get("notes"),
            elapsed_s=elapsed,
            decided_at=decision_data.get("decided_at"),
        )
    else:
        # Timeout — treat as reject
        decision = HitlDecision(
            decision="timeout",
            cid=cid,
            elapsed_s=elapsed,
            decided_at=datetime.now(timezone.utc).isoformat(),
        )

    # Publish resolution event
    await _publish_hitl_event(req, event_type="hitl_resolved", decision=decision)

    # Clean up pending key
    await _redis.delete(f"hitl_pending:{cid}")
    logger.info("[%s] hitl_service: decision=%s elapsed=%.1fs", cid, decision.decision, elapsed)
    return decision


# ─────────────────────────────────────────────────────────────────────────────
# Await decision — poll Redis hitl_decision:{cid}
# ─────────────────────────────────────────────────────────────────────────────

async def _await_hitl_decision(cid: str, timeout_s: int) -> Optional[Dict[str, Any]]:
    """
    Poll Redis hitl_decision:{cid} every second until decision arrives or timeout.
    NestJS HITL controller writes this key when supervisor acts.
    """
    deadline = time.monotonic() + timeout_s
    key = f"hitl_decision:{cid}"

    while time.monotonic() < deadline:
        raw = await _redis.get(key)
        if raw:
            data = json.loads(raw.decode() if isinstance(raw, bytes) else raw)
            await _redis.delete(key)
            return data
        await asyncio.sleep(1.0)

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Kafka event publishing
# ─────────────────────────────────────────────────────────────────────────────

async def _publish_hitl_event(
    req: HitlRequest,
    event_type: str,
    decision: Optional[HitlDecision] = None,
) -> None:
    """Publish HITL event to trustnow.conversation.events Kafka topic."""
    if not _kafka_producer:
        logger.warning("[%s] hitl_service: no Kafka producer — event not published", req.cid)
        return

    payload: Dict[str, Any] = {
        "action_type": req.action_type,
        "action_description": req.action_description,
        "amount": req.amount,
        "currency": req.currency,
        "risk_level": req.risk_level,
        "saga_step": req.saga_step,
        "sme_domain": req.sme_domain,
        "agent_id": req.agent_id,
        "context": req.context,
    }
    if decision:
        payload["decision"] = decision.decision
        payload["supervisor_id"] = decision.supervisor_id
        payload["supervisor_email"] = decision.supervisor_email
        payload["notes"] = decision.notes
        payload["elapsed_s"] = decision.elapsed_s

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: _kafka_producer.publish(
                cid=req.cid,
                tenant_id=req.tenant_id,
                event_type=event_type,
                payload=payload,
            ),
        )
    except Exception as exc:
        logger.warning("[%s] hitl_service: Kafka publish failed — %s (non-fatal)", req.cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# NestJS callback — write decision to Redis (called from hitl.controller.ts logic)
# ─────────────────────────────────────────────────────────────────────────────

async def resolve_hitl(
    cid: str,
    decision: str,
    supervisor_id: str,
    supervisor_email: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    """
    Write supervisor decision to Redis hitl_decision:{cid}.
    Called indirectly via NestJS HITL controller → this function is exposed as
    an internal FastAPI endpoint in main.py so NestJS can POST the decision.
    """
    data = json.dumps({
        "decision": decision,
        "supervisor_id": supervisor_id,
        "supervisor_email": supervisor_email,
        "notes": notes,
        "decided_at": datetime.now(timezone.utc).isoformat(),
    })
    await _redis.setex(f"hitl_decision:{cid}", HITL_DECISION_TTL, data)
    logger.info("[%s] hitl_service: decision written — %s by %s", cid, decision, supervisor_id)


# ─────────────────────────────────────────────────────────────────────────────
# Is HITL required for this action?
# ─────────────────────────────────────────────────────────────────────────────

def is_hitl_required(
    agent_config: Dict[str, Any],
    action_type: str,
    amount: Optional[float] = None,
    requires_human_approval: bool = False,
) -> bool:
    """
    Check whether a given action needs HITL approval per agent configuration.

    Always triggered:
      - requires_human_approval flag set by SME Worker
      - action_type in high_risk_action_types list

    Amount-gated:
      - refund/credit action with amount > risk_threshold_gbp
    """
    hitl_cfg = agent_config.get("hitl_config") or {}
    if not hitl_cfg.get("enabled", True):
        return False

    if requires_human_approval:
        return True

    # High-risk action types (configurable, with safe defaults)
    high_risk_types: List[str] = hitl_cfg.get("high_risk_action_types", [
        "card_block",
        "account_freeze",
        "plan_cancellation",
        "plan_downgrade",
        "address_change_financial",
        "refund",
        "credit",
    ])

    if action_type in high_risk_types:
        # For financial actions, apply threshold
        if action_type in ("refund", "credit") and amount is not None:
            threshold = float(hitl_cfg.get("risk_threshold_gbp", 100.0))
            return amount > threshold
        return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Get pending HITL request — for supervisor UI
# ─────────────────────────────────────────────────────────────────────────────

async def get_pending_hitl(cid: str) -> Optional[Dict[str, Any]]:
    """Return pending HITL request metadata for supervisor UI consumption."""
    raw = await _redis.get(f"hitl_pending:{cid}")
    if raw:
        return json.loads(raw.decode() if isinstance(raw, bytes) else raw)
    return None
