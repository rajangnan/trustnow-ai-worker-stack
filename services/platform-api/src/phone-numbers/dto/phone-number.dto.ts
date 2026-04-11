import { IsString, IsOptional, IsIn, IsArray, Matches } from 'class-validator';

export class CreatePhoneNumberDto {
  @IsString() label: string;
  @IsString() @Matches(/^\+[1-9]\d{6,14}$/) phone_number: string;
  @IsOptional() @IsIn(['tcp', 'tls']) sip_transport?: string;
  @IsOptional() @IsIn(['disabled', 'allowed', 'required']) media_encryption?: string;
  @IsOptional() @IsString() outbound_address?: string;
  @IsOptional() @IsIn(['tcp', 'tls']) outbound_transport?: string;
  @IsOptional() @IsIn(['disabled', 'allowed', 'required']) outbound_encryption?: string;
  @IsOptional() @IsArray() custom_sip_headers?: Array<{ name: string; value: string }>;
  @IsOptional() @IsString() sip_username?: string;
  @IsOptional() @IsString() sip_password?: string;
  @IsOptional() @IsString() agent_id?: string;
}

export class AssignAgentDto {
  agent_id: string | null;
}
