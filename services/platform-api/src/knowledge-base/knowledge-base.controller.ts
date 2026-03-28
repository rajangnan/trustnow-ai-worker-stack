import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kb')
export class KnowledgeBaseController {
  constructor(private service: KnowledgeBaseService) {}

  @Get('documents')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List KB documents for tenant' })
  findAll(@TenantId() tid: string, @Query('agent_id') agentId?: string) {
    return this.service.findAll(tid, agentId);
  }

  @Get('documents/:id')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get KB document' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Post('documents')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create KB document' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Delete('documents/:id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete KB document' })
  delete(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }

  @Post('agents/:agentId/kb/attach')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Attach KB docs to agent' })
  attach(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Body() body: { doc_ids: string[] },
    @CurrentUser() u: any,
  ) {
    return this.service.attachToAgent(tid, agentId, body.doc_ids, u.user_id);
  }

  @Put('agents/:agentId/kb/rag-config')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update RAG config for agent (Tab 4 — Configure RAG panel)' })
  updateRagConfig(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.updateRagConfig(tid, agentId, dto, u.user_id);
  }
}
