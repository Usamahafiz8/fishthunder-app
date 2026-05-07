import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameStatus, GameType } from '../../database/entities/game.entity';

export class CreateGameDto {
  @ApiProperty({ example: 'Golden Fish' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'golden-fish' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ enum: GameType, default: GameType.SLOT })
  @IsOptional()
  @IsEnum(GameType)
  type?: GameType;

  @ApiPropertyOptional({ enum: GameStatus, default: GameStatus.ACTIVE })
  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @ApiPropertyOptional({ example: 96.0, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  rtpTarget?: number;

  @ApiPropertyOptional({ example: 0.10 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  minBet?: number;

  @ApiPropertyOptional({ example: 100.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxBet?: number;

  @ApiPropertyOptional({ example: 'Classic 5-reel slot' })
  @IsOptional()
  @IsString()
  description?: string;
}
