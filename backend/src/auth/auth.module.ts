import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordResetEntity } from '../database/entities/password-reset.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { UserActivityEntity } from '../database/entities/user-activity.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') },
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      WalletEntity,
      PasswordResetEntity,
      UserActivityEntity,
    ]),
    MailModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
