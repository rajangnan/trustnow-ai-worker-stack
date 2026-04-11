import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { SttService } from './stt.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('stt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stt')
export class SttController {
  constructor(private service: SttService) {}

  @Post('transcribe')
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('file'))
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Submit async transcription job — returns transcript_id (§6.2X)' })
  transcribe(
    @TenantId() tid: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() u: any,
  ) {
    return this.service.createTranscription(tid, dto, file, u.user_id);
  }

  @Get('transcripts')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List transcripts — filter: search, status (§6.2X)' })
  findAll(
    @TenantId() tid: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(tid, search, status, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('transcripts/:id')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Get full transcript with word timestamps (§6.2X)' })
  findOne(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findOne(tid, id);
  }

  @Get('transcripts/:id/export')
  @Roles('agent_admin', 'operator', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Export transcript as txt | json | srt (§6.2X)' })
  async exportTranscript(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const result = await this.service.exportTranscript(tid, id, format || 'txt');
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  @Put('transcripts/:id')
  @Roles('agent_admin', 'operator', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Rename transcript (§6.2X)' })
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Delete('transcripts/:id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete transcript from MinIO + DB (§6.2X)' })
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.delete(tid, id, u.user_id);
  }
}
