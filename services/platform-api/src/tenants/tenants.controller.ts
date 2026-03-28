import {
  Controller, Get, Post, Put, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get()
  @Roles('platform_admin')
  @ApiOperation({ summary: 'List all tenants (platform_admin only)' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('platform_admin', 'tenant_admin')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Create new tenant' })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.user_id);
  }

  @Put(':id')
  @Roles('platform_admin', 'tenant_admin')
  @ApiOperation({ summary: 'Update tenant' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTenantDto>,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.user_id);
  }
}
