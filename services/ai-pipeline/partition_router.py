"""
TRUSTNOW Partition Router — BRD §5.4
=====================================
Single source of truth for ALL AI routing decisions.
Every STT, LLM, TTS, and RAG call in the pipeline routes through this module.

Partition A (cloud):   Deepgram STT / Cloud LLM / ElevenLabs TTS / OpenAI embeddings
Partition B (onprem):  FasterWhisper STT / Ollama LLM / Piper TTS / sentence-transformers

Data Sovereignty guarantee: Partition B NEVER makes external internet API calls.
"""

import socket
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Partition(str, Enum):
    CLOUD  = "cloud"
    ONPREM = "onprem"


@dataclass
class PartitionConfig:
    partition: Partition
    # STT
    stt_provider:        str            # "deepgram" | "fasterwhisper"
    stt_model:           str            # "nova-2" | "base" | "medium" | "large-v3"
    stt_api_key_path:    Optional[str]  # Vault path — None for onprem
    # LLM
    llm_model_prefix:    str            # "" (any) | "ollama/" (onprem only)
    llm_allowed_models:  list           # allowed model names
    # TTS
    tts_provider:        str            # "elevenlabs" | "piper"
    tts_model:           str            # "eleven_flash_v2_5" | piper model filename
    tts_api_key_path:    Optional[str]  # Vault path — None for onprem
    # Embedding (RAG)
    embedding_provider:  str            # "openai" | "sentence_transformers"
    embedding_model:     str            # "text-embedding-3-small" | "all-MiniLM-L6-v2"
    # Data sovereignty
    allow_external_calls: bool          # True for cloud, False for onprem — ENFORCED


PARTITION_CONFIGS = {
    Partition.CLOUD: PartitionConfig(
        partition=Partition.CLOUD,
        stt_provider="deepgram",
        stt_model="nova-2",
        stt_api_key_path="secret/trustnow/{tenant_id}/stt/deepgram_api_key",
        llm_model_prefix="",
        llm_allowed_models=[
            "gpt-4o", "gpt-4o-mini", "claude-sonnet", "claude-haiku",
            "gemini-flash", "gemini-pro", "qwen-max", "mistral-large",
            "llama-3.1-70b",
        ],
        tts_provider="elevenlabs",
        tts_model="eleven_flash_v2_5",
        tts_api_key_path="secret/trustnow/{tenant_id}/tts/elevenlabs_api_key",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        allow_external_calls=True,
    ),
    Partition.ONPREM: PartitionConfig(
        partition=Partition.ONPREM,
        stt_provider="fasterwhisper",
        stt_model="medium",          # override per quality preset: base|medium|large-v3
        stt_api_key_path=None,       # no external API
        llm_model_prefix="ollama/",
        llm_allowed_models=["ollama-llama3", "ollama-mistral", "ollama-qwen2"],
        tts_provider="piper",
        tts_model="en_US-lessac-medium",  # override per voice selection
        tts_api_key_path=None,       # no external API
        embedding_provider="sentence_transformers",
        embedding_model="all-MiniLM-L6-v2",
        allow_external_calls=False,  # DATA SOVEREIGNTY: NEVER TRUE FOR ONPREM
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_partition_config(partition: str) -> PartitionConfig:
    """Single entry point — all routing decisions start here."""
    try:
        return PARTITION_CONFIGS[Partition(partition)]
    except ValueError:
        raise ValueError(
            f"Unknown partition '{partition}'. Valid values: "
            f"{[p.value for p in Partition]}"
        )


def enforce_no_external_call(partition: str, attempted_url: str) -> None:
    """
    Partition B blocks public internet calls.
    Allows calls to private/internal IP ranges (RFC 1918) and localhost.
    Partition A: all calls allowed.

    Raises RuntimeError with 'DATA SOVEREIGNTY VIOLATION' if violated.
    """
    if partition != Partition.ONPREM.value and partition != Partition.ONPREM:
        return  # Partition A — all calls allowed

    try:
        hostname = attempted_url.split("//")[-1].split("/")[0].split(":")[0]
        ip = socket.gethostbyname(hostname)

        private_ranges = [
            ip.startswith("10."),
            ip.startswith("172.16.") or ip.startswith("172.17."),
            ip.startswith("192.168."),
            ip in ("127.0.0.1", "localhost", "::1"),
        ]

        if not any(private_ranges):
            raise RuntimeError(
                f"DATA SOVEREIGNTY VIOLATION: Partition B agent attempted call "
                f"to public internet endpoint {attempted_url} (resolved to {ip}). "
                f"Only private/internal network endpoints are permitted."
            )
    except socket.gaierror:
        raise RuntimeError(
            f"DATA SOVEREIGNTY VIOLATION: Could not resolve hostname in {attempted_url}. "
            f"Partition B agents may only call internal/private endpoints."
        )


def validate_llm_model_for_partition(partition: str, model_name: str) -> bool:
    """Returns True if model_name is allowed for the given partition."""
    config = get_partition_config(partition)
    return model_name in config.llm_allowed_models


def get_stt_config(partition: str, tenant_id: str) -> dict:
    """Returns resolved STT config dict for the given partition and tenant."""
    config = get_partition_config(partition)
    return {
        "provider": config.stt_provider,
        "model": config.stt_model,
        "api_key_path": (
            config.stt_api_key_path.format(tenant_id=tenant_id)
            if config.stt_api_key_path
            else None
        ),
    }


def get_tts_config(partition: str, tenant_id: str) -> dict:
    """Returns resolved TTS config dict for the given partition and tenant."""
    config = get_partition_config(partition)
    return {
        "provider": config.tts_provider,
        "model": config.tts_model,
        "api_key_path": (
            config.tts_api_key_path.format(tenant_id=tenant_id)
            if config.tts_api_key_path
            else None
        ),
    }


def get_embedding_config(partition: str) -> dict:
    """Returns resolved embedding config for the given partition."""
    config = get_partition_config(partition)
    return {
        "provider": config.embedding_provider,
        "model": config.embedding_model,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Self-test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("PARTITION ROUTER SELF-TEST")
    print("=" * 60)

    # Test 1: Partition A config
    cfg_a = get_partition_config("cloud")
    assert cfg_a.stt_provider == "deepgram"
    assert cfg_a.tts_provider == "elevenlabs"
    assert cfg_a.tts_model == "eleven_flash_v2_5"
    assert cfg_a.allow_external_calls is True
    print("  [PASS] Partition A config: deepgram / eleven_flash_v2_5 / external_calls=True")

    # Test 2: Partition B config
    cfg_b = get_partition_config("onprem")
    assert cfg_b.stt_provider == "fasterwhisper"
    assert cfg_b.tts_provider == "piper"
    assert cfg_b.allow_external_calls is False
    print("  [PASS] Partition B config: fasterwhisper / piper / external_calls=False")

    # Test 3: enforce_no_external_call allows localhost
    enforce_no_external_call("onprem", "http://127.0.0.1:4000/v1/chat")
    print("  [PASS] Partition B: localhost call allowed ✅")

    # Test 4: enforce_no_external_call blocks public internet
    try:
        enforce_no_external_call("onprem", "https://api.deepgram.com/v1/listen")
        print("  [FAIL] Partition B: should have blocked Deepgram API call")
        sys.exit(1)
    except RuntimeError as e:
        assert "DATA SOVEREIGNTY VIOLATION" in str(e)
        print("  [PASS] Partition B: Deepgram API call blocked ✅")

    # Test 5: Partition A external call not blocked
    enforce_no_external_call("cloud", "https://api.deepgram.com/v1/listen")
    print("  [PASS] Partition A: Deepgram API call allowed ✅")

    # Test 6: LLM model validation
    assert validate_llm_model_for_partition("cloud", "gpt-4o") is True
    assert validate_llm_model_for_partition("onprem", "gpt-4o") is False
    assert validate_llm_model_for_partition("onprem", "ollama-llama3") is True
    assert validate_llm_model_for_partition("cloud", "ollama-llama3") is False
    print("  [PASS] LLM model validation: cloud/onprem cross-check ✅")

    # Test 7: STT config resolution with tenant_id interpolation
    stt = get_stt_config("cloud", "tenant-123")
    assert stt["api_key_path"] == "secret/trustnow/tenant-123/stt/deepgram_api_key"
    stt_b = get_stt_config("onprem", "tenant-123")
    assert stt_b["api_key_path"] is None
    print("  [PASS] STT config tenant_id interpolation ✅")

    # Test 8: Unknown partition raises
    try:
        get_partition_config("invalid")
        print("  [FAIL] Should have raised ValueError")
        sys.exit(1)
    except ValueError:
        print("  [PASS] Unknown partition raises ValueError ✅")

    print()
    print("=" * 60)
    print("PARTITION ROUTER SELF-TEST: PASS (8/8)")
    print("=" * 60)
