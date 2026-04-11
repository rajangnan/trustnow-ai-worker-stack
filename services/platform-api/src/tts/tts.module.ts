import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [TtsService],
  controllers: [TtsController],
  exports: [TtsService],
})
export class TtsModule {}
