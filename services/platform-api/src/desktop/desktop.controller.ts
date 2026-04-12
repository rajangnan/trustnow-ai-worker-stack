import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import { getPool } from '../database/db.provider';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

/**
 * Human Agent Desktop REST API — Task 12
 * =========================================
 * Endpoints consumed by the `/agent-desktop/` frontend.
 * All require JWT + supervisor/human_agent/tenant_admin roles.
 *
 * Queue management (Redis trustnow:handoff:queue):
 *   GET  /desktop/queue             — list queued CIDs
 *   GET  /desktop/context/:cid      — full handoff context for a CID
 *   POST /desktop/queue/:cid/accept — agent accepts a queued call
 *
 * Agent status:
 *   GET  /desktop/team              — all agent statuses for tenant (supervisor)
 *   PUT  /desktop/status            — update own availability status
 *
 * Call controls (ESL via Platform API internal):
 *   POST /desktop/call/:cid/hold    — put call on hold
 *   POST /desktop/call/:cid/unhold  — unhold
 *   POST /desktop/call/:cid/mute    — mute agent audio
 *   POST /desktop/call/:cid/unmute  — unmute
 *   POST /desktop/call/:cid/transfer — transfer call
 *   POST /desktop/call/:cid/end     — end call
 *   POST /desktop/call/:cid/barge   — supervisor barge-in
 *   POST /desktop/call/:cid/whisper — supervisor whisper (agent only hears)
 *
 * Interaction history:
 *   GET  /desktop/history/:caller_phone — last 10 interactions for a caller
 *
 * Disposition:
 *   POST /desktop/call/:cid/disposition — save wrap-up code + notes
 *
 * Recording:
 *   GET  /desktop/recording/:cid   — get MinIO pre-signed URL for recording
 *
 * KB Search:
 *   GET  /desktop/kb/search        — ?q=&agent_id= — search agent KB
 */
@ApiTags('desktop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('desktop')
export class DesktopController {
  // ── Queue ─────────────────────────────────────────────────────────────────

  @Get('queue')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List queued handoff CIDs' })
  async getQueue(@TenantId() tid: string) {
    const queueKey = 'trustnow:handoff:queue';
    const cids = await redis.lrange(queueKey, 0, -1);
    const items = [];
    for (const cid of cids) {
      const raw = await redis.get(`trustnow:handoff:context:${cid}`);
      if (raw) {
        try {
          const ctx = JSON.parse(raw);
          // Only return calls for this tenant
          if (!ctx.context?.tenant_id || ctx.context.tenant_id === tid) {
            items.push({ cid, ...ctx, queue_time_s: Math.floor((Date.now() - new Date(ctx.timestamp).getTime()) / 1000) });
          }
        } catch {
          items.push({ cid });
        }
      }
    }
    return { queue: items, count: items.length };
  }

  @Get('context/:cid')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get full handoff context for a CID' })
  async getContext(@Param('cid') cid: string, @TenantId() tid: string) {
    const raw = await redis.get(`trustnow:handoff:context:${cid}`);
    if (!raw) return { found: false };
    const ctx = JSON.parse(raw);
    return { found: true, cid, ...ctx };
  }

  @Post('queue/:cid/accept')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Agent accepts a queued call — removes from queue, assigns to agent' })
  async acceptCall(
    @Param('cid') cid: string,
    @TenantId() tid: string,
    @CurrentUser() user: any,
  ) {
    // Remove from queue
    await redis.lrem('trustnow:handoff:queue', 1, cid);
    // Mark accepted
    await redis.hset(`session:${cid}`, {
      human_agent_id: user.user_id,
      human_agent_email: user.email,
      handoff_accepted_at: new Date().toISOString(),
    });
    // Notify other agents this call is taken
    await redis.publish('trustnow:handoff:notify', JSON.stringify({
      type: 'call_accepted',
      cid,
      agent_id: user.user_id,
    }));
    return { accepted: true, cid, agent_id: user.user_id };
  }

  // ── Agent Status ──────────────────────────────────────────────────────────

  @Get('team')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get all agent availability statuses for team (supervisor)' })
  async getTeam(@TenantId() tid: string) {
    const pool = getPool();
    // Get all human agent users for this tenant
    const { rows: agents } = await pool.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name, u.role
       FROM users u WHERE u.tenant_id = $1 AND u.role IN ('human_agent', 'supervisor')
       ORDER BY u.first_name`,
      [tid],
    );
    // Enrich with Redis status
    const statusMap = await redis.hgetall(`agent:status:${tid}`);
    const team = agents.map((a: any) => {
      const statusRaw = statusMap?.[a.user_id];
      const statusData = statusRaw ? JSON.parse(statusRaw) : { status: 'offline' };
      return { ...a, ...statusData };
    });
    return team;
  }

  @Put('status')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update own availability status' })
  async updateStatus(
    @TenantId() tid: string,
    @CurrentUser() user: any,
    @Body() dto: { status: string },
  ) {
    const validStatuses = ['available', 'busy', 'break', 'wrap_up', 'offline'];
    if (!validStatuses.includes(dto.status)) {
      return { error: 'Invalid status value' };
    }
    await redis.hset(
      `agent:status:${tid}`,
      user.user_id,
      JSON.stringify({ status: dto.status, updated_at: new Date().toISOString() }),
    );
    await redis.publish('trustnow:agent:status', JSON.stringify({
      agent_id: user.user_id,
      status: dto.status,
      tenant_id: tid,
    }));
    return { status: dto.status };
  }

  // ── Call Controls ─────────────────────────────────────────────────────────

  @Post('call/:cid/hold')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Place call on hold (MOH)' })
  async holdCall(@Param('cid') cid: string) {
    return this._eslCommand(cid, 'hold');
  }

  @Post('call/:cid/unhold')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Unhold call' })
  async unholdCall(@Param('cid') cid: string) {
    return this._eslCommand(cid, 'unhold');
  }

  @Post('call/:cid/mute')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Mute agent mic' })
  async muteCall(@Param('cid') cid: string) {
    return this._eslCommand(cid, 'mute');
  }

  @Post('call/:cid/unmute')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Unmute agent mic' })
  async unmuteCall(@Param('cid') cid: string) {
    return this._eslCommand(cid, 'unmute');
  }

  @Post('call/:cid/end')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'End call — ESL hangup' })
  async endCall(@Param('cid') cid: string) {
    return this._eslCommand(cid, 'hangup');
  }

  @Post('call/:cid/transfer')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Transfer call to queue, agent, or external number' })
  async transferCall(
    @Param('cid') cid: string,
    @Body() dto: { type: 'queue' | 'agent' | 'external'; target: string; notes?: string; warm?: boolean },
  ) {
    const session = await redis.hgetall(`session:${cid}`);
    return this._eslCommand(cid, 'transfer', { ...dto, channel_uuid: session?.channel_uuid });
  }

  @Post('call/:cid/barge')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Supervisor barge-in — joins conference (all parties hear supervisor)' })
  async bargeIn(@Param('cid') cid: string, @CurrentUser() user: any) {
    const session = await redis.hgetall(`session:${cid}`);
    await redis.hset(`session:${cid}`, 'supervisor_id', user.user_id);
    return this._eslCommand(cid, 'barge', { supervisor_id: user.user_id, channel_uuid: session?.channel_uuid });
  }

  @Post('call/:cid/whisper')
  @Roles('supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Supervisor whisper — only agent hears supervisor' })
  async whisper(@Param('cid') cid: string, @CurrentUser() user: any) {
    const session = await redis.hgetall(`session:${cid}`);
    return this._eslCommand(cid, 'whisper', { supervisor_id: user.user_id, channel_uuid: session?.channel_uuid });
  }

  // ── Interaction History ───────────────────────────────────────────────────

  @Get('history/:caller_phone')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get last 10 interactions for a caller phone number' })
  async getCallerHistory(
    @TenantId() tid: string,
    @Param('caller_phone') callerPhone: string,
  ) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT c.conversation_id, c.started_at, c.ended_at, c.channel,
              c.how_call_ended, c.ai_summary, c.handle_time_s,
              a.name AS agent_name
       FROM conversations c
       LEFT JOIN agents a ON a.agent_id = c.agent_id
       WHERE c.tenant_id = $1 AND c.caller_phone = $2
       ORDER BY c.started_at DESC LIMIT 10`,
      [tid, callerPhone],
    );
    return rows;
  }

  // ── Disposition / Wrap-up ─────────────────────────────────────────────────

  @Post('call/:cid/disposition')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Save wrap-up disposition code and notes after call ends' })
  async saveDisposition(
    @TenantId() tid: string,
    @Param('cid') cid: string,
    @CurrentUser() user: any,
    @Body() dto: { disposition_code: string; notes?: string; wrap_up_time_s?: number },
  ) {
    const pool = getPool();
    await pool.query(
      `UPDATE conversations
       SET disposition_code = $1, wrap_up_notes = $2, wrap_up_time_s = $3,
           human_agent_id = $4
       WHERE conversation_id = $5 AND tenant_id = $6`,
      [dto.disposition_code, dto.notes || null, dto.wrap_up_time_s || 0, user.user_id, cid, tid],
    );
    return { saved: true };
  }

  // ── Recording ─────────────────────────────────────────────────────────────

  @Get('recording/:cid')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get MinIO pre-signed URL for call recording' })
  async getRecording(@TenantId() tid: string, @Param('cid') cid: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT recording_url FROM conversations WHERE conversation_id = $1 AND tenant_id = $2`,
      [cid, tid],
    );
    if (!rows.length || !rows[0].recording_url) return { found: false };
    // The recording_url is already a MinIO path — return as-is;
    // the frontend fetches a pre-signed URL via the existing conversations API
    return { found: true, recording_url: rows[0].recording_url };
  }

  // ── KB Search ─────────────────────────────────────────────────────────────

  @Get('kb/search')
  @Roles('supervisor', 'human_agent', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Search agent knowledge base during call' })
  async searchKb(
    @TenantId() tid: string,
    @Query('q') q: string,
    @Query('agent_id') agentId: string,
  ) {
    if (!q || !agentId) return { results: [] };
    const pool = getPool();
    // Simple full-text search on knowledge base documents
    const { rows } = await pool.query(
      `SELECT kb_id, title, content_preview, source_type
       FROM knowledge_base
       WHERE tenant_id = $1 AND agent_id = $2
         AND (title ILIKE $3 OR content_preview ILIKE $3)
       LIMIT 8`,
      [tid, agentId, `%${q}%`],
    );
    return { results: rows };
  }

  // ── ESL command helper ────────────────────────────────────────────────────

  private async _eslCommand(cid: string, action: string, extra?: Record<string, any>) {
    // FreeSWITCH commands go through the internal telephony endpoints
    // (TelephonyController handles actual ESL communication)
    const session = await redis.hgetall(`session:${cid}`);
    const channelUuid = session?.channel_uuid || extra?.channel_uuid;
    await redis.publish(
      'trustnow:esl:command',
      JSON.stringify({ cid, action, channel_uuid: channelUuid, ...extra }),
    );
    return { cid, action, issued: true };
  }
}
