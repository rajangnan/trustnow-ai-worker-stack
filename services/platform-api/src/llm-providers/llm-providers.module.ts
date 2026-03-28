import { Module } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';
import { LlmProvidersController } from './llm-providers.controller';

@Module({
  providers: [LlmProvidersService],
  controllers: [LlmProvidersController],
})
export class LlmProvidersModule {}
