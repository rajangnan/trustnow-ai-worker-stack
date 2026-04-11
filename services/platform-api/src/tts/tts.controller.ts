import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TtsService } from './tts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('tts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tts')
export class TtsController {
  constructor(private service: TtsService) {}

  @Post('generate')
  @HttpCode(201)
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Generate TTS audio file — ElevenLabs + MinIO storage (§6.2W)' })
  generate(@TenantId() tid: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.generate(tid, dto, u.user_id);
  }

  @Get('history')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List TTS generation history (§6.2W)' })
  getHistory(
    @TenantId() tid: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory(tid, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('history/:id/download')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get fresh pre-signed download URL for past generation (§6.2W)' })
  getDownloadUrl(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.getDownloadUrl(tid, id);
  }

  @Delete('history/:id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete TTS generation from MinIO + DB (§6.2W)' })
  delete(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.deleteGeneration(tid, id, u.user_id);
  }
}
