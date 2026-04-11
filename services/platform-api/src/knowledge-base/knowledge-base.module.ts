import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController, AgentKbController } from './knowledge-base.controller';

@Module({
  providers: [KnowledgeBaseService],
  controllers: [KnowledgeBaseController, AgentKbController],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
