import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents/:agentId/tests')
export class TestsController {
  constructor(private service: TestsService) {}

  @Get('templates')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get 5 default test templates (ElevenLabs parity)' })
  getTemplates() {
    return this.service.getTemplates();
  }

  @Get()
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List tests for agent (Tab 7 — Next Reply + Tool Invocation types)' })
  findAll(@TenantId() tid: string, @Param('agentId') agentId: string) {
    return this.service.findAll(tid, agentId);
  }

  @Post()
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create test (type: next_reply | tool_invocation)' })
  create(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.create(tid, agentId, dto, u.user_id);
  }

  @Post(':testId/run')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Run a test' })
  run(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Param('testId') testId: string,
  ) {
    return this.service.runTest(tid, agentId, testId);
  }

  @Post('folders')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create test folder' })
  createFolder(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Body() body: { name: string },
    @CurrentUser() u: any,
  ) {
    return this.service.createFolder(tid, agentId, body.name, u.user_id);
  }
}
