import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PhoneNumbersService } from './phone-numbers.service';
import { CreatePhoneNumberDto, AssignAgentDto } from './dto/phone-number.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('phone-numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('phone-numbers')
export class PhoneNumbersController {
  constructor(private service: PhoneNumbersService) {}

  @Get()
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get('sip-endpoint')
  @Roles('agent_admin', 'supervisor', 'tenant_admin', 'platform_admin', 'operator')
  getSipEndpoint() { return this.service.getSipEndpoint(); }

  @Post()
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  create(@TenantId() tid: string, @Body() dto: CreatePhoneNumberDto, @CurrentUser() u: any) {
    return this.service.create(tid, dto, u.user_id);
  }

  @Put(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreatePhoneNumberDto>, @CurrentUser() u: any) {
    return this.service.update(tid, id, dto, u.user_id);
  }

  @Put(':id/assign')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  assignAgent(@TenantId() tid: string, @Param('id') id: string, @Body() dto: AssignAgentDto, @CurrentUser() u: any) {
    return this.service.assignAgent(tid, id, dto, u.user_id);
  }

  @Delete(':id')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  archive(@TenantId() tid: string, @Param('id') id: string, @CurrentUser() u: any) {
    return this.service.archive(tid, id, u.user_id);
  }

  @Post(':id/gateway')
  @Roles('agent_admin', 'tenant_admin', 'platform_admin')
  upsertGateway(@TenantId() tid: string, @Param('id') id: string) {
    return this.service.upsertFreeSwitchGateway(tid, id);
  }
}
