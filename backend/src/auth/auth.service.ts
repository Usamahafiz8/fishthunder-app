import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository, DataSource } from 'typeorm';
import { PasswordResetEntity } from '../database/entities/password-reset.entity';
import { RoleEntity, RoleSlug } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { UserActivityEntity } from '../database/entities/user-activity.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource:   DataSource,
    private readonly jwtService:   JwtService,
    private readonly config:       ConfigService,
    private readonly mailService:  MailService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PasswordResetEntity)
    private readonly resetRepo: Repository<PasswordResetEntity>,
    @InjectRepository(UserActivityEntity)
    private readonly activityRepo: Repository<UserActivityEntity>,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ip: string) {
    if (dto.password !== dto.password_confirmation) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Password confirmation does not match.',
        errors: { password_confirmation: ['Password confirmation does not match.'] },
      });
    }

    const [byUsername, byEmail] = await Promise.all([
      this.userRepo.findOne({ where: { username: dto.username } }),
      this.userRepo.findOne({ where: { email: dto.email } }),
    ]);
    if (byUsername) throw new ConflictException({ error: 'conflict', message: 'Username already taken.', errors: { username: ['Username already taken.'] } });
    if (byEmail)    throw new ConflictException({ error: 'conflict', message: 'Email already registered.', errors: { email: ['Email already registered.'] } });

    return this.dataSource.transaction(async (em) => {
      const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
      const hash   = await bcrypt.hash(dto.password, rounds);

      const user   = em.create(UserEntity, { username: dto.username, email: dto.email, password: hash, status: 'active' as any });
      await em.save(user);

      const playerRole = await this.roleRepo.findOneByOrFail({ slug: RoleSlug.PLAYER });
      user.roles = [playerRole];
      await em.save(user);

      const wallet = em.create(WalletEntity, { userId: user.id, balance: '0.00', currency: 'USD' });
      await em.save(wallet);

      await em.save(UserActivityEntity, { userId: user.id, action: 'user_registered', ipAddress: ip, metadata: { email: user.email } } as any);

      const token      = this.signToken(user);
      const expiresAt  = new Date(Date.now() + this.jwtTtlMs()).toISOString();

      return { token, expires_at: expiresAt, user: this.formatUser(user, wallet) };
    });
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip: string) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .leftJoinAndSelect('u.roles',  'r')
      .leftJoinAndSelect('u.wallet', 'w')
      .where('u.email = :id OR u.username = :id', { id: dto.identifier })
      .getOne();

    const valid = user && (await bcrypt.compare(dto.password, user.password));

    if (!valid) {
      await this.activityRepo.save({
        userId:             user?.id ?? null,
        action:             'login_failed',
        ipAddress:          ip,
        metadata:           { identifier: dto.identifier },
        attemptedUsername:  user ? null : dto.identifier,
      } as any);
      throw new UnauthorizedException({ error: 'invalid_credentials', message: 'The provided credentials are incorrect.' });
    }

    // Reject blocked accounts — even with correct password
    if (user.status === 'blocked' as any) {
      await this.activityRepo.save({
        userId: user.id, action: 'login_blocked', ipAddress: ip,
      } as any);
      throw new UnauthorizedException({ error: 'account_blocked', message: 'Your account has been blocked.' });
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    await this.activityRepo.save({ userId: user.id, action: 'login_success', ipAddress: ip } as any);

    const token     = this.signToken(user);
    const expiresAt = new Date(Date.now() + this.jwtTtlMs()).toISOString();

    return { token, expires_at: expiresAt, user: this.formatUser(user, user.wallet) };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  // With stateless JWT we rely on short TTL + Redis blacklist (see JwtStrategy).
  // Callers can store the jti in Redis with TTL = remaining token lifetime.
  logout(_userId: number) {
    return { message: 'Logged out successfully.' };
  }

  // ── Password Reset ────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return; // Silent success

    // Invalidate old tokens
    await this.resetRepo.update({ email, used: false }, { used: true });

    const rawToken  = crypto.randomBytes(48).toString('hex');
    const hashedTok = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.config.get<number>('PASSWORD_RESET_EXPIRY_MINUTES', 60) * 60_000);

    await this.resetRepo.save({ email, token: hashedTok, used: false, expiresAt } as any);

    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    if (user.email) {
      await this.mailService.sendPasswordReset(user.email, user.username, resetUrl);
    }
  }

  async resetPassword(email: string, token: string, password: string, confirmation: string) {
    if (password !== confirmation) {
      throw new BadRequestException({ error: 'validation_error', message: 'Password confirmation does not match.' });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.resetRepo.findOne({
      where: { email, token: hashed, used: false },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException({ error: 'invalid_reset_token', message: 'The password reset token is invalid or has expired.' });
    }

    const user = await this.userRepo.findOneByOrFail({ email });

    await this.dataSource.transaction(async (em) => {
      const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
      user.password = await bcrypt.hash(password, rounds);
      await em.save(user);
      record.used = true;
      await em.save(record);
    });

    await this.activityRepo.save({ userId: user.id, action: 'password_reset' } as any);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private signToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub:      user.id,
      username: user.username,
      role:     user.role?.slug,
      status:   user.status,
    });
  }

  private jwtTtlMs(): number {
    const ttl = this.config.get<string>('JWT_EXPIRES_IN', '1h');
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 3_600_000;
    const n = parseInt(match[1]);
    const unit: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * unit[match[2]];
  }

  formatUser(user: UserEntity, wallet?: WalletEntity | null) {
    const role = user.roles?.[0];
    return {
      id:         user.id,
      username:   user.username,
      email:      user.email,
      role:       role ? { id: role.id, name: role.name, slug: role.slug } : null,
      status:     user.status,
      balance:    wallet ? parseFloat(wallet.balance).toFixed(2) : null,
      currency:   wallet?.currency ?? 'USD',
      created_at: user.createdAt?.toISOString(),
      last_login: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
