import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentBlankDto {
  @ApiProperty({ description: 'Agent name', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  agent_name: string;

  @ApiProperty({ required: false, description: 'Chat-only mode (no voice)', default: false })
  @IsOptional()
  @IsBoolean()
  text_only?: boolean;
}
