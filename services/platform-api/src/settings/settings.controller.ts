import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workspace')
export class SettingsController {
  constructor(private service: SettingsService) {}

  // ── Workspace Settings ────────────────────────────────────────────────────

  @Get('settings')
  @Roles('supervisor', 'agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get workspace settings — webhooks, secrets summary (§6.2S)' })
  getSettings(@TenantId() tid: string) {
    return this.service.getSettings(tid);
  }

  @Put('settings')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update workspace settings (auto-save, UPSERT) (§6.2S)' })
  updateSettings(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateSettings(tid, dto, u.user_id);
  }

  @Post('settings/webhooks/test')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Test a workspace webhook URL (§6.2S)' })
  testWebhook(@TenantId() tid: string, @Body() dto: any) {
    return this.service.testWebhook(tid, dto);
  }

  // ── Workspace Secrets ─────────────────────────────────────────────────────

  @Get('secrets')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List workspace secrets — names only, values never returned (§6.2S)' })
  listSecrets(@TenantId() tid: string) {
    return this.service.listSecrets(tid);
  }

  @Post('secrets')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create workspace secret — encrypted via Vault (§6.2S)' })
  createSecret(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createSecret(tid, dto, u.user_id);
  }

  @Delete('secrets/:id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete workspace secret (§6.2S)' })
  deleteSecret(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deleteSecret(tid, id, u.user_id);
  }

  // ── Auth Connections ──────────────────────────────────────────────────────

  @Get('auth-connections')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List workspace auth connections (§6.2S)' })
  listAuthConnections(@TenantId() tid: string) {
    return this.service.listAuthConnections(tid);
  }

  @Post('auth-connections')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Create auth connection (oauth2 | api_key | bearer | basic) (§6.2S)' })
  createAuthConnection(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createAuthConnection(tid, dto, u.user_id);
  }

  @Delete('auth-connections/:id')
  @Roles('tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete auth connection — 409 if tools reference it (§6.2S)' })
  deleteAuthConnection(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deleteAuthConnection(tid, id, u.user_id);
  }
}
