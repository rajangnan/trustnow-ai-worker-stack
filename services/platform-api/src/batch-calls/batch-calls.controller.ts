import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BatchCallsService } from './batch-calls.service';
import { CreateBatchCallDto, TestCallDto } from './dto/batch-call.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('batch-calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batch-calls')
export class BatchCallsController {
  constructor(private service: BatchCallsService) {}

  @Get()
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get(':id')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findOne(tid, id); }

  @Get(':id/recipients')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  getRecipients(@TenantId() tid: string, @Param('id') id: string, @Query('page') p?: string, @Query('limit') l?: string) {
    return this.service.getRecipients(tid, id, p ? parseInt(p) : 1, l ? parseInt(l) : 100);
  }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @UseInterceptors(FileInterceptor('recipients_file'))
  create(
    @TenantId() tid: string,
    @Body() dto: CreateBatchCallDto,
    @CurrentUser() u: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(tid, dto, file?.buffer || null, u.user_id);
  }

  @Post(':id/cancel')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  cancel(@TenantId() tid: string, @Param('id') id: string) { return this.service.cancel(tid, id); }

  @Post('test-call')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  testCall(@TenantId() tid: string, @Body() dto: TestCallDto) { return this.service.testCall(tid, dto); }
}
