import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { HandoffService } from './handoff.service';

export class ExecuteHandoffDto {
  cid: string;
  handoff_type: 'A' | 'B';          // A = SIP transfer, B = internal queue
  target?: string;                   // Option A: SIP URI / phone number
  agent_id?: string;                 // Option B: preferred agent_id (optional)
  transcript: any[];                 // Full conversation transcript
  context: Record<string, any>;      // All session context
  channel_uuid: string;              // FreeSWITCH channel UUID
}

@ApiTags('Handoff')
@Controller('handoff')
@UseGuards(JwtAuthGuard)
export class HandoffController {
  constructor(private readonly handoffService: HandoffService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute human handoff — Option A (SIP) or Option B (internal queue)' })
  async execute(@Body() dto: ExecuteHandoffDto) {
    return this.handoffService.execute(dto);
  }
}
