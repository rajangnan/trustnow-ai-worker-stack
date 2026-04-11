import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SttService } from './stt.service';
import { SttController } from './stt.controller';
import { SttTranscribeProcessor } from './stt.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({ name: 'stt-transcribe' }),
  ],
  providers: [SttService, SttTranscribeProcessor],
  controllers: [SttController],
  exports: [SttService],
})
export class SttModule {}
