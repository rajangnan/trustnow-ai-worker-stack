import { Controller, Get, Put, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WidgetService } from './widget.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('widget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class WidgetController {
  constructor(private service: WidgetService) {}

  @Get(':id/widget')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get widget config for agent (Tab 8)' })
  getWidget(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getWidget(tid, id);
  }

  @Put(':id/widget')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update widget config (Tab 8 — all fields incl. expanded_behavior, avatar_type, include_www_variants, allow_http_links)' })
  updateWidget(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.updateWidget(tid, id, dto, u.user_id);
  }

  @Post(':id/widget/avatar')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Upload avatar image for widget (§6.2G) — JPEG/PNG/WebP/GIF, max 2MB' })
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() u: any,
  ) {
    return this.service.uploadAvatar(tid, id, file, u.user_id);
  }

  @Get(':id/widget/shareable-url')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get public shareable URL for agent widget (§6.2G)' })
  getShareableUrl(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getShareableUrl(tid, id);
  }

  @Get(':id/widget/embed')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get embed code snippet for agent widget' })
  getEmbedCode(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getEmbedCode(tid, id);
  }
}
