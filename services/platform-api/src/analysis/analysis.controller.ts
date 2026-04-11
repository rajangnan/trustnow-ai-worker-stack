import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AnalysisController {
  constructor(private service: AnalysisService) {}

  // ── Evaluation Criteria ──────────────────────────────────────────────────

  @Get(':id/criteria')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List evaluation criteria for agent (§6.2L)' })
  listCriteria(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.listCriteria(tid, id);
  }

  @Post(':id/criteria')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Add evaluation criterion (§6.2L)' })
  createCriterion(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createCriterion(tid, id, dto, u.user_id);
  }

  @Put(':id/criteria/:criteriaId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update evaluation criterion (§6.2L)' })
  updateCriterion(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('criteriaId') criteriaId: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.updateCriterion(tid, id, criteriaId, dto, u.user_id);
  }

  @Delete(':id/criteria/:criteriaId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete evaluation criterion (§6.2L)' })
  deleteCriterion(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('criteriaId') criteriaId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.deleteCriterion(tid, id, criteriaId, u.user_id);
  }

  // ── Data Collection Specs ────────────────────────────────────────────────

  @Get(':id/data-specs')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'List data collection specs for agent (§6.2L)' })
  listDataSpecs(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.listDataSpecs(tid, id);
  }

  @Post(':id/data-specs')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Add data collection spec (§6.2L)' })
  createDataSpec(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.service.createDataSpec(tid, id, dto, u.user_id);
  }

  @Put(':id/data-specs/:specId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Update data collection spec (§6.2L)' })
  updateDataSpec(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('specId') specId: string,
    @Body() dto: any,
    @CurrentUser() u: any,
  ) {
    return this.service.updateDataSpec(tid, id, specId, dto, u.user_id);
  }

  @Delete(':id/data-specs/:specId')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Delete data collection spec (§6.2L)' })
  deleteDataSpec(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Param('specId') specId: string,
    @CurrentUser() u: any,
  ) {
    return this.service.deleteDataSpec(tid, id, specId, u.user_id);
  }

  // ── Analysis Language ────────────────────────────────────────────────────

  @Put(':id/analysis-language')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Set analysis language for agent (§6.2L)' })
  updateAnalysisLanguage(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: { analysis_language: string },
    @CurrentUser() u: any,
  ) {
    return this.service.updateAnalysisLanguage(tid, id, dto.analysis_language, u.user_id);
  }

  // ── Batch Re-evaluation (EXCEED) ─────────────────────────────────────────

  @Post(':id/batch-re-evaluate')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  @ApiOperation({ summary: 'Queue batch re-evaluation of past conversations (§6.2L EXCEED)' })
  batchReEvaluate(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @CurrentUser() u?: any,
  ) {
    return this.service.batchReEvaluate(tid, id, limit ? parseInt(limit) : 100, u.user_id);
  }
}
