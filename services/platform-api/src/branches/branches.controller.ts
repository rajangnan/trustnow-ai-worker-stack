import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchTrafficDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents/:id/branches')
export class BranchesController {
  constructor(private service: BranchesService) {}

  @Get()
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  findAll(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.findAll(tid, id);
  }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  create(@TenantId() tid: string, @Param('id') id: string, @Body() dto: CreateBranchDto, @CurrentUser() u: any) {
    return this.service.create(tid, id, dto, u.user_id);
  }

  @Put(':branchId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  updateMetadata(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @Body() dto: UpdateBranchDto, @CurrentUser() u: any) {
    return this.service.updateMetadata(tid, id, bid, dto, u.user_id);
  }

  @Put(':branchId/traffic')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  updateTraffic(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @Body() dto: UpdateBranchTrafficDto, @CurrentUser() u: any) {
    return this.service.updateTraffic(tid, id, bid, dto, u.user_id);
  }

  @Post(':branchId/protect')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  protect(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @CurrentUser() u: any) {
    return this.service.protect(tid, id, bid, u.user_id);
  }

  @Post(':branchId/unlock')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  unlock(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @CurrentUser() u: any) {
    return this.service.unlock(tid, id, bid, u.user_id);
  }

  @Get(':branchId/versions')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  getVersions(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string) {
    return this.service.getVersions(tid, id, bid);
  }

  @Post(':branchId/versions/:versionId/restore')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  restoreVersion(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @Param('versionId') vid: string, @CurrentUser() u: any) {
    return this.service.restoreVersion(tid, id, bid, vid, u.user_id);
  }

  @Delete(':branchId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  archive(@TenantId() tid: string, @Param('id') id: string, @Param('branchId') bid: string, @CurrentUser() u: any) {
    return this.service.archive(tid, id, bid, u.user_id);
  }
}
