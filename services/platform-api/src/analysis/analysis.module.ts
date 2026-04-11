import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PostCallSummaryProcessor, PostCallCriteriaProcessor, PostCallDataExtractProcessor } from './post-call.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue(
      { name: 'post-call-summary' },
      { name: 'post-call-criteria' },
      { name: 'post-call-data-extract' },
    ),
  ],
  providers: [
    AnalysisService,
    PostCallSummaryProcessor,
    PostCallCriteriaProcessor,
    PostCallDataExtractProcessor,
  ],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}
