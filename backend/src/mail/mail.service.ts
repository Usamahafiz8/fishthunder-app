import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger     = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   config.get<string>('MAIL_HOST'),
      port:   config.get<number>('MAIL_PORT', 587),
      secure: config.get<number>('MAIL_PORT', 587) === 465,
      auth: {
        user: config.get<string>('MAIL_USER'),
        pass: config.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendPasswordReset(email: string, username: string, resetUrl: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:    `"${this.config.get('MAIL_FROM_NAME', 'FishThunder')}" <${this.config.get('MAIL_FROM')}>`,
        to:      email,
        subject: 'Reset Your Password – FishThunder',
        html: `
          <p>Hello ${username},</p>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }
}
