import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { UpdateAgentSecurityDto, CreateSessionTokenDto, CreatePostCallWebhookDto } from './dto/security.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SecurityController {
  constructor(private service: SecurityService) {}

  @Get('agents/:id/security')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  getAgentSecurity(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getAgentSecurity(tid, id);
  }

  @Put('agents/:id/security')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  updateAgentSecurity(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentSecurityDto,
    @CurrentUser() u: any,
  ) {
    return this.service.updateAgentSecurity(tid, id, dto, u.user_id);
  }

  @Post('api/auth/session-token')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin', 'operator')
  createSessionToken(@TenantId() tid: string, @Body() dto: CreateSessionTokenDto) {
    return this.service.createSessionToken(tid, dto);
  }

  @Post('agents/:id/webhooks/post-call')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  testOrSaveWebhook(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: CreatePostCallWebhookDto,
  ) {
    return this.service.testOrSavePostCallWebhook(tid, id, dto);
  }

  @Delete('agents/:id/webhooks/post-call')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  deleteWebhook(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.deletePostCallWebhook(tid, id);
  }
}
