import { IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({ example: 1, description: 'Game ID to start a session for' })
  @IsNumber()
  @IsPositive()
  gameId: number;

  @ApiProperty({ example: 50.00, description: 'Amount to transfer from main wallet into session' })
  @IsNumber()
  @IsPositive()
  transferAmount: number;
}
