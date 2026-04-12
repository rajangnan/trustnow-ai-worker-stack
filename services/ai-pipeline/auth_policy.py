"""
TRUSTNOW AI Pipeline — Authentication Policy Engine — BRD §6.3.3 (§11.3)
=========================================================================
Configurable per-agent caller authentication.

Supported mechanisms (all via LLM-guided conversation flow):
  OTP       — SMS or email one-time password; dispatched via platform API
  PIN       — Caller speaks or keys a pre-registered PIN/passcode
  KBA       — Knowledge-based authentication: security questions from agent config
  ANI/DNIS  — Automatic Number Identification match against allowlist
  Biometric — Voice biometric (placeholder; wired to biometric provider)
  SSO       — OAuth2/SSO redirect link dispatched to caller (web-channel only)
  Webhook   — Custom auth webhook: POST caller context, expect {verified: bool}

Auth flow:
  1. Load agent's auth policy (methods_enabled, config)
  2. Determine which method to use (priority order in policy)
  3. Run the appropriate auth challenge via LLM conversation
  4. Return AuthResult with verified flag and method used

Functions:
  authenticate_caller()   — main entry; returns AuthResult
  _otp_auth()             — OTP SMS/email dispatch + verify
  _pin_auth()             — PIN/passcode verification
  _kba_auth()             — knowledge-based questions
  _ani_auth()             — ANI/DNIS match
  _webhook_auth()         — custom webhook
"""

import asyncio
import json
import logging
import random
import string
import time
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.auth_policy")

PLATFORM_API_URL = "http://127.0.0.1:3001"

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


# ─────────────────────────────────────────────────────────────────────────────
# Auth result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class AuthResult:
    verified: bool
    method_used: str
    caller_id: Optional[str] = None   # resolved caller identifier (account/phone)
    attempts: int = 1
    failure_reason: Optional[str] = None
    context: dict = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Main dispatcher
# ─────────────────────────────────────────────────────────────────────────────

async def authenticate_caller(
    cid: str,
    agent_config: dict,
    caller_phone: Optional[str] = None,
) -> AuthResult:
    """
    Authenticate the caller using the agent's configured auth policy.
    Tries enabled methods in priority order until one succeeds or all fail.
    Returns AuthResult with verified=True on success.
    """
    auth_policy = await _load_auth_policy(agent_config["agent_id"], agent_config["tenant_id"])

    if not auth_policy or not auth_policy.get("authentication_enabled"):
        # Auth disabled for this agent — pass through
        return AuthResult(verified=True, method_used="none")

    methods_enabled = auth_policy.get("methods_enabled") or []
    if not methods_enabled:
        return AuthResult(verified=True, method_used="none")

    # Priority order: ANI first (zero-friction), then OTP, PIN, KBA, webhook
    METHOD_PRIORITY = ["ani_dnis", "pin", "otp_sms", "otp_email", "kba", "webhook", "biometric", "sso"]
    ordered_methods = [m for m in METHOD_PRIORITY if m in methods_enabled] + \
                      [m for m in methods_enabled if m not in METHOD_PRIORITY]

    for method in ordered_methods:
        logger.info("[%s] Attempting auth method: %s", cid, method)
        try:
            if method == "ani_dnis":
                result = await _ani_auth(cid, caller_phone, auth_policy)
            elif method in ("otp_sms", "otp_email"):
                channel = "sms" if method == "otp_sms" else "email"
                result = await _otp_auth(cid, agent_config, auth_policy, channel)
            elif method == "pin":
                result = await _pin_auth(cid, agent_config, auth_policy)
            elif method == "kba":
                result = await _kba_auth(cid, agent_config, auth_policy)
            elif method == "webhook":
                result = await _webhook_auth(cid, caller_phone, auth_policy)
            elif method == "biometric":
                result = await _biometric_auth(cid, caller_phone, auth_policy)
            else:
                continue

            if result.verified:
                # Record auth result in session
                await _redis.hset(f"session:{cid}", mapping={
                    "auth_verified": "1",
                    "auth_method": method,
                    "auth_caller_id": result.caller_id or "",
                })
                logger.info("[%s] Auth verified via %s — caller_id=%s", cid, method, result.caller_id)
                return result

        except Exception as exc:
            logger.warning("[%s] Auth method %s error: %s", cid, method, exc)
            continue

    # All methods exhausted
    await _redis.hset(f"session:{cid}", "auth_verified", "0")
    return AuthResult(verified=False, method_used="exhausted", failure_reason="All auth methods failed")


# ─────────────────────────────────────────────────────────────────────────────
# ANI/DNIS match — zero-friction, no caller interaction
# ─────────────────────────────────────────────────────────────────────────────

async def _ani_auth(
    cid: str,
    caller_phone: Optional[str],
    auth_policy: dict,
) -> AuthResult:
    """
    Verify caller by matching their CLI (ANI) against the allowlist in auth policy.
    Zero-friction — caller doesn't need to do anything.
    """
    allowed_numbers = auth_policy.get("allowed_numbers") or []
    if not caller_phone or not allowed_numbers:
        return AuthResult(verified=False, method_used="ani_dnis", failure_reason="No ANI or allowlist")

    # Normalise: strip spaces/dashes, ensure E.164 comparison
    def _normalise(n: str) -> str:
        return "".join(c for c in n if c.isdigit() or c == "+")

    caller_norm = _normalise(caller_phone)
    for allowed in allowed_numbers:
        if _normalise(str(allowed)) == caller_norm:
            return AuthResult(verified=True, method_used="ani_dnis", caller_id=caller_phone)

    return AuthResult(verified=False, method_used="ani_dnis", failure_reason="ANI not in allowlist")


# ─────────────────────────────────────────────────────────────────────────────
# OTP — SMS or email
# ─────────────────────────────────────────────────────────────────────────────

async def _otp_auth(
    cid: str,
    agent_config: dict,
    auth_policy: dict,
    channel: str = "sms",
) -> AuthResult:
    """
    Dispatch a 6-digit OTP via SMS or email, then verify via LLM-guided conversation.
    OTP stored in Redis `otp:{cid}` with 5-minute TTL.
    Dispatch via platform API /api/auth/send-otp.
    """
    # Generate OTP
    otp_code = "".join(random.choices(string.digits, k=6))
    otp_key = f"otp:{cid}"
    await _redis.set(otp_key, otp_code, ex=300)  # 5 minutes

    # Get caller contact from session (phone for SMS, email if available)
    session = await _redis.hgetall(f"session:{cid}")
    caller_phone = session.get("caller_phone", "")
    caller_email = session.get("caller_email", "")

    destination = caller_email if channel == "email" and caller_email else caller_phone
    if not destination:
        return AuthResult(verified=False, method_used=f"otp_{channel}", failure_reason="No destination for OTP")

    # Dispatch OTP
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{PLATFORM_API_URL}/api/auth/send-otp",
                json={
                    "cid": cid,
                    "channel": channel,
                    "destination": destination,
                    "otp_code": otp_code,  # platform sends it, never exposed to caller via transcript
                    "tenant_id": agent_config["tenant_id"],
                },
                headers={"X-Internal": "1"},
            )
            if resp.status_code not in (200, 204):
                logger.warning("[%s] OTP dispatch failed: %d", cid, resp.status_code)
                return AuthResult(verified=False, method_used=f"otp_{channel}",
                                  failure_reason=f"OTP dispatch failed: HTTP {resp.status_code}")
    except Exception as exc:
        logger.error("[%s] OTP dispatch error: %s", cid, exc)
        return AuthResult(verified=False, method_used=f"otp_{channel}", failure_reason=str(exc))

    # Wait for caller to speak the OTP code (collected via STT in turn loop)
    # Auth engine signals readiness via Redis — turn loop collects code and calls verify_otp()
    await _redis.hset(f"session:{cid}", "auth_awaiting", f"otp_{channel}")
    logger.info("[%s] OTP dispatched via %s to %s — awaiting caller input", cid, channel, destination)

    # Listen for OTP submission (published by turn loop when caller speaks digits)
    return AuthResult(
        verified=False,
        method_used=f"otp_{channel}",
        failure_reason="OTP dispatched — verification pending caller input",
        context={"awaiting_otp": True, "destination": destination},
    )


async def verify_otp(cid: str, spoken_code: str) -> bool:
    """
    Called from turn loop when caller speaks their OTP code.
    Returns True if code matches stored OTP.
    """
    stored = await _redis.get(f"otp:{cid}")
    if not stored:
        return False
    # Strip spaces from spoken code (STT may insert them between digits)
    entered = spoken_code.replace(" ", "").strip()
    verified = entered == stored
    if verified:
        await _redis.delete(f"otp:{cid}")
    return verified


# ─────────────────────────────────────────────────────────────────────────────
# PIN / Passcode
# ─────────────────────────────────────────────────────────────────────────────

async def _pin_auth(
    cid: str,
    agent_config: dict,
    auth_policy: dict,
) -> AuthResult:
    """
    Verify caller using a pre-registered PIN/passcode.
    PIN hash stored in auth_policy.jwt_config_json.pin_validation_webhook
    or checked against platform API /api/auth/verify-pin.
    """
    # Signal turn loop to collect PIN
    await _redis.hset(f"session:{cid}", "auth_awaiting", "pin")
    logger.info("[%s] PIN auth initiated — awaiting caller input", cid)

    return AuthResult(
        verified=False,
        method_used="pin",
        failure_reason="PIN collection pending caller input",
        context={"awaiting_pin": True},
    )


async def verify_pin(cid: str, spoken_pin: str, tenant_id: str, agent_id: str) -> bool:
    """
    Called from turn loop when caller speaks their PIN.
    Verifies against platform API /api/auth/verify-pin.
    """
    pin = spoken_pin.replace(" ", "").strip()
    session = await _redis.hgetall(f"session:{cid}")
    caller_id = session.get("caller_id", "")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{PLATFORM_API_URL}/api/auth/verify-pin",
                json={
                    "cid": cid,
                    "caller_id": caller_id,
                    "pin": pin,
                    "tenant_id": tenant_id,
                    "agent_id": agent_id,
                },
                headers={"X-Internal": "1"},
            )
            if resp.status_code == 200:
                return resp.json().get("verified", False)
    except Exception as exc:
        logger.warning("[%s] PIN verify error: %s", cid, exc)
    return False


# ─────────────────────────────────────────────────────────────────────────────
# KBA — Knowledge-Based Authentication
# ─────────────────────────────────────────────────────────────────────────────

async def _kba_auth(
    cid: str,
    agent_config: dict,
    auth_policy: dict,
) -> AuthResult:
    """
    Knowledge-based authentication using security questions.
    Questions and hashed answers stored in auth_policy.jwt_config_json.kba_questions.
    LLM asks questions conversationally; answers verified via platform API.
    """
    await _redis.hset(f"session:{cid}", "auth_awaiting", "kba")
    logger.info("[%s] KBA auth initiated", cid)

    return AuthResult(
        verified=False,
        method_used="kba",
        failure_reason="KBA question/answer pending",
        context={"awaiting_kba": True},
    )


async def verify_kba(
    cid: str,
    answers: dict,
    tenant_id: str,
    agent_id: str,
) -> bool:
    """
    Verify KBA answers against stored hashes via platform API.
    answers: {question_id: answer_text}
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{PLATFORM_API_URL}/api/auth/verify-kba",
                json={"cid": cid, "answers": answers, "tenant_id": tenant_id, "agent_id": agent_id},
                headers={"X-Internal": "1"},
            )
            if resp.status_code == 200:
                return resp.json().get("verified", False)
    except Exception as exc:
        logger.warning("[%s] KBA verify error: %s", cid, exc)
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Custom webhook auth
# ─────────────────────────────────────────────────────────────────────────────

async def _webhook_auth(
    cid: str,
    caller_phone: Optional[str],
    auth_policy: dict,
) -> AuthResult:
    """
    Custom authentication webhook.
    POST caller context to configured URL; expects {verified: bool, caller_id: str} response.
    """
    jwt_config = auth_policy.get("jwt_config_json") or {}
    webhook_url = jwt_config.get("auth_webhook_url", "")
    if not webhook_url:
        return AuthResult(verified=False, method_used="webhook", failure_reason="No auth webhook configured")

    session = await _redis.hgetall(f"session:{cid}")
    payload = {
        "cid": cid,
        "caller_phone": caller_phone or session.get("caller_phone", ""),
        "tenant_id": session.get("tenant_id", ""),
        "agent_id": session.get("agent_id", ""),
        "timestamp": int(time.time()),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                verified = data.get("verified", False)
                caller_id = data.get("caller_id")
                return AuthResult(
                    verified=verified,
                    method_used="webhook",
                    caller_id=caller_id,
                    failure_reason=None if verified else data.get("reason", "Webhook rejected"),
                )
            return AuthResult(verified=False, method_used="webhook",
                              failure_reason=f"Webhook HTTP {resp.status_code}")
    except Exception as exc:
        return AuthResult(verified=False, method_used="webhook", failure_reason=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Voice biometric (placeholder — wired to biometric provider)
# ─────────────────────────────────────────────────────────────────────────────

async def _biometric_auth(
    cid: str,
    caller_phone: Optional[str],
    auth_policy: dict,
) -> AuthResult:
    """
    Voice biometric authentication.
    Enrolls voiceprint on first call; matches on subsequent calls.
    Wired to biometric provider via platform API /api/auth/biometric.
    """
    session = await _redis.hgetall(f"session:{cid}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{PLATFORM_API_URL}/api/auth/biometric/verify",
                json={
                    "cid": cid,
                    "caller_phone": caller_phone or session.get("caller_phone", ""),
                    "tenant_id": session.get("tenant_id", ""),
                },
                headers={"X-Internal": "1"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return AuthResult(
                    verified=data.get("verified", False),
                    method_used="biometric",
                    caller_id=data.get("caller_id"),
                    failure_reason=None if data.get("verified") else "Biometric match failed",
                )
    except Exception as exc:
        logger.warning("[%s] Biometric auth error: %s", cid, exc)
    return AuthResult(verified=False, method_used="biometric", failure_reason="Biometric service unavailable")


# ─────────────────────────────────────────────────────────────────────────────
# Auth policy loader
# ─────────────────────────────────────────────────────────────────────────────

async def _load_auth_policy(agent_id: str, tenant_id: str) -> Optional[dict]:
    """Load auth policy from platform API (cached 60s in Redis)."""
    cache_key = f"auth_policy:{agent_id}"
    cached = await _redis.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{PLATFORM_API_URL}/api/agents/{agent_id}/auth-policy",
                headers={"X-Tenant-Id": tenant_id, "X-Internal": "1"},
            )
            if resp.status_code == 200:
                policy = resp.json()
                await _redis.set(cache_key, json.dumps(policy), ex=60)
                return policy
    except Exception as exc:
        logger.warning("_load_auth_policy error: %s", exc)
    return None
