"""
TRUSTNOW AI Pipeline — Payment Gating Service — BRD §6.3.4 / Task 11
======================================================================
Payment flow:
  1. Master Worker calls request_payment_link() with amount + description
  2. This module POSTs to tenant's payment webhook (configurable per agent)
  3. Payment provider returns a payment link URL
  4. Link is dispatched to caller (SMS and/or TTS read-out)
  5. Module monitors Redis for completion webhook from payment provider
     (payment provider posts to NestJS → NestJS publishes to Redis)
  6. Returns PaymentResult(status='completed'|'failed'|'timeout'|'cancelled')

Redis keys:
  payment_status:{cid}          — set by NestJS webhook receiver when provider calls back
  payment_link:{cid}            — stores link URL for audit / re-read

Configurable per agent (from agent_config.payment_config):
  webhook_url                   — tenant's payment system endpoint
  link_timeout_s                — how long to wait for payment (default 300s / 5 min)
  sms_dispatch                  — bool: also send link via SMS to caller phone
  retry_count                   — retries on webhook dispatch failure (default 3)
  retry_delay_s                 — base delay between retries in seconds (default 2)

Functions:
  request_payment_link()        — main entry point: dispatch + monitor
  _dispatch_payment_link()      — POST to tenant payment webhook, get link back
  _send_payment_sms()           — dispatch link via SMS
  _await_payment_completion()   — poll Redis for payment status with timeout
  cancel_payment()              — allow caller to cancel pending payment
  get_payment_status()          — read current Redis payment status for a CID
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.payment_gateway")

PLATFORM_API_URL = "http://127.0.0.1:3001"

# ─────────────────────────────────────────────────────────────────────────────
# Module-level Redis — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


# ─────────────────────────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PaymentResult:
    status: str                          # 'completed' | 'failed' | 'timeout' | 'cancelled' | 'dispatched'
    cid: str
    link_url: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "GBP"
    payment_reference: Optional[str] = None
    failure_reason: Optional[str] = None
    elapsed_s: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Main entry — request payment link and await completion
# ─────────────────────────────────────────────────────────────────────────────

async def request_payment_link(
    cid: str,
    tenant_id: str,
    agent_config: Dict[str, Any],
    amount: float,
    description: str,
    caller_phone: Optional[str] = None,
    currency: str = "GBP",
    metadata: Optional[Dict[str, Any]] = None,
) -> PaymentResult:
    """
    Dispatch payment link to caller and await confirmed completion.

    Payment config keys in agent_config['payment_config']:
        webhook_url       (required) — tenant payment system endpoint
        link_timeout_s    (default 300) — seconds to wait for payment completion
        sms_dispatch      (default True) — send link via SMS as well
        retry_count       (default 3) — dispatch retries
        retry_delay_s     (default 2) — base retry delay
    """
    start = time.monotonic()
    payment_cfg = (agent_config.get("payment_config") or {})
    webhook_url: Optional[str] = payment_cfg.get("webhook_url")
    link_timeout_s: int = int(payment_cfg.get("link_timeout_s", 300))
    sms_dispatch: bool = payment_cfg.get("sms_dispatch", True)
    retry_count: int = int(payment_cfg.get("retry_count", 3))
    retry_delay_s: float = float(payment_cfg.get("retry_delay_s", 2.0))

    if not webhook_url:
        logger.error("[%s] payment_gateway: no webhook_url configured for agent", cid)
        return PaymentResult(
            status="failed", cid=cid, amount=amount, currency=currency,
            failure_reason="no_payment_webhook_configured",
        )

    # Clear any stale payment state for this CID
    await _redis.delete(f"payment_status:{cid}")
    await _redis.delete(f"payment_link:{cid}")

    # 1. Dispatch to tenant's payment system
    link_url, payment_reference = await _dispatch_payment_link(
        cid=cid,
        tenant_id=tenant_id,
        webhook_url=webhook_url,
        amount=amount,
        currency=currency,
        description=description,
        caller_phone=caller_phone,
        metadata=metadata or {},
        retry_count=retry_count,
        retry_delay_s=retry_delay_s,
    )

    if not link_url:
        elapsed = time.monotonic() - start
        return PaymentResult(
            status="failed", cid=cid, amount=amount, currency=currency,
            failure_reason="payment_link_dispatch_failed", elapsed_s=elapsed,
        )

    # Store link for audit and potential re-reads
    await _redis.setex(f"payment_link:{cid}", link_timeout_s + 60, link_url)
    logger.info("[%s] payment_gateway: link dispatched — %s (ref=%s)", cid, link_url, payment_reference)

    # 2. Optionally send SMS
    if sms_dispatch and caller_phone:
        await _send_payment_sms(
            cid=cid,
            tenant_id=tenant_id,
            caller_phone=caller_phone,
            link_url=link_url,
            amount=amount,
            currency=currency,
        )

    # 3. Await payment completion (or timeout)
    completion_status = await _await_payment_completion(
        cid=cid,
        timeout_s=link_timeout_s,
    )

    elapsed = time.monotonic() - start
    return PaymentResult(
        status=completion_status,
        cid=cid,
        link_url=link_url,
        amount=amount,
        currency=currency,
        payment_reference=payment_reference,
        elapsed_s=elapsed,
        failure_reason=None if completion_status == "completed" else completion_status,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Dispatch: POST to tenant payment webhook
# ─────────────────────────────────────────────────────────────────────────────

async def _dispatch_payment_link(
    cid: str,
    tenant_id: str,
    webhook_url: str,
    amount: float,
    currency: str,
    description: str,
    caller_phone: Optional[str],
    metadata: Dict[str, Any],
    retry_count: int,
    retry_delay_s: float,
) -> tuple[Optional[str], Optional[str]]:
    """
    POST to tenant's payment system and return (link_url, payment_reference).
    Returns (None, None) on exhausted retries.
    """
    payload = {
        "cid": cid,
        "tenant_id": tenant_id,
        "amount": amount,
        "currency": currency,
        "description": description,
        "caller_phone": caller_phone,
        "callback_url": f"{PLATFORM_API_URL}/api/payments/webhook",
        "metadata": metadata,
    }

    for attempt in range(1, retry_count + 1):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(webhook_url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    link_url = data.get("payment_url") or data.get("link_url")
                    reference = data.get("reference") or data.get("payment_reference") or data.get("id")
                    if link_url:
                        return link_url, reference
                    logger.warning("[%s] payment_gateway: dispatch response missing link — %s", cid, data)
                else:
                    logger.warning(
                        "[%s] payment_gateway: dispatch attempt %d returned HTTP %d",
                        cid, attempt, resp.status_code,
                    )
        except Exception as exc:
            logger.warning("[%s] payment_gateway: dispatch attempt %d failed — %s", cid, attempt, exc)

        if attempt < retry_count:
            delay = retry_delay_s * (2 ** (attempt - 1))  # exponential backoff
            await asyncio.sleep(delay)

    logger.error("[%s] payment_gateway: all %d dispatch attempts failed", cid, retry_count)
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# SMS dispatch — via Platform API internal endpoint
# ─────────────────────────────────────────────────────────────────────────────

async def _send_payment_sms(
    cid: str,
    tenant_id: str,
    caller_phone: str,
    link_url: str,
    amount: float,
    currency: str,
) -> None:
    """Dispatch payment link SMS via Platform API send_sms internal endpoint."""
    message = (
        f"Your payment link for {currency} {amount:.2f}: {link_url} — "
        f"This link expires in 5 minutes. Reply STOP to decline."
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{PLATFORM_API_URL}/api/telephony/send_sms",
                json={"cid": cid, "tenant_id": tenant_id, "to": caller_phone, "body": message},
            )
        logger.info("[%s] payment_gateway: SMS dispatched to %s", cid, caller_phone[-4:])
    except Exception as exc:
        logger.warning("[%s] payment_gateway: SMS dispatch failed — %s (non-fatal)", cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Await completion — poll Redis key set by NestJS webhook receiver
# ─────────────────────────────────────────────────────────────────────────────

async def _await_payment_completion(cid: str, timeout_s: int) -> str:
    """
    Poll Redis payment_status:{cid} until:
      - 'completed' → payment confirmed
      - 'failed'    → payment provider reported failure
      - 'cancelled' → caller cancelled
      - timeout     → link_timeout_s elapsed without result

    NestJS PaymentWebhookController sets this key when the payment provider
    calls back at POST /api/payments/webhook.

    Polling interval: 2s (keeps Redis load minimal while staying responsive).
    """
    poll_interval = 2.0
    deadline = time.monotonic() + timeout_s
    key = f"payment_status:{cid}"

    logger.info("[%s] payment_gateway: awaiting completion (timeout=%ds)", cid, timeout_s)

    while time.monotonic() < deadline:
        status = await _redis.get(key)
        if status:
            status_str = status.decode() if isinstance(status, bytes) else status
            logger.info("[%s] payment_gateway: completion status=%s", cid, status_str)
            await _redis.delete(key)
            return status_str
        await asyncio.sleep(poll_interval)

    logger.warning("[%s] payment_gateway: payment timed out after %ds", cid, timeout_s)
    return "timeout"


# ─────────────────────────────────────────────────────────────────────────────
# Cancel payment — called by Master Worker if caller says cancel
# ─────────────────────────────────────────────────────────────────────────────

async def cancel_payment(cid: str) -> None:
    """
    Signal payment cancellation by writing to Redis.
    _await_payment_completion will pick this up on next poll.
    """
    await _redis.setex(f"payment_status:{cid}", 60, "cancelled")
    logger.info("[%s] payment_gateway: payment cancelled", cid)


# ─────────────────────────────────────────────────────────────────────────────
# Status read — for Master Worker to check without waiting
# ─────────────────────────────────────────────────────────────────────────────

async def get_payment_status(cid: str) -> Optional[str]:
    """Return current payment status for a CID without blocking."""
    val = await _redis.get(f"payment_status:{cid}")
    if val:
        return val.decode() if isinstance(val, bytes) else val
    return None


async def get_payment_link(cid: str) -> Optional[str]:
    """Return stored payment link URL for a CID."""
    val = await _redis.get(f"payment_link:{cid}")
    if val:
        return val.decode() if isinstance(val, bytes) else val
    return None
