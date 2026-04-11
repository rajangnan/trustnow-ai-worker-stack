import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

// ── Workspace Tests ───────────────────────────────────────────────────────────

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class WorkspaceTestsController {
  constructor(private service: TestsService) {}

  @Get('templates')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List 5 seed test templates (§6.2Q)' })
  getTemplates(@TenantId() tid: string) {
    return this.service.getTemplates(tid);
  }

  @Get()
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List all workspace tests (§6.2Q) — filters: type, folder_id, search' })
  findAll(
    @TenantId() tid: string,
    @Query('type') type?: string,
    @Query('folder_id') folder_id?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllWorkspace(tid, { type, folder_id, search });
  }

  @Post()
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create workspace test (§6.2Q) — types: next_reply | tool_invocation | simulation' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createWorkspace(tid, dto, u.user_id);
  }

  @Post('templates/:id/clone')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Clone a template into workspace (§6.2Q)' })
  cloneTemplate(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.cloneTemplate(tid, id, u.user_id);
  }

  @Post(':id/run')
  @HttpCode(202)
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Run a test async — returns run_id; poll GET /test-runs/:run_id (§6.2Q)' })
  run(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.runTest(tid, id, dto, u.user_id);
  }

  @Get(':id')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get full test detail (§6.2Q)' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Put(':id')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update test (§6.2Q)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete test + all attachments (§6.2Q)' })
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }
}

// ── Test Runs ─────────────────────────────────────────────────────────────────

@ApiTags('test-runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-runs')
export class TestRunsController {
  constructor(private service: TestsService) {}

  @Get(':runId')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Poll test run status + results (§6.2Q)' })
  getTestRun(@TenantId() tid: string, @Param('runId') runId: string) {
    return this.service.getTestRun(tid, runId);
  }
}

// ── Agent Test Attachments ────────────────────────────────────────────────────

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentTestsController {
  constructor(private service: TestsService) {}

  @Get(':id/tests')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List tests attached to agent + past 10 runs (§6.2Q)' })
  findAgentTests(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findAgentTests(tid, id);
  }

  @Post(':id/tests/attach')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Attach an existing workspace test to this agent (§6.2Q)' })
  attach(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { test_id: string }, @CurrentUser() u: any) {
    return this.service.attachToAgent(tid, id, dto.test_id, u.user_id);
  }

  @Delete(':id/tests/:testId')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Detach test from agent (does not delete the test) (§6.2Q)' })
  detach(@TenantId() tid: string, @Param('id') id: string, @Param('testId') testId: string, @CurrentUser() u: any) {
    return this.service.detachFromAgent(tid, id, testId, u.user_id);
  }
}

// ── Test Folders ──────────────────────────────────────────────────────────────

@ApiTags('test-folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-folders')
export class TestFoldersController {
  constructor(private service: TestsService) {}

  @Post()
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create test folder (§6.2Q)' })
  create(@TenantId() tid: string, @Body() body: { name: string }, @CurrentUser() u: any) {
    return this.service.createFolder(tid, body.name, u.user_id);
  }

  @Put(':id')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Rename test folder (§6.2Q)' })
  rename(@TenantId() tid: string, @Param('id') id: string, @Body() body: { name: string }, @CurrentUser() u: any) {
    return this.service.renameFolder(tid, id, body.name, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete folder — moves contents to root (§6.2Q)' })
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deleteFolder(tid, id, u.user_id);
  }
}
