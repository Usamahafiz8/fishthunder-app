import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserStatus } from '../../database/entities/user.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, _ctx: ExecutionContext) {
    if (err || !user) {
      throw new UnauthorizedException({
        error:   'unauthorized',
        message: 'Authentication required.',
      });
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException({
        error:   'account_blocked',
        message: 'Your account has been blocked.',
      });
    }
    return user;
  }
}
