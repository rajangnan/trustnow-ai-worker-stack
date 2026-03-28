import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('summary')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Global analytics summary (BRD-L5-MIS-001)' })
  getSummary(
    @TenantId() tid: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSummary(tid, from, to);
  }

  @Get('conversations')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Analytics conversations list (BRD-L5-MIS-002)' })
  getConversations(
    @TenantId() tid: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getConversationsAnalytics(tid, from, to);
  }

  @Get('agents/:id')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin')
  @ApiQuery({ name: 'tab', enum: ['general', 'evaluation', 'data_collection', 'audio', 'tools', 'llms', 'knowledge_base', 'advanced'], required: false })
  @ApiOperation({ summary: 'Agent analytics — 8 sub-tabs (§6.2C): general|evaluation|data_collection|audio|tools|llms|knowledge_base|advanced' })
  getAgentAnalytics(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Query('tab') tab: string = 'general',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getAgentAnalytics(tid, id, tab, from, to);
  }
}
