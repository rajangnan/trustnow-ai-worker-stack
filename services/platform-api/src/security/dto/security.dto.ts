import { IsOptional, IsBoolean, IsString, IsArray, IsIn } from 'class-validator';

export class UpdateAgentSecurityDto {
  @IsOptional() @IsBoolean() authentication_enabled?: boolean;
  @IsOptional() @IsBoolean() guardrails_focus_enabled?: boolean;
  @IsOptional() @IsBoolean() guardrails_manipulation_enabled?: boolean;
  @IsOptional() @IsBoolean() guardrails_prompt_injection?: boolean;
  @IsOptional() @IsBoolean() guardrails_content_enabled?: boolean;
  @IsOptional() @IsString() guardrails_custom_prompt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) allowed_hosts?: string[];
  @IsOptional() @IsArray() allowed_overrides?: string[];
  @IsOptional() @IsBoolean() conversation_initiation_webhook_enabled?: boolean;
  @IsOptional() @IsString() conversation_initiation_webhook_url?: string;
  @IsOptional() @IsString() post_call_webhook_url?: string;
  @IsOptional() @IsString() post_call_webhook_secret?: string;
}

export class CreateSessionTokenDto {
  @IsString() agent_id: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() user_metadata?: Record<string, string>;
  @IsOptional() ttl_seconds?: number;
}

export class CreatePostCallWebhookDto {
  @IsString() url: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsBoolean() test?: boolean;
}
