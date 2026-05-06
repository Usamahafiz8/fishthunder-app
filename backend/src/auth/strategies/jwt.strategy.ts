import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserEntity, UserStatus } from '../../database/entities/user.entity';

export interface JwtPayload {
  sub:      number;
  username: string;
  role:     string;
  status:   string;
  iat:      number;
  exp:      number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'wallet'],
    });

    if (!user) throw new UnauthorizedException('Token is no longer valid.');
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException({
        error:   'account_blocked',
        message: 'Your account has been blocked.',
      });
    }

    return user;
  }
}
