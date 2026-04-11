import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';

export class CreateBatchCallDto {
  @IsOptional() @IsString() name?: string;
  @IsUUID() agent_id: string;
  @IsUUID() phone_number_id: string;
  @IsOptional() @IsNumber() ringing_timeout_s?: number;
  @IsOptional() @IsNumber() concurrency_limit?: number;
  @IsOptional() @IsString() scheduled_at?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsBoolean() compliance_acknowledged: boolean;
}

export class TestCallDto {
  @IsUUID() agent_id: string;
  @IsUUID() phone_number_id: string;
  @IsString() recipient_phone_number: string;
  @IsOptional() dynamic_variables?: Record<string, string>;
}
