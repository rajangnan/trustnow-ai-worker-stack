"""
TRUSTNOW AI Pipeline — Turn Loop — BRD §9.1 Path 2
====================================================
Implements the full per-turn conversation pipeline:
  STT → RAG (optional) → LLM → TTS → audio output

Barge-in: subscribes to Redis interrupt:{cid} pub/sub channel per turn.
Speculative turn: starts LLM generation when VAD confidence > 0.7 (§9.9).

Functions:
  handle_user_turn()        — main entry — called on VAD end-of-speech
  barge_in_listener()       — checks interrupt:{cid} channel, honours interrupt mode
  build_llm_messages()      — build OpenAI-format message array from transcript
  play_agent_turn()         — TTS synthesis + barge-in-aware streaming
  execute_platform_handoff()— triggers handoff via handoff_service.py
"""

import asyncio
import json
import logging
import time
from typing import Any, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.turn_loop")

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None

# Import adapters lazily to avoid circular imports at module level
import tts_adapter
import stt_adapter
import rag_pipeline


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


# ─────────────────────────────────────────────────────────────────────────────
# Path 2 — Main user turn handler (STT → RAG → LLM → TTS)
# §9.1 Path 2
# ─────────────────────────────────────────────────────────────────────────────

async def handle_user_turn(cid: str, audio_bytes: bytes, agent_config: dict) -> None:
    """
    Called when VAD confirms end-of-speech for the caller.
    Implements: STT → RAG (optional) → LLM → TTS → audio output.
    Records latency for each stage.
    Publishes real-time transcript updates to Redis pub/sub for frontend streaming.
    """
    from session_manager import (
        append_transcript_turn,
        publish_transcript_complete,
        get_elapsed_seconds,
        set_listening_state,
        stream_audio_chunk_to_caller,
        stop_audio_stream,
    )
    from silence_watchdog import reset_silence_watchdog, start_silence_watchdog

    session = await _redis.hgetall(f"session:{cid}")
    turn_start_ts = await get_elapsed_seconds(cid)

    # ── STAGE 1: ASR (Speech-to-Text) ────────────────────────────────────────
    t_asr_start = time.monotonic()
    try:
        transcript_text = await stt_adapter.transcribe_batch(
            audio=audio_bytes,
            language=agent_config.get("language", "en"),
            channel=agent_config.get("channel", "sip"),
            partition=agent_config.get("partition", "cloud"),
            tenant_id=agent_config["tenant_id"],
            cid=cid,
            quality_preset=agent_config.get("latency_preset", "balanced"),
        )
    except Exception as exc:
        logger.error("[%s] STT error: %s", cid, exc)
        await reset_silence_watchdog(cid, agent_config)
        return

    asr_latency_ms = int((time.monotonic() - t_asr_start) * 1000)
    logger.info("[%s] STT: %dms — '%s'", cid, asr_latency_ms, transcript_text[:80])

    if not transcript_text.strip():
        # Empty transcript — treat as silence, reset watchdog
        await reset_silence_watchdog(cid, agent_config)
        return

    # Append user turn immediately (real-time frontend streaming)
    await append_transcript_turn(cid, {
        "role": "user",
        "text": transcript_text,
        "timestamp_s": turn_start_ts,
        "asr_latency_ms": asr_latency_ms,
        "llm_latency_ms": None,
        "tts_latency_ms": None,
        "interrupted": False,
    })
    # Real-time user transcript publish — §9.6
    await _redis.publish(f"transcript:{cid}", json.dumps({
        "event": "transcript_turn",
        "cid": cid,
        "turn": {
            "role": "user",
            "text": transcript_text,
            "timestamp_s": turn_start_ts,
            "asr_latency_ms": asr_latency_ms,
            "streaming": False,
            "interrupted": False,
        },
    }))

    # Reset silence watchdog — user spoke, restart the timer
    await reset_silence_watchdog(cid, agent_config)
    await _redis.hset(f"session:{cid}", "silence_tier", 0)

    # ── STAGE 2: RAG Retrieval (optional) ────────────────────────────────────
    rag_context = ""
    if agent_config.get("rag_enabled") and agent_config.get("kb_docs_attached"):
        try:
            rag_results = await rag_pipeline.retrieve(
                query=transcript_text,
                tenant_id=agent_config["tenant_id"],
                agent_id=agent_config["agent_id"],
                partition=agent_config.get("partition", "cloud"),
                top_k=int(agent_config.get("rag_top_k", 5)),
            )
            if rag_results:
                rag_context = "\n\n".join(
                    r.get("content", "") for r in rag_results if r.get("content")
                )
        except Exception as exc:
            logger.warning("[%s] RAG retrieval failed (non-fatal): %s", cid, exc)

    # ── STAGE 3: LLM Completion ───────────────────────────────────────────────
    raw_transcript = await _redis.hget(f"session:{cid}", "transcript")
    full_transcript = json.loads(raw_transcript) if raw_transcript else []
    messages = build_llm_messages(
        system_prompt=agent_config.get("system_prompt", ""),
        transcript=full_transcript,
        rag_context=rag_context,
    )

    t_llm_start = time.monotonic()
    try:
        llm_response = await _llm_complete(
            messages=messages,
            model=agent_config.get("llm_model", "gpt-4o-mini"),
            backup_model=agent_config.get("backup_llm_model"),
            temperature=float(agent_config.get("llm_temperature", 0.7)),
            max_tokens=int(agent_config.get("llm_max_tokens", 512)),
            cid=cid,
            tenant_id=agent_config["tenant_id"],
            partition=agent_config.get("partition", "cloud"),
        )
    except Exception as exc:
        logger.error("[%s] LLM error: %s", cid, exc)
        await reset_silence_watchdog(cid, agent_config)
        return

    llm_latency_ms = int((time.monotonic() - t_llm_start) * 1000)
    agent_turn_text = llm_response.get("content", "")
    logger.info("[%s] LLM: %dms — '%s'", cid, llm_latency_ms, agent_turn_text[:80])

    # Record LLM cost
    llm_cost = llm_response.get("cost_usd", 0.0)
    await _redis.hincrbyfloat(f"session:{cid}", "llm_cost_usd", llm_cost)
    await _redis.hincrby(f"session:{cid}", "llm_turns", 1)

    # Check handoff conditions BEFORE generating TTS (§7.12)
    from handoff_service import check_handoff_conditions
    updated_transcript = full_transcript + [{"caller": transcript_text}]
    handoff_trigger = check_handoff_conditions(updated_transcript, agent_config, session)
    if handoff_trigger:
        await execute_platform_handoff(cid, session, agent_config, handoff_trigger, full_transcript)
        return

    # ── STAGE 4: TTS Synthesis + Streaming with Barge-In ─────────────────────
    audio_completed = await play_agent_turn(
        cid=cid,
        text=agent_turn_text,
        agent_config=agent_config,
        llm_latency_ms=llm_latency_ms,
        turn_start_ts=turn_start_ts,
    )

    # ── STAGE 5: Back to listening ────────────────────────────────────────────
    await _redis.hincrby(f"session:{cid}", "turn_count", 1)
    if audio_completed:
        await start_silence_watchdog(cid, agent_config)
        await set_listening_state(cid)
    # If interrupted — caller is already speaking, new turn in progress


# ─────────────────────────────────────────────────────────────────────────────
# TTS streaming with barge-in — §9.1 Path 2 Stage 4
# ─────────────────────────────────────────────────────────────────────────────

async def play_agent_turn(
    cid: str,
    text: str,
    agent_config: dict,
    llm_latency_ms: Optional[int] = None,
    turn_start_ts: float = 0.0,
) -> bool:
    """
    Synthesise text via TTS and stream audio to caller with per-chunk barge-in checks.
    Returns True if audio completed uninterrupted, False if barge-in occurred.
    Used by both handle_user_turn() (§9.1 Path 2) and silence_watchdog (re-prompts).
    """
    from session_manager import (
        append_transcript_turn,
        publish_transcript_complete,
        stream_audio_chunk_to_caller,
        stop_audio_stream,
    )

    channel = agent_config.get("channel", "sip")
    output_format = "ulaw_8000" if channel == "sip" else "pcm_16000"

    t_tts_start = time.monotonic()

    # Subscribe to barge-in interrupt channel BEFORE starting TTS stream — §9.2
    pubsub = _redis.pubsub()
    await pubsub.subscribe(f"interrupt:{cid}")

    audio_completed = True
    try:
        async for audio_chunk in tts_adapter.synthesise_streaming(
            text=text,
            voice_id=agent_config.get("voice_id"),
            piper_model=agent_config.get("piper_model"),
            partition=agent_config.get("partition", "cloud"),
            output_format=output_format,
            tenant_id=agent_config["tenant_id"],
            cid=cid,
            stability=float(agent_config.get("voice_stability", 0.65)),
            similarity=float(agent_config.get("voice_similarity", 0.75)),
            speed=float(agent_config.get("voice_speed", 1.0)),
        ):
            # Check for barge-in interrupt signal on every chunk — §9.2
            should_interrupt = await _check_barge_in(pubsub, agent_config)
            if should_interrupt:
                logger.info("[%s] Barge-in detected — stopping TTS stream", cid)
                await stop_audio_stream(cid)
                audio_completed = False
                break

            await stream_audio_chunk_to_caller(cid, audio_chunk)

    except Exception as exc:
        logger.error("[%s] TTS streaming error: %s", cid, exc)
        audio_completed = False
    finally:
        await pubsub.unsubscribe(f"interrupt:{cid}")
        await pubsub.aclose()

    tts_latency_ms = int((time.monotonic() - t_tts_start) * 1000)
    logger.info("[%s] TTS: %dms — completed=%s", cid, tts_latency_ms, audio_completed)

    # Append agent turn to transcript — §9.5
    agent_turn = {
        "role": "agent",
        "text": text if audio_completed else text + " [interrupted]",
        "timestamp_s": turn_start_ts,
        "llm_latency_ms": llm_latency_ms,
        "tts_latency_ms": tts_latency_ms,
        "asr_latency_ms": None,
        "interrupted": not audio_completed,
    }
    await append_transcript_turn(cid, agent_turn)

    # Publish agent turn to Redis for real-time frontend streaming — §9.6
    await _redis.publish(f"transcript:{cid}", json.dumps({
        "event": "transcript_turn",
        "cid": cid,
        "turn": {
            "role": "agent",
            "text": agent_turn["text"],
            "timestamp_s": turn_start_ts,
            "llm_latency_ms": llm_latency_ms,
            "tts_latency_ms": tts_latency_ms,
            "streaming": not audio_completed,
            "interrupted": not audio_completed,
        },
    }))

    if audio_completed:
        await publish_transcript_complete(cid, "agent", text)

    return audio_completed


# ─────────────────────────────────────────────────────────────────────────────
# Barge-in listener — §9.2
# ─────────────────────────────────────────────────────────────────────────────

async def _check_barge_in(pubsub: aioredis.client.PubSub, agent_config: dict) -> bool:
    """
    Non-blocking poll of the interrupt pubsub channel.
    Returns True if barge-in should stop TTS, False otherwise.
    Honours interrupt_sensitivity: 'allow' | 'smart' | 'none'
    """
    interrupt_mode = agent_config.get("interrupt_sensitivity", "allow")

    if interrupt_mode == "none":
        return False

    try:
        message = await asyncio.wait_for(pubsub.get_message(ignore_subscribe_messages=True), timeout=0.02)
    except asyncio.TimeoutError:
        return False
    except Exception:
        return False

    if not message or message.get("type") != "message":
        return False

    if interrupt_mode == "smart":
        # Only interrupt if speech duration >= 300ms — §9.2
        try:
            payload = json.loads(message["data"])
            return int(payload.get("speech_duration_ms", 0)) >= 300
        except Exception:
            return False

    # "allow" mode — any speech = interrupt
    return True


# ─────────────────────────────────────────────────────────────────────────────
# LLM message builder — §9.1 Path 2 Stage 3
# ─────────────────────────────────────────────────────────────────────────────

def build_llm_messages(
    system_prompt: str,
    transcript: list[dict],
    rag_context: str = "",
) -> list[dict]:
    """
    Build OpenAI-format message array from session transcript.
    Injects RAG context into the system prompt when present.
    First message (role=agent, llm_latency_ms=None) is the agent greeting — skip from LLM context.
    """
    system_content = system_prompt
    if rag_context:
        system_content += (
            "\n\nRelevant context from knowledge base:\n"
            "---\n"
            f"{rag_context}\n"
            "---\n"
            "Use the above context to answer accurately. If the context doesn't cover the question, say so honestly."
        )

    messages: list[dict] = [{"role": "system", "content": system_content}]

    for turn in transcript:
        role = turn.get("role")
        text = turn.get("text", "")
        # Skip the first agent message (greeting) — no LLM call was used for it
        if role == "agent" and turn.get("llm_latency_ms") is None and not turn.get("interrupted"):
            # First message — include as assistant context so LLM knows what was said
            messages.append({"role": "assistant", "content": text})
            continue
        if role == "agent":
            messages.append({"role": "assistant", "content": text})
        elif role == "user":
            messages.append({"role": "user", "content": text})
        # Ignore other roles

    return messages


# ─────────────────────────────────────────────────────────────────────────────
# LLM completion helper (internal — calls LiteLLM proxy :4000)
# ─────────────────────────────────────────────────────────────────────────────

async def _llm_complete(
    messages: list[dict],
    model: str,
    cid: str,
    tenant_id: str,
    partition: str = "cloud",
    backup_model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> dict:
    """
    Call LiteLLM proxy at :4000 with fallback to backup_model if primary fails.
    Returns dict with 'content' and 'cost_usd'.
    """
    litellm_url = "http://127.0.0.1:4000"

    async def _call(m: str) -> dict:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{litellm_url}/v1/chat/completions",
                json={
                    "model": m,
                    "messages": messages,
                    "max_tokens": max_tokens if max_tokens > 0 else None,
                    "temperature": temperature,
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "content": data["choices"][0]["message"]["content"],
                "model": data.get("model", m),
                "cost_usd": float(data.get("_response_cost", 0.0)),
                "usage": data.get("usage", {}),
            }

    try:
        return await _call(model)
    except Exception as primary_exc:
        logger.warning("[%s] Primary LLM '%s' failed: %s", cid, model, primary_exc)
        if backup_model:
            logger.info("[%s] Falling back to backup LLM '%s'", cid, backup_model)
            return await _call(backup_model)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Handoff execution — §7.12
# ─────────────────────────────────────────────────────────────────────────────

async def execute_platform_handoff(
    cid: str,
    session: dict,
    agent_config: dict,
    trigger: str,
    transcript: list[dict],
) -> None:
    """
    Trigger a human handoff via handoff_service.py.
    Plays a handoff announcement message first, then executes the transfer.
    Records handoff_occurred in Redis session.
    """
    from handoff_service import execute_handoff

    # Play handoff announcement via TTS
    handoff_message = agent_config.get(
        "handoff_message",
        "I'm connecting you with a specialist who can better assist you. Please hold.",
    )
    await play_agent_turn(
        cid=cid,
        text=handoff_message,
        agent_config=agent_config,
    )

    # Mark handoff in session
    await _redis.hset(f"session:{cid}", mapping={
        "handoff_occurred": "1",
        "how_call_ended": "handoff_complete",
    })

    # Execute handoff
    try:
        await execute_handoff(
            cid=cid,
            channel_uuid=session.get("channel_uuid", ""),
            handoff_type=agent_config.get("handoff_type", "B"),
            transcript=transcript,
            context={
                "agent_id": agent_config.get("agent_id"),
                "tenant_id": agent_config.get("tenant_id"),
                "language": agent_config.get("language", "en"),
            },
            target=agent_config.get("handoff_sip_target"),
            trigger=trigger,
            jwt_token=session.get("jwt_token", ""),
        )
        logger.info("[%s] Handoff executed — trigger: %s", cid, trigger)
    except Exception as exc:
        logger.error("[%s] Handoff execution failed: %s", cid, exc)
