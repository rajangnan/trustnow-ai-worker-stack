import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LlmProvidersService } from './llm-providers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('llm-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('llm-providers')
export class LlmProvidersController {
  constructor(private service: LlmProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all LLM providers (BRD-L1-005)' })
  findAll() { return this.service.findAllProviders(); }

  @Get('models')
  @ApiOperation({ summary: 'List all LLM models with latency + cost/min — all 22 models (BRD-L1-005)' })
  findModels(@Query('provider_id') providerId?: string) {
    return this.service.findAllModels({ provider_id: providerId });
  }
}
