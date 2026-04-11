import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionPurgeJob } from './retention-purge.job';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  providers: [RetentionPurgeJob],
})
export class SchedulerModule {}
