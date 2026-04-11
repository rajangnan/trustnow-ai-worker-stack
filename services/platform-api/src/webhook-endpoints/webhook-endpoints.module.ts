import { Module } from '@nestjs/common';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { WebhookEndpointsController } from './webhook-endpoints.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [WebhookEndpointsService],
  controllers: [WebhookEndpointsController],
  exports: [WebhookEndpointsService],
})
export class WebhookEndpointsModule {}
