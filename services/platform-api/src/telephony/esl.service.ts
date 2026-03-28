import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'net';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EslService extends EventEmitter2 implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EslService.name);
  private client: net.Socket;
  private connected = false;
  private buffer = '';
  private readonly ESL_HOST = '127.0.0.1';
  private readonly ESL_PORT = 8021;

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
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
      if (cid) {
        this.emit('DETECTED_SPEECH', { cid });
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
