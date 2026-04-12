import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tools')
export class ToolsController {
  constructor(private service: ToolsService) {}

  @Get()
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List tools — ?agent_id=:id or ?scope=workspace (§6.2J EXCEED)' })
  findAll(
    @TenantId() tid: string,
    @Query('agent_id') agentId?: string,
    @Query('scope') scope?: string,
  ) {
    return this.service.findAll(tid, agentId, scope);
  }

  @Get('system')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List system tools (incl. "Play keypad touch tone")' })
  getSystemTools() { return this.service.getSystemTools(); }

  @Post('test')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Test tool webhook without saving (§6.2J EXCEED)' })
  testTool(@TenantId() tid: string, @Body() dto: any) {
    return this.service.testTool(tid, dto);
  }

  @Get(':id/history')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get tool change history (§6.2J EXCEED)' })
  getHistory(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getToolHistory(tid, id);
  }

  @Get(':id')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findOne(tid, id); }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create tool' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update tool' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete tool' })
  delete(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }
}

// ── /agents/:id/tools/system ──────────────────────────────────────────────────

@ApiTags('tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentToolsController {
  constructor(private service: ToolsService) {}

  @Put(':id/tools/system')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'PATCH system tools for agent — only provided keys merged (§6.2J)' })
  patchSystemTools(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: Record<string, boolean>,
    @CurrentUser() u: any,
  ) {
    return this.service.patchAgentSystemTools(tid, id, dto, u.user_id);
  }
}

// ── /mcp-servers ─────────────────────────────────────────────────────────────

@ApiTags('mcp-servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mcp-servers')
export class McpServersController {
  constructor(private service: ToolsService) {}

  @Get()
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List MCP servers — ?agent_id=:id for agent+workspace scope' })
  findAll(@TenantId() tid: string, @Query('agent_id') agentId?: string) {
    return this.service.getMcpServers(tid, agentId);
  }

  @Post('accept-terms')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Accept MCP workspace terms (shown once per workspace)' })
  acceptTerms(@TenantId() tid: string, @CurrentUser() u: any) {
    return this.service.acceptMcpTerms(tid, u.user_id);
  }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Register MCP server' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createMcpServer(tid, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete MCP server' })
  delete(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deleteMcpServer(tid, id, u.user_id);
  }
}
