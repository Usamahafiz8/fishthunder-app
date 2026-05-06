import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RoleSlug } from '../../database/entities/role.entity';
import { UserStatus } from '../../database/entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'jane_doe', description: 'Unique username (letters, numbers, underscores)' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'Secret@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: RoleSlug, example: RoleSlug.PLAYER, description: 'Role to assign. Must be lower than your own.' })
  @IsEnum(RoleSlug)
  role: RoleSlug;

  @ApiPropertyOptional({ example: 5, description: 'Override parent user ID (defaults to your own ID)' })
  @IsOptional()
  @IsNumber()
  parent_id?: number;

  @ApiPropertyOptional({ example: 3, description: 'Associate with a shop (optional)' })
  @IsOptional()
  @IsNumber()
  shop_id?: number;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
