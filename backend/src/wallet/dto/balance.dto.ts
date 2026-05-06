import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class BalanceDto {
  @ApiProperty({ example: '100.00', description: 'Positive amount with up to 2 decimal places' })
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive number with at most 2 decimal places' })
  amount: string;

  @ApiProperty({ example: 'Top-up from cashier', description: 'Human-readable reason for this transaction' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason: string;
}
