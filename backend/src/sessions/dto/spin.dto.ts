import { IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpinDto {
  @ApiProperty({ example: 1.00, description: 'Bet amount (must be within game min/max bet)' })
  @IsNumber()
  @IsPositive()
  betAmount: number;

  @ApiProperty({ example: 'uuid-v4-unique-key', description: 'Client-generated idempotency key — prevents duplicate spins on retry' })
  @IsString()
  @MaxLength(100)
  idempotencyKey: string;
}
