import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkflowNodeDto {
  @IsOptional() @IsString() node_id?: string;
  @IsString() node_type: string;
  @IsOptional() @IsString() label?: string;
  @IsNumber() position_x: number;
  @IsNumber() position_y: number;
  @IsOptional() @IsString() conversation_goal?: string;
  @IsOptional() @IsBoolean() override_prompt?: boolean;
  @IsOptional() voice_id?: string | null;
  @IsOptional() llm_model?: string | null;
  @IsOptional() eagerness?: string | null;
  @IsOptional() spelling_patience?: string | null;
  @IsOptional() speculative_turn_enabled?: boolean | null;
  @IsOptional() config?: object;
}

export class CreateWorkflowEdgeDto {
  @IsOptional() @IsString() edge_id?: string;
  @IsString() source_node_id: string;
  @IsString() target_node_id: string;
  @IsOptional() @IsString() condition_label?: string;
  @IsOptional() @IsIn(['unconditional', 'llm_evaluated', 'tool_output']) condition_type?: string;
  @IsOptional() @IsNumber() priority?: number;
}

export class SaveWorkflowDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateWorkflowNodeDto) nodes: CreateWorkflowNodeDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateWorkflowEdgeDto) edges: CreateWorkflowEdgeDto[];
  @IsOptional() global_settings?: { prevent_infinite_loops?: boolean };
}

export class LoadWorkflowTemplateDto {
  @IsString() template_id: string;
}
