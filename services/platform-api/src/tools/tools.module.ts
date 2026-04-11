import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolsController, AgentToolsController, McpServersController } from './tools.controller';

@Module({
  providers: [ToolsService],
  controllers: [ToolsController, AgentToolsController, McpServersController],
  exports: [ToolsService],
})
export class ToolsModule {}
