import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['starter', 'professional', 'enterprise'], default: 'starter' })
  @IsOptional()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan_tier?: string;

  @ApiProperty({ enum: ['cloud', 'onprem', 'hybrid'], default: 'cloud' })
  @IsOptional()
  @IsIn(['cloud', 'onprem', 'hybrid'])
  default_partition?: string;
}
