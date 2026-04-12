import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  HitlController,
  HitlInternalController,
  PaymentWebhookController,
} from './hitl.controller';

@Module({
  imports: [AuditModule],
  controllers: [
    HitlController,
    HitlInternalController,
    PaymentWebhookController,
  ],
})
export class AutonomousModule {}
