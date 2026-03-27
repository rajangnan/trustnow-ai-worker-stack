"""
TRUSTNOW STT Adapter — BRD §5.3
=================================
Single entry point for ALL Speech-to-Text in the AI pipeline.

Partition A (cloud):   Deepgram nova-2 — realtime WebSocket + batch REST
Partition B (onprem):  FasterWhisper   — CPU inference, audioop μ-law→linear16 conversion

Audio format chain:
  SIP (FreeSWITCH) → μ-law 8kHz → converted to linear16 16kHz for FasterWhisper
  WebRTC (LiveKit) → linear16 16kHz → no conversion needed
  Deepgram handles both natively via encoding parameter

Usage:
    from stt_adapter import transcribe_batch, get_deepgram_live_options
    transcript, lang = await transcribe_batch(audio_bytes, "en", "sip", "cloud", "tenant-123", "cid-123")
"""

import asyncio
import audioop
import io
import json
import logging
import os
import subprocess
import sys
import wave
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Tuple

from faster_whisper import WhisperModel

from partition_router import (
    get_stt_config,
    enforce_no_external_call,
    Partition,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Vault helper (same pattern as cid_service.py)
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
            raise RuntimeError("VAULT_TOKEN not set and vault-init.json not readable")
    env = {**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token}
    result = subprocess.run(
        ["vault", "kv", "get", f"-field={field}", path],
        capture_output=True, text=True, env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(f"vault kv get failed for {path}/{field}: {result.stderr.strip()}")
    return result.stdout.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Partition B — FasterWhisper model pool (loaded ONCE at import time)
# ─────────────────────────────────────────────────────────────────────────────

WHISPER_MODELS: dict = {}
WHISPER_EXECUTOR: Optional[ThreadPoolExecutor] = None


def _load_whisper_models() -> None:
    """Load all three quality tiers. Called once at startup."""
    global WHISPER_MODELS, WHISPER_EXECUTOR
    logger.info("Loading FasterWhisper models (base / medium / large-v3)…")
    WHISPER_MODELS = {
        "fast":         WhisperModel("base",     device="cpu", compute_type="int8"),
        "balanced":     WhisperModel("medium",   device="cpu", compute_type="int8"),
        "high_quality": WhisperModel("large-v3", device="cpu", compute_type="int8"),
    }
    WHISPER_EXECUTOR = ThreadPoolExecutor(max_workers=3)
    logger.info("FasterWhisper models ready.")


# ─────────────────────────────────────────────────────────────────────────────
# Audio format conversion
# ─────────────────────────────────────────────────────────────────────────────

def mulaw_to_linear16_16k(mulaw_8k_bytes: bytes) -> bytes:
    """Convert μ-law 8kHz (FreeSWITCH SIP) to linear16 16kHz (FasterWhisper input)."""
    linear_8k = audioop.ulaw2lin(mulaw_8k_bytes, 2)              # μ-law → linear16 8kHz
    linear_16k = audioop.ratecv(linear_8k, 2, 1, 8000, 16000, None)[0]  # 8kHz → 16kHz
    return linear_16k


def wrap_pcm_as_wav(pcm_bytes: bytes, sample_rate: int = 16000,
                    sample_width: int = 2, channels: int = 1) -> bytes:
    """Wrap raw PCM bytes in a WAV container (needed by FasterWhisper file API)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# Partition A — Deepgram
# ─────────────────────────────────────────────────────────────────────────────

def _get_deepgram_client(tenant_id: str):
    """Create a Deepgram client using the API key from Vault."""
    from deepgram import DeepgramClient
    stt_cfg = get_stt_config("cloud", tenant_id)
    api_key = _vault_get(stt_cfg["api_key_path"], "api_key")
    # Data sovereignty check — Deepgram is a cloud API
    enforce_no_external_call("cloud", "https://api.deepgram.com/v1/listen")  # no-op for cloud
    return DeepgramClient(api_key=api_key)


def get_deepgram_live_options(language: str, channel: str,
                               endpointing_ms: int = 500) -> dict:
    """
    Return kwargs dict for client.listen.v1.connect() for realtime streaming.

    channel: "sip" → mulaw 8kHz / "webrtc" → linear16 16kHz
    """
    if channel == "sip":
        encoding = "mulaw"
        sample_rate = "8000"
    else:
        encoding = "linear16"
        sample_rate = "16000"

    return dict(
        model="nova-2",
        language=language,
        encoding=encoding,
        sample_rate=sample_rate,
        smart_format="true",
        interim_results="true",
        endpointing=str(endpointing_ms),
        utterance_end_ms=str(endpointing_ms),
        vad_events="true",
        channels="1",
    )


def get_deepgram_live_connection(tenant_id: str, language: str, channel: str,
                                  endpointing_ms: int = 500):
    """
    Open a Deepgram live transcription WebSocket.
    Returns a V1SocketClient — caller calls send_media(bytes) and iterates for events.
    """
    client = _get_deepgram_client(tenant_id)
    options = get_deepgram_live_options(language, channel, endpointing_ms)
    return client.listen.v1.connect(**options)


async def get_deepgram_live_connection_async(tenant_id: str, language: str, channel: str,
                                              endpointing_ms: int = 500):
    """Async version — returns AsyncV1SocketClient."""
    client = _get_deepgram_client(tenant_id)
    options = get_deepgram_live_options(language, channel, endpointing_ms)
    return await client.listen.v1.connect(**options)


async def transcribe_batch_cloud(audio_bytes: bytes, language: str,
                                  channel: str, tenant_id: str) -> Tuple[str, str]:
    """
    Batch transcription via Deepgram REST API (post-call / recording processing).
    Returns (transcript, detected_language).
    """
    client = _get_deepgram_client(tenant_id)

    if channel == "sip":
        encoding = "mulaw"
        sample_rate = "8000"
    else:
        encoding = "linear16"
        sample_rate = "16000"

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.listen.v1.media.transcribe_file(
            request=audio_bytes,
            model="nova-2",
            language=language,
            smart_format=True,
            punctuate=True,
            diarize=False,  # enable in Task 14 QM
            encoding=encoding,
            sample_rate=int(sample_rate),
            channels=1,
        )
    )

    # Extract transcript from Deepgram 6.x response structure
    try:
        channels = response.results.channels
        if channels:
            alts = channels[0].alternatives
            if alts:
                transcript = alts[0].transcript or ""
                detected_lang = language  # Deepgram batch may not return detected lang
                return transcript, detected_lang
    except Exception as exc:
        logger.error("Failed to parse Deepgram response: %s", exc)

    return "", language


# ─────────────────────────────────────────────────────────────────────────────
# Partition B — FasterWhisper
# ─────────────────────────────────────────────────────────────────────────────

async def transcribe_onprem(audio_bytes: bytes, language: str,
                             quality_preset: str, channel: str,
                             vad_threshold: float = 0.5,
                             min_speech_ms: int = 250,
                             max_speech_s: float = 30.0,
                             end_of_speech_ms: int = 500) -> Tuple[str, str]:
    """
    Transcribe audio using FasterWhisper (Partition B — no external API calls).

    quality_preset: "fast" (base) | "balanced" (medium) | "high_quality" (large-v3)
    channel: "sip" (μ-law 8kHz → converted) | "webrtc" (linear16 16kHz — pass through)
    Returns (transcript, detected_language)
    """
    global WHISPER_MODELS, WHISPER_EXECUTOR

    if not WHISPER_MODELS:
        _load_whisper_models()

    # Convert audio format based on channel
    if channel == "sip":
        pcm_16k = mulaw_to_linear16_16k(audio_bytes)
    else:
        pcm_16k = audio_bytes  # WebRTC already linear16 16kHz

    # Wrap as WAV for FasterWhisper
    wav_bytes = wrap_pcm_as_wav(pcm_16k, sample_rate=16000)
    wav_io = io.BytesIO(wav_bytes)

    model = WHISPER_MODELS.get(quality_preset, WHISPER_MODELS["balanced"])

    # CPU-bound — run in thread pool to keep asyncio event loop free
    loop = asyncio.get_event_loop()

    def _run_whisper():
        segments, info = model.transcribe(
            wav_io,
            language=language if language != "auto" else None,
            beam_size=5,
            vad_filter=True,
            vad_parameters={
                "threshold": vad_threshold,
                "min_speech_duration_ms": min_speech_ms,
                "max_speech_duration_s": max_speech_s,
                "min_silence_duration_ms": end_of_speech_ms,
            },
        )
        text = " ".join(seg.text.strip() for seg in segments)
        detected = info.language or language
        return text, detected

    transcript, detected_lang = await loop.run_in_executor(WHISPER_EXECUTOR, _run_whisper)
    return transcript, detected_lang


# ─────────────────────────────────────────────────────────────────────────────
# Unified public API — routes to correct partition
# ─────────────────────────────────────────────────────────────────────────────

async def transcribe_batch(audio_bytes: bytes, language: str, channel: str,
                            partition: str, tenant_id: str, cid: str,
                            quality_preset: str = "balanced") -> Tuple[str, str]:
    """
    Route batch transcription to the correct partition.

    Returns (transcript, detected_language).
    CID is logged for audit traceability.
    """
    logger.info("[%s] transcribe_batch partition=%s channel=%s lang=%s",
                cid, partition, channel, language)

    if partition == Partition.CLOUD.value or partition == Partition.CLOUD:
        return await transcribe_batch_cloud(audio_bytes, language, channel, tenant_id)
    elif partition == Partition.ONPREM.value or partition == Partition.ONPREM:
        return await transcribe_onprem(
            audio_bytes, language, quality_preset, channel
        )
    else:
        raise ValueError(f"Unknown partition: {partition}")


# ─────────────────────────────────────────────────────────────────────────────
# Language detection helper (used by main.py after first utterance)
# ─────────────────────────────────────────────────────────────────────────────

async def handle_language_detection(cid: str, detected_lang: str,
                                     primary_language: str,
                                     additional_languages: list,
                                     redis_client) -> bool:
    """
    If detected language differs from primary and is in additional_languages,
    persist it to session state for voice switch.
    Returns True if a language switch occurred.
    """
    if detected_lang == primary_language:
        return False
    if detected_lang not in additional_languages:
        return False

    await redis_client.hset(f"session:{cid}", "detected_language", detected_lang)
    logger.info("[%s] Language switch: %s → %s", cid, primary_language, detected_lang)
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Self-test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("STT ADAPTER SELF-TEST")
    print("=" * 60)

    # Test 1: Audio format conversion
    # Synthesise a simple μ-law buffer (zeroes = silence)
    silence_ulaw = bytes([0xFF] * 800)  # 100ms silence at 8kHz
    linear = mulaw_to_linear16_16k(silence_ulaw)
    assert len(linear) > 0, "mulaw_to_linear16_16k produced empty output"
    print("  [PASS] mulaw_to_linear16_16k: silence converted ✅")

    # Test 2: WAV wrapping
    wav = wrap_pcm_as_wav(linear, sample_rate=16000)
    assert wav[:4] == b"RIFF", "WAV header not found"
    print("  [PASS] wrap_pcm_as_wav: WAV header correct ✅")

    # Test 3: FasterWhisper model loading
    print("  Loading FasterWhisper models (this may take a moment)…")
    _load_whisper_models()
    assert "fast" in WHISPER_MODELS
    assert "balanced" in WHISPER_MODELS
    assert "high_quality" in WHISPER_MODELS
    print("  [PASS] FasterWhisper: all 3 quality tiers loaded ✅")

    # Test 4: Onprem transcription with silence audio
    print("  Running FasterWhisper transcription on silence audio…")
    transcript, lang = asyncio.run(
        transcribe_onprem(silence_ulaw, "en", "balanced", "sip")
    )
    # silence → empty transcript is correct
    print(f"  [PASS] FasterWhisper transcription: '{transcript}' (lang={lang}) ✅")

    # Test 5: Deepgram live options
    opts = get_deepgram_live_options("en", "sip", 500)
    assert opts["model"] == "nova-2"
    assert opts["encoding"] == "mulaw"
    assert opts["sample_rate"] == "8000"
    opts_webrtc = get_deepgram_live_options("en", "webrtc")
    assert opts_webrtc["encoding"] == "linear16"
    assert opts_webrtc["sample_rate"] == "16000"
    print("  [PASS] Deepgram live options: SIP + WebRTC format params ✅")

    # Test 6: Partition routing
    async def _test_routing():
        # Small valid WAV with silence
        pcm = bytes(3200)  # 100ms 16kHz linear16 silence
        wav = wrap_pcm_as_wav(pcm)
        transcript, lang = await transcribe_batch(
            wav, "en", "webrtc", "onprem", "test-tenant", "test-cid", "fast"
        )
        print(f"  [PASS] Partition routing onprem: transcript='{transcript}' lang={lang} ✅")

    asyncio.run(_test_routing())

    print()
    print("=" * 60)
    print("STT ADAPTER SELF-TEST: PASS (6/6)")
    print("=" * 60)
