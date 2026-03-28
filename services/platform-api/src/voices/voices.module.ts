import { Module } from '@nestjs/common';
import { VoicesService } from './voices.service';
import { VoicesController } from './voices.controller';

@Module({
  providers: [VoicesService],
  controllers: [VoicesController],
})
export class VoicesModule {}
