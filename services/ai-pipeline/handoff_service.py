"""
handoff_service.py — TRUSTNOW AI Pipeline Handoff Helper
Called from the agent turn loop when handoff conditions are met.
Makes a REST call to the NestJS HandoffModule (POST /handoff/execute).
"""
import httpx
import asyncio
import logging
from typing import Optional, List, Dict, Any, Literal

logger = logging.getLogger(__name__)

PLATFORM_API_URL = "http://127.0.0.1:3001"

# Handoff trigger conditions (BRD §7.3.1)
HANDOFF_TRIGGERS = {
    "confidence_threshold",   # LLM confidence below configured floor
    "caller_request",         # Caller explicitly asked for human
    "keyword_detection",      # Trigger keyword detected in transcript
    "intent_mapping",         # Intent classifier maps to escalation intent
    "sme_escalation",         # Agent flagged query as requiring SME
    "max_duration_exceeded",  # Call exceeded configured max duration
}


async def execute_handoff(
    cid: str,
    channel_uuid: str,
    handoff_type: Literal["A", "B"],
    transcript: List[Dict[str, Any]],
    context: Dict[str, Any],
    target: Optional[str] = None,
    agent_id: Optional[str] = None,
    trigger: str = "caller_request",
    jwt_token: str = "",
) -> Dict[str, Any]:
    """
    Execute human handoff via Platform API.

    Args:
        cid: Conversation ID
        channel_uuid: FreeSWITCH channel UUID (from ESL CHANNEL_ANSWER event)
        handoff_type: "A" = SIP transfer to external PBX/CCaaS
                      "B" = internal TRUSTNOW Agent Console queue
        transcript: Full conversation transcript up to handoff point
        context: Full session context (agent_id, tenant_id, language, data_collection results, etc.)
        target: SIP URI or phone number (Option A only)
        agent_id: Preferred human agent ID (Option B, optional)
        trigger: Which condition triggered the handoff (for audit log)
        jwt_token: Platform API JWT for authentication
    """
    payload = {
        "cid": cid,
        "channel_uuid": channel_uuid,
        "handoff_type": handoff_type,
        "transcript": transcript,
        "context": {**context, "handoff_trigger": trigger},
        "target": target,
        "agent_id": agent_id,
    }

    logger.info(f"Handoff initiated — CID: {cid}, type: {handoff_type}, trigger: {trigger}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{PLATFORM_API_URL}/api/handoff/execute",
                json=payload,
                headers={"Authorization": f"Bearer {jwt_token}"},
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Handoff result — CID: {cid}: {result}")
            return result
    except httpx.HTTPError as e:
        logger.error(f"Handoff HTTP error — CID: {cid}: {e}")
        raise
    except Exception as e:
        logger.error(f"Handoff unexpected error — CID: {cid}: {e}")
        raise


def check_handoff_conditions(
    transcript: List[Dict[str, Any]],
    agent_config: Dict[str, Any],
    session_state: Dict[str, Any],
) -> Optional[str]:
    """
    Check whether any handoff trigger condition is met.
    Returns the trigger name if handoff should occur, else None.
    Called from the agent turn loop after each LLM response.
    """
    latest_turn = transcript[-1] if transcript else {}
    caller_text = latest_turn.get("caller", "").lower()

    # Caller explicitly requested human
    human_request_phrases = [
        "speak to a human", "speak to someone", "real person", "talk to an agent",
        "transfer me", "human agent", "customer service", "representative",
    ]
    if any(phrase in caller_text for phrase in human_request_phrases):
        return "caller_request"

    # Keyword detection — checks agent_config.guardrails
    escalation_keywords = agent_config.get("guardrails_escalation_keywords", [])
    if any(kw.lower() in caller_text for kw in escalation_keywords):
        return "keyword_detection"

    # Max duration exceeded
    max_duration_s = agent_config.get("max_duration_value", 1800)
    elapsed_s = session_state.get("elapsed_seconds", 0)
    if elapsed_s >= max_duration_s:
        return "max_duration_exceeded"

    return None  # No handoff needed
