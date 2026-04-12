import { Module } from '@nestjs/common';
import { DesktopController } from './desktop.controller';
import { DesktopGateway } from './desktop.gateway';

@Module({
  controllers: [DesktopController],
  providers: [DesktopGateway],
  exports: [DesktopGateway],
})
export class DesktopModule {}
