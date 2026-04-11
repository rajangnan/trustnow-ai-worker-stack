import { Module } from '@nestjs/common';
import { PhoneNumbersService } from './phone-numbers.service';
import { PhoneNumbersController } from './phone-numbers.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [PhoneNumbersService],
  controllers: [PhoneNumbersController],
  exports: [PhoneNumbersService],
})
export class PhoneNumbersModule {}
