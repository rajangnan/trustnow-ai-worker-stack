import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

// ── Workspace-level KB documents ─────────────────────────────────────────────

@ApiTags('knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kb')
export class KnowledgeBaseController {
  constructor(private service: KnowledgeBaseService) {}

  @Get('documents')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List workspace KB documents (§6.2K)' })
  findAll(
    @TenantId() tid: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll(tid, search, type);
  }

  @Post('documents/upload')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Pre-upload file — returns temp_file_id (§6.2K)' })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @TenantId() tid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() u: any,
  ) {
    return this.service.uploadFile(tid, file, u.user_id);
  }

  @Post('documents')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create KB document (url/text/file) (§6.2K)' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Get('documents/:id')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get KB document detail with dependent agents (§6.2K)' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Delete('documents/:id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete KB document (blocked if attached to agents — §6.2K EXCEED)' })
  delete(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }

  @Post('documents/:id/reindex')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Trigger RAG re-indexing (§6.2K)' })
  reindex(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.reindex(tid, id, u.user_id);
  }
}

// ── Agent-scoped KB attachment ────────────────────────────────────────────────

@ApiTags('knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentKbController {
  constructor(private service: KnowledgeBaseService) {}

  @Post(':id/kb/attach')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Attach KB doc to agent via junction table (§6.2K)' })
  attach(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: { kb_doc_id: string; branch_id?: string },
    @CurrentUser() u: any,
  ) {
    return this.service.attachToAgent(tid, id, dto, u.user_id);
  }

  @Delete(':id/kb/:kbDocId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Detach KB doc from agent (§6.2K)' })
  detach(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('kbDocId') kbDocId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.detachFromAgent(tid, id, kbDocId, u.user_id);
  }

  @Put(':id/kb/rag-config')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update RAG config for agent (§6.2K)' })
  updateRagConfig(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.updateRagConfig(tid, id, dto, u.user_id);
  }
}
