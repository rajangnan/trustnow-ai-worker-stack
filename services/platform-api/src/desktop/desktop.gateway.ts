import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

/**
 * Human Agent Desktop WebSocket Gateway — Task 12
 * ================================================
 * Exposes a socket.io namespace at /desktop.
 * Bridges Redis pub/sub → connected agent clients:
 *
 *   trustnow:handoff:notify   → client event 'handoff:incoming'
 *   trustnow:transcript:{cid} → client event 'transcript:update'  (agent joins CID room)
 *   trustnow:hitl:notify      → client event 'hitl:approval_required'
 *   trustnow:agent:status     → client event 'agent:status_changed'
 *
 * Clients can emit:
 *   'agent:set_status'    → { status: 'available'|'busy'|'break'|'wrap_up'|'offline' }
 *   'call:join'           → { cid: string } — subscribe to transcript stream for this CID
 *   'call:leave'          → { cid: string }
 *   'supervisor:listen'   → { agent_socket_id: string } — supervisor listen-only
 */
@WebSocketGateway({
  namespace: '/desktop',
  cors: {
    origin: '*',
    credentials: false,
  },
  transports: ['websocket', 'polling'],
})
export class DesktopGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DesktopGateway.name);
  private redisSubscriber: Redis;
  private redisClient: Redis;

  constructor() {
    const redisOpts = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    };
    this.redisSubscriber = new Redis(redisOpts);
    this.redisClient = new Redis(redisOpts);
  }

  afterInit() {
    this.logger.log('Desktop WebSocket Gateway initialised at /desktop');
    this._subscribeToRedis();
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Desktop client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Desktop client disconnected: ${client.id}`);
  }

  // ── Redis → WebSocket bridges ─────────────────────────────────────────────

  private _subscribeToRedis() {
    this.redisSubscriber.connect().catch(() => {});
    this.redisClient.connect().catch(() => {});

    // Handoff notifications: new call arrives in queue
    this.redisSubscriber.subscribe(
      'trustnow:handoff:notify',
      'trustnow:hitl:notify',
      'trustnow:agent:status',
      (err) => {
        if (err) this.logger.error('Redis subscribe error:', err.message);
        else this.logger.log('Redis channels subscribed (handoff, hitl, agent-status)');
      },
    );

    this.redisSubscriber.on('message', (channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);

        if (channel === 'trustnow:handoff:notify') {
          this.server.emit('handoff:incoming', payload);
        } else if (channel === 'trustnow:hitl:notify') {
          this.server.emit('hitl:approval_required', payload);
        } else if (channel === 'trustnow:agent:status') {
          this.server.emit('agent:status_changed', payload);
        } else if (channel.startsWith('transcript:')) {
          // Dynamic transcript channels — broadcast to CID room
          const cid = channel.replace('transcript:', '');
          this.server.to(`cid:${cid}`).emit('transcript:update', payload);
        }
      } catch {
        // ignore malformed messages
      }
    });

    // Pattern subscribe for per-CID transcript channels
    this.redisSubscriber.psubscribe('transcript:*', (err) => {
      if (err) this.logger.warn('psubscribe transcript:* error:', err.message);
    });

    this.redisSubscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        const cid = channel.replace('transcript:', '');
        this.server.to(`cid:${cid}`).emit('transcript:update', { cid, ...payload });
      } catch {
        // ignore
      }
    });
  }

  // ── Client → server handlers ──────────────────────────────────────────────

  @SubscribeMessage('call:join')
  handleCallJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cid: string },
  ) {
    client.join(`cid:${data.cid}`);
    this.logger.debug(`Client ${client.id} joined room cid:${data.cid}`);
    return { joined: true, cid: data.cid };
  }

  @SubscribeMessage('call:leave')
  handleCallLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cid: string },
  ) {
    client.leave(`cid:${data.cid}`);
    return { left: true, cid: data.cid };
  }

  @SubscribeMessage('agent:set_status')
  async handleSetStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agent_id: string; status: string; tenant_id: string },
  ) {
    const validStatuses = ['available', 'busy', 'break', 'wrap_up', 'offline'];
    if (!validStatuses.includes(data.status)) {
      return { error: 'Invalid status' };
    }
    // Persist to Redis — supervisor monitoring reads this
    await this.redisClient.hset(
      `agent:status:${data.tenant_id}`,
      data.agent_id,
      JSON.stringify({ status: data.status, updated_at: new Date().toISOString() }),
    );
    // Broadcast to supervisors
    await this.redisClient.publish(
      'trustnow:agent:status',
      JSON.stringify({ agent_id: data.agent_id, status: data.status, tenant_id: data.tenant_id }),
    );
    return { status: data.status };
  }

  @SubscribeMessage('supervisor:get_team')
  async handleGetTeam(
    @MessageBody() data: { tenant_id: string },
  ) {
    // Return all agent statuses for this tenant
    const statuses = await this.redisClient.hgetall(`agent:status:${data.tenant_id}`);
    const team = Object.entries(statuses || {}).map(([agentId, raw]) => ({
      agent_id: agentId,
      ...JSON.parse(raw as string),
    }));
    return { team };
  }

  // ── Broadcast helpers (called by DesktopController) ──────────────────────

  broadcastHitlNotification(payload: any) {
    this.server.emit('hitl:approval_required', payload);
  }

  broadcastHandoffNotification(payload: any) {
    this.server.emit('handoff:incoming', payload);
  }
}
