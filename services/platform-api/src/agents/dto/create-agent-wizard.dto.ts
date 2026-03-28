/**
 * §6.2D — Agent Creation Wizard DTO
 * Powers the "+New Agent" wizard (UI-SPEC §6.3A)
 */
import {
  IsString, IsOptional, IsIn, IsArray, IsBoolean, IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentWizardDto {
  @ApiProperty({ enum: ['conversational', 'tools_assisted', 'autonomous'], description: 'Step 1: agent type' })
  @IsIn(['conversational', 'tools_assisted', 'autonomous'])
  agent_type: string;

  @ApiProperty({ description: 'Step 2: industry', example: 'healthcare_medical' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Step 3: use case', example: 'telehealth_support' })
  @IsString()
  use_case: string;

  @ApiProperty({ description: 'Step 4: agent name' })
  @IsString()
  agent_name: string;

  @ApiProperty({ description: 'Step 4: main goal (free text)' })
  @IsString()
  main_goal: string;

  @ApiProperty({ required: false, description: 'Step 4: company/product website URL for personalisation' })
  @IsOptional()
  @IsString()
  website_url?: string;

  @ApiProperty({ required: false, description: 'Step 3: pre-selected KB doc IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  kb_doc_ids?: string[];

  @ApiProperty({ required: false, description: 'Step 4: text-only (chat) mode' })
  @IsOptional()
  @IsBoolean()
  chat_only?: boolean;
}
