import {
  Controller, Post, Get, Param, Body, UseGuards, SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import Redis from 'ioredis';

// Internal-only endpoints — bypass JWT for AI pipeline callbacks
const SkipAuth = () => SetMetadata('isPublic', true);

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

// ── Supervisor HITL endpoints (JWT-protected) ─────────────────────────────

@ApiTags('hitl')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hitl')
export class HitlController {
  constructor(private audit: AuditService) {}

  @Get('pending')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List all pending HITL approval requests for this tenant' })
  async listPending(@TenantId() tid: string) {
    // Fetch all hitl_pending:* keys from Redis — supervisor sees all pending requests
    const keys = await redis.keys('hitl_pending:*');
    const requests = [];
    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.tenant_id === tid) {
            requests.push(data);
          }
        } catch {
          // skip malformed
        }
      }
    }
    return requests;
  }

  @Get(':cid')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get pending HITL request for a specific CID' })
  async getPending(@TenantId() tid: string, @Param('cid') cid: string) {
    const raw = await redis.get(`hitl_pending:${cid}`);
    if (!raw) return { pending: false };
    const data = JSON.parse(raw);
    if (data.tenant_id !== tid) return { pending: false };
    return { pending: true, ...data };
  }

  @Post(':cid/approve')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Approve a HITL request — AI Worker proceeds with action' })
  async approve(
    @TenantId() tid: string,
    @Param('cid') cid: string,
    @Body() dto: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this._writeDecision(tid, cid, 'approve', user, dto.notes);
  }

  @Post(':cid/reject')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Reject a HITL request — AI Worker informs caller and offers alternatives' })
  async reject(
    @TenantId() tid: string,
    @Param('cid') cid: string,
    @Body() dto: { notes?: string },
    @CurrentUser() user: any,
  ) {
    return this._writeDecision(tid, cid, 'reject', user, dto.notes);
  }

  private async _writeDecision(
    tenantId: string,
    cid: string,
    decision: 'approve' | 'reject',
    user: any,
    notes?: string,
  ) {
    // Validate the pending request belongs to this tenant
    const raw = await redis.get(`hitl_pending:${cid}`);
    if (!raw) {
      return { success: false, error: 'No pending HITL request found for this CID' };
    }
    const pending = JSON.parse(raw);
    if (pending.tenant_id !== tenantId) {
      return { success: false, error: 'HITL request does not belong to this tenant' };
    }

    // Write decision to Redis — AI Pipeline hitl_service.py polls this key
    const decisionData = JSON.stringify({
      decision,
      supervisor_id: user.user_id,
      supervisor_email: user.email,
      notes: notes || null,
      decided_at: new Date().toISOString(),
    });
    await redis.setex(`hitl_decision:${cid}`, 300, decisionData);

    // Audit log
    const pool = getPool();
    await this.audit.log({
      tenant_id: tenantId,
      actor_id: user.user_id,
      action: `hitl.${decision}`,
      resource_type: 'conversation',
      resource_id: cid,
      diff_json: {
        action_type: pending.action_type,
        amount: pending.amount,
        currency: pending.currency,
        notes,
        decision,
      },
    });

    return { success: true, decision, cid, decided_by: user.email };
  }
}


// ── Payment webhook receiver — internal endpoint (SkipAuth) ──────────────

@ApiTags('payments')
@Controller('payments')
export class PaymentWebhookController {
  @Post('webhook')
  @SkipAuth()
  @ApiOperation({ summary: 'Inbound payment completion webhook from payment provider — internal' })
  async receivePaymentWebhook(@Body() body: any) {
    // Payment providers call this when payment completes/fails
    // body must contain: cid, status ('completed'|'failed'|'cancelled')
    const { cid, status, reference } = body;
    if (!cid || !status) {
      return { received: false, error: 'Missing cid or status' };
    }
    const validStatuses = ['completed', 'failed', 'cancelled'];
    const resolvedStatus = validStatuses.includes(status) ? status : 'failed';
    await redis.setex(`payment_status:${cid}`, 360, resolvedStatus);
    return { received: true, cid, status: resolvedStatus };
  }
}


// ── AI Pipeline internal HITL resolve endpoint (SkipAuth) ─────────────────
// Called by AI pipeline (hitl_service.py) for crash-resume or direct resolution

@ApiTags('hitl-internal')
@Controller('_internal/hitl')
export class HitlInternalController {
  @Post(':cid/resolve')
  @SkipAuth()
  @ApiOperation({ summary: 'Internal: write HITL decision to Redis — called by AI pipeline' })
  async resolveInternal(
    @Param('cid') cid: string,
    @Body() dto: { decision: string; supervisor_id: string; supervisor_email?: string; notes?: string },
  ) {
    const { decision, supervisor_id, supervisor_email, notes } = dto;
    if (!['approve', 'reject', 'timeout'].includes(decision)) {
      return { success: false, error: 'Invalid decision value' };
    }
    const data = JSON.stringify({
      decision,
      supervisor_id,
      supervisor_email: supervisor_email || null,
      notes: notes || null,
      decided_at: new Date().toISOString(),
    });
    await redis.setex(`hitl_decision:${cid}`, 300, data);
    return { success: true };
  }
}
