import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name, e.g. "Test LLM Temperature"' })
  @IsString()
  name: string;
}

export class UpdateBranchTrafficDto {
  @ApiProperty({ description: 'Traffic split percentage 0–100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  traffic_split_pct: number;
}
