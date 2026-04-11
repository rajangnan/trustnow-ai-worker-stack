import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Get()
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List API keys — hash and full key never returned (§6.2T)' })
  findAll(@TenantId() tid: string) {
    return this.service.findAll(tid);
  }

  @Post()
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create API key — full key returned ONCE (§6.2T). Prefix: sk-tn_' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update key name, permissions or credit limit (§6.2T)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Revoke (soft-delete) API key — sets is_active=false (§6.2T)' })
  revoke(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.revoke(tid, id, u.user_id);
  }
}
