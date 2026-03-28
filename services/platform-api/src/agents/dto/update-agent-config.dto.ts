/**
 * §6.2A — Full UpdateAgentConfigDto
 * Every field in agent_configs schema (§3.1 + migration-001) must be represented.
 * Partial update — only provided fields are written.
 */
import {
  IsString, IsBoolean, IsNumber, IsOptional, IsArray,
  IsUUID, IsIn, IsObject, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AdditionalVoiceDto {
  @IsUUID() voice_id: string;
  @IsString() language: string;
}

class LanguageGroupDto {
  @IsString() name: string;
  @IsArray() @IsString({ each: true }) languages: string[];
}

class GuardrailsFocusConfigDto {
  @IsOptional() @IsArray() @IsString({ each: true }) allowed_topics?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) blocked_topics?: string[];
}

class EvaluationCriterionDto {
  @IsString() name: string;
  @IsString() prompt: string;
}

class DataCollectionFieldDto {
  @IsString() name: string;
  @IsString() description: string;
  @IsOptional() @IsString() type?: string;
}

class WorkflowNodeDto {
  @IsString() id: string;
  @IsString() type: string;
  @IsObject() position: { x: number; y: number };
  @IsOptional() @IsObject() data?: object;
}

class WorkflowEdgeDto {
  @IsString() id: string;
  @IsString() source: string;
  @IsString() target: string;
  @IsOptional() @IsString() label?: string;
}

class WorkflowDefinitionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkflowNodeDto) nodes: WorkflowNodeDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkflowEdgeDto) edges: WorkflowEdgeDto[];
}

export class UpdateAgentConfigDto {
  // ── System Prompt ──────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsString()
  system_prompt?: string;

  @ApiProperty({ required: false, description: '"Default personality" toggle' })
  @IsOptional() @IsBoolean()
  default_personality_enabled?: boolean;

  @ApiProperty({ required: false, description: '"Set timezone" — e.g. "Asia/Kolkata"' })
  @IsOptional() @IsString()
  timezone_override?: string;

  // ── First Message ──────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsString()
  first_message?: string;

  @ApiProperty({ required: false, description: '"Interruptible" toggle' })
  @IsOptional() @IsBoolean()
  first_message_interruptible?: boolean;

  // ── Voice ──────────────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  voice_id?: string;

  @ApiProperty({ required: false, description: 'Expressive Mode — NEW from co-browsing' })
  @IsOptional() @IsBoolean()
  expressive_mode_enabled?: boolean;

  @ApiProperty({ required: false, type: [AdditionalVoiceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AdditionalVoiceDto)
  additional_voices?: AdditionalVoiceDto[];

  // ── Language ───────────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsString()
  primary_language?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsArray() @IsString({ each: true })
  additional_languages?: string[];

  @ApiProperty({ required: false, description: 'Hinglish Mode toggle — NEW from co-browsing' })
  @IsOptional() @IsBoolean()
  hinglish_mode_enabled?: boolean;

  @ApiProperty({ required: false, type: [LanguageGroupDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LanguageGroupDto)
  language_groups?: LanguageGroupDto[];

  // ── LLM ───────────────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  llm_model_id?: string;

  @ApiProperty({ required: false, enum: ['default', 'custom', 'disabled'], description: 'Backup LLM policy — NEW' })
  @IsOptional() @IsIn(['default', 'custom', 'disabled'])
  backup_llm_policy?: 'default' | 'custom' | 'disabled';

  @ApiProperty({ required: false, description: 'Backup LLM model UUID — NEW' })
  @IsOptional() @IsUUID()
  backup_llm_model_id?: string;

  @ApiProperty({ required: false, description: 'LLM temperature 0.0–1.0 — NEW', minimum: 0, maximum: 1 })
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  llm_temperature?: number;

  @ApiProperty({ required: false, description: 'LLM thinking budget toggle — NEW' })
  @IsOptional() @IsBoolean()
  llm_thinking_budget_enabled?: boolean;

  @ApiProperty({ required: false, description: 'Max tokens (-1 = unlimited) — NEW' })
  @IsOptional() @IsNumber()
  llm_max_tokens?: number;

  // ── STT / TTS ─────────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  stt_provider_id?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  tts_provider_id?: string;

  // ── Conversational Behaviour ───────────────────────────────────────────────
  @ApiProperty({ required: false, enum: ['low', 'normal', 'high'], description: 'Turn eagerness — NEW' })
  @IsOptional() @IsIn(['low', 'normal', 'high'])
  eagerness?: 'low' | 'normal' | 'high';

  @ApiProperty({ required: false, description: 'Speculative turn — NEW' })
  @IsOptional() @IsBoolean()
  speculative_turn_enabled?: boolean;

  @ApiProperty({ required: false, description: 'Take turn after silence ms (default 7000) — NEW' })
  @IsOptional() @IsNumber()
  take_turn_after_silence_ms?: number;

  @ApiProperty({ required: false, description: 'End after silence seconds (-1 = disabled) — NEW' })
  @IsOptional() @IsNumber()
  end_conversation_after_silence_s?: number;

  @ApiProperty({ required: false, description: 'Max conversation duration seconds (default 600) — NEW' })
  @IsOptional() @IsNumber()
  max_conversation_duration_s?: number;

  @ApiProperty({ required: false, description: 'Max duration message — NEW' })
  @IsOptional() @IsString()
  max_conversation_duration_message?: string;

  @ApiProperty({ required: false, description: 'Soft timeout seconds (-1 = disabled) — NEW' })
  @IsOptional() @IsNumber()
  soft_timeout_s?: number;

  // ── ASR / Audio ───────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'Filter background speech (Alpha) — NEW' })
  @IsOptional() @IsBoolean()
  filter_background_speech_enabled?: boolean;

  @ApiProperty({ required: false, description: 'ASR model — NEW', example: 'original' })
  @IsOptional() @IsString()
  asr_model?: string;

  @ApiProperty({ required: false, description: 'User input audio format — NEW', example: 'pcm_16000' })
  @IsOptional() @IsString()
  user_input_audio_format?: string;

  // ── Guardrails ────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'Guardrails Focus (Alpha) — NEW' })
  @IsOptional() @IsBoolean()
  guardrails_focus_enabled?: boolean;

  @ApiProperty({ required: false, type: GuardrailsFocusConfigDto })
  @IsOptional() @IsObject()
  guardrails_focus_config?: object;

  @ApiProperty({ required: false, description: 'Guardrails Manipulation (Alpha) — NEW' })
  @IsOptional() @IsBoolean()
  guardrails_manipulation_enabled?: boolean;

  // ── Overrides ─────────────────────────────────────────────────────────────
  @ApiProperty({
    required: false,
    isArray: true,
    description: 'Allowed override keys — NEW',
    example: ['first_message', 'system_prompt', 'llm', 'voice', 'voice_speed', 'voice_stability', 'voice_similarity', 'text_only'],
  })
  @IsOptional() @IsArray() @IsString({ each: true })
  @IsIn(['first_message', 'system_prompt', 'llm', 'voice', 'voice_speed', 'voice_stability', 'voice_similarity', 'text_only'], { each: true })
  allowed_overrides?: string[];

  // ── RAG ───────────────────────────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean()
  rag_enabled?: boolean;

  @ApiProperty({ required: false, enum: ['english', 'multilingual'] })
  @IsOptional() @IsIn(['english', 'multilingual'])
  rag_embedding_model?: 'english' | 'multilingual';

  @ApiProperty({ required: false }) @IsOptional() @IsNumber()
  rag_character_limit?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsNumber()
  rag_chunk_limit?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsNumber()
  rag_vector_distance_limit?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean()
  rag_num_candidates_enabled?: boolean;

  @ApiProperty({ required: false }) @IsOptional() @IsNumber()
  rag_num_candidates?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean()
  rag_query_rewrite_enabled?: boolean;

  // ── Evaluation & Data Collection ──────────────────────────────────────────
  @ApiProperty({ required: false, type: [EvaluationCriterionDto], description: 'Evaluation criteria — NEW' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EvaluationCriterionDto)
  evaluation_criteria_json?: EvaluationCriterionDto[];

  @ApiProperty({ required: false, type: [DataCollectionFieldDto], description: 'Data collection fields — NEW' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DataCollectionFieldDto)
  data_collection_json?: DataCollectionFieldDto[];

  // ── Workflow ──────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'Workflow node/edge canvas definition — NEW' })
  @IsOptional() @IsObject()
  workflow_definition_json?: object;

  // ── Tools / KB / Widget / Auth ────────────────────────────────────────────
  @ApiProperty({ required: false }) @IsOptional() @IsArray()
  tools_config_json?: object;

  @ApiProperty({ required: false }) @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  kb_docs_attached?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  widget_config_id?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  auth_policy_id?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsUUID()
  handoff_policy_id?: string;

  // ── Webhooks ──────────────────────────────────────────────────────────────
  @ApiProperty({ required: false, description: 'Post-call webhook URL — NEW' })
  @IsOptional() @IsString()
  post_call_webhook_url?: string;

  @ApiProperty({ required: false, description: 'Conversation initiation webhook URL — NEW' })
  @IsOptional() @IsString()
  conversation_initiation_webhook_url?: string;
}
