import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiPropertyOptional({ example: 'Player cashed out' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
