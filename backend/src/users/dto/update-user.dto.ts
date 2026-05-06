import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserStatus } from '../../database/entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jane_doe_v2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username?: string;

  @ApiPropertyOptional({ example: 'jane_new@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  shop_id?: number;
}
