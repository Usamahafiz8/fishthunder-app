import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEmail,
  IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PlayerEntry {
  @ApiProperty({ example: 'player_001' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username: string;

  @ApiProperty({ example: 'Player@1234' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'player001@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class MassCreateUsersDto {
  @ApiProperty({ type: [PlayerEntry], description: 'Array of 1–100 player records to create' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PlayerEntry)
  users: PlayerEntry[];
}
