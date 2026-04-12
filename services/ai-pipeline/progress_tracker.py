"""
TRUSTNOW AI Pipeline — Caller Progress Tracker — BRD §6.3 / Task 11 §11.7
===========================================================================
Manages the caller experience while the Master Worker runs background SME tasks.
Silence on hold erodes caller confidence — this module ensures regular, contextual
updates are delivered throughout the wait.

Progress update triggers (all configurable per agent):
  hold_begins         → TTS: "I'm just checking that for you now. Please bear with me."
  every 20s on hold   → TTS: Brief update, then MOH resumes
  sme_task_completed  → update Redis progress state for next message context
  hold > 60s          → more substantive update acknowledging delay
  hold > 120s         → escalating message, offer alternatives (wait / transfer / callback)

Update message generation:
  - LLM-generated via lightweight prompt (not full agent system prompt) to keep latency low
  - References specific task being worked on, not generic "working on your request"
  - Tone matches agent's configured voice personality

MOH control:
  - PUT    /api/telephony/moh_start  — start FreeSWITCH hold music
  - DELETE /api/telephony/moh_stop   — stop hold music (before TTS update)
  After TTS update: MOH resumes automatically

Redis keys:
  session:{cid}.progress           — Dict with current_task, completed_tasks, elapsed_s
  session:{cid}.hold_start         — epoch float of when hold started

Functions:
  start_hold()                     — place caller on MOH + begin progress tracking task
  stop_hold()                      — end hold, cancel progress task
  update_progress()                — called by Master Worker when SME completes a step
  _progress_loop()                 — asyncio task: deliver updates on schedule
  _get_update_message()            — LLM-generate contextual update
  _deliver_update()                — stop MOH → TTS → resume MOH
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.progress_tracker")

PLATFORM_API_URL = "http://127.0.0.1:3001"
LITELLM_URL = "http://127.0.0.1:4000"

# Update timing constants (seconds)
UPDATE_INTERVAL_S = 20
HOLD_THRESHOLD_SUBSTANTIVE_S = 60    # switch to more substantive message
HOLD_THRESHOLD_ESCALATE_S = 120      # escalate — offer alternatives

# Active progress tasks per CID
_active_tasks: Dict[str, asyncio.Task] = {}

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
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
# Public API
# ─────────────────────────────────────────────────────────────────────────────

async def start_hold(
    cid: str,
    tenant_id: str,
    channel_uuid: str,
    agent_config: Dict[str, Any],
    initial_task_description: str,
    internal_token: str = "",
) -> None:
    """
    Place caller on MOH and begin progress update loop.
    Call this when Master Worker starts background SME processing.
    """
    # Record hold start time
    await _redis.hset(f"session:{cid}", "hold_start", str(time.time()))
    await _redis.hset(f"session:{cid}", "on_hold", "1")

    # Initialise progress state
    await _redis.set(
        f"session:{cid}.progress",
        json.dumps({
            "current_task": initial_task_description,
            "completed_tasks": [],
            "pending_tasks": [],
            "elapsed_s": 0,
        }),
    )

    # Start MOH via telephony API
    await _start_moh(cid=cid, channel_uuid=channel_uuid, internal_token=internal_token)

    # Deliver initial hold message
    opening_message = await _get_opening_message(
        cid=cid,
        agent_config=agent_config,
        task_description=initial_task_description,
    )
    await _deliver_tts(
        cid=cid,
        channel_uuid=channel_uuid,
        text=opening_message,
        agent_config=agent_config,
        internal_token=internal_token,
        pause_moh=False,  # MOH not yet started, say message then start MOH
    )

    # Launch background progress loop
    if cid in _active_tasks and not _active_tasks[cid].done():
        _active_tasks[cid].cancel()

    task = asyncio.create_task(
        _progress_loop(
            cid=cid,
            tenant_id=tenant_id,
            channel_uuid=channel_uuid,
            agent_config=agent_config,
            internal_token=internal_token,
        )
    )
    _active_tasks[cid] = task
    logger.info("[%s] progress_tracker: hold started — task=%s", cid, initial_task_description)


async def stop_hold(
    cid: str,
    channel_uuid: str,
    internal_token: str = "",
) -> None:
    """
    End hold: cancel progress loop and stop MOH.
    Call before delivering the final response to the caller.
    """
    # Cancel progress task
    if cid in _active_tasks and not _active_tasks[cid].done():
        _active_tasks[cid].cancel()
        try:
            await _active_tasks[cid]
        except asyncio.CancelledError:
            pass
        del _active_tasks[cid]

    # Stop MOH
    await _stop_moh(cid=cid, channel_uuid=channel_uuid, internal_token=internal_token)
    await _redis.hset(f"session:{cid}", "on_hold", "0")
    logger.info("[%s] progress_tracker: hold stopped", cid)


async def update_progress(
    cid: str,
    completed_task: str,
    next_task: Optional[str] = None,
) -> None:
    """
    Called by Master Worker when a background SME step completes.
    Updates Redis progress state so next caller update message references
    what has actually been completed.
    """
    raw = await _redis.get(f"session:{cid}.progress")
    state = json.loads(raw.decode() if isinstance(raw, bytes) else raw) if raw else {}

    completed = state.get("completed_tasks", [])
    completed.append(completed_task)
    state["completed_tasks"] = completed
    state["current_task"] = next_task or state.get("current_task", "")

    await _redis.set(f"session:{cid}.progress", json.dumps(state))
    logger.debug("[%s] progress_tracker: completed=%s next=%s", cid, completed_task, next_task)


# ─────────────────────────────────────────────────────────────────────────────
# Progress loop — asyncio background task per CID
# ─────────────────────────────────────────────────────────────────────────────

async def _progress_loop(
    cid: str,
    tenant_id: str,
    channel_uuid: str,
    agent_config: Dict[str, Any],
    internal_token: str,
) -> None:
    """
    Background task that delivers contextual TTS updates to the caller while on hold.

    Schedule:
      t=0     : opening message already delivered by start_hold()
      t=20s   : brief update + MOH
      t=40s   : brief update + MOH
      t=60s   : substantive update (more explanation)
      t=80s   : brief update
      t=100s  : brief update
      t=120s  : escalating update — offer alternatives
      t=120s+ : repeat every 20s with escalating message
    """
    elapsed = 0.0
    escalation_offered = False

    try:
        while True:
            await asyncio.sleep(UPDATE_INTERVAL_S)
            elapsed += UPDATE_INTERVAL_S

            # Load current progress state
            raw = await _redis.get(f"session:{cid}.progress")
            progress = json.loads(raw.decode() if isinstance(raw, bytes) else raw) if raw else {}
            progress["elapsed_s"] = elapsed

            if elapsed >= HOLD_THRESHOLD_ESCALATE_S and not escalation_offered:
                escalation_offered = True
                update_type = "escalate"
            elif elapsed >= HOLD_THRESHOLD_SUBSTANTIVE_S and elapsed < HOLD_THRESHOLD_ESCALATE_S:
                update_type = "substantive"
            else:
                update_type = "brief"

            message = await _get_update_message(
                cid=cid,
                tenant_id=tenant_id,
                agent_config=agent_config,
                progress=progress,
                update_type=update_type,
            )

            await _deliver_update(
                cid=cid,
                channel_uuid=channel_uuid,
                text=message,
                agent_config=agent_config,
                internal_token=internal_token,
            )

            logger.info(
                "[%s] progress_tracker: update delivered type=%s elapsed=%.0fs",
                cid, update_type, elapsed,
            )

    except asyncio.CancelledError:
        logger.debug("[%s] progress_tracker: progress loop cancelled", cid)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Message generation — LLM-generated contextual updates
# ─────────────────────────────────────────────────────────────────────────────

async def _get_opening_message(
    cid: str,
    agent_config: Dict[str, Any],
    task_description: str,
) -> str:
    """Generate the initial hold message."""
    personality = agent_config.get("voice_personality", "professional and friendly")
    prompt = (
        f"You are a {personality} AI assistant. "
        f"You are about to put the caller on hold to {task_description}. "
        "Generate a single short sentence (max 20 words) informing the caller you're working on it and asking them to hold briefly. "
        "Do not use placeholder text. Sound natural and helpful."
    )
    return await _llm_generate_short(prompt, fallback="I'm just checking that for you now. Please bear with me for a moment.")


async def _get_update_message(
    cid: str,
    tenant_id: str,
    agent_config: Dict[str, Any],
    progress: Dict[str, Any],
    update_type: str,
) -> str:
    """Generate a contextual progress update message using LLM."""
    personality = agent_config.get("voice_personality", "professional and friendly")
    current_task = progress.get("current_task", "your request")
    completed = progress.get("completed_tasks", [])
    elapsed = progress.get("elapsed_s", 0)

    completed_summary = f" I've already completed: {', '.join(completed)}." if completed else ""

    if update_type == "brief":
        prompt = (
            f"You are a {personality} AI assistant. The caller is on hold while you work on: {current_task}.{completed_summary} "
            f"Generate a single reassuring sentence (max 15 words) saying you're still working on it. "
            "Do not repeat previous messages. Sound natural."
        )
        fallback = "Still working on this for you, just another moment."

    elif update_type == "substantive":
        prompt = (
            f"You are a {personality} AI assistant. The caller has been on hold for {int(elapsed)} seconds while you work on: {current_task}.{completed_summary} "
            "Generate two short sentences (max 30 words total) acknowledging the wait is a bit longer than expected "
            "and reassuring you haven't forgotten them. Sound genuine, not scripted."
        )
        fallback = "This is taking slightly longer than usual. I'm still working on it and haven't forgotten you."

    else:  # escalate
        prompt = (
            f"You are a {personality} AI assistant. The caller has been on hold for {int(elapsed)} seconds while you work on: {current_task}.{completed_summary} "
            "Generate two sentences (max 40 words total): "
            "1) Sincerely apologise for the extended wait. "
            "2) Ask them to choose: continue waiting, be transferred to a human agent, or receive a callback. "
            "Sound genuinely apologetic and offer real options."
        )
        fallback = (
            "I really appreciate your patience — this is taking a little longer than expected. "
            "Would you like to continue holding, be transferred to one of my colleagues, or would a callback be more convenient?"
        )

    return await _llm_generate_short(prompt, fallback=fallback)


async def _llm_generate_short(prompt: str, fallback: str) -> str:
    """Call LiteLLM to generate a short message. Returns fallback on any error."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{LITELLM_URL}/chat/completions",
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 80,
                    "temperature": 0.7,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Strip any quotation marks the LLM might add
                return content.strip('"').strip("'")
    except Exception as exc:
        logger.warning("progress_tracker: LLM message generation failed — %s (using fallback)", exc)
    return fallback


# ─────────────────────────────────────────────────────────────────────────────
# TTS delivery with MOH pause/resume
# ─────────────────────────────────────────────────────────────────────────────

async def _deliver_update(
    cid: str,
    channel_uuid: str,
    text: str,
    agent_config: Dict[str, Any],
    internal_token: str,
) -> None:
    """Stop MOH, deliver TTS update, restart MOH."""
    await _stop_moh(cid=cid, channel_uuid=channel_uuid, internal_token=internal_token)
    await asyncio.sleep(0.3)  # brief gap before speaking
    await _deliver_tts(
        cid=cid,
        channel_uuid=channel_uuid,
        text=text,
        agent_config=agent_config,
        internal_token=internal_token,
        pause_moh=True,
    )
    await asyncio.sleep(0.3)  # brief gap after speaking
    await _start_moh(cid=cid, channel_uuid=channel_uuid, internal_token=internal_token)


async def _deliver_tts(
    cid: str,
    channel_uuid: str,
    text: str,
    agent_config: Dict[str, Any],
    internal_token: str,
    pause_moh: bool = False,
) -> None:
    """Synthesize TTS and play to caller via Platform API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"{PLATFORM_API_URL}/api/telephony/play_audio",
                json={
                    "cid": cid,
                    "channel_uuid": channel_uuid,
                    "text": text,
                    "voice_id": agent_config.get("voice_id"),
                    "partition": agent_config.get("partition", "cloud"),
                },
                headers={"Authorization": f"Bearer {internal_token}"},
            )
    except Exception as exc:
        logger.warning("[%s] progress_tracker: TTS delivery failed — %s", cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# MOH control
# ─────────────────────────────────────────────────────────────────────────────

async def _start_moh(cid: str, channel_uuid: str, internal_token: str) -> None:
    """Start hold music via Platform API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.put(
                f"{PLATFORM_API_URL}/api/telephony/moh_start",
                json={"cid": cid, "channel_uuid": channel_uuid},
                headers={"Authorization": f"Bearer {internal_token}"},
            )
    except Exception as exc:
        logger.warning("[%s] progress_tracker: MOH start failed — %s (non-fatal)", cid, exc)


async def _stop_moh(cid: str, channel_uuid: str, internal_token: str) -> None:
    """Stop hold music via Platform API."""
    try:
        import json as _json
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.request(
                "DELETE",
                f"{PLATFORM_API_URL}/api/telephony/moh_stop",
                content=_json.dumps({"cid": cid, "channel_uuid": channel_uuid}),
                headers={
                    "Authorization": f"Bearer {internal_token}",
                    "Content-Type": "application/json",
                },
            )
    except Exception as exc:
        logger.warning("[%s] progress_tracker: MOH stop failed — %s (non-fatal)", cid, exc)
