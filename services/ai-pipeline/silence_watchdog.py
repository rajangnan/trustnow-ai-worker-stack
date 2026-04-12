"""
TRUSTNOW AI Pipeline — Silence Watchdog — BRD §9.3
====================================================
3-tier silence re-prompt system, matching ElevenLabs live-observed behaviour.

Tiers (from co-browse observation 28 Mar 2026):
  Tier 1 — 20s wait → LLM re-engagement question
  Tier 2 — 25s wait → gentle acknowledgement
  Tier 3 — 20s wait → farewell → platform_end_call()

The watchdog runs as an asyncio background task per session.
It is cancelled and restarted on every caller speech event.
`platform_end_call()` sends a FreeSWITCH ESL hangup via the NestJS platform API.
The LLM MUST NEVER end a call through conversation text — §9.1 constraint.

Functions:
  start_silence_watchdog()   — create background task for CID
  reset_silence_watchdog()   — cancel + restart (called on every user speech)
  silence_watchdog()         — the coroutine implementing 3-tier logic
  platform_end_call()        — ESL-driven hangup (the ONLY legitimate call termination path)
"""

import asyncio
import json
import logging
import time
from typing import Any, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.silence_watchdog")

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None

# Per-CID asyncio task registry
_watchdog_tasks: dict[str, asyncio.Task] = {}


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


# ─────────────────────────────────────────────────────────────────────────────
# Silence tier configuration — §9.3 (3 tiers, live-observed timings)
# ─────────────────────────────────────────────────────────────────────────────

SILENCE_TIERS = [
    {
        "tier": 1,
        "wait_s": 20,
        "prompt": (
            "The caller hasn't responded after your last message. "
            "Generate a brief, natural re-engagement question to check if they are still there. "
            "Maximum 1 sentence. Do not apologise."
        ),
        "is_final": False,
    },
    {
        "tier": 2,
        "wait_s": 25,
        "prompt": (
            "The caller still hasn't responded. "
            "Generate a gentle acknowledgement that they may be busy, and offer to continue whenever they are ready. "
            "Maximum 2 sentences."
        ),
        "is_final": False,
    },
    {
        "tier": 3,
        "wait_s": 20,
        "prompt": (
            "This is the final silence attempt. "
            "Generate a brief, warm farewell message indicating you will be here when they are ready. "
            "Maximum 1 sentence."
        ),
        "is_final": True,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Watchdog task management
# ─────────────────────────────────────────────────────────────────────────────

async def start_silence_watchdog(cid: str, agent_config: dict) -> None:
    """
    Create a new background asyncio task running silence_watchdog().
    Cancels any existing watchdog for this CID first.
    """
    await _cancel_watchdog(cid)
    task = asyncio.create_task(
        silence_watchdog(cid, agent_config),
        name=f"silence_watchdog:{cid}",
    )
    _watchdog_tasks[cid] = task
    logger.debug("[%s] Silence watchdog started", cid)


async def reset_silence_watchdog(cid: str, agent_config: dict) -> None:
    """
    Cancel the current watchdog and restart from tier 0.
    Called immediately when the caller speaks (VAD end-of-speech confirmed).
    """
    await _cancel_watchdog(cid)
    await _redis.hset(f"session:{cid}", "silence_tier", 0)
    task = asyncio.create_task(
        silence_watchdog(cid, agent_config),
        name=f"silence_watchdog:{cid}",
    )
    _watchdog_tasks[cid] = task
    logger.debug("[%s] Silence watchdog reset", cid)


async def cancel_silence_watchdog(cid: str) -> None:
    """Cancel the watchdog permanently (called on session end / hangup)."""
    await _cancel_watchdog(cid)
    _watchdog_tasks.pop(cid, None)
    logger.debug("[%s] Silence watchdog cancelled", cid)


async def _cancel_watchdog(cid: str) -> None:
    existing = _watchdog_tasks.get(cid)
    if existing and not existing.done():
        existing.cancel()
        try:
            await existing
        except asyncio.CancelledError:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Silence watchdog coroutine — §9.3
# ─────────────────────────────────────────────────────────────────────────────

async def silence_watchdog(cid: str, agent_config: dict) -> None:
    """
    Runs as a background asyncio task per session.
    Fires LLM-generated re-prompts at configured silence intervals.
    After final tier: triggers platform_end_call() via FreeSWITCH ESL.
    Cancelled immediately when user speaks (reset_silence_watchdog called from turn_loop).
    """
    try:
        tier = int(await _redis.hget(f"session:{cid}", "silence_tier") or 0)
        starting_tier = tier

        for silence_config in SILENCE_TIERS[tier:]:
            # Wait for configured silence duration
            await asyncio.sleep(silence_config["wait_s"])

            # Check if user spoke while we were sleeping (tier was reset externally)
            current_tier = int(await _redis.hget(f"session:{cid}", "silence_tier") or 0)
            if current_tier != starting_tier + (silence_config["tier"] - SILENCE_TIERS[0]["tier"]):
                logger.debug("[%s] Silence watchdog: user spoke during sleep — exiting", cid)
                return

            # Verify session still active
            session = await _redis.hgetall(f"session:{cid}")
            if not session:
                logger.debug("[%s] Silence watchdog: session gone — exiting", cid)
                return

            logger.info("[%s] Silence watchdog: tier %d firing", cid, silence_config["tier"])

            # Generate re-prompt via LLM
            transcript = json.loads(session.get("transcript", "[]"))
            try:
                re_prompt_text = await _llm_generate_silence_prompt(
                    silence_config["prompt"], transcript, agent_config, cid
                )
            except Exception as exc:
                logger.warning("[%s] Silence re-prompt LLM failed: %s", cid, exc)
                re_prompt_text = _fallback_silence_message(silence_config["tier"])

            # Play re-prompt via TTS (uses turn_loop.play_agent_turn for barge-in support)
            from turn_loop import play_agent_turn
            await play_agent_turn(cid=cid, text=re_prompt_text, agent_config=agent_config)

            # Advance tier counter
            tier += 1
            await _redis.hset(f"session:{cid}", "silence_tier", tier)

            if silence_config.get("is_final"):
                # Final tier exhausted — end the call via platform (NOT via LLM text) — §9.1
                logger.info("[%s] Silence watchdog: final tier exhausted — ending call", cid)
                await platform_end_call(cid, reason="silence_timeout")
                return

    except asyncio.CancelledError:
        logger.debug("[%s] Silence watchdog cancelled (user spoke)", cid)
    except Exception as exc:
        logger.error("[%s] Silence watchdog unexpected error: %s", cid, exc)
    finally:
        _watchdog_tasks.pop(cid, None)


# ─────────────────────────────────────────────────────────────────────────────
# Platform call termination — §9.1 constraint
# The LLM MUST NEVER end a call through conversation text.
# This is the ONLY legitimate platform-side call termination path.
# ─────────────────────────────────────────────────────────────────────────────

async def platform_end_call(cid: str, reason: str = "agent_decision") -> None:
    """
    Terminate the call via FreeSWITCH ESL through the NestJS platform API.
    Records how_call_ended in Redis session, then flushes session to PostgreSQL.

    Reason values (§9.3):
      silence_timeout  — 3-tier silence watchdog exhausted
      max_duration     — call exceeded agent_config.max_duration_value seconds
      handoff_complete — Option B internal handoff accepted by human agent
      agent_decision   — agent triggered end via end_call system tool
    """
    from session_manager import flush_session

    logger.info("[%s] platform_end_call — reason: %s", cid, reason)

    # Record how_call_ended before flush
    await _redis.hset(f"session:{cid}", "how_call_ended", reason)

    # Send hangup command via NestJS platform API → FreeSWITCH ESL
    session = await _redis.hgetall(f"session:{cid}")
    channel_uuid = session.get("channel_uuid", "")

    platform_api_url = "http://127.0.0.1:3001"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{platform_api_url}/api/telephony/hangup",
                json={
                    "cid": cid,
                    "channel_uuid": channel_uuid,
                    "reason": reason,
                },
            )
            if resp.status_code not in (200, 204):
                logger.warning("[%s] platform_end_call: hangup API returned %d",
                               cid, resp.status_code)
    except httpx.ConnectError:
        logger.warning("[%s] platform_end_call: platform API unreachable", cid)
    except Exception as exc:
        logger.error("[%s] platform_end_call: hangup API error: %s", cid, exc)

    # Flush session to PostgreSQL regardless of ESL success
    await flush_session(cid)

    # Cancel watchdog (no longer needed)
    await cancel_silence_watchdog(cid)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _llm_generate_silence_prompt(
    instruction: str,
    transcript: list[dict],
    agent_config: dict,
    cid: str,
) -> str:
    """
    Generate a silence re-prompt via LLM using the instruction as system context.
    Uses a focused prompt to keep latency low — no RAG.
    """
    from turn_loop import build_llm_messages, _llm_complete

    # Build a focused message list with silence instruction injected
    system = (
        f"{agent_config.get('system_prompt', '')}\n\n"
        f"SILENCE HANDLER INSTRUCTION: {instruction}"
    )
    messages = build_llm_messages(system_prompt=system, transcript=transcript)

    result = await _llm_complete(
        messages=messages,
        model=agent_config.get("llm_model", "gpt-4o-mini"),
        backup_model=agent_config.get("backup_llm_model"),
        temperature=0.7,
        max_tokens=80,  # Short re-prompts only
        cid=cid,
        tenant_id=agent_config.get("tenant_id", ""),
        partition=agent_config.get("partition", "cloud"),
    )
    return result.get("content", "").strip()


def _fallback_silence_message(tier: int) -> str:
    """Static fallback if LLM is unavailable during silence re-prompt."""
    fallbacks = {
        1: "Are you still there?",
        2: "Take your time — I'm here whenever you're ready.",
        3: "I'll be here if you need anything. Goodbye for now.",
    }
    return fallbacks.get(tier, "Are you still there?")
