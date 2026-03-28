import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private service: ConversationsService) {}

  @Get()
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'List conversations (BRD-L5-MIS-002)' })
  findAll(
    @TenantId() tid: string,
    @Query('agent_id') agentId?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(tid, { agent_id: agentId, status, channel, limit, offset, from, to });
  }

  @Get(':id')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'Get conversation detail — all co-browsing metadata (§6.2C): call_successful, how_call_ended, user_id, branch_id, tts_latency_ms_avg, asr_latency_ms_avg, turn_count, call_cost_credits, llm_credits, environment, evaluation_results, data_collection_results' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Get(':id/transcript')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'Get conversation transcript JSON' })
  getTranscript(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getTranscript(tid, id);
  }

  @Get(':id/recording')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'Get conversation recording URL' })
  getRecording(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getRecording(tid, id);
  }
}
