import { IsString, IsEmail, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  role_id?: string;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({ enum: ['active', 'inactive', 'locked'], required: false })
  @IsOptional()
  @IsIn(['active', 'inactive', 'locked'])
  status?: string;
}
