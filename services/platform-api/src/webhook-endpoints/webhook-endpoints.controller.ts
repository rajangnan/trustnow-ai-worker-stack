import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/webhooks')
export class WebhookEndpointsController {
  constructor(private service: WebhookEndpointsService) {}

  @Get()
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List platform webhook endpoints (§6.2U)' })
  findAll(@TenantId() tid: string) {
    return this.service.findAll(tid);
  }

  @Post()
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Add webhook endpoint — secret returned ONCE (§6.2U)' })
  create(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update webhook endpoint (§6.2U)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete webhook endpoint (§6.2U)' })
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }

  @Post(':id/rotate-secret')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Rotate HMAC secret — new secret returned ONCE (§6.2U)' })
  rotateSecret(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.rotateSecret(tid, id, u.user_id);
  }
}
