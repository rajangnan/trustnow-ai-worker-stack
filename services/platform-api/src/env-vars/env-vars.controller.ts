import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EnvVarsService } from './env-vars.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('env-vars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('env-vars')
export class EnvVarsController {
  constructor(private service: EnvVarsService) {}

  @Get()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List all environment variables — values not included (§6.2V)' })
  findAll(@TenantId() tid: string) {
    return this.service.findAll(tid);
  }

  @Get(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get variable with all environment values (§6.2V)' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create environment variable — supports custom environments (§6.2V)' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update variable — UPSERT on conflict(var_id, environment) (§6.2V)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete variable — cascades all env values (§6.2V)' })
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }
}
