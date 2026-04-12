import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'net';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

@Injectable()
export class EslService extends EventEmitter2 implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EslService.name);
  private client: net.Socket;
  private connected = false;
  private buffer = '';
  private readonly ESL_HOST = '127.0.0.1';
  private readonly ESL_PORT = 8021;
  // Redis pub/sub client — publishes interrupt:{cid} signals to AI pipeline (§9.2)
  private redisPublisher: Redis;

  constructor() {
    super();
    // Initialise Redis publisher for barge-in interrupt signals — §9.2
    this.redisPublisher = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });
    this.redisPublisher.on('error', (err) => {
      this.logger.warn(`ESL Redis publisher error: ${err.message}`);
    });
  }

  async onModuleInit() {
    await this.redisPublisher.connect().catch((err) => {
      this.logger.warn(`ESL Redis connect failed — barge-in signals disabled: ${err.message}`);
    });
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
    this.redisPublisher.disconnect();
  }

  private async connect(): Promise<void> {
    this.client = new net.Socket();

    this.client.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.client.on('error', (err) => {
      this.logger.error(`ESL connection error: ${err.message}`);
      this.connected = false;
      setTimeout(() => this.connect(), 5000); // reconnect after 5s
    });

    this.client.on('close', () => {
      this.logger.warn('ESL connection closed — reconnecting in 5s');
      this.connected = false;
      setTimeout(() => this.connect(), 5000);
    });

    return new Promise((resolve) => {
      this.client.connect(this.ESL_PORT, this.ESL_HOST, () => {
        this.logger.log('ESL connected to FreeSWITCH');
        this.connected = true;
        resolve();
      });
    });
  }

  private processBuffer(): void {
    const parts = this.buffer.split('\n\n');
    for (let i = 0; i < parts.length - 1; i++) {
      this.handleMessage(parts[i]);
    }
    this.buffer = parts[parts.length - 1];
  }

  private handleMessage(message: string): void {
    if (message.includes('Content-Type: auth/request')) {
      const eslPass = process.env.FREESWITCH_ESL_PASSWORD || '';
      this.send(`auth ${eslPass}\n\n`);
      this.send('events plain CHANNEL_ANSWER CHANNEL_HANGUP CHANNEL_BRIDGE DTMF DETECTED_SPEECH\n\n');
      this.logger.log('ESL authenticated — subscribed to TRUSTNOW call events');
      return;
    }

    if (message.includes('Event-Name: CHANNEL_ANSWER')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      if (cid) {
        this.emit('CHANNEL_ANSWER', { cid, channelUuid });
        this.logger.log(`CHANNEL_ANSWER — CID: ${cid}`);
      }
    }

    if (message.includes('Event-Name: CHANNEL_HANGUP')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      const cause = this.extractHeader(message, 'Hangup-Cause');
      if (cid) {
        this.emit('CHANNEL_HANGUP', { cid, channelUuid, cause });
        this.logger.log(`CHANNEL_HANGUP — CID: ${cid}, cause: ${cause}`);
      }
    }

    if (message.includes('Event-Name: CHANNEL_BRIDGE')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      const channelUuid = this.extractHeader(message, 'Unique-ID');
      if (cid) {
        this.emit('CHANNEL_BRIDGE', { cid, channelUuid });
        this.logger.log(`CHANNEL_BRIDGE (handoff) — CID: ${cid}`);
      }
    }

    if (message.includes('Event-Name: DETECTED_SPEECH')) {
      const cid = this.extractHeader(message, 'variable_trustnow_cid');
      // Speech-Duration is in ms — used for 'smart' interrupt mode (≥300ms) — §9.2
      const speechDurationMs = parseInt(this.extractHeader(message, 'Speech-Duration') || '0', 10);
      if (cid) {
        // Publish barge-in interrupt signal to Redis — AI pipeline subscribes per active CID
        const payload = JSON.stringify({
          speech_duration_ms: speechDurationMs,
          timestamp: Date.now(),
        });
        this.redisPublisher.publish(`interrupt:${cid}`, payload).catch((err) => {
          this.logger.warn(`interrupt:${cid} Redis publish failed: ${err.message}`);
        });
        this.emit('DETECTED_SPEECH', { cid, speechDurationMs });
      }
    }
  }

  private extractHeader(message: string, header: string): string | null {
    const match = message.match(new RegExp(`^${header}: (.+)$`, 'm'));
    return match ? match[1].trim() : null;
  }

  send(command: string): void {
    if (this.connected) {
      this.client.write(command);
    }
  }

  transferCall(channelUuid: string, destination: string, cid: string): void {
    // Option A: SIP transfer with CID in UUI header (BRD-CC-008)
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: set\nexecute-app-arg: sip_h_User-to-User=${cid};encoding=ascii\n\n`);
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: transfer\nexecute-app-arg: ${destination}\n\n`);
  }

  playMoh(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: playback\nexecute-app-arg: local_stream://default\n\n`);
  }

  stopMoh(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: stop_playback\nexecute-app-arg: \n\n`);
  }

  startRecording(channelUuid: string, cid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: record_session\nexecute-app-arg: /var/lib/freeswitch/recordings/${cid}.wav\n\n`);
  }

  stopRecording(channelUuid: string): void {
    this.send(`sendmsg ${channelUuid}\ncall-command: execute\nexecute-app-name: stop_record_session\nexecute-app-arg: all\n\n`);
  }

  private disconnect(): void {
    if (this.client) {
      this.client.destroy();
    }
  }
}
