import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';

@ApiTags('Auth')
@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account' })
  @ApiResponse({ status: 201, description: 'Registration successful. Returns JWT token and user object.' })
  @ApiResponse({ status: 409, description: 'Username or email already in use.' })
  @ApiResponse({ status: 422, description: 'Validation error (mismatched passwords, etc.).' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(dto, req.ip ?? req.socket?.remoteAddress ?? '');
    return { success: true, data: result, error: null, message: 'Registration successful.' };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with username/email + password' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns JWT token and user object.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or blocked account.' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, req.ip ?? req.socket?.remoteAddress ?? '');
    return { success: true, data: result, error: null, message: 'Login successful.' };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout (invalidate session client-side)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  logout(@CurrentUser() user: UserEntity) {
    this.authService.logout(user.id);
    return { success: true, data: null, error: null, message: 'Logged out successfully.' };
  }

  @Post('password/forgot')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password-reset email' })
  @ApiResponse({ status: 200, description: 'Always returns 200 to prevent email enumeration.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      success: true,
      data:    null,
      error:   null,
      message: 'If that email is registered, you will receive a reset link shortly.',
    };
  }

  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Token invalid, expired, or passwords do not match.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.token, dto.password, dto.password_confirmation);
    return { success: true, data: null, error: null, message: 'Password has been reset successfully.' };
  }
}
