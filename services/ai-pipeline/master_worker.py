"""
TRUSTNOW AI Pipeline — Master AI Worker — BRD §6.3.1 / Task 11 §11.1
======================================================================
10-step orchestration engine that drives the fully autonomous AI Worker call flow.

Steps:
  1. Greeting             — play welcome message from agent config
  2. Intent Capture       — LLM extracts caller intent + required domains
  3. Authentication       — auth_policy.py (OTP/PIN/KBA/ANI/biometric/webhook)
  4. Eligibility Check    — verify caller is eligible for requested service
  5. Dues Check           — check outstanding balances/obligations before proceeding
  6. Payment Gating       — if dues exist, dispatch payment link + await clearance
  7. Task Delegation      — run saga across required SME Workers with HITL where needed
  8. Progress Tracking    — MOH + LLM-generated updates during background processing
  9. Result Consolidation — merge all SME results into coherent caller response
  10. Final Response      — deliver answer, close call or hand off to human

Each step can be:
  - skipped (if not applicable per agent config or caller intent)
  - failed  (triggers compensation per saga strategy)
  - completed (result stored in Redis, saga continues)

The Master Worker runs as an asyncio task spawned from the session_manager
after the first-message path (Path 1) completes. It drives all subsequent
turns via turn_loop.handle_user_turn() and controls the call flow.

Redis state for each step stored under session:{CID} hash.

Functions:
  run_autonomous_session()    — main entry: called after first message delivered
  _step_intent_capture()      — LLM + structured output for intent extraction
  _step_authentication()      — delegates to auth_policy.authenticate_caller()
  _step_eligibility()         — checks account eligibility via SME or API
  _step_dues()                — checks outstanding dues via billing SME
  _step_payment_gating()      — delegates to payment_gateway.request_payment_link()
  _step_task_delegation()     — builds saga steps from intent, runs via saga_orchestrator
  _step_result_consolidation()— merges SME results with LLM summary
  _step_final_response()      — TTS final answer + call closure
  _build_intent_prompt()      — construct structured intent extraction prompt
  _deliver_message()          — TTS helper for Master Worker utterances
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import redis.asyncio as aioredis

import auth_policy
import payment_gateway
import progress_tracker
import sme_worker
from saga_orchestrator import (
    SagaStep, SagaResult, run_saga, save_saga_state, get_saga_state,
)
import hitl_service

logger = logging.getLogger("trustnow.master_worker")

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
class MasterWorkerContext:
    cid: str
    tenant_id: str
    agent_id: str
    channel_uuid: str
    agent_config: Dict[str, Any]
    caller_phone: Optional[str] = None
    internal_token: str = ""
    # Populated during orchestration
    caller_intent: Optional[str] = None
    required_domains: List[str] = field(default_factory=list)
    caller_data: Dict[str, Any] = field(default_factory=dict)
    auth_result: Optional[auth_policy.AuthResult] = None
    payment_result: Optional[payment_gateway.PaymentResult] = None
    saga_result: Optional[SagaResult] = None
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    step_results: Dict[str, Any] = field(default_factory=dict)
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# Main entry — run the full autonomous session
# ─────────────────────────────────────────────────────────────────────────────

async def run_autonomous_session(
    cid: str,
    tenant_id: str,
    agent_id: str,
    channel_uuid: str,
    agent_config: Dict[str, Any],
    caller_phone: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    internal_token: str = "",
) -> None:
    """
    Drive the full 10-step autonomous AI Worker call flow.
    Spawned as an asyncio task from session_manager after first-message delivery.
    """
    ctx = MasterWorkerContext(
        cid=cid,
        tenant_id=tenant_id,
        agent_id=agent_id,
        channel_uuid=channel_uuid,
        agent_config=agent_config,
        caller_phone=caller_phone,
        internal_token=internal_token,
        conversation_history=conversation_history or [],
    )

    logger.info("[%s] master_worker: autonomous session started agent=%s", cid, agent_id)

    # Check for crash-resume
    saved_state = await get_saga_state(cid)
    if saved_state:
        logger.info("[%s] master_worker: resuming from saved state step=%s", cid, saved_state.get("last_step"))
        ctx.caller_intent = saved_state.get("caller_intent")
        ctx.required_domains = saved_state.get("required_domains", [])
        ctx.caller_data = saved_state.get("caller_data", {})

    try:
        # ── Step 1: Intent Capture ───────────────────────────────────────────
        if not ctx.caller_intent:
            await _step_intent_capture(ctx)
        if not ctx.caller_intent:
            await _deliver_message(ctx, "I'm sorry, I wasn't quite able to understand what you need help with today. Let me connect you with one of my colleagues who can assist.")
            await _trigger_handoff(ctx, reason="intent_capture_failed")
            return

        # ── Step 2: Authentication ───────────────────────────────────────────
        auth_cfg = agent_config.get("auth_policy", {})
        if auth_cfg.get("enabled", False):
            await _step_authentication(ctx)
            if ctx.auth_result and not ctx.auth_result.verified:
                await _deliver_message(ctx, "I'm sorry, I wasn't able to verify your identity. For your security, I'm not able to proceed without verification. Please call us back if you'd like to try again.")
                await _end_call(ctx)
                return

        # ── Step 3: Eligibility Check ────────────────────────────────────────
        eligibility_check = agent_config.get("eligibility_check", {})
        if eligibility_check.get("enabled", False):
            eligible = await _step_eligibility(ctx)
            if not eligible:
                await _deliver_message(ctx, "I'm sorry, it looks like this service isn't available on your account. I can connect you with someone who can help clarify your options.")
                await _trigger_handoff(ctx, reason="not_eligible")
                return

        # ── Step 4: Dues Check ───────────────────────────────────────────────
        dues_check = agent_config.get("dues_check", {})
        dues_outstanding = False
        if dues_check.get("enabled", False):
            dues_outstanding = await _step_dues_check(ctx)

        # ── Step 5: Payment Gating ───────────────────────────────────────────
        if dues_outstanding:
            paid = await _step_payment_gating(ctx)
            if not paid:
                await _deliver_message(ctx, "I'm sorry, I wasn't able to process the outstanding balance. I'll connect you with our billing team for assistance.")
                await _trigger_handoff(ctx, reason="payment_not_cleared")
                return

        # ── Step 6: Task Delegation + Step 7: Progress Tracking ─────────────
        if ctx.required_domains:
            await _step_task_delegation(ctx)
        else:
            # No SME domains identified — give direct conversational response
            await _step_direct_response(ctx)
            return

        # ── Step 8: Result Consolidation ─────────────────────────────────────
        final_answer = await _step_result_consolidation(ctx)

        # ── Step 9: Final Response ───────────────────────────────────────────
        await _step_final_response(ctx, final_answer)

    except asyncio.CancelledError:
        logger.info("[%s] master_worker: session cancelled", cid)
        raise
    except Exception as exc:
        logger.error("[%s] master_worker: unhandled error — %s", cid, exc, exc_info=True)
        try:
            await _deliver_message(ctx, "I'm sorry, something unexpected happened. Let me connect you with a colleague who can help.")
            await _trigger_handoff(ctx, reason="master_worker_error")
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Intent Capture
# ─────────────────────────────────────────────────────────────────────────────

async def _step_intent_capture(ctx: MasterWorkerContext) -> None:
    """
    Use LLM to extract structured intent from conversation history.
    Populates ctx.caller_intent and ctx.required_domains.
    """
    logger.info("[%s] master_worker: step=intent_capture", ctx.cid)

    # Gather recent conversation turns
    recent_turns = ctx.conversation_history[-6:] if ctx.conversation_history else []
    history_text = "\n".join(
        f"{t.get('role', 'user').upper()}: {t.get('content', '')}"
        for t in recent_turns
    )

    available_domains = sme_worker.get_registered_domains()
    domain_list = ", ".join(available_domains)

    prompt = (
        f"Analyse this conversation and extract the caller's intent.\n\n"
        f"Conversation:\n{history_text}\n\n"
        f"Available SME domains: {domain_list}\n\n"
        "Return JSON with:\n"
        "  caller_intent: string (concise description of what the caller wants)\n"
        "  required_domains: array of domain names needed to fulfil this intent (can be empty if simple query)\n"
        "  caller_data: object of any account/personal data mentioned by caller\n"
        "  complexity: 'simple'|'moderate'|'complex'\n"
        "Respond with JSON only."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{LITELLM_URL}/chat/completions",
                json={
                    "model": ctx.agent_config.get("llm_model", "gpt-4o"),
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 512,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = json.loads(data["choices"][0]["message"]["content"])
                ctx.caller_intent = content.get("caller_intent", "")
                ctx.required_domains = [
                    d for d in content.get("required_domains", [])
                    if d in sme_worker.SME_DOMAIN_REGISTRY
                ]
                ctx.caller_data.update(content.get("caller_data", {}))
                logger.info(
                    "[%s] master_worker: intent=%s domains=%s complexity=%s",
                    ctx.cid, ctx.caller_intent[:80], ctx.required_domains, content.get("complexity"),
                )
                # Persist intent for crash-resume
                await save_saga_state(ctx.cid, {
                    "caller_intent": ctx.caller_intent,
                    "required_domains": ctx.required_domains,
                    "caller_data": ctx.caller_data,
                    "last_step": "intent_capture",
                })
    except Exception as exc:
        logger.error("[%s] master_worker: intent capture failed — %s", ctx.cid, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Authentication
# ─────────────────────────────────────────────────────────────────────────────

async def _step_authentication(ctx: MasterWorkerContext) -> None:
    """Delegate to auth_policy module."""
    logger.info("[%s] master_worker: step=authentication", ctx.cid)
    ctx.auth_result = await auth_policy.authenticate_caller(
        cid=ctx.cid,
        agent_config=ctx.agent_config,
        caller_phone=ctx.caller_phone,
    )
    ctx.step_results["authentication"] = {
        "verified": ctx.auth_result.verified,
        "method": ctx.auth_result.method_used,
    }
    logger.info(
        "[%s] master_worker: auth verified=%s method=%s",
        ctx.cid, ctx.auth_result.verified, ctx.auth_result.method_used,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Eligibility Check
# ─────────────────────────────────────────────────────────────────────────────

async def _step_eligibility(ctx: MasterWorkerContext) -> bool:
    """Check caller account eligibility via billing SME or Platform API."""
    logger.info("[%s] master_worker: step=eligibility", ctx.cid)
    eligibility_cfg = ctx.agent_config.get("eligibility_check", {})
    webhook_url = eligibility_cfg.get("webhook_url")

    if webhook_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    webhook_url,
                    json={"cid": ctx.cid, "caller_phone": ctx.caller_phone, "caller_data": ctx.caller_data},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    eligible = data.get("eligible", True)
                    ctx.step_results["eligibility"] = data
                    return eligible
        except Exception as exc:
            logger.warning("[%s] master_worker: eligibility webhook failed — %s (defaulting eligible)", ctx.cid, exc)

    # Default: eligible if no webhook configured
    ctx.step_results["eligibility"] = {"eligible": True, "source": "default"}
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Dues Check
# ─────────────────────────────────────────────────────────────────────────────

async def _step_dues_check(ctx: MasterWorkerContext) -> bool:
    """Check for outstanding balances. Returns True if dues exist."""
    logger.info("[%s] master_worker: step=dues_check", ctx.cid)
    dues_cfg = ctx.agent_config.get("dues_check", {})
    webhook_url = dues_cfg.get("webhook_url")

    if webhook_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    webhook_url,
                    json={"cid": ctx.cid, "caller_phone": ctx.caller_phone, "caller_data": ctx.caller_data},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    has_dues = data.get("has_outstanding_balance", False)
                    ctx.caller_data["outstanding_balance"] = data.get("amount", 0)
                    ctx.caller_data["outstanding_currency"] = data.get("currency", "GBP")
                    ctx.step_results["dues_check"] = data
                    if has_dues:
                        amount = data.get("amount", 0)
                        currency = data.get("currency", "GBP")
                        await _deliver_message(
                            ctx,
                            f"Before I can proceed, I can see there's an outstanding balance of "
                            f"{currency} {amount:.2f} on your account. "
                            "I'll send you a secure payment link now so we can clear this and continue.",
                        )
                    return has_dues
        except Exception as exc:
            logger.warning("[%s] master_worker: dues check webhook failed — %s (skipping)", ctx.cid, exc)

    ctx.step_results["dues_check"] = {"has_outstanding_balance": False, "source": "skipped"}
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Payment Gating
# ─────────────────────────────────────────────────────────────────────────────

async def _step_payment_gating(ctx: MasterWorkerContext) -> bool:
    """Dispatch payment link and await completion. Returns True if paid."""
    logger.info("[%s] master_worker: step=payment_gating", ctx.cid)
    amount = ctx.caller_data.get("outstanding_balance", 0)
    currency = ctx.caller_data.get("outstanding_currency", "GBP")

    result = await payment_gateway.request_payment_link(
        cid=ctx.cid,
        tenant_id=ctx.tenant_id,
        agent_config=ctx.agent_config,
        amount=float(amount),
        description="Outstanding account balance",
        caller_phone=ctx.caller_phone,
        currency=currency,
    )

    ctx.payment_result = result
    ctx.step_results["payment_gating"] = {
        "status": result.status,
        "amount": result.amount,
        "currency": result.currency,
        "reference": result.payment_reference,
    }

    if result.status == "completed":
        await _deliver_message(
            ctx,
            f"Thank you — I've confirmed receipt of your payment of {currency} {amount:.2f}. "
            "Let me now continue with your request.",
        )
        return True
    elif result.status == "timeout":
        await _deliver_message(
            ctx,
            "I haven't received confirmation of payment yet. "
            "The secure link is still valid if you'd like to complete it. "
            "I'll need to transfer you to our billing team to continue.",
        )
    elif result.status == "cancelled":
        await _deliver_message(
            ctx,
            "No problem — I've cancelled the payment request. "
            "Please let me know if you'd like to try again or if I can help you another way.",
        )

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Steps 6–7: Task Delegation + Progress Tracking
# ─────────────────────────────────────────────────────────────────────────────

async def _step_task_delegation(ctx: MasterWorkerContext) -> None:
    """
    Build saga steps for required SME domains, start hold with progress tracking,
    run saga, stop hold when complete.
    """
    logger.info("[%s] master_worker: step=task_delegation domains=%s", ctx.cid, ctx.required_domains)

    # Build saga steps — one per required domain
    steps: List[SagaStep] = []
    for i, domain in enumerate(ctx.required_domains):
        step_kwargs = {
            "domain": domain,
            "task_ctx": sme_worker.SmeTaskContext(
                task_description=ctx.caller_intent or "",
                caller_intent=ctx.caller_intent or "",
                caller_data=ctx.caller_data,
                conversation_history=ctx.conversation_history,
                completed_saga_steps=[],
                tenant_id=ctx.tenant_id,
                agent_id=ctx.agent_id,
                cid=ctx.cid,
                idempotency_token=f"{ctx.cid}-{i+1}-{domain}",
            ),
            "agent_config": ctx.agent_config,
        }

        # Determine compensation strategy from agent config
        domain_cfg = ctx.agent_config.get("sme_config", {}).get(domain, {})
        compensation = domain_cfg.get("compensation_strategy", "halt")

        steps.append(SagaStep(
            step_number=i + 1,
            sme_domain=domain,
            action=f"Processing {sme_worker.get_domain_display_name(domain)} request",
            execute_fn=_execute_sme_with_hitl,
            execute_kwargs={
                "domain": domain,
                "ctx": ctx,
            },
            compensation_strategy=compensation,
            retry_count=domain_cfg.get("retry_count", 2),
            retry_delay_s=2.0,
            parallel=domain_cfg.get("parallel", False),
        ))

    # Start hold with progress tracking
    initial_task = f"processing your {', '.join(sme_worker.get_domain_display_name(d) for d in ctx.required_domains)} request"
    await progress_tracker.start_hold(
        cid=ctx.cid,
        tenant_id=ctx.tenant_id,
        channel_uuid=ctx.channel_uuid,
        agent_config=ctx.agent_config,
        initial_task_description=initial_task,
        internal_token=ctx.internal_token,
    )

    try:
        # Run saga
        ctx.saga_result = await run_saga(
            cid=ctx.cid,
            tenant_id=ctx.tenant_id,
            steps=steps,
            context={"master_ctx": ctx.step_results},
        )
        ctx.step_results["task_delegation"] = {
            "status": ctx.saga_result.status,
            "completed": [s.sme_domain for s in ctx.saga_result.completed_steps],
            "failed": [s.sme_domain for s in ctx.saga_result.failed_steps],
            "skipped": [s.sme_domain for s in ctx.saga_result.skipped_steps],
        }
    finally:
        # Always stop hold — even if saga fails
        await progress_tracker.stop_hold(
            cid=ctx.cid,
            channel_uuid=ctx.channel_uuid,
            internal_token=ctx.internal_token,
        )


async def _execute_sme_with_hitl(
    cid: str,
    tenant_id: str,
    idempotency_token: str,
    context: Dict[str, Any],
    domain: str,
    ctx: MasterWorkerContext,
) -> Dict[str, Any]:
    """
    Execute an SME task with HITL check if required.
    This function signature matches what saga_orchestrator expects from execute_fn.
    """
    completed_so_far = [s.sme_domain for s in (ctx.saga_result.completed_steps if ctx.saga_result else [])]
    task_ctx = sme_worker.SmeTaskContext(
        task_description=ctx.caller_intent or "",
        caller_intent=ctx.caller_intent or "",
        caller_data=ctx.caller_data,
        conversation_history=ctx.conversation_history,
        completed_saga_steps=completed_so_far,
        tenant_id=ctx.tenant_id,
        agent_id=ctx.agent_id,
        cid=cid,
        idempotency_token=idempotency_token,
    )

    result = await sme_worker.run_sme_task(
        domain=domain,
        task_ctx=task_ctx,
        agent_config=ctx.agent_config,
    )

    # Update progress state
    await progress_tracker.update_progress(
        cid=cid,
        completed_task=sme_worker.get_domain_display_name(domain),
        next_task=None,
    )

    # HITL gate
    if result.requires_human_approval or hitl_service.is_hitl_required(
        ctx.agent_config, domain, result.payment_details.get("amount") if result.payment_details else None,
        result.requires_human_approval,
    ):
        hitl_decision = await hitl_service.request_hitl_approval(
            cid=cid,
            tenant_id=tenant_id,
            agent_id=ctx.agent_id,
            agent_config=ctx.agent_config,
            action_type=domain,
            action_description=result.answer or f"{domain} action",
            amount=result.payment_details.get("amount") if result.payment_details else None,
            currency=result.payment_details.get("currency", "GBP") if result.payment_details else "GBP",
            sme_domain=domain,
        )

        if hitl_decision.decision != "approve":
            raise Exception(f"HITL decision={hitl_decision.decision} for domain={domain}")

    # Payment gate
    if result.requires_payment and result.payment_details:
        pd = result.payment_details
        pay_result = await payment_gateway.request_payment_link(
            cid=cid,
            tenant_id=tenant_id,
            agent_config=ctx.agent_config,
            amount=float(pd.get("amount", 0)),
            description=pd.get("description", f"Payment for {domain} service"),
            caller_phone=ctx.caller_phone,
            currency=pd.get("currency", "GBP"),
        )
        if pay_result.status != "completed":
            raise Exception(f"Payment not completed for domain={domain} status={pay_result.status}")

    if result.status == "failed":
        raise Exception(result.error or f"SME {domain} returned failed status")

    return {
        "domain": result.domain,
        "answer": result.answer,
        "actions_taken": result.actions_taken,
        "confidence": result.confidence,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Step 8: Result Consolidation
# ─────────────────────────────────────────────────────────────────────────────

async def _step_result_consolidation(ctx: MasterWorkerContext) -> str:
    """
    Merge all SME results into a coherent, natural response for the caller.
    Uses LLM with the agent's voice personality.
    """
    logger.info("[%s] master_worker: step=result_consolidation", ctx.cid)

    if not ctx.saga_result:
        return "I've completed your request. Is there anything else I can help you with?"

    # Build summary of what was completed/failed/skipped
    completed_summaries = []
    for step in ctx.saga_result.completed_steps:
        result = step.result or {}
        if result.get("answer"):
            completed_summaries.append(f"{sme_worker.get_domain_display_name(step.sme_domain)}: {result['answer']}")

    failed_domains = [sme_worker.get_domain_display_name(s.sme_domain) for s in ctx.saga_result.failed_steps]
    skipped_domains = [sme_worker.get_domain_display_name(s.sme_domain) for s in ctx.saga_result.skipped_steps]

    personality = ctx.agent_config.get("voice_personality", "professional and friendly")

    prompt = (
        f"You are a {personality} AI assistant. "
        f"You have just completed tasks for a caller who needed help with: {ctx.caller_intent}\n\n"
        f"Completed results:\n" + ("\n".join(f"- {s}" for s in completed_summaries) or "None") + "\n"
        + (f"\nCould not complete: {', '.join(failed_domains)}\n" if failed_domains else "")
        + (f"\nSkipped: {', '.join(skipped_domains)}\n" if skipped_domains else "")
        + "\nGenerate a single natural, conversational response (2-4 sentences) that:\n"
        "1. Summarises what was accomplished\n"
        "2. If anything failed, acknowledges it and offers next steps\n"
        "3. Ends with asking if there's anything else you can help with\n"
        "Do not use placeholder text. Sound warm and natural."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{LITELLM_URL}/chat/completions",
                json={
                    "model": ctx.agent_config.get("llm_model", "gpt-4o"),
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 256,
                    "temperature": 0.7,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning("[%s] master_worker: result consolidation LLM failed — %s", ctx.cid, exc)

    # Fallback response
    if completed_summaries:
        return "I've completed your request. " + " ".join(completed_summaries[:2]) + " Is there anything else I can help with?"
    return "I've looked into your request. Is there anything else I can help you with today?"


# ─────────────────────────────────────────────────────────────────────────────
# Step 9: Final Response
# ─────────────────────────────────────────────────────────────────────────────

async def _step_final_response(ctx: MasterWorkerContext, final_answer: str) -> None:
    """Deliver final answer and handle call closure or continuation."""
    logger.info("[%s] master_worker: step=final_response", ctx.cid)
    await _deliver_message(ctx, final_answer)

    # If saga halted (unresolvable failure), trigger handoff
    if ctx.saga_result and ctx.saga_result.status == "halted":
        await asyncio.sleep(1.5)
        await _trigger_handoff(ctx, reason=ctx.saga_result.halt_reason or "saga_halted")


async def _step_direct_response(ctx: MasterWorkerContext) -> None:
    """
    Handle simple queries that don't require SME delegation.
    Deliver direct LLM response using agent system prompt.
    """
    logger.info("[%s] master_worker: step=direct_response (no SME domains required)", ctx.cid)
    # Return to normal conversational turn loop — turn_loop.handle_user_turn() handles this
    # Master Worker just exits; session_manager continues with normal turns
    return


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _deliver_message(ctx: MasterWorkerContext, text: str) -> None:
    """Deliver a TTS message to the caller via Platform API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"{PLATFORM_API_URL}/api/telephony/play_audio",
                json={
                    "cid": ctx.cid,
                    "channel_uuid": ctx.channel_uuid,
                    "text": text,
                    "voice_id": ctx.agent_config.get("voice_id"),
                    "partition": ctx.agent_config.get("partition", "cloud"),
                },
                headers={"Authorization": f"Bearer {ctx.internal_token}"},
            )
    except Exception as exc:
        logger.warning("[%s] master_worker: TTS delivery failed — %s", ctx.cid, exc)


async def _trigger_handoff(ctx: MasterWorkerContext, reason: str) -> None:
    """Trigger human handoff with full context."""
    from handoff_service import execute_handoff
    try:
        await execute_handoff(
            cid=ctx.cid,
            channel_uuid=ctx.channel_uuid,
            handoff_type="B",
            transcript=ctx.conversation_history,
            context={
                "agent_id": ctx.agent_id,
                "tenant_id": ctx.tenant_id,
                "caller_intent": ctx.caller_intent,
                "completed_steps": ctx.step_results,
                "saga_result": {
                    "status": ctx.saga_result.status,
                    "next_best_action": ctx.saga_result.next_best_action,
                } if ctx.saga_result else {},
                "reason": reason,
            },
            trigger=reason,
        )
    except Exception as exc:
        logger.error("[%s] master_worker: handoff failed — %s", ctx.cid, exc)


async def _end_call(ctx: MasterWorkerContext) -> None:
    """Gracefully end the call via Platform API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{PLATFORM_API_URL}/api/telephony/hangup",
                json={"cid": ctx.cid, "channel_uuid": ctx.channel_uuid},
                headers={"Authorization": f"Bearer {ctx.internal_token}"},
            )
    except Exception as exc:
        logger.warning("[%s] master_worker: end call failed — %s", ctx.cid, exc)
