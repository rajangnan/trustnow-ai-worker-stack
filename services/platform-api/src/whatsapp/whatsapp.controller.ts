import {
  Controller, Get, Post, Put, Delete, Param, Body, Headers, RawBodyRequest,
  Req, UseGuards, HttpCode, SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import { Request } from 'express';

export const SKIP_AUTH_KEY = 'skipAuth';
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);

@ApiTags('whatsapp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private service: WhatsAppService) {}

  @Get('accounts')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List connected WhatsApp accounts (§6.2R)' })
  findAll(@TenantId() tid: string) {
    return this.service.findAll(tid);
  }

  @Post('accounts/connect')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Connect WhatsApp account via Meta OAuth callback (§6.2R)' })
  connect(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.connectAccount(tid, dto, u.user_id);
  }

  @Put('accounts/:id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update WhatsApp account settings (§6.2R)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateAccount(tid, id, dto, u.user_id);
  }

  @Delete('accounts/:id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Disconnect WhatsApp account (soft delete) (§6.2R)' })
  disconnect(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.disconnectAccount(tid, id, u.user_id);
  }

  @Post('accounts/:id/outbound-message')
  @HttpCode(202)
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Send outbound WhatsApp message via approved template (§6.2R)' })
  sendMessage(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.sendOutboundMessage(tid, id, dto);
  }

  @Post('accounts/:id/outbound-call')
  @HttpCode(202)
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Initiate outbound WhatsApp call (§6.2R)' })
  initiateCall(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.initiateOutboundCall(tid, id, dto);
  }

  // ── Webhook — NO JWT auth (Meta calls this without a token) ───────────────
  @SkipAuth()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inbound Meta WhatsApp webhook — @SkipAuth (§6.2R)' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') sig: string,
    @Body() body: any,
  ) {
    // Verify HMAC-SHA256 signature
    const appSecret = process.env.META_APP_SECRET || '';
    if (appSecret) {
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (rawBody && sig) {
        const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
        if (expected !== sig) {
          return { status: 'invalid_signature' };
        }
      }
    }
    return this.service.handleWebhook(body);
  }

  // Meta webhook verification challenge (GET)
  @SkipAuth()
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification challenge — @SkipAuth (§6.2R)' })
  verifyWebhook(
    @Req() req: any,
  ) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'trustnow-verify';
    if (mode === 'subscribe' && token === verifyToken) {
      return parseInt(challenge, 10);
    }
    return { status: 'forbidden' };
  }
}
