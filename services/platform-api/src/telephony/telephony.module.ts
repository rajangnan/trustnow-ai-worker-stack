import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EslService } from './esl.service';
import { HandoffService } from './handoff.service';
import { HandoffController } from './handoff.controller';
import { TelephonyController } from './telephony.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [HandoffController, TelephonyController],
  providers: [EslService, HandoffService],
  exports: [EslService, HandoffService],
})
export class TelephonyModule {}
