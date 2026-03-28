import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
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
  @ApiOperation({ summary: 'List tenant tools' })
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get('system')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List system tools (incl. "Play keypad touch tone")' })
  getSystemTools() { return this.service.getSystemTools(); }

  @Get('mcp')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List MCP servers (Tab 6 sub-tab)' })
  getMcp(@TenantId() tid: string) { return this.service.getMcpServers(tid); }

  @Post('mcp')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Register MCP server' })
  createMcp(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createMcpServer(tid, dto, u.user_id);
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

  @Put('agents/:agentId/system')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update system tools for agent' })
  updateAgentSystemTools(
    @TenantId() tid: string,
    @Param('agentId') agentId: string,
    @Body() body: { tool_ids: string[] },
    @CurrentUser() u: any,
  ) {
    return this.service.updateAgentSystemTools(tid, agentId, body.tool_ids, u.user_id);
  }
}
