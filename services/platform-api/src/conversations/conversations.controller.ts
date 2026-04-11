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
  @ApiOperation({ summary: 'List conversations — 15 query filters (§6.2L): agent_id, branch_id, date_after, date_before, call_status, channel, language, search, duration_min/max, rating_min/max, has_comments, sort, page, limit' })
  findAll(
    @TenantId() tid: string,
    @Query('agent_id') agent_id?: string,
    @Query('branch_id') branch_id?: string,
    @Query('date_after') date_after?: string,
    @Query('date_before') date_before?: string,
    @Query('call_status') call_status?: string,
    @Query('channel') channel?: string,
    @Query('language') language?: string,
    @Query('user_id') user_id?: string,
    @Query('search') search?: string,
    @Query('duration_min') duration_min?: string,
    @Query('duration_max') duration_max?: string,
    @Query('rating_min') rating_min?: string,
    @Query('rating_max') rating_max?: string,
    @Query('has_comments') has_comments?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(tid, {
      agent_id, branch_id, date_after, date_before, call_status,
      channel, language, user_id, search, sort,
      duration_min: duration_min ? parseInt(duration_min) : undefined,
      duration_max: duration_max ? parseInt(duration_max) : undefined,
      rating_min: rating_min ? parseFloat(rating_min) : undefined,
      rating_max: rating_max ? parseFloat(rating_max) : undefined,
      has_comments: has_comments === 'true' ? true : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id/turns')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'Get per-turn latency data (§6.2L)' })
  getTurns(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getTurns(tid, id);
  }

  @Get(':id/share-link')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Generate shareable link (24h JWT token — §6.2L)' })
  getShareLink(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getShareLink(tid, id);
  }

  @Get(':id')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin', 'auditor')
  @ApiOperation({ summary: 'Get conversation detail — all metadata fields (§6.2C/§6.2L)' })
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
