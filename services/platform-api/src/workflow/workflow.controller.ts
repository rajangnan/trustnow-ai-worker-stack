import { Controller, Get, Put, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { SaveWorkflowDto, LoadWorkflowTemplateDto } from './dto/workflow.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents/:id/workflow')
export class WorkflowController {
  constructor(private service: WorkflowService) {}

  @Get()
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  getWorkflow(@TenantId() tid: string, @Param('id') id: string, @Query('branch_id') bid?: string) {
    return this.service.getWorkflow(tid, id, bid);
  }

  @Put()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  saveWorkflow(@TenantId() tid: string, @Param('id') id: string, @Body() dto: SaveWorkflowDto, @CurrentUser() u: any, @Query('branch_id') bid?: string) {
    return this.service.saveWorkflow(tid, id, dto, u.user_id, bid);
  }

  @Get('templates')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  getTemplates() { return this.service.getTemplates(); }

  @Post('load-template')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  loadTemplate(@TenantId() tid: string, @Param('id') id: string, @Body() dto: LoadWorkflowTemplateDto, @CurrentUser() u: any, @Query('branch_id') bid?: string) {
    return this.service.loadTemplate(tid, id, dto, u.user_id, bid);
  }
}
