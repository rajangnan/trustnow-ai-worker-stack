"""
TRUSTNOW TTS Adapter — BRD §5.4
=================================
Single entry point for ALL Text-to-Speech in the AI pipeline.

Partition A (cloud):   ElevenLabs SDK 1.59.0 — streaming, eleven_flash_v2_5
Partition B (onprem):  Piper TTS — sentence-chunked, audioop format conversion

Audio format chain (Partition A):
  ElevenLabs → ulaw_8000 native → FreeSWITCH SIP (no transcode)
  ElevenLabs → pcm_16000 native → LiveKit WebRTC

Audio format chain (Partition B):
  Piper → native PCM WAV (22050 Hz) → audioop resample → 8kHz μ-law (SIP) or 16kHz PCM (WebRTC)

Usage:
    from tts_adapter import synthesise_streaming, synthesise_piper_chunked

    # Partition A — async generator yielding audio bytes
    async for chunk in synthesise_streaming(text_stream, voice_id, "sip", tenant_id, cid):
        send_to_freeswitch(chunk)

    # Partition B — async generator yielding audio bytes
    async for chunk in synthesise_piper_chunked(text_stream, voice, "sip", cid, redis):
        send_to_freeswitch(chunk)
"""

import asyncio
import audioop
import io
import json
import logging
import os
import re
import subprocess
import wave
from concurrent.futures import ThreadPoolExecutor
from typing import AsyncIterator, Optional

from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings
from piper import PiperVoice

from partition_router import (
    get_tts_config,
    enforce_no_external_call,
    Partition,
)

logger = logging.getLogger(__name__)

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
# Piper voice model cache (loaded on first use per model file)
# ─────────────────────────────────────────────────────────────────────────────

_PIPER_VOICES: dict = {}
_PIPER_EXECUTOR = ThreadPoolExecutor(max_workers=4)

PIPER_VOICES_DIR = "/opt/trustnowailabs/trustnow-ai-worker-stack/data/piper-voices"


def get_piper_voice(model_file: str) -> PiperVoice:
    """Load (and cache) a Piper voice model by filename."""
    if model_file not in _PIPER_VOICES:
        model_path = f"{PIPER_VOICES_DIR}/{model_file}"
        logger.info("Loading Piper voice: %s", model_file)
        _PIPER_VOICES[model_file] = PiperVoice.load(model_path)
        logger.info("Piper voice loaded: %s", model_file)
    return _PIPER_VOICES[model_file]


# ─────────────────────────────────────────────────────────────────────────────
# Partition B — Piper audio format conversion
# ─────────────────────────────────────────────────────────────────────────────

def piper_synth_to_pcm(text: str, voice: PiperVoice) -> tuple[bytes, int]:
    """
    Synthesise text with Piper, return (raw PCM bytes, sample_rate).
    Reads actual sample_rate from WAV header — Piper models vary (22050 Hz typical).
    """
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        voice.synthesize_wav(text, wav_file)
    wav_buffer.seek(0)
    with wave.open(wav_buffer, "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        sample_width = wav_file.getsampwidth()
        n_channels = wav_file.getnchannels()
        pcm = wav_file.readframes(wav_file.getnframes())
    return pcm, sample_rate


def piper_to_sip_audio(text: str, voice: PiperVoice) -> bytes:
    """Synthesise with Piper → convert to μ-law 8kHz for FreeSWITCH SIP."""
    pcm_native, src_rate = piper_synth_to_pcm(text, voice)
    # Resample to 8kHz
    pcm_8k = audioop.ratecv(pcm_native, 2, 1, src_rate, 8000, None)[0]
    # Convert linear16 → μ-law
    mulaw_8k = audioop.lin2ulaw(pcm_8k, 2)
    return mulaw_8k


def piper_to_webrtc_audio(text: str, voice: PiperVoice) -> bytes:
    """Synthesise with Piper → resample to linear16 16kHz for LiveKit WebRTC."""
    pcm_native, src_rate = piper_synth_to_pcm(text, voice)
    if src_rate == 16000:
        return pcm_native
    pcm_16k = audioop.ratecv(pcm_native, 2, 1, src_rate, 16000, None)[0]
    return pcm_16k


# ─────────────────────────────────────────────────────────────────────────────
# Partition A — ElevenLabs streaming (LLM token stream → audio stream)
# ─────────────────────────────────────────────────────────────────────────────

def _get_elevenlabs_client(tenant_id: str) -> ElevenLabs:
    """Create ElevenLabs client using API key from Vault."""
    tts_cfg = get_tts_config("cloud", tenant_id)
    api_key = _vault_get(tts_cfg["api_key_path"], "api_key")
    return ElevenLabs(api_key=api_key)


async def synthesise_streaming(text_stream: AsyncIterator[str],
                                voice_id: str,
                                channel: str,
                                tenant_id: str,
                                cid: str,
                                redis_client=None,
                                stability: float = 0.65,
                                similarity: float = 0.75,
                                speed: float = 1.0) -> AsyncIterator[bytes]:
    """
    Partition A — ElevenLabs streaming TTS.
    Feeds LLM token stream directly into ElevenLabs SDK to minimise TTFA.
    Checks Redis interrupt:{cid} before each chunk.

    channel: "sip" → ulaw_8000 / "webrtc" → pcm_16000
    Yields audio bytes as they arrive.
    """
    output_format = "ulaw_8000" if channel == "sip" else "pcm_16000"

    # Collect text from async stream (ElevenLabs SDK 1.59 takes a plain string)
    # For lowest latency, we buffer into sentences and stream each sentence
    client = _get_elevenlabs_client(tenant_id)
    voice_settings = VoiceSettings(
        stability=stability,
        similarity_boost=similarity,
        speed=speed,
        use_speaker_boost=True,
    )

    sentence_end = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')
    sentence_buffer = ""

    async for token in text_stream:
        # Check for interrupt before each token
        if redis_client:
            interrupted = await redis_client.get(f"interrupt:{cid}")
            if interrupted:
                logger.info("[%s] TTS interrupted by Redis signal", cid)
                return

        sentence_buffer += token

        if sentence_end.search(sentence_buffer):
            sentences = sentence_end.split(sentence_buffer)
            for sentence in sentences[:-1]:
                sentence = sentence.strip()
                if not sentence:
                    continue
                loop = asyncio.get_event_loop()
                audio_iter = await loop.run_in_executor(
                    None,
                    lambda s=sentence: list(client.text_to_speech.convert_as_stream(
                        voice_id=voice_id,
                        text=s,
                        model_id="eleven_flash_v2_5",
                        voice_settings=voice_settings,
                        output_format=output_format,
                    ))
                )
                for chunk in audio_iter:
                    if chunk:
                        yield chunk
            sentence_buffer = sentences[-1]

    # Flush remaining buffer
    if sentence_buffer.strip():
        if redis_client:
            interrupted = await redis_client.get(f"interrupt:{cid}")
            if interrupted:
                return
        loop = asyncio.get_event_loop()
        audio_iter = await loop.run_in_executor(
            None,
            lambda s=sentence_buffer.strip(): list(client.text_to_speech.convert_as_stream(
                voice_id=voice_id,
                text=s,
                model_id="eleven_flash_v2_5",
                voice_settings=voice_settings,
                output_format=output_format,
            ))
        )
        for chunk in audio_iter:
            if chunk:
                yield chunk


async def synthesise_elevenlabs_full(text: str,
                                      voice_id: str,
                                      channel: str,
                                      tenant_id: str,
                                      cid: str,
                                      stability: float = 0.65,
                                      similarity: float = 0.75,
                                      speed: float = 1.0) -> bytes:
    """
    Partition A — synthesise a complete text string and return all audio bytes.
    Used for short utterances where sentence streaming overhead isn't worth it.
    """
    output_format = "ulaw_8000" if channel == "sip" else "pcm_16000"
    client = _get_elevenlabs_client(tenant_id)
    voice_settings = VoiceSettings(
        stability=stability,
        similarity_boost=similarity,
        speed=speed,
        use_speaker_boost=True,
    )
    loop = asyncio.get_event_loop()
    chunks = await loop.run_in_executor(
        None,
        lambda: list(client.text_to_speech.convert_as_stream(
            voice_id=voice_id,
            text=text,
            model_id="eleven_flash_v2_5",
            voice_settings=voice_settings,
            output_format=output_format,
        ))
    )
    return b"".join(c for c in chunks if c)


# ─────────────────────────────────────────────────────────────────────────────
# Partition B — Piper sentence-chunked synthesis
# ─────────────────────────────────────────────────────────────────────────────

async def synthesise_piper_chunked(llm_response_stream: AsyncIterator[str],
                                    voice: PiperVoice,
                                    channel: str,
                                    cid: str,
                                    redis_client=None) -> AsyncIterator[bytes]:
    """
    Partition B — Piper sentence-chunked TTS.
    Reads LLM token stream, buffers to sentence boundary, synthesises each sentence.
    Caller hears first sentence while LLM is still generating subsequent sentences.

    channel: "sip" → μ-law 8kHz / "webrtc" → linear16 16kHz
    """
    sentence_end = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')
    sentence_buffer = ""

    async for token in llm_response_stream:
        # Check interrupt before each sentence
        if redis_client:
            interrupted = await redis_client.get(f"interrupt:{cid}")
            if interrupted:
                logger.info("[%s] Piper TTS interrupted by Redis signal", cid)
                return

        sentence_buffer += token

        if sentence_end.search(sentence_buffer):
            sentences = sentence_end.split(sentence_buffer)
            for sentence in sentences[:-1]:
                sentence = sentence.strip()
                if not sentence:
                    continue
                loop = asyncio.get_event_loop()
                if channel == "sip":
                    audio = await loop.run_in_executor(
                        _PIPER_EXECUTOR,
                        lambda s=sentence: piper_to_sip_audio(s, voice)
                    )
                else:
                    audio = await loop.run_in_executor(
                        _PIPER_EXECUTOR,
                        lambda s=sentence: piper_to_webrtc_audio(s, voice)
                    )
                yield audio
            sentence_buffer = sentences[-1]

    # Flush remaining buffer
    if sentence_buffer.strip():
        if redis_client:
            interrupted = await redis_client.get(f"interrupt:{cid}")
            if interrupted:
                return
        loop = asyncio.get_event_loop()
        if channel == "sip":
            audio = await loop.run_in_executor(
                _PIPER_EXECUTOR,
                lambda s=sentence_buffer.strip(): piper_to_sip_audio(s, voice)
            )
        else:
            audio = await loop.run_in_executor(
                _PIPER_EXECUTOR,
                lambda s=sentence_buffer.strip(): piper_to_webrtc_audio(s, voice)
            )
        yield audio


async def synthesise_piper_full(text: str, voice: PiperVoice, channel: str) -> bytes:
    """Partition B — synthesise a complete text string with Piper (no streaming)."""
    loop = asyncio.get_event_loop()
    if channel == "sip":
        return await loop.run_in_executor(
            _PIPER_EXECUTOR, lambda: piper_to_sip_audio(text, voice)
        )
    return await loop.run_in_executor(
        _PIPER_EXECUTOR, lambda: piper_to_webrtc_audio(text, voice)
    )


# ─────────────────────────────────────────────────────────────────────────────
# Self-test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import audioop as _audioop

    print("=" * 60)
    print("TTS ADAPTER SELF-TEST")
    print("=" * 60)

    # Test 1: Piper voice loading
    print("  Loading Piper en_US-lessac-medium…")
    voice = get_piper_voice("en_US-lessac-medium.onnx")
    print("  [PASS] Piper voice loaded ✅")

    # Test 2: Piper → SIP audio (μ-law 8kHz)
    audio_sip = piper_to_sip_audio("Hello, this is a test.", voice)
    assert len(audio_sip) > 0, "SIP audio is empty"
    # μ-law is 1 byte per sample — verify it's not raw PCM
    assert len(audio_sip) < 20000, f"SIP audio too large: {len(audio_sip)}"
    print(f"  [PASS] Piper → SIP μ-law 8kHz: {len(audio_sip)} bytes ✅")

    # Test 3: Piper → WebRTC audio (linear16 16kHz)
    audio_webrtc = piper_to_webrtc_audio("Hello, this is a test.", voice)
    assert len(audio_webrtc) > 0, "WebRTC audio is empty"
    print(f"  [PASS] Piper → WebRTC linear16 16kHz: {len(audio_webrtc)} bytes ✅")

    # Test 4: Piper sentence chunking
    async def _test_chunking():
        async def token_stream():
            for token in ["Hello, ", "how are ", "you today? ", "I hope ", "you are well."]:
                yield token

        chunks = []
        async for audio in synthesise_piper_chunked(token_stream(), voice, "sip", "test-cid"):
            chunks.append(audio)
        assert len(chunks) >= 1, "No audio chunks produced"
        total = sum(len(c) for c in chunks)
        print(f"  [PASS] Piper chunked synthesis: {len(chunks)} sentence(s), {total} bytes total ✅")

    asyncio.run(_test_chunking())

    # Test 5: Audio format verification — SIP should be smaller than WebRTC
    # μ-law is 1 byte/sample at 8kHz; linear16 is 2 bytes/sample at 16kHz
    # For same duration: μ-law = 8000 B/s, linear16 16kHz = 32000 B/s
    # So SIP should be ~4x smaller
    assert len(audio_sip) < len(audio_webrtc), (
        f"SIP audio ({len(audio_sip)}) should be smaller than WebRTC ({len(audio_webrtc)})"
    )
    print(f"  [PASS] Audio format sizes: SIP={len(audio_sip)}B < WebRTC={len(audio_webrtc)}B ✅")

    # Test 6: Piper full synthesis async
    async def _test_full():
        audio = await synthesise_piper_full("Test synthesis complete.", voice, "webrtc")
        assert len(audio) > 0
        print(f"  [PASS] Piper full synthesis async: {len(audio)} bytes ✅")

    asyncio.run(_test_full())

    print()
    print("=" * 60)
    print("TTS ADAPTER SELF-TEST: PASS (6/6)")
    print("=" * 60)
