import { IsString, IsOptional, IsNumber, IsIn, Min, Max, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateBranchTrafficDto {
  @IsNumber() @Min(0) @Max(100) traffic_split: number;
  @IsOptional() @IsIn(['live', 'paused']) status?: string;
}

export class RestoreBranchVersionDto {
  // POST /agents/:id/branches/:branch_id/versions/:version_id/restore — no body
}
