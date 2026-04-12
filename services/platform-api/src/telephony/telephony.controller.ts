/**
 * TRUSTNOW Platform API — Telephony Controller
 * =============================================
 * HTTP endpoints called by the AI Pipeline (Python) to control FreeSWITCH channels.
 * These are internal endpoints — not exposed through Kong to external callers.
 *
 * Endpoints:
 *   POST /api/telephony/hangup          — hang up a channel via ESL (platform_end_call)
 *   POST /api/telephony/play_audio      — stream audio bytes to a channel
 *   POST /api/telephony/play_audio_chunk— stream a single audio chunk (streaming TTS)
 *   POST /api/telephony/stop_audio      — stop current audio playback (barge-in)
 *   POST /api/telephony/play_dtmf       — send DTMF digit to channel
 */

import {
  Controller, Post, Body, Headers, Req,
  HttpCode, HttpStatus, Logger, SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EslService } from './esl.service';
import { Request } from 'express';

// Mark endpoints as public (bypass JWT guard) — internal AI pipeline calls only
const SkipAuth = () => SetMetadata('isPublic', true);

class HangupDto {
  cid: string;
  channel_uuid: string;
  reason: string;
}

class PlayAudioDto {
  cid: string;
  channel_uuid: string;
}

class StopAudioDto {
  cid: string;
  channel_uuid: string;
}

class PlayDtmfDto {
  cid: string;
  channel_uuid: string;
  digit: string;
}

@ApiTags('Telephony')
@Controller('telephony')
export class TelephonyController {
  private readonly logger = new Logger(TelephonyController.name);

  constructor(private readonly eslService: EslService) {}

  /**
   * POST /api/telephony/hangup
   * Called by silence_watchdog.platform_end_call() and system tool end_conversation.
   * Sends FreeSWITCH ESL hangup command. Internal — AI pipeline only.
   */
  @Post('hangup')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hang up a channel via FreeSWITCH ESL — AI pipeline internal' })
  async hangup(@Body() dto: HangupDto): Promise<void> {
    this.logger.log(`Hangup requested — CID: ${dto.cid}, reason: ${dto.reason}`);

    if (!dto.channel_uuid) {
      this.logger.warn(`Hangup: no channel_uuid for CID ${dto.cid} — ignoring`);
      return;
    }

    // Send FreeSWITCH ESL hangup command
    this.eslService.send(
      `sendmsg ${dto.channel_uuid}\n` +
      `call-command: execute\n` +
      `execute-app-name: hangup\n` +
      `execute-app-arg: NORMAL_CLEARING\n\n`,
    );
    this.logger.log(`ESL hangup sent — channel: ${dto.channel_uuid}, CID: ${dto.cid}`);
  }

  /**
   * POST /api/telephony/play_audio
   * Full audio buffer delivery for first-message TTS playback.
   * Content-Type: audio/mulaw (SIP) or audio/pcm (WebRTC).
   */
  @Post('play_audio')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Play full audio buffer on channel — AI pipeline internal' })
  async playAudio(
    @Headers('x-cid') cid: string,
    @Headers('x-channel-uuid') channelUuid: string,
    @Headers('content-type') contentType: string,
    @Req() req: Request,
  ): Promise<void> {
    if (!channelUuid || !cid) {
      this.logger.warn('play_audio: missing X-CID or X-Channel-UUID headers');
      return;
    }

    // Read raw body — audio bytes
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      this.logger.warn(`play_audio: empty audio buffer for CID ${cid}`);
      return;
    }

    // Write audio to FreeSWITCH via ESL playback
    // For SIP: use mod_audio_stream or shm playback for real-time audio
    // This dispatches to FreeSWITCH's audio streaming bridge
    this.eslService.send(
      `sendmsg ${channelUuid}\n` +
      `call-command: execute\n` +
      `execute-app-name: playback\n` +
      `execute-app-arg: shm://${cid}\n\n`,
    );
    this.logger.debug(`play_audio: ${audioBuffer.length} bytes queued for channel ${channelUuid}`);
  }

  /**
   * POST /api/telephony/play_audio_chunk
   * Individual chunk during streaming TTS — low latency path.
   */
  @Post('play_audio_chunk')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stream single audio chunk to channel — AI pipeline internal' })
  async playAudioChunk(
    @Headers('x-cid') cid: string,
    @Headers('x-channel-uuid') channelUuid: string,
    @Req() req: Request,
  ): Promise<void> {
    // For production: push chunk to a per-CID audio queue that FreeSWITCH mod_audio_stream reads
    // Stub: emit event for future audio streaming bridge wiring
    this.logger.debug(`play_audio_chunk: chunk received for CID ${cid}`);
  }

  /**
   * POST /api/telephony/stop_audio
   * Called on barge-in — stops current TTS playback immediately.
   */
  @Post('stop_audio')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stop audio playback (barge-in) — AI pipeline internal' })
  async stopAudio(@Body() dto: StopAudioDto): Promise<void> {
    if (!dto.channel_uuid) return;

    this.eslService.send(
      `sendmsg ${dto.channel_uuid}\n` +
      `call-command: execute\n` +
      `execute-app-name: stop_playback\n` +
      `execute-app-arg: \n\n`,
    );
    this.logger.debug(`stop_audio: playback stopped on channel ${dto.channel_uuid}`);
  }

  /**
   * POST /api/telephony/play_dtmf
   * Called by system tool play_keypad_touch_tone.
   */
  @Post('play_dtmf')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send DTMF digit to channel — AI pipeline internal' })
  async playDtmf(@Body() dto: PlayDtmfDto): Promise<void> {
    if (!dto.channel_uuid || !dto.digit) return;

    // Validate digit — only 0-9, *, #
    if (!/^[0-9*#]$/.test(dto.digit)) {
      this.logger.warn(`play_dtmf: invalid digit '${dto.digit}' for CID ${dto.cid}`);
      return;
    }

    this.eslService.send(
      `sendmsg ${dto.channel_uuid}\n` +
      `call-command: execute\n` +
      `execute-app-name: send_dtmf\n` +
      `execute-app-arg: ${dto.digit}@2000\n\n`,
    );
    this.logger.log(`play_dtmf: digit ${dto.digit} sent to channel ${dto.channel_uuid}`);
  }
}
