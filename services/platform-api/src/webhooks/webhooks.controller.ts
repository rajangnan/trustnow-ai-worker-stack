import { Controller, Post, Delete, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class WebhooksController {
  constructor(private service: WebhooksService) {}

  @Post(':id/webhooks/post-call')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create/update post-call webhook (Tab 9 Security)' })
  setPostCall(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() body: { url: string },
    @CurrentUser() u: any,
  ) {
    return this.service.setPostCallWebhook(tid, id, body.url, u.user_id);
  }

  @Delete(':id/webhooks/post-call')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete post-call webhook (Tab 9 Security)' })
  deletePostCall(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deletePostCallWebhook(tid, id, u.user_id);
  }

  @Put(':id/webhooks/initiation')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Set conversation initiation webhook (Tab 9 Security)' })
  setInitiation(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() body: { url: string },
    @CurrentUser() u: any,
  ) {
    return this.service.setInitiationWebhook(tid, id, body.url, u.user_id);
  }
}
