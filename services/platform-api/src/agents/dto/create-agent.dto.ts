import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['conversational', 'tools_assisted', 'autonomous'] })
  @IsIn(['conversational', 'tools_assisted', 'autonomous'])
  type: string;

  @ApiProperty({ enum: ['cloud', 'onprem', 'hybrid'], default: 'cloud' })
  @IsOptional()
  @IsIn(['cloud', 'onprem', 'hybrid'])
  partition?: string;

  @ApiProperty({ enum: ['production', 'staging', 'development'], default: 'production' })
  @IsOptional()
  @IsIn(['production', 'staging', 'development'])
  environment?: string;
}
