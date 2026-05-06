import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username or email address' })
  @IsString()
  @MaxLength(150)
  identifier: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @MinLength(1)
  password: string;
}
