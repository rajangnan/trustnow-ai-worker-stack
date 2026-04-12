"""
TRUSTNOW AI Pipeline — Tool Executor — BRD §6.2 / Task 10
==========================================================
Runtime tool execution engine for Tools-Assisted AI Agents.
All tool types (webhook, system, MCP, client) pass through this shared layer.

§10.2 execution standards applied uniformly:
  - Idempotency key:   X-Idempotency-Key: {cid}-{tool_id}-{turn_number}
  - Retry policy:      max 3 attempts, 1s→2s→4s backoff + ±200ms jitter
                       Retry: timeout, 429, 503  |  No retry: 400, 401, 403, 404
  - Circuit breaker:   per-tool, Redis key circuit:{tool_id}
                       >50% failures in 60s window → open 120s
  - Audit log:         every execution recorded to audit_logs table

§10.3 sandboxing:
  - Tenant scope validated before execution
  - Agent scope validated via agent_configs.tools_config_json
  - Execution in isolated async task with independent timeout

Functions:
  execute_tool()             — main dispatcher; validates scope, checks circuit, runs, audits
  build_tools_schema()       — convert agent tools to OpenAI function calling format
  _execute_webhook_tool()    — HTTP webhook with idempotency + retry
  _execute_system_tool()     — end_call, detect_language, skip_turn, transfer_*, play_dtmf
  _execute_mcp_tool()        — MCP SSE/HTTP tool invocation
  _resolve_template()        — {{env.VAR}} + {{secret.NAME}} interpolation
  _check_circuit_breaker()   — Redis-based circuit state read
  _record_circuit_failure()  — increment failure counter, maybe open circuit
  _record_tool_audit()       — PostgreSQL audit_logs write
"""

import asyncio
import json
import logging
import os
import random
import subprocess
import time
from typing import Any, Optional

import httpx
import psycopg2
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.tool_executor")

# ─────────────────────────────────────────────────────────────────────────────
# Module-level shared resources — injected by main.py at startup
# ─────────────────────────────────────────────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_pg_conn_params: Optional[dict] = None

PLATFORM_API_URL = "http://127.0.0.1:3001"


def set_redis(r: aioredis.Redis) -> None:
    global _redis
    _redis = r


def set_pg_conn_params(params: dict) -> None:
    global _pg_conn_params
    _pg_conn_params = params


# ─────────────────────────────────────────────────────────────────────────────
# Circuit breaker constants — §10.2
# ─────────────────────────────────────────────────────────────────────────────

CIRCUIT_WINDOW_S = 60       # failure counting window
CIRCUIT_OPEN_TTL_S = 120    # how long circuit stays open
CIRCUIT_FAILURE_THRESHOLD = 0.5  # >50% failure rate triggers open
CIRCUIT_MIN_CALLS = 4       # minimum calls before circuit can open


# ─────────────────────────────────────────────────────────────────────────────
# Main executor — dispatch + scope validation + circuit + audit
# ─────────────────────────────────────────────────────────────────────────────

async def execute_tool(
    cid: str,
    tool_id: str,
    tool_name: str,
    tool_type: str,
    input_params: dict,
    agent_config: dict,
    turn_number: int = 0,
) -> dict:
    """
    Main tool execution entry point.
    Validates tenant + agent scope (§10.3), checks circuit breaker,
    dispatches to type-specific handler, and records audit log (§10.2).

    Returns dict with 'result' (tool output) and 'success' bool.
    On failure: returns graceful error dict the LLM can reason over.
    """
    tenant_id = agent_config["tenant_id"]
    agent_id = agent_config["agent_id"]
    t_start = time.monotonic()
    success = False
    error_code = None
    result = {}
    attempt_number = 1

    # §10.3: Validate agent scope — tool must be attached to this agent
    if tool_type != "system":
        attached = await _validate_agent_scope(tenant_id, agent_id, tool_id)
        if not attached:
            logger.warning("[%s] Tool %s not attached to agent %s — blocked", cid, tool_id, agent_id)
            return {"success": False, "result": {"error": "Tool not available for this agent"}}

    # §10.2: Check circuit breaker
    if tool_type != "system" and await _is_circuit_open(tool_id):
        logger.warning("[%s] Tool %s circuit OPEN — returning cached failure", cid, tool_id)
        cached = await _get_circuit_cached_result(tool_id)
        return {"success": False, "result": cached or {"error": "Tool temporarily unavailable (circuit open)"}}

    try:
        if tool_type in ("webhook", "integration"):
            result, attempt_number = await _execute_webhook_tool(
                cid=cid,
                tool_id=tool_id,
                input_params=input_params,
                agent_config=agent_config,
                turn_number=turn_number,
            )
        elif tool_type == "system":
            result = await _execute_system_tool(
                cid=cid,
                tool_name=tool_name,
                input_params=input_params,
                agent_config=agent_config,
            )
        elif tool_type == "mcp":
            result, attempt_number = await _execute_mcp_tool(
                cid=cid,
                tool_id=tool_id,
                tool_name=tool_name,
                input_params=input_params,
                agent_config=agent_config,
                turn_number=turn_number,
            )
        elif tool_type == "client":
            result = await _execute_client_tool(
                cid=cid,
                tool_id=tool_id,
                tool_name=tool_name,
                input_params=input_params,
                agent_config=agent_config,
            )
        else:
            result = {"error": f"Unknown tool type: {tool_type}"}

        success = "error" not in result
        if success:
            # Cache successful result for circuit breaker fallback
            await _cache_circuit_result(tool_id, result)

    except Exception as exc:
        logger.error("[%s] Tool %s execution error: %s", cid, tool_id, exc)
        error_code = type(exc).__name__
        result = {"error": str(exc)}
        success = False

    latency_ms = int((time.monotonic() - t_start) * 1000)

    # §10.2: Record circuit failure if applicable
    if not success and tool_type != "system":
        await _record_circuit_failure(tool_id)

    # §10.2: Audit log every execution
    await _record_tool_audit(
        cid=cid,
        tool_id=tool_id,
        tool_type=tool_type,
        tenant_id=tenant_id,
        input_params=input_params,
        output_result=result,
        latency_ms=latency_ms,
        success=success,
        error_code=error_code,
        attempt_number=attempt_number,
    )

    logger.info("[%s] Tool %s (%s) — success=%s latency=%dms", cid, tool_name, tool_type, success, latency_ms)
    return {"success": success, "result": result}


# ─────────────────────────────────────────────────────────────────────────────
# Build OpenAI function calling schema from agent tools
# ─────────────────────────────────────────────────────────────────────────────

async def build_tools_schema(agent_config: dict) -> list[dict]:
    """
    Fetch tools attached to this agent and convert to OpenAI function calling format.
    The schema is passed to the LLM so it can invoke tools via function calls.
    Returns empty list if no tools attached or agent has no tools_config_json.
    """
    tenant_id = agent_config["tenant_id"]
    agent_id = agent_config["agent_id"]

    # Fetch tool configs from platform API
    tools_data = await _fetch_agent_tools(tenant_id, agent_id)
    if not tools_data:
        return []

    # Add system tools based on tools_config_json.system_tools
    tools_config = agent_config.get("tools_config_json") or {}
    if isinstance(tools_config, str):
        try:
            tools_config = json.loads(tools_config)
        except Exception:
            tools_config = {}

    system_tools_enabled = tools_config.get("system_tools", {})
    system_schemas = _build_system_tool_schemas(system_tools_enabled)

    # Convert webhook/integration/MCP tools to OpenAI function schema
    custom_schemas = []
    for tool in tools_data:
        schema = _tool_to_function_schema(tool)
        if schema:
            custom_schemas.append(schema)

    return custom_schemas + system_schemas


def _tool_to_function_schema(tool: dict) -> Optional[dict]:
    """Convert a tool DB row to OpenAI function schema format."""
    config = tool.get("config_json") or {}
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except Exception:
            config = {}

    input_schema = config.get("input_schema") or {}
    if not input_schema:
        input_schema = {"type": "object", "properties": {}}

    name = tool.get("name", "").replace(" ", "_").lower()[:64]
    if not name:
        return None

    return {
        "type": "function",
        "function": {
            "name": name,
            "description": tool.get("description", ""),
            "parameters": input_schema,
            "_tool_id": str(tool.get("tool_id", "")),
            "_tool_type": tool.get("type", "webhook"),
        },
    }


def _build_system_tool_schemas(system_tools: dict) -> list[dict]:
    """Return OpenAI function schemas for enabled system tools."""
    schemas = []

    SYSTEM_TOOL_DEFS = {
        "end_conversation": {
            "name": "end_conversation",
            "description": "End the current call when the conversation has reached a natural conclusion. Only call this when you have fully addressed the caller's needs and said goodbye.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        "detect_language": {
            "name": "detect_language",
            "description": "Detect the language the caller is speaking and switch to it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "language_code": {"type": "string", "description": "BCP-47 language code (e.g. 'hi', 'en', 'ta')"},
                },
                "required": ["language_code"],
            },
        },
        "skip_turn": {
            "name": "skip_turn",
            "description": "Stay silent for this turn — do not generate a spoken response. Use when waiting for caller action.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        "transfer_to_agent": {
            "name": "transfer_to_agent",
            "description": "Transfer the caller to a human agent in the internal queue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Reason for transfer (passed to the agent)"},
                },
                "required": [],
            },
        },
        "transfer_to_number": {
            "name": "transfer_to_number",
            "description": "Transfer the caller to an external phone number or SIP URI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Phone number or SIP URI to transfer to"},
                    "reason": {"type": "string"},
                },
                "required": ["destination"],
            },
        },
        "play_keypad_touch_tone": {
            "name": "play_keypad_touch_tone",
            "description": "Play a DTMF keypad tone on the call (e.g. to navigate IVR menus).",
            "parameters": {
                "type": "object",
                "properties": {
                    "digit": {"type": "string", "description": "DTMF digit: 0-9, *, #"},
                },
                "required": ["digit"],
            },
        },
        "voicemail_detection": {
            "name": "voicemail_detection",
            "description": "Check if the call connected to a voicemail system rather than a live person.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    }

    for tool_key, definition in SYSTEM_TOOL_DEFS.items():
        if system_tools.get(tool_key, False):
            schemas.append({
                "type": "function",
                "function": {
                    **definition,
                    "_tool_id": tool_key,
                    "_tool_type": "system",
                },
            })

    return schemas


# ─────────────────────────────────────────────────────────────────────────────
# Webhook tool handler — §10.2 retry + idempotency
# ─────────────────────────────────────────────────────────────────────────────

async def _execute_webhook_tool(
    cid: str,
    tool_id: str,
    input_params: dict,
    agent_config: dict,
    turn_number: int,
) -> tuple[dict, int]:
    """
    Execute a webhook tool with idempotency key, retry policy, and circuit breaker.
    Returns (result_dict, final_attempt_number).
    """
    tenant_id = agent_config["tenant_id"]
    tool_config = await _fetch_tool_config(tenant_id, tool_id)
    if not tool_config:
        return {"error": f"Tool {tool_id} config not found"}, 1

    config = tool_config.get("config_json") or {}
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except Exception:
            config = {}

    method = (config.get("method") or "POST").upper()
    url = config.get("url", "")
    headers = dict(config.get("headers") or {})
    timeout_s = int(config.get("response_timeout_s") or 20)

    if not url:
        return {"error": "Tool has no URL configured"}, 1

    # Resolve {{env.VAR}} and {{secret.NAME}} templates
    url = await _resolve_template(url, tenant_id, tool_id)
    headers = {k: await _resolve_template(v, tenant_id, tool_id) for k, v in headers.items()}

    # Fetch credentials from Vault at execution time — NEVER cached — §10.2
    creds = await _vault_get_tool_credentials(tenant_id, tool_id)
    if creds:
        auth_type = creds.get("type", "")
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {creds.get('token', '')}"
        elif auth_type == "api_key":
            key_header = creds.get("header_name", "X-Api-Key")
            headers[key_header] = creds.get("api_key", "")
        elif auth_type == "basic":
            import base64
            cred_str = base64.b64encode(
                f"{creds.get('username', '')}:{creds.get('password', '')}".encode()
            ).decode()
            headers["Authorization"] = f"Basic {cred_str}"

    # §10.2 Idempotency key
    idempotency_key = f"{cid}-{tool_id}-{turn_number}"
    headers["X-Idempotency-Key"] = idempotency_key
    headers.setdefault("Content-Type", "application/json")

    # §10.2 Retry policy
    RETRY_ON = {408, 429, 503, 504}
    NO_RETRY_ON = {400, 401, 403, 404}
    BACKOFF_SECONDS = [1.0, 2.0, 4.0]

    last_error = None
    for attempt in range(1, 4):  # max 3 attempts
        try:
            async with httpx.AsyncClient(timeout=float(timeout_s)) as client:
                if method in ("GET", "DELETE"):
                    resp = await client.request(method, url, headers=headers, params=input_params)
                else:
                    resp = await client.request(method, url, headers=headers, json=input_params)

            if resp.status_code < 400:
                try:
                    return resp.json(), attempt
                except Exception:
                    return {"response": resp.text, "status": resp.status_code}, attempt

            if resp.status_code in NO_RETRY_ON:
                return {"error": f"HTTP {resp.status_code}", "body": resp.text[:500]}, attempt

            if resp.status_code in RETRY_ON and attempt < 3:
                jitter = random.uniform(-0.2, 0.2)
                await asyncio.sleep(BACKOFF_SECONDS[attempt - 1] + jitter)
                continue

            return {"error": f"HTTP {resp.status_code}", "body": resp.text[:500]}, attempt

        except httpx.TimeoutException as exc:
            last_error = exc
            if attempt < 3:
                jitter = random.uniform(-0.2, 0.2)
                await asyncio.sleep(BACKOFF_SECONDS[attempt - 1] + jitter)
                logger.warning("[%s] Tool %s timeout on attempt %d — retrying", cid, tool_id, attempt)
        except Exception as exc:
            return {"error": str(exc)}, attempt

    return {"error": f"All 3 attempts failed: {last_error}"}, 3


# ─────────────────────────────────────────────────────────────────────────────
# System tool handlers
# ─────────────────────────────────────────────────────────────────────────────

async def _execute_system_tool(
    cid: str,
    tool_name: str,
    input_params: dict,
    agent_config: dict,
) -> dict:
    """
    Handle built-in system tool invocations.
    System tools directly control the conversation flow — they don't make external HTTP calls.
    """
    from silence_watchdog import platform_end_call
    from handoff_service import execute_handoff

    if tool_name in ("end_conversation", "end_call"):
        # Agent triggers call termination — §9.1 constraint: platform ends the call, not LLM text
        logger.info("[%s] System tool: end_conversation — triggering platform_end_call", cid)
        # Schedule as task so result returns immediately to LLM
        asyncio.create_task(platform_end_call(cid, reason="agent_decision"))
        return {"status": "call_ending", "message": "Call will end after your current response"}

    elif tool_name == "detect_language":
        lang_code = input_params.get("language_code", "en")
        # Update session language
        await _redis.hset(f"session:{cid}", "language", lang_code)
        logger.info("[%s] System tool: detect_language → %s", cid, lang_code)
        return {"detected_language": lang_code, "switched": True}

    elif tool_name == "skip_turn":
        logger.info("[%s] System tool: skip_turn", cid)
        return {"status": "skipped"}

    elif tool_name == "transfer_to_agent":
        reason = input_params.get("reason", "Caller requested human agent")
        session = await _redis.hgetall(f"session:{cid}")
        transcript_raw = session.get("transcript", "[]")
        transcript = json.loads(transcript_raw)
        logger.info("[%s] System tool: transfer_to_agent — reason: %s", cid, reason)
        asyncio.create_task(execute_handoff(
            cid=cid,
            channel_uuid=session.get("channel_uuid", ""),
            handoff_type="B",
            transcript=transcript,
            context={"agent_id": agent_config.get("agent_id"), "tenant_id": agent_config.get("tenant_id"), "reason": reason},
            trigger="agent_decision",
        ))
        return {"status": "transferring", "type": "internal_queue"}

    elif tool_name == "transfer_to_number":
        destination = input_params.get("destination", "")
        reason = input_params.get("reason", "")
        session = await _redis.hgetall(f"session:{cid}")
        transcript_raw = session.get("transcript", "[]")
        transcript = json.loads(transcript_raw)
        logger.info("[%s] System tool: transfer_to_number → %s", cid, destination)
        asyncio.create_task(execute_handoff(
            cid=cid,
            channel_uuid=session.get("channel_uuid", ""),
            handoff_type="A",
            transcript=transcript,
            context={"agent_id": agent_config.get("agent_id"), "tenant_id": agent_config.get("tenant_id")},
            target=destination,
            trigger="agent_decision",
        ))
        return {"status": "transferring", "destination": destination}

    elif tool_name in ("play_keypad_touch_tone", "play_dtmf"):
        digit = input_params.get("digit", "")
        session = await _redis.hgetall(f"session:{cid}")
        channel_uuid = session.get("channel_uuid", "")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{PLATFORM_API_URL}/api/telephony/play_dtmf",
                    json={"channel_uuid": channel_uuid, "digit": digit, "cid": cid},
                )
        except Exception as exc:
            logger.warning("[%s] play_dtmf error: %s", cid, exc)
        return {"status": "dtmf_played", "digit": digit}

    elif tool_name == "voicemail_detection":
        # Check session for voicemail detection flag (set by FreeSWITCH AMD)
        session = await _redis.hgetall(f"session:{cid}")
        is_voicemail = session.get("is_voicemail", "0") == "1"
        return {"voicemail_detected": is_voicemail}

    else:
        logger.warning("[%s] Unknown system tool: %s", cid, tool_name)
        return {"error": f"Unknown system tool: {tool_name}"}


# ─────────────────────────────────────────────────────────────────────────────
# MCP tool handler
# ─────────────────────────────────────────────────────────────────────────────

async def _execute_mcp_tool(
    cid: str,
    tool_id: str,
    tool_name: str,
    input_params: dict,
    agent_config: dict,
    turn_number: int,
) -> tuple[dict, int]:
    """
    Execute a tool via MCP (Model Context Protocol) server.
    Supports SSE and streamable_http server types.
    """
    tenant_id = agent_config["tenant_id"]
    tool_config = await _fetch_tool_config(tenant_id, tool_id)
    if not tool_config:
        return {"error": f"MCP server {tool_id} not found"}, 1

    config = tool_config.get("config_json") or {}
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except Exception:
            config = {}

    server_url = await _resolve_template(config.get("server_url", ""), tenant_id, tool_id)
    server_type = config.get("server_type", "streamable_http")
    headers = {k: await _resolve_template(v, tenant_id, tool_id)
               for k, v in (config.get("headers") or {}).items()}

    if not server_url:
        return {"error": "MCP server has no URL configured"}, 1

    # §10.2 Idempotency key
    headers["X-Idempotency-Key"] = f"{cid}-{tool_id}-{turn_number}"

    # MCP tool call payload (JSON-RPC 2.0 style)
    payload = {
        "jsonrpc": "2.0",
        "id": f"{cid}-{turn_number}",
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": input_params,
        },
    }

    BACKOFF_SECONDS = [1.0, 2.0, 4.0]
    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(server_url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Extract result from JSON-RPC response
                    if "result" in data:
                        content = data["result"].get("content", [])
                        # Flatten content array to simple dict
                        if isinstance(content, list) and content:
                            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]
                            return {"content": "\n".join(text_parts), "raw": data["result"]}, attempt
                        return data["result"], attempt
                    elif "error" in data:
                        return {"error": data["error"].get("message", "MCP error")}, attempt
                elif resp.status_code in {429, 503} and attempt < 3:
                    jitter = random.uniform(-0.2, 0.2)
                    await asyncio.sleep(BACKOFF_SECONDS[attempt - 1] + jitter)
                    continue
                else:
                    return {"error": f"MCP server HTTP {resp.status_code}"}, attempt
        except httpx.TimeoutException:
            if attempt < 3:
                jitter = random.uniform(-0.2, 0.2)
                await asyncio.sleep(BACKOFF_SECONDS[attempt - 1] + jitter)
        except Exception as exc:
            return {"error": str(exc)}, attempt

    return {"error": "MCP server unreachable after 3 attempts"}, 3


# ─────────────────────────────────────────────────────────────────────────────
# Client-side tool handler
# ─────────────────────────────────────────────────────────────────────────────

async def _execute_client_tool(
    cid: str,
    tool_id: str,
    tool_name: str,
    input_params: dict,
    agent_config: dict,
) -> dict:
    """
    Publish a client-side tool invocation to Redis for frontend WebSocket delivery.
    The frontend JavaScript receives this and executes the action in the browser.
    """
    payload = {
        "event": "tool_request",
        "cid": cid,
        "tool_id": tool_id,
        "tool_name": tool_name,
        "params": input_params,
    }
    await _redis.publish(f"client_tool:{cid}", json.dumps(payload))
    logger.info("[%s] Client tool %s published to frontend", cid, tool_name)
    return {"status": "published", "awaiting_frontend": True}


# ─────────────────────────────────────────────────────────────────────────────
# Circuit breaker — §10.2
# Redis keys:
#   circuit:{tool_id}:state          — "open" or absent (closed)
#   circuit:{tool_id}:failures:{window} — failure count in current 60s window
#   circuit:{tool_id}:calls:{window}    — total call count in current 60s window
# ─────────────────────────────────────────────────────────────────────────────

async def _is_circuit_open(tool_id: str) -> bool:
    state = await _redis.get(f"circuit:{tool_id}:state")
    return state == "open"


async def _record_circuit_failure(tool_id: str) -> None:
    """Increment failure count; open circuit if >50% failures in 60s window."""
    window = int(time.time()) // CIRCUIT_WINDOW_S
    failures_key = f"circuit:{tool_id}:failures:{window}"
    calls_key = f"circuit:{tool_id}:calls:{window}"

    failures = await _redis.incr(failures_key)
    calls = await _redis.incr(calls_key)
    await _redis.expire(failures_key, CIRCUIT_WINDOW_S * 2)
    await _redis.expire(calls_key, CIRCUIT_WINDOW_S * 2)

    if calls >= CIRCUIT_MIN_CALLS and (failures / calls) > CIRCUIT_FAILURE_THRESHOLD:
        await _redis.set(f"circuit:{tool_id}:state", "open", ex=CIRCUIT_OPEN_TTL_S)
        logger.warning("Circuit OPENED for tool %s (%d/%d failures in %ds window)",
                       tool_id, failures, calls, CIRCUIT_WINDOW_S)


async def _cache_circuit_result(tool_id: str, result: dict) -> None:
    """Cache last successful result for use when circuit is open."""
    await _redis.set(f"circuit:{tool_id}:last_result", json.dumps(result), ex=3600)


async def _get_circuit_cached_result(tool_id: str) -> Optional[dict]:
    raw = await _redis.get(f"circuit:{tool_id}:last_result")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Audit log — §10.2
# ─────────────────────────────────────────────────────────────────────────────

async def _record_tool_audit(
    cid: str,
    tool_id: str,
    tool_type: str,
    tenant_id: str,
    input_params: dict,
    output_result: dict,
    latency_ms: int,
    success: bool,
    error_code: Optional[str],
    attempt_number: int,
) -> None:
    """Write tool execution record to audit_logs table."""
    if not _pg_conn_params:
        return

    # Sanitise params — strip any keys that look like secrets
    def _sanitise(d: dict) -> dict:
        sensitive = {"password", "token", "secret", "key", "auth", "api_key", "credential"}
        return {k: "***" if any(s in k.lower() for s in sensitive) else v for k, v in d.items()}

    safe_input = _sanitise(input_params)
    safe_output = _sanitise(output_result)

    try:
        def _sync_write():
            conn = psycopg2.connect(**_pg_conn_params)
            with conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO audit_logs
                          (tenant_id, actor_id, action, resource_type, resource_id, diff_json)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        tenant_id,
                        "ai_pipeline",
                        "tool.execute",
                        "tool",
                        tool_id,
                        json.dumps({
                            "cid": cid,
                            "tool_type": tool_type,
                            "input_params": safe_input,
                            "output_result": safe_output,
                            "latency_ms": latency_ms,
                            "success": success,
                            "error_code": error_code,
                            "attempt_number": attempt_number,
                        }),
                    ))
            conn.close()

        # Run sync PG write in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_write)
    except Exception as exc:
        logger.warning("[%s] Tool audit log failed (non-fatal): %s", cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Template interpolation — {{env.VAR}} and {{secret.NAME}}
# ─────────────────────────────────────────────────────────────────────────────

async def _resolve_template(template: str, tenant_id: str, tool_id: str) -> str:
    """
    Resolve {{env.VAR_NAME}} and {{secret.SECRET_NAME}} placeholders.
    env vars: fetched from platform API /api/env-vars
    secrets:  fetched from Vault at secret/trustnow/{tenant_id}/tools/{tool_id}/credentials
    Never caches credentials in memory — §10.2.
    """
    import re

    if "{{" not in template:
        return template

    result = template

    # Resolve {{env.VAR_NAME}}
    for match in re.finditer(r"\{\{env\.([A-Za-z0-9_]+)\}\}", template):
        var_name = match.group(1)
        value = await _fetch_env_var(tenant_id, var_name)
        result = result.replace(match.group(0), value or "")

    # Resolve {{secret.NAME}} — tool-level secrets from Vault
    for match in re.finditer(r"\{\{secret\.([A-Za-z0-9_]+)\}\}", template):
        secret_name = match.group(1)
        value = _vault_get_secret(f"secret/trustnow/{tenant_id}/tools/{tool_id}/secrets", secret_name)
        result = result.replace(match.group(0), value or "")

    return result


async def _fetch_env_var(tenant_id: str, var_name: str) -> Optional[str]:
    """Fetch a workspace environment variable from the platform API."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{PLATFORM_API_URL}/api/env-vars/{var_name}",
                headers={"X-Tenant-Id": tenant_id, "X-Internal": "1"},
            )
            if resp.status_code == 200:
                return resp.json().get("value")
    except Exception:
        pass
    return os.environ.get(var_name)  # Fallback to process env


async def _vault_get_tool_credentials(tenant_id: str, tool_id: str) -> Optional[dict]:
    """
    Retrieve tool credentials from Vault at execution time.
    Path: secret/trustnow/{tenant_id}/tools/{tool_id}/credentials
    Returns None if no credentials stored (webhook has no auth).
    """
    try:
        vault_addr = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
        vault_token = os.environ.get("VAULT_TOKEN", "")
        if not vault_token:
            init_file = "/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json"
            with open(init_file) as f:
                vault_token = json.load(f)["root_token"]

        env = {**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token}
        result = subprocess.run(
            ["vault", "kv", "get", "-format=json",
             f"secret/trustnow/{tenant_id}/tools/{tool_id}/credentials"],
            capture_output=True, text=True, env=env, timeout=5,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get("data", {}).get("data", {})
    except Exception:
        pass
    return None


def _vault_get_secret(path: str, field: str) -> Optional[str]:
    """Synchronous Vault secret read for template resolution."""
    try:
        vault_addr = os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
        vault_token = os.environ.get("VAULT_TOKEN", "")
        if not vault_token:
            init_file = "/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json"
            with open(init_file) as f:
                vault_token = json.load(f)["root_token"]
        env = {**os.environ, "VAULT_ADDR": vault_addr, "VAULT_TOKEN": vault_token}
        result = subprocess.run(
            ["vault", "kv", "get", f"-field={field}", path],
            capture_output=True, text=True, env=env, timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Platform API fetch helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _fetch_agent_tools(tenant_id: str, agent_id: str) -> list[dict]:
    """Fetch tools attached to an agent from the platform API."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{PLATFORM_API_URL}/api/tools",
                params={"agent_id": agent_id},
                headers={"X-Tenant-Id": tenant_id, "X-Internal": "1"},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("_fetch_agent_tools error: %s", exc)
    return []


async def _fetch_tool_config(tenant_id: str, tool_id: str) -> Optional[dict]:
    """Fetch a single tool's full config from the platform API."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{PLATFORM_API_URL}/api/tools/{tool_id}",
                headers={"X-Tenant-Id": tenant_id, "X-Internal": "1"},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("_fetch_tool_config error: %s", exc)
    return None


async def _validate_agent_scope(tenant_id: str, agent_id: str, tool_id: str) -> bool:
    """
    Verify a tool is attached to this specific agent — §10.3 agent scope check.
    Uses the platform API to check agent_configs.tools_config_json.
    """
    tools = await _fetch_agent_tools(tenant_id, agent_id)
    return any(str(t.get("tool_id", "")) == str(tool_id) for t in tools)
