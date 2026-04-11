import { Module } from '@nestjs/common';
import { BatchCallsService } from './batch-calls.service';
import { BatchCallsController } from './batch-calls.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [BatchCallsService],
  controllers: [BatchCallsController],
  exports: [BatchCallsService],
})
export class BatchCallsModule {}
