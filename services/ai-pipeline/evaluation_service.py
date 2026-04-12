"""
TRUSTNOW AI Pipeline — Evaluation Service — BRD §9.4 (§9.7–§9.8)
==================================================================
Post-call pipeline: evaluation criteria scoring + data collection extraction.
Runs as a background job after every session flush.

Evaluation criteria: LLM-based per-criterion True/False scoring.
Data collection: LLM-based field extraction from transcript.

Functions:
  run_post_call_pipeline()          — main entry: evaluate + collect + persist
  evaluate_conversation()           — score each criterion against the transcript
  collect_data_from_transcript()    — extract structured data fields
"""

import asyncio
import json
import logging
from typing import Any, Optional

import httpx
import psycopg2
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.evaluation_service")

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
# Main post-call pipeline entry — §9.4
# ─────────────────────────────────────────────────────────────────────────────

async def run_post_call_pipeline(cid: str, agent_config: dict) -> None:
    """
    Orchestrate post-call jobs after session flush:
      Job 1 — Evaluation criteria scoring
      Job 2 — Data collection extraction
      Job 3 — Persist results to PostgreSQL + Redis (for webhook pickup)

    Called as asyncio.create_task() from session flush, so it runs in background.
    Failures are non-fatal — logged only.
    """
    logger.info("[%s] Post-call pipeline starting", cid)

    session = await _redis.hgetall(f"session:{cid}")
    if not session:
        logger.warning("[%s] Post-call pipeline: session not in Redis", cid)
        return

    transcript_raw = session.get("transcript", "[]")
    try:
        transcript = json.loads(transcript_raw)
    except Exception:
        transcript = []

    # Job 1: Evaluation criteria
    evaluation_results = {}
    call_successful = True
    try:
        evaluation_results, call_successful = await evaluate_conversation(
            transcript=transcript,
            agent_config=agent_config,
            cid=cid,
        )
    except Exception as exc:
        logger.warning("[%s] Evaluation failed (non-fatal): %s", cid, exc)

    # Job 2: Data collection
    data_collection_results = {}
    try:
        data_collection_results = await collect_data_from_transcript(
            transcript=transcript,
            agent_config=agent_config,
            cid=cid,
        )
    except Exception as exc:
        logger.warning("[%s] Data collection failed (non-fatal): %s", cid, exc)

    # Job 3: Persist results
    await _persist_post_call_results(
        cid=cid,
        evaluation_results=evaluation_results,
        data_collection_results=data_collection_results,
        call_successful=call_successful,
    )
    logger.info("[%s] Post-call pipeline complete — successful=%s criteria=%d fields=%d",
                cid, call_successful, len(evaluation_results), len(data_collection_results))


# ─────────────────────────────────────────────────────────────────────────────
# Job 1 — Evaluation criteria scoring — §9.4 (9.7)
# ─────────────────────────────────────────────────────────────────────────────

async def evaluate_conversation(
    transcript: list[dict],
    agent_config: dict,
    cid: str,
) -> tuple[dict, bool]:
    """
    Score each evaluation criterion against the full transcript using LLM.
    Returns (evaluation_results dict, call_successful bool).

    Criteria stored in agent_config['evaluation_criteria_json']:
    [{"name": "resolved_query", "prompt": "Did the agent fully resolve the caller's query?"}]
    """
    criteria_raw = agent_config.get("evaluation_criteria_json", [])
    if isinstance(criteria_raw, str):
        try:
            criteria = json.loads(criteria_raw)
        except Exception:
            criteria = []
    else:
        criteria = criteria_raw or []

    if not criteria:
        # Default: call successful if agent had at least one exchange
        has_exchange = any(t.get("role") == "user" for t in transcript)
        return {}, has_exchange

    transcript_text = _format_transcript_for_llm(transcript)
    results: dict[str, bool] = {}

    for criterion in criteria:
        name = criterion.get("name", "unknown")
        prompt = criterion.get("prompt", "")
        if not prompt:
            continue
        try:
            result = await _llm_evaluate(
                transcript_text=transcript_text,
                criterion_prompt=prompt,
                cid=cid,
                agent_config=agent_config,
            )
            results[name] = result
        except Exception as exc:
            logger.warning("[%s] Criterion '%s' evaluation failed: %s", cid, name, exc)
            results[name] = False

    call_successful = all(results.values()) if results else True
    return results, call_successful


# ─────────────────────────────────────────────────────────────────────────────
# Job 2 — Data collection extraction — §9.4 (9.8)
# ─────────────────────────────────────────────────────────────────────────────

async def collect_data_from_transcript(
    transcript: list[dict],
    agent_config: dict,
    cid: str,
) -> dict:
    """
    Extract structured data fields from the conversation transcript using LLM.
    Returns dict of {field_name: extracted_value}.

    Spec stored in agent_config['data_collection_json']:
    [{"name": "customer_intent", "description": "Primary reason for the call"},
     {"name": "account_number", "description": "Account number mentioned by caller"},
     {"name": "issue_resolved", "type": "boolean"}]
    """
    spec_raw = agent_config.get("data_collection_json", [])
    if isinstance(spec_raw, str):
        try:
            spec = json.loads(spec_raw)
        except Exception:
            spec = []
    else:
        spec = spec_raw or []

    if not spec:
        return {}

    transcript_text = _format_transcript_for_llm(transcript)
    extracted: dict = {}

    for field_spec in spec:
        name = field_spec.get("name", "unknown")
        description = field_spec.get("description", name)
        field_type = field_spec.get("type", "string")
        try:
            value = await _llm_extract(
                transcript_text=transcript_text,
                field_name=name,
                description=description,
                field_type=field_type,
                cid=cid,
                agent_config=agent_config,
            )
            extracted[name] = value
        except Exception as exc:
            logger.warning("[%s] Data field '%s' extraction failed: %s", cid, name, exc)
            extracted[name] = None

    return extracted


# ─────────────────────────────────────────────────────────────────────────────
# Persist post-call results to PostgreSQL + Redis
# ─────────────────────────────────────────────────────────────────────────────

async def _persist_post_call_results(
    cid: str,
    evaluation_results: dict,
    data_collection_results: dict,
    call_successful: bool,
) -> None:
    """Write evaluation and data collection results back to PostgreSQL."""
    # Update Redis for webhook pickup
    await _redis.hset(f"session:{cid}", mapping={
        "evaluation_results": json.dumps(evaluation_results),
        "data_collection_results": json.dumps(data_collection_results),
        "call_successful": "1" if call_successful else "0",
    })

    if not _pg_conn_params:
        return

    try:
        conn = psycopg2.connect(**_pg_conn_params)
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE conversations SET
                        evaluation_results      = %s::jsonb,
                        data_collection_results = %s::jsonb,
                        call_successful         = %s
                    WHERE conversation_id = %s
                """, (
                    json.dumps(evaluation_results),
                    json.dumps(data_collection_results),
                    call_successful,
                    cid,
                ))
        conn.close()
        logger.debug("[%s] Post-call results persisted to PostgreSQL", cid)
    except Exception as exc:
        logger.error("[%s] Post-call results persist failed: %s", cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# LLM helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _llm_evaluate(
    transcript_text: str,
    criterion_prompt: str,
    cid: str,
    agent_config: dict,
) -> bool:
    """
    Ask LLM to evaluate one criterion against the transcript.
    Returns True if the criterion is satisfied, False otherwise.
    Uses a strict yes/no prompt to minimise tokens.
    """
    system = (
        "You are an AI quality assurance assistant. "
        "You will be given a call transcript and an evaluation criterion. "
        "Respond with exactly one word: 'yes' if the criterion is satisfied, 'no' if it is not. "
        "Do not add any other text."
    )
    user_content = (
        f"TRANSCRIPT:\n{transcript_text}\n\n"
        f"CRITERION: {criterion_prompt}\n\n"
        "Answer yes or no:"
    )

    response = await _post_llm(
        system=system,
        user_content=user_content,
        cid=cid,
        agent_config=agent_config,
        max_tokens=5,
    )
    return response.strip().lower().startswith("y")


async def _llm_extract(
    transcript_text: str,
    field_name: str,
    description: str,
    field_type: str,
    cid: str,
    agent_config: dict,
) -> Any:
    """
    Ask LLM to extract a single data field from the transcript.
    Returns typed value: bool if field_type='boolean', else str.
    """
    if field_type == "boolean":
        system = (
            "You are a data extraction assistant. "
            "Extract the requested field from the transcript. "
            "Respond with exactly 'true' or 'false'. No other text."
        )
        user_content = (
            f"TRANSCRIPT:\n{transcript_text}\n\n"
            f"FIELD: {field_name}\n"
            f"DESCRIPTION: {description}\n\n"
            "Answer true or false:"
        )
        response = await _post_llm(
            system=system,
            user_content=user_content,
            cid=cid,
            agent_config=agent_config,
            max_tokens=5,
        )
        return response.strip().lower() == "true"
    else:
        system = (
            "You are a data extraction assistant. "
            "Extract the requested field value from the transcript. "
            "Respond with only the extracted value. "
            "If the value is not mentioned, respond with 'null'."
        )
        user_content = (
            f"TRANSCRIPT:\n{transcript_text}\n\n"
            f"FIELD: {field_name}\n"
            f"DESCRIPTION: {description}\n\n"
            "Extracted value:"
        )
        response = await _post_llm(
            system=system,
            user_content=user_content,
            cid=cid,
            agent_config=agent_config,
            max_tokens=100,
        )
        value = response.strip()
        return None if value.lower() == "null" else value


async def _post_llm(
    system: str,
    user_content: str,
    cid: str,
    agent_config: dict,
    max_tokens: int = 100,
) -> str:
    """Shared LLM caller for evaluation/extraction — uses cheapest model."""
    litellm_url = "http://127.0.0.1:4000"
    # Use the cheapest/fastest model for post-call jobs (overridable)
    model = agent_config.get("analysis_model", "gpt-4o-mini")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{litellm_url}/v1/chat/completions",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_content},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.0,  # Deterministic for evaluation
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ─────────────────────────────────────────────────────────────────────────────
# Transcript formatter
# ─────────────────────────────────────────────────────────────────────────────

def _format_transcript_for_llm(transcript: list[dict]) -> str:
    """Convert transcript turn list to a readable text format for LLM evaluation."""
    lines = []
    for turn in transcript:
        role = turn.get("role", "unknown").upper()
        text = turn.get("text", "")
        # Strip [interrupted] suffix for cleaner evaluation
        text = text.replace(" [interrupted]", "").strip()
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines) if lines else "(no conversation transcript)"
