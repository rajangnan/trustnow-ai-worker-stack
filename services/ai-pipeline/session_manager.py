"""
TRUSTNOW AI Pipeline — Session Manager — BRD §9.1
===================================================
Handles Path 1 (first message — TTS only, no LLM) and session lifecycle.

Functions:
  start_session()          — called on CHANNEL_ANSWER, plays first message
  append_transcript_turn() — appends turn to Redis transcript + publishes streaming update
  get_elapsed_seconds()    — seconds since session start
  set_listening_state()    — marks session as waiting for caller speech
  stream_audio_to_caller() — streams audio bytes to FreeSWITCH channel
  flush_session()          — persist session to PostgreSQL + record how_call_ended
  fire_post_call_webhook() — POST call summary to agent's post_call_webhook_url
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
import psycopg2
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.session_manager")

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None

# Import adapters lazily to avoid circular imports
import tts_adapter


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


# ─────────────────────────────────────────────────────────────────────────────
# Path 1 — Session start / first message (NO LLM CALL)
# §9.1 Path 1
# ─────────────────────────────────────────────────────────────────────────────

async def start_session(cid: str, agent_config: dict, channel_uuid: str) -> None:
    """
    Called immediately when FreeSWITCH CHANNEL_ANSWER fires.
    Writes session state to Redis, plays first_message via TTS (no LLM call),
    appends first turn to transcript, starts silence watchdog.
    """
    from silence_watchdog import start_silence_watchdog

    t_start = time.monotonic()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Write session state to Redis
    await _redis.hset(f"session:{cid}", mapping={
        "agent_id": agent_config["agent_id"],
        "tenant_id": agent_config["tenant_id"],
        "channel_uuid": channel_uuid,
        "partition": agent_config.get("partition", "cloud"),
        "language": agent_config.get("language", "en"),
        "started_at": now_iso,
        "turn_count": 0,
        "llm_cost_usd": 0.0,
        "llm_turns": 0,
        "transcript": json.dumps([]),
        "silence_tier": 0,
        "listening": 0,
        "how_call_ended": "",
    })
    await _redis.expire(f"session:{cid}", 7200)  # 2-hour max session
    logger.info("[%s] Session initialised in Redis", cid)

    # 2. Synthesise first_message via TTS — NO LLM CALL
    first_message = agent_config.get("first_message", "")
    if not first_message:
        # No first message configured — wait for caller to speak first
        logger.info("[%s] No first_message configured — entering listening state", cid)
        await set_listening_state(cid)
        return

    t_tts_start = time.monotonic()
    channel = agent_config.get("channel", "sip")
    output_format = "ulaw_8000" if channel == "sip" else "pcm_16000"

    try:
        audio_bytes = await tts_adapter.synthesise_full(
            text=first_message,
            voice_id=agent_config.get("voice_id"),
            piper_model=agent_config.get("piper_model"),
            partition=agent_config.get("partition", "cloud"),
            output_format=output_format,
            tenant_id=agent_config["tenant_id"],
            cid=cid,
            stability=agent_config.get("voice_stability", 0.65),
            similarity=agent_config.get("voice_similarity", 0.75),
            speed=agent_config.get("voice_speed", 1.0),
        )
    except Exception as exc:
        logger.error("[%s] First message TTS failed: %s", cid, exc)
        await set_listening_state(cid)
        return

    tts_latency_ms = int((time.monotonic() - t_tts_start) * 1000)
    logger.info("[%s] First message TTS latency: %dms", cid, tts_latency_ms)

    # 3. Stream audio to caller
    await stream_audio_to_caller(cid, channel_uuid, audio_bytes, agent_config)

    # 4. Append first message to transcript (no LLM or ASR latency for this turn)
    turn_start = time.monotonic() - t_start
    await append_transcript_turn(cid, {
        "role": "agent",
        "text": first_message,
        "timestamp_s": 0.0,
        "tts_latency_ms": tts_latency_ms,
        "llm_latency_ms": None,   # no LLM on first message — §9.5
        "asr_latency_ms": None,
        "interrupted": False,
    })

    # 5. Start silence watchdog — begins counting from end of first message
    await start_silence_watchdog(cid, agent_config)

    # 6. Enter listening state
    await set_listening_state(cid)
    logger.info("[%s] Session start complete — total elapsed: %.0fms",
                cid, (time.monotonic() - t_start) * 1000)


# ─────────────────────────────────────────────────────────────────────────────
# Transcript helpers — §9.5
# ─────────────────────────────────────────────────────────────────────────────

async def append_transcript_turn(cid: str, turn: dict) -> None:
    """
    Append a single turn to the session transcript in Redis.
    Validates the turn conforms to §9.5 schema then publishes to transcript:{cid}.
    """
    # Load current transcript
    raw = await _redis.hget(f"session:{cid}", "transcript")
    transcript: list = json.loads(raw) if raw else []

    transcript.append(turn)

    await _redis.hset(f"session:{cid}", "transcript", json.dumps(transcript))
    logger.debug("[%s] Transcript turn appended: role=%s", cid, turn.get("role"))

    # Publish real-time streaming update — §9.6
    session = await _redis.hgetall(f"session:{cid}")
    payload = {
        "event": "transcript_turn",
        "cid": cid,
        "turn": {
            **turn,
            "streaming": turn.get("role") == "agent",  # True while agent TTS in progress
        },
    }
    await _redis.publish(f"transcript:{cid}", json.dumps(payload))


async def publish_transcript_complete(cid: str, role: str, final_text: str) -> None:
    """
    Publish transcript_turn_complete event once TTS finishes streaming.
    Closes the '...' tail in the frontend widget — §9.6.
    """
    payload = {
        "event": "transcript_turn_complete",
        "cid": cid,
        "role": role,
        "final_text": final_text,
    }
    await _redis.publish(f"transcript:{cid}", json.dumps(payload))


# ─────────────────────────────────────────────────────────────────────────────
# Session state helpers
# ─────────────────────────────────────────────────────────────────────────────

async def get_elapsed_seconds(cid: str) -> float:
    """Return seconds elapsed since session started_at."""
    started_at_raw = await _redis.hget(f"session:{cid}", "started_at")
    if not started_at_raw:
        return 0.0
    try:
        started = datetime.fromisoformat(started_at_raw)
        now = datetime.now(timezone.utc)
        return (now - started).total_seconds()
    except Exception:
        return 0.0


async def set_listening_state(cid: str) -> None:
    """Mark session as actively listening for caller speech."""
    await _redis.hset(f"session:{cid}", "listening", 1)


async def set_speaking_state(cid: str) -> None:
    """Mark session as agent speaking (TTS playing)."""
    await _redis.hset(f"session:{cid}", "listening", 0)


# ─────────────────────────────────────────────────────────────────────────────
# Audio streaming — §9.1 Path 1
# ─────────────────────────────────────────────────────────────────────────────

async def stream_audio_to_caller(
    cid: str,
    channel_uuid: str,
    audio_bytes: bytes,
    agent_config: dict,
) -> None:
    """
    Stream synthesised audio to the caller via the platform API.
    The platform API proxies the audio to FreeSWITCH (SIP) or LiveKit (WebRTC).

    POST /api/telephony/play_audio with audio bytes and channel_uuid.
    Non-blocking — fire-and-forget for first message path.
    """
    platform_api_url = "http://127.0.0.1:3001"
    channel = agent_config.get("channel", "sip")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{platform_api_url}/api/telephony/play_audio",
                content=audio_bytes,
                headers={
                    "Content-Type": "audio/mulaw" if channel == "sip" else "audio/pcm",
                    "X-CID": cid,
                    "X-Channel-UUID": channel_uuid,
                },
            )
            if resp.status_code not in (200, 204):
                logger.warning("[%s] play_audio returned %d: %s",
                               cid, resp.status_code, resp.text[:200])
    except httpx.ConnectError:
        logger.warning("[%s] play_audio: platform API unreachable (SIP bridge not yet wired)", cid)
    except Exception as exc:
        logger.error("[%s] stream_audio_to_caller error: %s", cid, exc)


async def stream_audio_chunk_to_caller(cid: str, chunk: bytes) -> None:
    """Stream a single audio chunk during TTS streaming (turn_loop usage)."""
    session = await _redis.hgetall(f"session:{cid}")
    channel_uuid = session.get("channel_uuid", "")
    channel = session.get("channel", "sip")
    platform_api_url = "http://127.0.0.1:3001"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{platform_api_url}/api/telephony/play_audio_chunk",
                content=chunk,
                headers={
                    "Content-Type": "audio/mulaw" if channel == "sip" else "audio/pcm",
                    "X-CID": cid,
                    "X-Channel-UUID": channel_uuid,
                },
            )
    except Exception:
        pass  # Audio chunk loss is non-fatal — caller hears a gap


async def stop_audio_stream(cid: str) -> None:
    """Stop active TTS audio playback on the caller's channel (barge-in)."""
    session = await _redis.hgetall(f"session:{cid}")
    channel_uuid = session.get("channel_uuid", "")
    platform_api_url = "http://127.0.0.1:3001"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{platform_api_url}/api/telephony/stop_audio",
                json={"channel_uuid": channel_uuid, "cid": cid},
            )
    except Exception as exc:
        logger.warning("[%s] stop_audio_stream error: %s", cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Session flush — persist to PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────

async def flush_session(cid: str) -> None:
    """
    Flush completed session from Redis to PostgreSQL.
    Called on CHANNEL_HANGUP or after platform_end_call().
    Fires post-call webhook if configured.
    """
    session = await _redis.hgetall(f"session:{cid}")
    if not session:
        logger.warning("[%s] flush_session: session not found in Redis", cid)
        return

    now = datetime.now(timezone.utc)
    started_at_raw = session.get("started_at", now.isoformat())
    try:
        started = datetime.fromisoformat(started_at_raw)
        duration_s = int((now - started).total_seconds())
    except Exception:
        duration_s = 0

    transcript = json.loads(session.get("transcript", "[]"))
    turn_count = int(session.get("turn_count", 0))
    llm_cost = float(session.get("llm_cost_usd", 0.0))
    how_call_ended = session.get("how_call_ended", "client_ended_call")
    language = session.get("language", "en")

    # Determine call_successful (set by evaluation engine; default True if no criteria)
    call_successful = session.get("call_successful", "1") == "1"

    try:
        conn = psycopg2.connect(**_pg_conn_params)
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE conversations SET
                        status            = 'completed',
                        ended_at          = %s,
                        duration_s        = %s,
                        transcript_json   = %s::jsonb,
                        turn_count        = %s,
                        llm_cost_usd      = %s,
                        how_call_ended    = %s,
                        language_detected = %s,
                        call_successful   = %s
                    WHERE conversation_id = %s
                """, (
                    now,
                    duration_s,
                    json.dumps(transcript),
                    turn_count,
                    llm_cost,
                    how_call_ended,
                    language,
                    call_successful,
                    cid,
                ))
        conn.close()
        logger.info("[%s] Session flushed to PostgreSQL — duration=%ds turns=%d",
                    cid, duration_s, turn_count)
    except Exception as exc:
        logger.error("[%s] PostgreSQL flush error: %s", cid, exc)

    # Load agent config for webhook
    agent_id = session.get("agent_id", "")
    tenant_id = session.get("tenant_id", "")
    evaluation_results = json.loads(session.get("evaluation_results", "{}"))
    data_collection_results = json.loads(session.get("data_collection_results", "{}"))

    # Fire post-call webhook if configured
    await fire_post_call_webhook(
        agent_id=agent_id,
        tenant_id=tenant_id,
        conversation={
            "conversation_id": cid,
            "duration_s": duration_s,
            "transcript_json": transcript,
            "turn_count": turn_count,
            "language_detected": language,
            "call_successful": call_successful,
            "how_call_ended": how_call_ended,
            "total_cost": llm_cost,
            "handoff_occurred": session.get("handoff_occurred", "0") == "1",
            "evaluation_results": evaluation_results,
            "data_collection_results": data_collection_results,
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Post-call webhook — §9.6 (Post-Call Webhook)
# ─────────────────────────────────────────────────────────────────────────────

async def fire_post_call_webhook(
    agent_id: str,
    tenant_id: str,
    conversation: dict,
) -> None:
    """
    Fire POST to agent.post_call_webhook_url after session flush.
    Non-fatal — webhook failure is logged but does not affect session state.
    §9.6 Post-Call Webhook.
    """
    platform_api_url = "http://127.0.0.1:3001"

    # Fetch agent config to get post_call_webhook_url
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{platform_api_url}/api/agents/{agent_id}",
                headers={"X-Tenant-Id": tenant_id, "X-Internal": "1"},
            )
            if resp.status_code != 200:
                return
            agent = resp.json()
    except Exception as exc:
        logger.debug("[%s] Could not fetch agent for webhook: %s", conversation.get("conversation_id"), exc)
        return

    webhook_url = agent.get("post_call_webhook_url") or agent.get("postCallWebhookUrl")
    if not webhook_url:
        return

    payload = {
        "conversation_id": conversation["conversation_id"],
        "agent_id": agent_id,
        "tenant_id": tenant_id,
        "duration_s": conversation["duration_s"],
        "transcript": conversation["transcript_json"],
        "turn_count": conversation["turn_count"],
        "language_detected": conversation["language_detected"],
        "call_successful": conversation["call_successful"],
        "how_call_ended": conversation["how_call_ended"],
        "total_cost": float(conversation["total_cost"]),
        "handoff_occurred": conversation["handoff_occurred"],
        "evaluation_results": conversation["evaluation_results"],
        "data_collection_results": conversation["data_collection_results"],
    }

    cid = conversation["conversation_id"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            logger.info("[%s] Post-call webhook fired → %s: %d", cid, webhook_url, resp.status_code)
    except Exception as exc:
        logger.warning("[%s] Post-call webhook failed (non-fatal): %s", cid, exc)
