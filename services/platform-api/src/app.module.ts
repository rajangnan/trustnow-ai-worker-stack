import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ToolsModule } from './tools/tools.module';
import { WidgetModule } from './widget/widget.module';
import { VoicesModule } from './voices/voices.module';
import { LlmProvidersModule } from './llm-providers/llm-providers.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TestsModule } from './tests/tests.module';
import { TelephonyModule } from './telephony/telephony.module';
import { SecurityModule } from './security/security.module';
import { PhoneNumbersModule } from './phone-numbers/phone-numbers.module';
import { BatchCallsModule } from './batch-calls/batch-calls.module';
import { WorkflowModule } from './workflow/workflow.module';
import { BranchesModule } from './branches/branches.module';
import { AnalysisModule } from './analysis/analysis.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { SettingsModule } from './settings/settings.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebhookEndpointsModule } from './webhook-endpoints/webhook-endpoints.module';
import { EnvVarsModule } from './env-vars/env-vars.module';
import { TtsModule } from './tts/tts.module';
import { SttModule } from './stt/stt.module';
import { AutonomousModule } from './autonomous/autonomous.module';
import { DesktopModule } from './desktop/desktop.module';
import { ApiKeyMiddleware } from './common/middleware/api-key.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),
    // Core
    AuthModule,
    AuditModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    KnowledgeBaseModule,
    ToolsModule,
    WidgetModule,
    VoicesModule,
    LlmProvidersModule,
    ConversationsModule,
    AnalyticsModule,
    WebhooksModule,
    TestsModule,
    TelephonyModule,
    // Addendum 6A modules
    SecurityModule,
    PhoneNumbersModule,
    BatchCallsModule,
    WorkflowModule,
    BranchesModule,
    AnalysisModule,
    SchedulerModule,
    WhatsAppModule,
    SettingsModule,
    ApiKeysModule,
    WebhookEndpointsModule,
    EnvVarsModule,
    TtsModule,
    SttModule,
    // Task 11 — Autonomous AI Workers
    AutonomousModule,
    // Task 12 — Human Agent Desktop
    DesktopModule,
  ],
  controllers: [AppController],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply ApiKeyMiddleware to all routes — it checks for x-api-key header
    // and only acts when sk-tn_ prefix is present; otherwise falls through to JWT
    consumer.apply(ApiKeyMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
