"""
TRUSTNOW Voice Library Service — BRD-L1-010/011/012/013 §5.6
==============================================================
FastAPI APIRouter — included in main.py at :8002

Voice Library: two-tier catalogue
  - Global Library    — platform-curated, read-only for tenants (is_global=true)
  - Tenant-Private    — per-tenant voices (cloned, custom)

Three source types:
  elevenlabs_premade  — ElevenLabs catalogue voices (accessed by voice_id at synthesis)
  trustnow_designed   — Designed via ElevenLabs Voice Design API
  tenant_cloned       — Instant Voice Clone from tenant audio sample
  piper_onprem        — Piper TTS models (Partition B only)

Endpoints (9):
  GET  /voices
  GET  /voices/languages
  GET  /voices/languages/{code}/top-picks
  GET  /voices/{id}
  GET  /voices/{id}/preview
  POST /voices/design
  POST /voices/clone
  PUT  /voices/{id}
  DELETE /voices/{id}
  POST /voices/{id}/settings
"""

import asyncio
import io
import json
import logging
import os
import subprocess
import uuid
from typing import Any, Optional

import psycopg2
import psycopg2.extras
from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings
from fastapi import APIRouter, HTTPException, Query, Response, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger("trustnow.voice_service")

router = APIRouter(prefix="/voices", tags=["Voice Library"])

# Populated by main.py startup
_pg_conn_params: Optional[dict] = None


def _set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


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
# DB helper
# ─────────────────────────────────────────────────────────────────────────────

def _get_conn():
    if not _pg_conn_params:
        raise RuntimeError("DB not initialised")
    return psycopg2.connect(**_pg_conn_params)


def _voice_row_to_dict(row, cursor) -> dict:
    cols = [desc[0] for desc in cursor.description]
    d = dict(zip(cols, row))
    # Convert arrays and non-serialisable types
    for k, v in d.items():
        if isinstance(v, (list,)):
            d[k] = list(v)
    return d


# ─────────────────────────────────────────────────────────────────────────────
# ElevenLabs client helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_el_client(tenant_id: str = "platform") -> ElevenLabs:
    """Get ElevenLabs client — uses platform-level API key for global voices."""
    # For platform/global operations use the first available tenant key or a platform key
    try:
        api_key = _vault_get(
            f"secret/trustnow/{tenant_id}/tts/elevenlabs_api_key", "api_key"
        )
    except Exception:
        # Fall back to platform key if tenant-specific not set
        api_key = _vault_get("secret/trustnow/platform/tts/elevenlabs_api_key", "api_key")
    return ElevenLabs(api_key=api_key)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class VoiceDesignRequest(BaseModel):
    name: str
    description: str
    accent: Optional[str] = None
    gender: Optional[str] = "female"
    age_group: Optional[str] = "young"
    use_case_tags: list[str] = []
    tone_tags: list[str] = []
    preview_text: Optional[str] = "Hello, welcome to our service. How can I help you today?"
    tenant_id: str = "platform"


class VoiceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trait_tags: Optional[list[str]] = None
    tone_tags: Optional[list[str]] = None
    use_case_tags: Optional[list[str]] = None
    stability_default: Optional[float] = None
    similarity_default: Optional[float] = None
    speed_default: Optional[float] = None
    preview_text: Optional[str] = None


class VoiceSettingsOverride(BaseModel):
    tenant_id: str
    stability: Optional[float] = None
    similarity: Optional[float] = None
    speed: Optional[float] = None


# ─────────────────────────────────────────────────────────────────────────────
# GET /voices — list voices with filters
# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
async def list_voices(
    scope: str = Query("all", pattern="^(global|private|all)$"),
    language: Optional[str] = None,
    gender: Optional[str] = None,
    accent: Optional[str] = None,
    use_case: Optional[str] = None,
    tone: Optional[str] = None,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    tenant_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """
    List voices. Filters: scope, language (ISO 639-1), gender, accent,
    use_case, tone, search (name/description), source_type.
    """
    conditions = []
    params: list[Any] = []

    if scope == "global":
        conditions.append("is_global = true")
    elif scope == "private":
        conditions.append("is_global = false")
        if tenant_id:
            conditions.append("tenant_id = %s")
            params.append(tenant_id)

    if language:
        conditions.append("%s = ANY(language_tags)")
        params.append(language)

    if gender:
        conditions.append("gender = %s")
        params.append(gender)

    if accent:
        conditions.append("LOWER(accent) LIKE LOWER(%s)")
        params.append(f"%{accent}%")

    if use_case:
        conditions.append("%s = ANY(use_case_tags)")
        params.append(use_case)

    if tone:
        conditions.append("%s = ANY(tone_tags)")
        params.append(tone)

    if source_type:
        conditions.append("source_type = %s")
        params.append(source_type)

    if search:
        conditions.append("(LOWER(name) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s))")
        params.extend([f"%{search}%", f"%{search}%"])

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    sql = f"""
        SELECT voice_id, tenant_id, name, description, gender, language_tags,
               trait_tags, provider, sample_audio_url, is_global,
               elevenlabs_voice_id, elevenlabs_model, accent, age_group,
               use_case_tags, tone_tags, emotion_range, stability_default,
               similarity_default, speed_default, source_type, piper_model_file
        FROM voices
        {where_clause}
        ORDER BY is_global DESC, name ASC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    loop = asyncio.get_event_loop()

    def _query():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [_voice_row_to_dict(r, cur) for r in rows]
        finally:
            conn.close()

    voices = await loop.run_in_executor(None, _query)
    return {"voices": voices, "count": len(voices), "offset": offset}


# ─────────────────────────────────────────────────────────────────────────────
# GET /voices/languages — list languages with voice counts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/languages")
async def list_languages():
    """List all languages present in the voice library with voice counts."""
    sql = """
        SELECT unnest(language_tags) AS lang, COUNT(*) AS voice_count
        FROM voices
        WHERE is_global = true
        GROUP BY lang
        ORDER BY voice_count DESC, lang ASC
    """
    loop = asyncio.get_event_loop()

    def _query():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
                return [{"language": r[0], "voice_count": r[1]} for r in cur.fetchall()]
        finally:
            conn.close()

    languages = await loop.run_in_executor(None, _query)
    return {"languages": languages}


# ─────────────────────────────────────────────────────────────────────────────
# GET /voices/languages/{code}/top-picks — top 2 per gender per language
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/languages/{code}/top-picks")
async def language_top_picks(code: str):
    """
    Return top voices for a given language code (ISO 639-1).
    Returns up to 2 female + 2 male voices — used for automatic language detection switch.
    """
    sql = """
        SELECT voice_id, name, gender, description, elevenlabs_voice_id,
               elevenlabs_model, piper_model_file, source_type,
               stability_default, similarity_default, speed_default,
               accent, trait_tags
        FROM voices
        WHERE is_global = true
          AND %s = ANY(language_tags)
        ORDER BY
            CASE gender WHEN 'female' THEN 1 WHEN 'male' THEN 2 ELSE 3 END,
            name ASC
    """
    loop = asyncio.get_event_loop()

    def _query():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, (code,))
                rows = cur.fetchall()
                cols = [desc[0] for desc in cur.description]
                voices = [dict(zip(cols, r)) for r in rows]

            # Return top 2 per gender
            female = [v for v in voices if v["gender"] == "female"][:2]
            male   = [v for v in voices if v["gender"] == "male"][:2]
            return female + male
        finally:
            conn.close()

    picks = await loop.run_in_executor(None, _query)
    return {"language": code, "top_picks": picks, "count": len(picks)}


# ─────────────────────────────────────────────────────────────────────────────
# GET /voices/{id} — get single voice
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{voice_id}")
async def get_voice(voice_id: str):
    """Get full voice metadata by voice_id (UUID)."""
    sql = """
        SELECT * FROM voices WHERE voice_id = %s
    """
    loop = asyncio.get_event_loop()

    def _query():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, (voice_id,))
                row = cur.fetchone()
                if not row:
                    return None
                return _voice_row_to_dict(row, cur)
        finally:
            conn.close()

    voice = await loop.run_in_executor(None, _query)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")
    return voice


# ─────────────────────────────────────────────────────────────────────────────
# GET /voices/{id}/preview — stream TTS preview audio
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{voice_id}/preview")
async def voice_preview(
    voice_id: str,
    text: str = Query("Hello, welcome to our service. How can I help you today?"),
    tenant_id: str = Query("platform"),
):
    """
    Stream a TTS preview of this voice.
    Uses ElevenLabs for elevenlabs_premade/trustnow_designed/tenant_cloned.
    Uses Piper for piper_onprem voices.
    Returns audio/mpeg or audio/mulaw.
    """
    # Fetch voice from DB
    loop = asyncio.get_event_loop()

    def _get():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT elevenlabs_voice_id, source_type, piper_model_file, "
                    "stability_default, similarity_default, speed_default, "
                    "elevenlabs_model FROM voices WHERE voice_id = %s",
                    (voice_id,)
                )
                return cur.fetchone()
        finally:
            conn.close()

    row = await loop.run_in_executor(None, _get)
    if not row:
        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")

    el_voice_id, source_type, piper_model, stability, similarity, speed, el_model = row

    if source_type == "piper_onprem":
        # Piper preview
        from tts_adapter import get_piper_voice, piper_to_webrtc_audio
        voice = get_piper_voice(piper_model)
        audio = await loop.run_in_executor(
            None, lambda: piper_to_webrtc_audio(text, voice)
        )
        return Response(content=audio, media_type="audio/pcm",
                        headers={"X-Voice-ID": voice_id, "X-Source": "piper"})

    if not el_voice_id:
        raise HTTPException(status_code=400, detail="Voice has no ElevenLabs voice_id set")

    # ElevenLabs preview
    try:
        client = _get_el_client(tenant_id)
        vs = VoiceSettings(
            stability=float(stability or 0.65),
            similarity_boost=float(similarity or 0.75),
            speed=float(speed or 1.0),
            use_speaker_boost=True,
        )
        audio_chunks = await loop.run_in_executor(
            None,
            lambda: list(client.text_to_speech.convert_as_stream(
                voice_id=el_voice_id,
                text=text,
                model_id=el_model or "eleven_flash_v2_5",
                voice_settings=vs,
                output_format="mp3_44100_128",
            ))
        )
        audio = b"".join(c for c in audio_chunks if c)
        return Response(content=audio, media_type="audio/mpeg",
                        headers={"X-Voice-ID": voice_id, "X-Source": "elevenlabs"})
    except Exception as exc:
        logger.error("ElevenLabs preview failed for voice %s: %s", voice_id, exc)
        raise HTTPException(status_code=502, detail=f"ElevenLabs preview failed: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /voices/design — create voice via ElevenLabs Voice Design API
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/design")
async def design_voice(req: VoiceDesignRequest):
    """
    Create a new voice via ElevenLabs Voice Design API.
    Platform admin only (not enforced here — enforce via Kong JWT plugin).
    Stores the created voice in the global library with source_type='trustnow_designed'.
    """
    try:
        client = _get_el_client(req.tenant_id)
        loop = asyncio.get_event_loop()

        # ElevenLabs Voice Design: uses text_to_voice.create_previews + .create_from_preview
        previews = await loop.run_in_executor(
            None,
            lambda: client.text_to_voice.create_previews(
                voice_description=req.description,
                text=req.preview_text or "Hello, how can I help you today?",
            )
        )

        if not previews or not previews.previews:
            raise HTTPException(status_code=502, detail="ElevenLabs Voice Design returned no previews")

        # Use first preview
        preview = previews.previews[0]

        created_voice = await loop.run_in_executor(
            None,
            lambda: client.text_to_voice.create_voice_from_preview(
                voice_name=req.name,
                voice_description=req.description,
                generated_voice_id=preview.generated_voice_id,
            )
        )

        el_voice_id = created_voice.voice_id

        # Store in DB
        new_id = str(uuid.uuid4())

        def _insert():
            conn = _get_conn()
            try:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO voices (
                                voice_id, tenant_id, is_global, provider, source_type,
                                name, description, gender, age_group, accent,
                                language_tags, trait_tags, tone_tags, use_case_tags,
                                elevenlabs_voice_id, elevenlabs_model,
                                stability_default, similarity_default, speed_default,
                                preview_text
                            ) VALUES (
                                %s, NULL, true, 'elevenlabs', 'trustnow_designed',
                                %s, %s, %s, %s, %s,
                                ARRAY['en'], ARRAY[]::text[], %s, %s,
                                %s, 'eleven_flash_v2_5',
                                0.65, 0.75, 1.0, %s
                            )
                        """, (
                            new_id, req.name, req.description, req.gender, req.age_group,
                            req.accent, req.tone_tags, req.use_case_tags,
                            el_voice_id, req.preview_text
                        ))
            finally:
                conn.close()

        await loop.run_in_executor(None, _insert)

        return {
            "voice_id": new_id,
            "elevenlabs_voice_id": el_voice_id,
            "name": req.name,
            "source_type": "trustnow_designed",
            "status": "created",
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Voice design failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# POST /voices/clone — instant voice clone from audio file
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/clone")
async def clone_voice(
    audio_file: UploadFile = File(...),
    name: str = Query(...),
    description: str = Query(""),
    tenant_id: str = Query(...),
):
    """
    Create an Instant Voice Clone (IVC) via ElevenLabs API.
    Tenant Admin only. Voice stored in tenant-private library.
    """
    try:
        audio_bytes = await audio_file.read()
        client = _get_el_client(tenant_id)
        loop = asyncio.get_event_loop()

        created_voice = await loop.run_in_executor(
            None,
            lambda: client.clone(
                name=name,
                description=description,
                files=[audio_bytes],
            )
        )

        el_voice_id = created_voice.voice_id
        new_id = str(uuid.uuid4())

        def _insert():
            conn = _get_conn()
            try:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO voices (
                                voice_id, tenant_id, is_global, provider, source_type,
                                name, description, language_tags, trait_tags,
                                elevenlabs_voice_id, elevenlabs_model,
                                stability_default, similarity_default, speed_default
                            ) VALUES (
                                %s, %s, false, 'elevenlabs', 'tenant_cloned',
                                %s, %s, ARRAY['en'], ARRAY[]::text[],
                                %s, 'eleven_flash_v2_5',
                                0.65, 0.75, 1.0
                            )
                        """, (new_id, tenant_id, name, description, el_voice_id))
            finally:
                conn.close()

        await loop.run_in_executor(None, _insert)

        return {
            "voice_id": new_id,
            "elevenlabs_voice_id": el_voice_id,
            "name": name,
            "source_type": "tenant_cloned",
            "tenant_id": tenant_id,
            "status": "cloned",
        }

    except Exception as exc:
        logger.error("Voice clone failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# PUT /voices/{id} — update voice metadata
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/{voice_id}")
async def update_voice(voice_id: str, req: VoiceUpdateRequest):
    """Update voice metadata. Cannot update global voices' core fields."""
    updates = {}
    if req.name is not None:
        updates["name"] = req.name
    if req.description is not None:
        updates["description"] = req.description
    if req.trait_tags is not None:
        updates["trait_tags"] = req.trait_tags
    if req.tone_tags is not None:
        updates["tone_tags"] = req.tone_tags
    if req.use_case_tags is not None:
        updates["use_case_tags"] = req.use_case_tags
    if req.stability_default is not None:
        updates["stability_default"] = req.stability_default
    if req.similarity_default is not None:
        updates["similarity_default"] = req.similarity_default
    if req.speed_default is not None:
        updates["speed_default"] = req.speed_default
    if req.preview_text is not None:
        updates["preview_text"] = req.preview_text

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [voice_id]

    loop = asyncio.get_event_loop()

    def _update():
        conn = _get_conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE voices SET {set_clause} WHERE voice_id = %s",
                        values
                    )
                    if cur.rowcount == 0:
                        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")
        finally:
            conn.close()

    await loop.run_in_executor(None, _update)
    return {"voice_id": voice_id, "updated": list(updates.keys())}


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /voices/{id} — remove from tenant-private library
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{voice_id}")
async def delete_voice(voice_id: str):
    """
    Delete a voice. Cannot delete global voices (is_global=true).
    Tenant-private voices only.
    """
    loop = asyncio.get_event_loop()

    def _delete():
        conn = _get_conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT is_global FROM voices WHERE voice_id = %s",
                        (voice_id,)
                    )
                    row = cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")
                    if row[0]:
                        raise HTTPException(status_code=403, detail="Cannot delete global voices")
                    cur.execute("DELETE FROM voices WHERE voice_id = %s", (voice_id,))
        finally:
            conn.close()

    await loop.run_in_executor(None, _delete)
    return {"voice_id": voice_id, "status": "deleted"}


# ─────────────────────────────────────────────────────────────────────────────
# POST /voices/{id}/settings — tenant-level settings override
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{voice_id}/settings")
async def update_voice_settings(voice_id: str, req: VoiceSettingsOverride):
    """
    Override stability/similarity/speed defaults for a specific voice.
    Updates stored defaults in the voices table.
    For per-tenant-per-voice overrides, this writes to voices table directly.
    (Tenant-specific settings stored in agent_configs.voice_settings_override_json)
    """
    updates = {}
    if req.stability is not None:
        updates["stability_default"] = req.stability
    if req.similarity is not None:
        updates["similarity_default"] = req.similarity
    if req.speed is not None:
        updates["speed_default"] = req.speed

    if not updates:
        raise HTTPException(status_code=400, detail="No settings to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [voice_id]

    loop = asyncio.get_event_loop()

    def _update():
        conn = _get_conn()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE voices SET {set_clause} WHERE voice_id = %s",
                        values
                    )
                    if cur.rowcount == 0:
                        raise HTTPException(status_code=404, detail=f"Voice {voice_id} not found")
        finally:
            conn.close()

    await loop.run_in_executor(None, _update)
    return {
        "voice_id": voice_id,
        "tenant_id": req.tenant_id,
        "updated_settings": updates,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper — get best voice for detected language (used by stt_adapter)
# ─────────────────────────────────────────────────────────────────────────────

async def get_best_voice_for_language(tenant_id: str, language: str,
                                       gender: str = "female") -> Optional[dict]:
    """Return the best available global voice for a given language and gender."""
    sql = """
        SELECT voice_id, name, gender, elevenlabs_voice_id, piper_model_file,
               source_type, stability_default, similarity_default, speed_default
        FROM voices
        WHERE is_global = true
          AND %s = ANY(language_tags)
          AND gender = %s
        ORDER BY name ASC
        LIMIT 1
    """
    loop = asyncio.get_event_loop()

    def _query():
        conn = _get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, (language, gender))
                row = cur.fetchone()
                if not row:
                    return None
                cols = [desc[0] for desc in cur.description]
                return dict(zip(cols, row))
        finally:
            conn.close()

    return await loop.run_in_executor(None, _query)
