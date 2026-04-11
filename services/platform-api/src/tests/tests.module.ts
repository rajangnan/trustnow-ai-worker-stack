import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TestsService } from './tests.service';
import {
  WorkspaceTestsController,
  TestRunsController,
  AgentTestsController,
  TestFoldersController,
} from './tests.controller';
import { TestExecutionProcessor } from './test-execution.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({ name: 'test-execution' }),
  ],
  providers: [TestsService, TestExecutionProcessor],
  controllers: [
    WorkspaceTestsController,
    TestRunsController,
    AgentTestsController,
    TestFoldersController,
  ],
  exports: [TestsService],
})
export class TestsModule {}
