import { Injectable, Logger } from '@nestjs/common';
import { EslService } from './esl.service';
import Redis from 'ioredis';
import { ExecuteHandoffDto } from './handoff.controller';

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);
  private readonly redis: Redis;

  constructor(private readonly eslService: EslService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  async execute(dto: ExecuteHandoffDto): Promise<{ status: string; queue_position?: number }> {
    this.logger.log(`Handoff execute — CID: ${dto.cid}, type: ${dto.handoff_type}`);

    if (dto.handoff_type === 'A') {
      return this.executeOptionA(dto);
    } else {
      return this.executeOptionB(dto);
    }
  }

  // Option A — Integration-Layer Transfer: SIP transfer to external PBX/CCaaS
  // CID passed in SIP UUI header (BRD-CC-008, BRD-L4-004)
  private async executeOptionA(dto: ExecuteHandoffDto): Promise<{ status: string }> {
    if (!dto.target) {
      throw new Error('Option A handoff requires a target SIP URI or phone number');
    }

    // Play MOH to caller while transfer is in progress
    this.eslService.playMoh(dto.channel_uuid);

    // Issue SIP transfer with CID in UUI header via ESL
    this.eslService.transferCall(dto.channel_uuid, dto.target, dto.cid);

    // Record handoff event in Redis session
    await this.redis.hset(`session:${dto.cid}`, {
      handoff_type: 'A',
      handoff_target: dto.target,
      handoff_at: new Date().toISOString(),
    });

    this.logger.log(`Option A handoff issued — CID: ${dto.cid} → ${dto.target}`);
    return { status: 'transfer_issued' };
  }

  // Option B — Internal TRUSTNOW Agent Console: push to Redis queue
  // Human Agent Desktop subscribes via WebSocket (BRD-L4-005)
  private async executeOptionB(dto: ExecuteHandoffDto): Promise<{ status: string; queue_position: number }> {
    const queueKey = 'trustnow:handoff:queue';
    const contextKey = `trustnow:handoff:context:${dto.cid}`;

    // Build complete handoff payload for the Human Agent Desktop
    const handoffPayload = {
      cid: dto.cid,
      channel_uuid: dto.channel_uuid,
      timestamp: new Date().toISOString(),
      transcript: dto.transcript,
      context: dto.context,
      preferred_agent_id: dto.agent_id || null,
    };

    // Store full context so agent desktop can retrieve it
    await this.redis.setex(contextKey, 3600, JSON.stringify(handoffPayload));

    // Push CID to handoff queue (FIFO)
    const queueLength = await this.redis.rpush(queueKey, dto.cid);

    // Play MOH to caller while awaiting human agent pickup
    this.eslService.playMoh(dto.channel_uuid);

    // Publish WebSocket notification to Human Agent Desktop (Task 12)
    await this.redis.publish('trustnow:handoff:notify', JSON.stringify({
      cid: dto.cid,
      queue_position: queueLength,
      preferred_agent_id: dto.agent_id || null,
    }));

    // Record handoff event in Redis session
    await this.redis.hset(`session:${dto.cid}`, {
      handoff_type: 'B',
      handoff_queue_position: queueLength,
      handoff_at: new Date().toISOString(),
    });

    this.logger.log(`Option B handoff queued — CID: ${dto.cid}, queue position: ${queueLength}`);
    return { status: 'queued', queue_position: queueLength };
  }
}
