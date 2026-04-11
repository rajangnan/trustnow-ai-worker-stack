import { Module } from '@nestjs/common';
import { EnvVarsService } from './env-vars.service';
import { EnvVarsController } from './env-vars.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [EnvVarsService],
  controllers: [EnvVarsController],
  exports: [EnvVarsService],
})
export class EnvVarsModule {}
