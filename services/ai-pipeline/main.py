"""
TRUSTNOW AI Pipeline — FastAPI Service — BRD §5.5
===================================================
Runs on :8002 (GAP-001 FIXED — NOT :8000 which is Kong)
4 uvicorn workers for concurrent session handling.

Endpoints:
  POST /stt/transcribe         — Deepgram A / FasterWhisper B
  POST /llm/complete           — LiteLLM proxy :4000, records cost
  POST /tts/synthesise         — ElevenLabs A / Piper B (StreamingResponse)
  POST /rag/retrieve           — Qdrant kb_{tenant_id}_{agent_id}
  GET  /session/{cid}/state    — Redis session read
  POST /session/{cid}/state    — Redis session write
  POST /session/{cid}/end      — flush Redis → PostgreSQL, Kafka call_ended
  GET  /health                 — health check
"""

import asyncio
import json
import logging
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Optional

import httpx
import psycopg2
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from partition_router import (
    Partition,
    get_partition_config,
    validate_llm_model_for_partition,
    enforce_no_external_call,
    get_stt_config,
    get_tts_config,
    get_embedding_config,
)
from stt_adapter import transcribe_batch
from tts_adapter import (
    synthesise_piper_full,
    synthesise_elevenlabs_full,
    get_piper_voice,
)
from kafka_producers import ConversationEventProducer
from voice_service import router as voices_router, _set_pg_conn_params
import session_manager
import turn_loop
import silence_watchdog
import evaluation_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("trustnow.ai_pipeline")

# ─────────────────────────────────────────────────────────────────────────────
# Vault helper
# ─────────────────────────────────────────────────────────────────────────────

def _vault_get(path: str, field: str) -> str:
    vault_addr = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
    vault_token = os.environ.get("VAULT_TOKEN", "")
    if not vault_token:
        init_file = "/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json"
        try:
            with open(init_file) as f:
                vault_token = json.load(f)["root_token"]
        except Exception:
            raise RuntimeError("VAULT_TOKEN not set")
    env = {**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token}
    result = subprocess.run(
        ["vault", "kv", "get", f"-field={field}", path],
        capture_output=True, text=True, env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(f"vault kv get failed for {path}/{field}: {result.stderr.strip()}")
    return result.stdout.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Application startup — initialise shared resources
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="TRUSTNOW AI Pipeline",
    version="1.0.0",
    description="BRD-L1 AI processing — STT, LLM, TTS, RAG with partition routing",
)
app.include_router(voices_router)

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None


@app.on_event("startup")
async def startup():
    global _redis, _pg_conn_params

    redis_pass = _vault_get("secret/trustnow/platform/redis", "password")
    _redis = aioredis.from_url(
        f"redis://127.0.0.1:6379",
        password=redis_pass,
        decode_responses=True,
    )
    await _redis.ping()
    logger.info("Redis connected")

    pg_pass = _vault_get("secret/trustnow/platform/postgres", "app_password")
    _pg_conn_params = {
        "host": "127.0.0.1",
        "port": 5433,  # PgBouncer
        "dbname": "trustnow_platform",
        "user": "trustnow_app",
        "password": pg_pass,
    }
    logger.info("PostgreSQL connection params loaded (via PgBouncer :5433)")
    _set_pg_conn_params(_pg_conn_params)

    # Inject shared resources into Task 9 turn-loop modules
    session_manager.set_redis(_redis)
    session_manager.set_pg_conn_params(_pg_conn_params)
    turn_loop.set_redis(_redis)
    turn_loop.set_pg_conn_params(_pg_conn_params)
    silence_watchdog.set_redis(_redis)
    silence_watchdog.set_pg_conn_params(_pg_conn_params)
    evaluation_service.set_redis(_redis)
    evaluation_service.set_pg_conn_params(_pg_conn_params)
    logger.info("Turn-loop modules initialised (session_manager, turn_loop, silence_watchdog, evaluation_service)")


@app.on_event("shutdown")
async def shutdown():
    if _redis:
        await _redis.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helper: resolve agent config (Redis cache → PostgreSQL fallback)
# ─────────────────────────────────────────────────────────────────────────────

async def get_agent_config(cid: str) -> dict:
    """
    Load agent configuration for the session.
    Reads from Redis session hash. Falls back to DB if not found.
    """
    session = await _redis.hgetall(f"session:{cid}")
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {cid} not found in Redis")
    return session


# ─────────────────────────────────────────────────────────────────────────────
# Request / response models
# ─────────────────────────────────────────────────────────────────────────────

class STTRequest(BaseModel):
    cid: str
    audio_b64: str                      # base64-encoded audio bytes
    language: str = "en"
    channel: str = "sip"               # "sip" | "webrtc"
    quality_preset: str = "balanced"   # "fast" | "balanced" | "high_quality"


class STTResponse(BaseModel):
    cid: str
    transcript: str
    detected_language: str


class LLMRequest(BaseModel):
    cid: str
    messages: list[dict]               # OpenAI-format message array
    model: str = "gpt-4o-mini"
    tenant_id: str
    partition: str = "cloud"
    max_tokens: int = 512
    temperature: float = 0.7


class LLMResponse(BaseModel):
    cid: str
    content: str
    model: str
    cost_usd: float
    usage: dict


class TTSRequest(BaseModel):
    cid: str
    text: str
    voice_id: Optional[str] = None     # ElevenLabs voice_id or None
    piper_model: Optional[str] = None  # Piper model filename (Partition B)
    channel: str = "sip"
    tenant_id: str
    partition: str = "cloud"
    stability: float = 0.65
    similarity: float = 0.75
    speed: float = 1.0


class RAGRequest(BaseModel):
    cid: str
    query: str
    tenant_id: str
    agent_id: str
    partition: str = "cloud"
    top_k: int = 5


class RAGResponse(BaseModel):
    cid: str
    results: list[dict]


class SessionStateUpdate(BaseModel):
    fields: dict[str, str]


class SessionStartRequest(BaseModel):
    """
    Payload sent by NestJS TelephonyModule on CHANNEL_ANSWER ESL event.
    Triggers Path 1 (first message TTS) and starts the silence watchdog.
    """
    channel_uuid: str                    # FreeSWITCH Unique-ID
    agent_id: str
    tenant_id: str
    partition: str = "cloud"             # "cloud" | "onprem"
    channel: str = "sip"                 # "sip" | "webrtc"
    language: str = "en"
    first_message: str = ""
    system_prompt: str = ""
    voice_id: Optional[str] = None       # ElevenLabs voice_id (Partition A)
    piper_model: Optional[str] = None    # Piper model (Partition B)
    voice_stability: float = 0.65
    voice_similarity: float = 0.75
    voice_speed: float = 1.0
    rag_enabled: bool = False
    kb_docs_attached: bool = False
    rag_top_k: int = 5
    llm_model: str = "gpt-4o-mini"
    backup_llm_model: Optional[str] = None
    llm_temperature: float = 0.7
    llm_max_tokens: int = 512
    latency_preset: str = "balanced"     # "fast" | "balanced" | "high_quality"
    interrupt_sensitivity: str = "allow" # "allow" | "smart" | "none"
    handoff_type: str = "B"
    handoff_sip_target: Optional[str] = None
    handoff_message: Optional[str] = None
    max_duration_value: int = 1800
    evaluation_criteria_json: list = Field(default_factory=list)
    data_collection_json: list = Field(default_factory=list)
    post_call_webhook_url: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "trustnow-ai-pipeline", "port": 8002}


@app.post("/stt/transcribe", response_model=STTResponse)
async def stt_transcribe(req: STTRequest):
    """Route STT to Deepgram (Partition A) or FasterWhisper (Partition B)."""
    import base64
    logger.info("[%s] POST /stt/transcribe partition from session", req.cid)

    session = await _redis.hgetall(f"session:{req.cid}")
    partition = session.get("partition", req.channel and "cloud")
    tenant_id = session.get("tenant_id", "unknown")

    audio_bytes = base64.b64decode(req.audio_b64)

    transcript, detected_lang = await transcribe_batch(
        audio_bytes,
        req.language,
        req.channel,
        partition,
        tenant_id,
        req.cid,
        req.quality_preset,
    )

    # Persist detected language to session
    if detected_lang != req.language:
        await _redis.hset(f"session:{req.cid}", "detected_language", detected_lang)

    return STTResponse(cid=req.cid, transcript=transcript, detected_language=detected_lang)


@app.post("/llm/complete", response_model=LLMResponse)
async def llm_complete(req: LLMRequest):
    """Route LLM call through LiteLLM proxy :4000. Record cost to Redis session."""
    logger.info("[%s] POST /llm/complete model=%s partition=%s", req.cid, req.model, req.partition)

    # Validate model is allowed for this partition
    if not validate_llm_model_for_partition(req.partition, req.model):
        config = get_partition_config(req.partition)
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.model}' not allowed for partition '{req.partition}'. "
                   f"Allowed: {config.llm_allowed_models}"
        )

    # Enforce data sovereignty for Partition B
    litellm_url = "http://127.0.0.1:4000"
    if req.partition == Partition.ONPREM.value:
        enforce_no_external_call(req.partition, litellm_url)  # passes — localhost

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{litellm_url}/v1/chat/completions",
            json={
                "model": req.model,
                "messages": req.messages,
                "max_tokens": req.max_tokens,
                "temperature": req.temperature,
            },
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code,
                                detail=f"LiteLLM error: {resp.text[:500]}")
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    model_used = data.get("model", req.model)

    # Record cost to Redis session (BRD-L5-MIS-003)
    # LiteLLM returns cost in response for supported models
    cost_usd = float(data.get("_response_cost", 0.0))
    await _redis.hincrbyfloat(f"session:{req.cid}", "llm_cost_usd", cost_usd)
    await _redis.hincrby(f"session:{req.cid}", "llm_turns", 1)

    return LLMResponse(
        cid=req.cid,
        content=content,
        model=model_used,
        cost_usd=cost_usd,
        usage=usage,
    )


@app.post("/tts/synthesise")
async def tts_synthesise(req: TTSRequest):
    """
    Synthesise text to audio.
    Returns StreamingResponse with audio bytes.
    Content-Type: audio/mulaw (SIP) or audio/pcm (WebRTC)
    """
    logger.info("[%s] POST /tts/synthesise partition=%s channel=%s", req.cid, req.partition, req.channel)

    content_type = "audio/mulaw" if req.channel == "sip" else "audio/pcm"

    if req.partition == Partition.CLOUD.value or req.partition == Partition.CLOUD:
        if not req.voice_id:
            raise HTTPException(status_code=400, detail="voice_id required for Partition A TTS")
        audio = await synthesise_elevenlabs_full(
            req.text, req.voice_id, req.channel, req.tenant_id, req.cid,
            stability=req.stability, similarity=req.similarity, speed=req.speed,
        )
    else:
        if not req.piper_model:
            raise HTTPException(status_code=400, detail="piper_model required for Partition B TTS")
        voice = get_piper_voice(req.piper_model)
        audio = await synthesise_piper_full(req.text, voice, req.channel)

    return StreamingResponse(
        iter([audio]),
        media_type=content_type,
        headers={"X-CID": req.cid, "X-Audio-Channel": req.channel},
    )


@app.post("/rag/retrieve", response_model=RAGResponse)
async def rag_retrieve(req: RAGRequest):
    """
    Retrieve relevant documents from Qdrant for the given query.
    Routes embedding to OpenAI (Partition A) or sentence-transformers (Partition B).
    """
    logger.info("[%s] POST /rag/retrieve partition=%s", req.cid, req.partition)
    try:
        from rag_pipeline import retrieve
        results = await retrieve(
            query=req.query,
            tenant_id=req.tenant_id,
            agent_id=req.agent_id,
            partition=req.partition,
            top_k=req.top_k,
        )
        return RAGResponse(cid=req.cid, results=results)
    except ImportError:
        raise HTTPException(status_code=503, detail="RAG pipeline not yet initialised")
    except Exception as exc:
        logger.error("[%s] RAG retrieve error: %s", req.cid, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/session/{cid}/state")
async def session_state_get(cid: str):
    """Read full session state from Redis."""
    state = await _redis.hgetall(f"session:{cid}")
    if not state:
        raise HTTPException(status_code=404, detail=f"Session {cid} not found")
    return {"cid": cid, "state": state}


@app.post("/session/{cid}/state")
async def session_state_post(cid: str, body: SessionStateUpdate):
    """Update session state fields in Redis (HSET — merge, not replace)."""
    if not body.fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    await _redis.hset(f"session:{cid}", mapping=body.fields)
    return {"cid": cid, "updated": list(body.fields.keys())}


@app.post("/session/{cid}/start")
async def session_start(cid: str, body: SessionStartRequest):
    """
    Session start — called by NestJS TelephonyModule on CHANNEL_ANSWER ESL event.
    Executes Path 1: synthesises first_message via TTS (no LLM), starts silence watchdog.
    Returns immediately; audio streaming and watchdog run as background tasks.
    """
    logger.info("[%s] POST /session/start — agent=%s tenant=%s channel=%s",
                cid, body.agent_id, body.tenant_id, body.channel)

    # Build agent_config dict from request body
    agent_config = body.model_dump()
    agent_config["agent_id"] = body.agent_id
    agent_config["tenant_id"] = body.tenant_id

    # Fire-and-forget — start_session runs as background task so this endpoint
    # returns quickly while audio synthesis happens asynchronously
    asyncio.create_task(
        session_manager.start_session(
            cid=cid,
            agent_config=agent_config,
            channel_uuid=body.channel_uuid,
        ),
        name=f"start_session:{cid}",
    )

    return {"cid": cid, "status": "starting", "channel_uuid": body.channel_uuid}


@app.post("/session/{cid}/end")
async def session_end(cid: str):
    """
    End a session:
    1. Read full session from Redis
    2. Flush to PostgreSQL conversations table
    3. Publish call_ended Kafka event
    4. Delete Redis session key
    """
    logger.info("[%s] POST /session/end", cid)

    session = await _redis.hgetall(f"session:{cid}")
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {cid} not found")

    now = datetime.now(timezone.utc)

    # Flush to PostgreSQL
    try:
        conn = psycopg2.connect(**_pg_conn_params)
        with conn:
            with conn.cursor() as cur:
                handle_time_s = float(session.get("handle_time_s", 0))
                llm_cost_usd = float(session.get("llm_cost_usd", 0))
                llm_turns = int(session.get("llm_turns", 0))

                cur.execute("""
                    UPDATE conversations
                    SET ended_at = %s,
                        handle_time_s = %s,
                        llm_cost_usd = %s,
                        llm_turns = %s
                    WHERE conversation_id = %s
                """, (now, handle_time_s, llm_cost_usd, llm_turns, cid))
        conn.close()
        logger.info("[%s] Session flushed to PostgreSQL", cid)
    except Exception as exc:
        logger.error("[%s] PostgreSQL flush error: %s", cid, exc)
        raise HTTPException(status_code=500, detail=f"DB flush failed: {exc}")

    # Publish call_ended Kafka event
    try:
        producer = ConversationEventProducer()
        producer.send_event(
            cid=cid,
            tenant_id=session.get("tenant_id", "unknown"),
            event_type="call_ended",
            payload={
                "handle_time_s": float(session.get("handle_time_s", 0)),
                "llm_turns": int(session.get("llm_turns", 0)),
                "llm_cost_usd": float(session.get("llm_cost_usd", 0)),
                "channel": session.get("channel", "unknown"),
                "partition": session.get("partition", "unknown"),
            }
        )
        producer.flush()
        logger.info("[%s] call_ended event published to Kafka", cid)
    except Exception as exc:
        logger.warning("[%s] Kafka publish failed (non-fatal): %s", cid, exc)

    # Delete Redis session
    await _redis.delete(f"session:{cid}")

    return {"cid": cid, "status": "ended", "ended_at": now.isoformat()}


# ─────────────────────────────────────────────────────────────────────────────
# Entry point (for direct execution — systemd uses uvicorn CLI)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8002,
        workers=1,  # single worker when run directly; systemd service uses 4
        log_level="info",
        reload=False,
    )
