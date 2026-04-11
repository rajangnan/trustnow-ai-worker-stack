import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { CreateBranchDto, UpdateBranchTrafficDto } from './dto/create-branch.dto';
import { CreateAgentWizardDto } from './dto/create-agent-wizard.dto';
import { CreateAgentBlankDto } from './dto/create-agent-blank.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(private service: AgentsService) {}

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  @Get()
  @Roles('agent_admin', 'supervisor', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List agents for tenant' })
  findAll(@TenantId() tid: string) {
    return this.service.findAll(tid);
  }

  @Get(':id')
  @Roles('agent_admin', 'supervisor', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get agent with latest config' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create new agent' })
  create(@TenantId() tid: string, @Body() dto: CreateAgentDto, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update agent metadata' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateAgentDto>, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Archive agent' })
  archive(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.archive(tid, id, u.user_id);
  }

  // ── Config (§6.2A — full DTO) ─────────────────────────────────────────────

  @Put(':id/config')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update agent config — all 40+ fields (§6.2A)' })
  updateConfig(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentConfigDto,
    @CurrentUser() u: any,
  ) {
    return this.service.updateConfig(tid, id, dto, u.user_id);
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  @Post(':id/publish')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Publish agent (snapshot config → agent_versions, set status=published)' })
  publish(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.publish(tid, id, u.user_id);
  }

  // ── Branches (§6.2B — A/B testing) ───────────────────────────────────────

  @Get(':id/branches')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List agent branches (§6.2B)' })
  getBranches(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getBranches(tid, id);
  }

  @Post(':id/branches')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create new A/B test branch (§6.2B)' })
  createBranch(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: CreateBranchDto,
    @CurrentUser() u: any,
  ) {
    return this.service.createBranch(tid, id, dto, u.user_id);
  }

  @Put(':id/branches/:branchId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update branch config (§6.2B)' })
  updateBranch(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateAgentConfigDto,
    @CurrentUser() u: any,
  ) {
    return this.service.updateBranchConfig(tid, id, branchId, dto, u.user_id);
  }

  @Put(':id/branches/:branchId/traffic')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Set branch traffic split % (§6.2B)' })
  updateBranchTraffic(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchTrafficDto,
    @CurrentUser() u: any,
  ) {
    return this.service.updateBranchTraffic(tid, id, branchId, dto, u.user_id);
  }

  @Post(':id/branches/:branchId/publish')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Make branch live (§6.2B)' })
  publishBranch(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.publishBranch(tid, id, branchId, u.user_id);
  }

  @Delete(':id/branches/:branchId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Archive/delete branch (§6.2B)' })
  deleteBranch(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.deleteBranch(tid, id, branchId, u.user_id);
  }

  // ── Blank Agent (§6.2D-A) ─────────────────────────────────────────────────

  @Post('blank')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create blank agent (§6.2D-A) — minimal 2-step creation, no LLM' })
  createBlank(@TenantId() tid: string, @Body() dto: CreateAgentBlankDto, @CurrentUser() u: any) {
    return this.service.createBlank(tid, dto, u.user_id);
  }

  // ── Wizard (§6.2D-B) ──────────────────────────────────────────────────────

  @Post('wizard')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: '+New Agent guided wizard (§6.2D-B) — LLM-generated prompts' })
  createWizard(@TenantId() tid: string, @Body() dto: CreateAgentWizardDto, @CurrentUser() u: any) {
    return this.service.createViaWizard(tid, dto, u.user_id);
  }

  // ── Translate First Message (§6.2F) ───────────────────────────────────────

  @Post(':id/translate-first-message')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Translate first message to all additional languages (§6.2F)' })
  translateFirstMessage(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.translateFirstMessage(tid, id, u.user_id);
  }
}
