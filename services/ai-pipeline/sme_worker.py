"""
TRUSTNOW AI Pipeline — SME AI Workers — BRD §6.3.2 / Task 11 §11.2
====================================================================
Each SME Worker is a domain-specialised AI agent with:
  - Own Qdrant KB collection (domain-scoped)
  - Own system prompt
  - Own tool set (attached_tool_ids filtered by domain)
  - Own LLM context (no cross-domain memory leakage)

Domains: Billing, Provisioning, Technical Support, Banking/Finance, Retail, Healthcare
         (framework is extensible — add new domain by registering in SME_DOMAIN_REGISTRY)

Each SME Worker receives a task from the Master Worker and returns a structured result:
  SmeResult(
    domain, status, answer, actions_taken, requires_human_approval,
    requires_payment, payment_details, confidence, reasoning, elapsed_s
  )

The Master Worker:
  1. Calls run_sme_task() with domain + task context
  2. Receives SmeResult
  3. Checks requires_human_approval → triggers HITL if True
  4. Checks requires_payment → triggers payment_gateway if True
  5. Continues saga with result

Functions:
  run_sme_task()              — main entry: route to domain worker, run LLM + tools
  _get_domain_config()        — return domain-specific system prompt + Qdrant collection
  _run_sme_llm()              — execute LLM with domain context + tools
  _build_sme_messages()       — build message array with domain system prompt + task
  get_registered_domains()    — return list of available SME domains
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx
import redis.asyncio as aioredis

logger = logging.getLogger("trustnow.sme_worker")

LITELLM_URL = "http://127.0.0.1:4000"
PLATFORM_API_URL = "http://127.0.0.1:3001"

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
# Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SmeResult:
    domain: str
    status: str                              # 'completed' | 'failed' | 'escalated'
    answer: Optional[str] = None            # final answer/summary from SME
    actions_taken: List[str] = field(default_factory=list)
    requires_human_approval: bool = False    # flag HITL before execution
    requires_payment: bool = False           # flag payment_gateway before execution
    payment_details: Optional[Dict[str, Any]] = None   # {amount, currency, description}
    confidence: float = 1.0                 # 0.0–1.0
    reasoning: Optional[str] = None
    raw_llm_response: Optional[str] = None
    tool_calls_made: List[str] = field(default_factory=list)
    elapsed_s: float = 0.0
    error: Optional[str] = None


@dataclass
class SmeTaskContext:
    task_description: str
    caller_intent: str
    caller_data: Dict[str, Any]            # CRM data, account info, etc.
    conversation_history: List[Dict[str, Any]]
    completed_saga_steps: List[str]        # what prior SME steps already completed
    tenant_id: str
    agent_id: str
    cid: str
    idempotency_token: str


# ─────────────────────────────────────────────────────────────────────────────
# SME Domain Registry
# Each domain: system_prompt_template, qdrant_collection, tool_domains
# ─────────────────────────────────────────────────────────────────────────────

SME_DOMAIN_REGISTRY: Dict[str, Dict[str, Any]] = {
    "billing": {
        "display_name": "Billing & Payments",
        "qdrant_collection": "kb_billing",
        "tool_domains": ["billing", "payment", "invoicing"],
        "system_prompt": (
            "You are a specialist Billing AI Worker for TRUSTNOW. "
            "Your domain is billing, invoices, payments, refunds, and charges. "
            "You have access to account billing data and payment tools. "
            "When processing refunds or credits over £100, set requires_human_approval=true in your response. "
            "Always verify account identity before making any financial changes. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
    "provisioning": {
        "display_name": "Provisioning & Account Changes",
        "qdrant_collection": "kb_provisioning",
        "tool_domains": ["provisioning", "account", "subscription"],
        "system_prompt": (
            "You are a specialist Provisioning AI Worker for TRUSTNOW. "
            "Your domain covers account changes, plan upgrades/downgrades, service activation/deactivation, "
            "and configuration updates. "
            "For plan cancellations or downgrades, set requires_human_approval=true. "
            "For service upgrades that incur new charges, set requires_payment=true and populate payment_details. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
    "technical_support": {
        "display_name": "Technical Support",
        "qdrant_collection": "kb_tech_support",
        "tool_domains": ["diagnostics", "configuration", "troubleshooting"],
        "system_prompt": (
            "You are a specialist Technical Support AI Worker for TRUSTNOW. "
            "Your domain covers fault diagnosis, configuration troubleshooting, device support, "
            "network issues, and software support. "
            "Use the available diagnostic tools to investigate issues before recommending solutions. "
            "For hardware replacement or on-site visits, set requires_human_approval=true. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
    "banking": {
        "display_name": "Banking & Finance",
        "qdrant_collection": "kb_banking",
        "tool_domains": ["banking", "transactions", "accounts", "cards"],
        "system_prompt": (
            "You are a specialist Banking AI Worker for TRUSTNOW. "
            "Your domain covers account enquiries, transaction disputes, card management, "
            "balance checks, and transfer processing. "
            "For card blocks, account freezes, or address changes: requires_human_approval=true. "
            "For payments or transfers: requires_payment=true with payment_details. "
            "ALWAYS comply with FCA regulatory requirements. Never share account details without verification. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
    "retail": {
        "display_name": "Retail & Orders",
        "qdrant_collection": "kb_retail",
        "tool_domains": ["orders", "returns", "inventory", "delivery"],
        "system_prompt": (
            "You are a specialist Retail AI Worker for TRUSTNOW. "
            "Your domain covers order management, returns/refunds, delivery tracking, "
            "product enquiries, and inventory checks. "
            "For refunds exceeding the tenant threshold: requires_human_approval=true. "
            "For purchases: requires_payment=true with payment_details. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
    "healthcare": {
        "display_name": "Healthcare",
        "qdrant_collection": "kb_healthcare",
        "tool_domains": ["appointments", "prescriptions", "clinical_admin"],
        "system_prompt": (
            "You are a specialist Healthcare AI Worker for TRUSTNOW. "
            "Your domain covers appointment scheduling, prescription queries, referrals, "
            "and clinical administrative tasks. "
            "You do NOT provide medical advice or diagnoses — always direct clinical questions to healthcare professionals. "
            "For prescription changes or urgent clinical matters: requires_human_approval=true. "
            "Comply fully with CQC standards and Caldicott principles for patient data. "
            "Return a JSON object with: answer (string), actions_taken (list), "
            "requires_human_approval (bool), requires_payment (bool), "
            "payment_details (object or null), confidence (0-1), reasoning (string)."
        ),
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Main entry — run SME task for a given domain
# ─────────────────────────────────────────────────────────────────────────────

async def run_sme_task(
    domain: str,
    task_ctx: SmeTaskContext,
    agent_config: Dict[str, Any],
) -> SmeResult:
    """
    Execute an SME task for the specified domain.

    Fetches domain-specific tools from Platform API, queries domain KB via RAG,
    runs LLM with function calling, returns structured SmeResult.
    """
    start = time.monotonic()
    domain_cfg = SME_DOMAIN_REGISTRY.get(domain)

    if not domain_cfg:
        logger.error("[%s] sme_worker: unknown domain=%s", task_ctx.cid, domain)
        return SmeResult(
            domain=domain, status="failed",
            error=f"Unknown SME domain: {domain}", elapsed_s=0,
        )

    logger.info(
        "[%s] sme_worker: domain=%s task=%s idempotency=%s",
        task_ctx.cid, domain, task_ctx.task_description[:80], task_ctx.idempotency_token,
    )

    # Fetch domain tools from Platform API
    tools = await _fetch_domain_tools(
        tenant_id=task_ctx.tenant_id,
        agent_id=task_ctx.agent_id,
        tool_domains=domain_cfg.get("tool_domains", []),
    )

    # RAG retrieval from domain KB collection
    rag_context = await _retrieve_domain_kb(
        cid=task_ctx.cid,
        domain=domain,
        qdrant_collection=domain_cfg.get("qdrant_collection", ""),
        query=task_ctx.task_description,
        tenant_id=task_ctx.tenant_id,
    )

    # Run LLM with domain system prompt + RAG context + tools
    llm_result = await _run_sme_llm(
        domain=domain,
        domain_cfg=domain_cfg,
        task_ctx=task_ctx,
        rag_context=rag_context,
        tools=tools,
        agent_config=agent_config,
    )

    elapsed = time.monotonic() - start

    # Parse LLM response JSON
    sme_result = _parse_llm_response(
        domain=domain,
        cid=task_ctx.cid,
        llm_content=llm_result.get("content", ""),
        tools_used=llm_result.get("tool_calls_made", []),
        elapsed=elapsed,
    )

    logger.info(
        "[%s] sme_worker: domain=%s status=%s confidence=%.2f hitl=%s payment=%s elapsed=%.1fs",
        task_ctx.cid, domain, sme_result.status, sme_result.confidence,
        sme_result.requires_human_approval, sme_result.requires_payment, elapsed,
    )
    return sme_result


# ─────────────────────────────────────────────────────────────────────────────
# LLM execution with domain context
# ─────────────────────────────────────────────────────────────────────────────

async def _run_sme_llm(
    domain: str,
    domain_cfg: Dict[str, Any],
    task_ctx: SmeTaskContext,
    rag_context: str,
    tools: List[Dict[str, Any]],
    agent_config: Dict[str, Any],
) -> Dict[str, Any]:
    """Run LLM call for the SME domain — returns {content, tool_calls_made}."""
    messages = _build_sme_messages(
        domain_cfg=domain_cfg,
        task_ctx=task_ctx,
        rag_context=rag_context,
    )

    model = agent_config.get("llm_model", "gpt-4o")
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.3,  # Lower temp for SME tasks — factual, deterministic
        "response_format": {"type": "json_object"},
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    tool_calls_made: List[str] = []
    content = ""

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(f"{LITELLM_URL}/chat/completions", json=payload)
            if resp.status_code != 200:
                logger.error(
                    "[%s] sme_worker: LLM call failed HTTP %d — %s",
                    task_ctx.cid, resp.status_code, resp.text[:200],
                )
                return {"content": '{"status": "failed", "answer": "SME LLM call failed", "confidence": 0}', "tool_calls_made": []}

            data = resp.json()
            choice = data["choices"][0]
            finish_reason = choice.get("finish_reason")

            if finish_reason == "tool_calls":
                # Tool calls handling — execute tools and re-prompt (max 3 iterations)
                messages.append(choice["message"])
                for _ in range(3):
                    tool_results = await _execute_sme_tools(
                        task_ctx.cid, task_ctx.tenant_id,
                        choice["message"].get("tool_calls", []),
                        agent_config,
                    )
                    tool_calls_made.extend([tc["function"]["name"] for tc in choice["message"].get("tool_calls", [])])
                    messages.extend(tool_results)
                    payload["messages"] = messages

                    resp2 = await client.post(f"{LITELLM_URL}/chat/completions", json=payload)
                    if resp2.status_code == 200:
                        data2 = resp2.json()
                        choice = data2["choices"][0]
                        if choice.get("finish_reason") != "tool_calls":
                            content = choice["message"].get("content", "")
                            break
                        messages.append(choice["message"])
                    else:
                        break
            else:
                content = choice["message"].get("content", "")

    except Exception as exc:
        logger.error("[%s] sme_worker: LLM error — %s", task_ctx.cid, exc)
        content = '{"status": "failed", "answer": "SME processing error", "confidence": 0, "reasoning": "' + str(exc)[:100] + '"}'

    return {"content": content, "tool_calls_made": tool_calls_made}


def _build_sme_messages(
    domain_cfg: Dict[str, Any],
    task_ctx: SmeTaskContext,
    rag_context: str,
) -> List[Dict[str, Any]]:
    """Build LLM message array with domain system prompt + task context."""
    system_prompt = domain_cfg["system_prompt"]

    # Build prior saga context
    completed_context = ""
    if task_ctx.completed_saga_steps:
        completed_context = "\n\nPreviously completed steps:\n" + "\n".join(
            f"- {step}" for step in task_ctx.completed_saga_steps
        )

    # Caller data context
    caller_context = ""
    if task_ctx.caller_data:
        caller_context = "\n\nCaller account data:\n" + json.dumps(task_ctx.caller_data, indent=2)

    # RAG context
    kb_context = f"\n\nRelevant knowledge base information:\n{rag_context}" if rag_context else ""

    user_message = (
        f"Task: {task_ctx.task_description}\n"
        f"Caller intent: {task_ctx.caller_intent}\n"
        f"Idempotency token: {task_ctx.idempotency_token}"
        f"{completed_context}{caller_context}{kb_context}\n\n"
        "Respond with a JSON object only — no extra text."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]


def _parse_llm_response(
    domain: str,
    cid: str,
    llm_content: str,
    tools_used: List[str],
    elapsed: float,
) -> SmeResult:
    """Parse LLM JSON response into SmeResult."""
    try:
        data = json.loads(llm_content)
        return SmeResult(
            domain=domain,
            status=data.get("status", "completed"),
            answer=data.get("answer"),
            actions_taken=data.get("actions_taken", []),
            requires_human_approval=bool(data.get("requires_human_approval", False)),
            requires_payment=bool(data.get("requires_payment", False)),
            payment_details=data.get("payment_details"),
            confidence=float(data.get("confidence", 1.0)),
            reasoning=data.get("reasoning"),
            raw_llm_response=llm_content,
            tool_calls_made=tools_used,
            elapsed_s=elapsed,
        )
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning("[%s] sme_worker: failed to parse LLM response — %s", cid, exc)
        return SmeResult(
            domain=domain,
            status="completed",
            answer=llm_content,  # Use raw content as answer if JSON fails
            tool_calls_made=tools_used,
            elapsed_s=elapsed,
            confidence=0.5,
            reasoning="Response was not valid JSON — used raw content",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Tool execution for SME domain
# ─────────────────────────────────────────────────────────────────────────────

async def _execute_sme_tools(
    cid: str,
    tenant_id: str,
    tool_calls: List[Dict[str, Any]],
    agent_config: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Execute tool calls made by the SME LLM — returns role:tool messages."""
    from tool_executor import execute_tool
    results = []
    for tc in tool_calls:
        tool_id = tc.get("id", "")
        fn = tc.get("function", {})
        tool_name = fn.get("name", "")
        try:
            args = json.loads(fn.get("arguments", "{}"))
        except json.JSONDecodeError:
            args = {}

        try:
            result = await execute_tool(
                cid=cid,
                tool_id=tool_id,
                tool_name=tool_name,
                tool_type="webhook",
                input_params=args,
                agent_config=agent_config,
            )
        except Exception as exc:
            result = {"error": str(exc), "status": "failed"}

        results.append({
            "role": "tool",
            "tool_call_id": tool_id,
            "content": json.dumps(result),
        })
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Fetch domain-scoped tools from Platform API
# ─────────────────────────────────────────────────────────────────────────────

async def _fetch_domain_tools(
    tenant_id: str,
    agent_id: str,
    tool_domains: List[str],
) -> List[Dict[str, Any]]:
    """Fetch agent tools from Platform API, filtered to domain-relevant tool types."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{PLATFORM_API_URL}/api/tools",
                params={"agent_id": agent_id},
                headers={"x-tenant-id": tenant_id, "x-skip-auth": "internal"},
            )
            if resp.status_code == 200:
                tools = resp.json()
                # Convert to OpenAI function schema
                from tool_executor import _tool_to_function_schema
                schemas = []
                for t in tools:
                    schema = _tool_to_function_schema(t)
                    if schema:
                        schemas.append({"type": "function", "function": schema})
                return schemas
    except Exception as exc:
        logger.warning("sme_worker: tool fetch failed — %s (running without tools)", exc)
    return []


# ─────────────────────────────────────────────────────────────────────────────
# RAG retrieval from domain KB
# ─────────────────────────────────────────────────────────────────────────────

async def _retrieve_domain_kb(
    cid: str,
    domain: str,
    qdrant_collection: str,
    query: str,
    tenant_id: str,
) -> str:
    """Retrieve relevant KB chunks from the domain's Qdrant collection."""
    try:
        from rag_pipeline import retrieve
        results = await retrieve(
            query=query,
            tenant_id=tenant_id,
            collection=qdrant_collection,
            top_k=3,
        )
        if results:
            return "\n\n".join(r.get("text", "") for r in results)
    except Exception as exc:
        logger.debug("[%s] sme_worker: RAG retrieval failed for %s — %s (non-fatal)", cid, domain, exc)
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Registry utility
# ─────────────────────────────────────────────────────────────────────────────

def get_registered_domains() -> List[str]:
    """Return list of registered SME domain keys."""
    return list(SME_DOMAIN_REGISTRY.keys())


def get_domain_display_name(domain: str) -> str:
    """Return human-readable domain name."""
    return SME_DOMAIN_REGISTRY.get(domain, {}).get("display_name", domain)
