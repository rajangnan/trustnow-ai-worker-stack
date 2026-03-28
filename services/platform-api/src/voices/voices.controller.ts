import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VoicesService } from './voices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('voices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('voices')
export class VoicesController {
  constructor(private service: VoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all voices (BRD-L1-010) — supports ?language= ?gender= ?provider=' })
  findAll(
    @Query('language') language?: string,
    @Query('gender') gender?: string,
    @Query('provider') provider?: string,
  ) {
    return this.service.findAll({ language, gender, provider });
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all available languages with voice counts' })
  getLanguages() {
    return this.service.getLanguages();
  }

  @Get('languages/:code/top-picks')
  @ApiOperation({ summary: 'Get top voice picks for a language (BRD-L1-013)' })
  getTopPicks(@Param('code') code: string) {
    return this.service.getTopPicksByLanguage(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voice by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Get voice preview audio URL (BRD-L1-011)' })
  preview(@Param('id') id: string) {
    return this.service.previewVoice(id);
  }

  @Post('design')
  @ApiOperation({ summary: 'Design a new voice (BRD-L1-012)' })
  design(@Body() dto: any) {
    return this.service.designVoice(dto);
  }

  @Post('clone')
  @ApiOperation({ summary: 'Clone voice from audio sample (BRD-L1-013)' })
  clone(@TenantId() tid: string, @Body() dto: { name: string; description: string }) {
    return this.service.cloneVoice(dto.name, dto.description, tid);
  }
}
