import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { RoleEntity, RoleSlug, ROLE_LEVELS } from '../database/entities/role.entity';
import { UserEntity, UserStatus } from '../database/entities/user.entity';
import { UserActivityEntity } from '../database/entities/user-activity.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config:     ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserActivityEntity)
    private readonly activityRepo: Repository<UserActivityEntity>,
  ) {}

  // ── Create single user ────────────────────────────────────────────────────

  async createUser(dto: CreateUserDto, actor: UserEntity): Promise<UserEntity> {
    this.assertCanAssignRole(actor, dto.role);

    const [byUsername, byEmail] = await Promise.all([
      this.userRepo.findOne({ where: { username: dto.username } }),
      this.userRepo.findOne({ where: { email: dto.email } }),
    ]);
    if (byUsername) throw new ConflictException({ error: 'conflict', message: 'Username already taken.', errors: { username: ['Username already taken.'] } });
    if (byEmail)    throw new ConflictException({ error: 'conflict', message: 'Email already registered.', errors: { email: ['Email already registered.'] } });

    return this.dataSource.transaction(async (em) => {
      const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
      const hash   = await bcrypt.hash(dto.password, rounds);

      const user = em.create(UserEntity, {
        username: dto.username,
        email:    dto.email,
        password: hash,
        parentId: dto.parent_id ?? actor.id,
        shopId:   dto.shop_id ?? null,
        status:   (dto.status ?? UserStatus.ACTIVE) as UserStatus,
      });
      await em.save(user);

      const role = await this.roleRepo.findOneByOrFail({ slug: dto.role });
      user.roles = [role];
      await em.save(user);

      await em.save(WalletEntity, { userId: user.id, balance: '0.00', currency: 'USD' } as any);

      await em.save(UserActivityEntity, {
        userId: user.id, actorId: actor.id, action: 'user_created',
        metadata: { username: user.username, email: user.email, role: dto.role, status: user.status },
      } as any);

      return em.findOneOrFail(UserEntity, { where: { id: user.id }, relations: ['roles', 'wallet'] });
    });
  }

  // ── Mass create players ───────────────────────────────────────────────────

  async massCreatePlayers(players: Array<{ username: string; password: string; email?: string }>, cashier: UserEntity) {
    if (cashier.role?.slug !== RoleSlug.CASHIER) {
      throw new ForbiddenException('Only Cashiers can mass-create players.');
    }

    let created = 0;
    const failed: Array<{ username: string; reason: string }> = [];
    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);

    for (const p of players) {
      try {
        await this.dataSource.transaction(async (em) => {
          const exists = await em.findOne(UserEntity, { where: { username: p.username } });
          if (exists) throw new Error('Username already taken.');

          const hash = await bcrypt.hash(p.password, rounds);
          const user = em.create(UserEntity, { username: p.username, email: p.email ?? null, password: hash, parentId: cashier.id, status: UserStatus.ACTIVE } as any);
          await em.save(user);

          const playerRole = await this.roleRepo.findOneByOrFail({ slug: RoleSlug.PLAYER });
          user.roles = [playerRole];
          await em.save(user);

          await em.save(WalletEntity, { userId: user.id, balance: '0.00', currency: 'USD' } as any);
          await em.save(UserActivityEntity, { userId: user.id, actorId: cashier.id, action: 'user_created_bulk', metadata: { username: user.username } } as any);
        });
        created++;
      } catch (err: any) {
        failed.push({ username: p.username, reason: err.message });
      }
    }

    return { created, failed };
  }

  // ── List users (hierarchy-scoped) ─────────────────────────────────────────

  async listUsers(actor: UserEntity, query: {
    role?: string; status?: string; parent_id?: number;
    search?: string; from?: string; to?: string;
    page?: number; per_page?: number;
  }) {
    const descendantIds = await this.getDescendantIds(actor.id);
    if (descendantIds.length === 0) return { data: [], meta: { total: 0, per_page: 25, current_page: 1, last_page: 1 } };

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles',  'r')
      .leftJoinAndSelect('u.wallet', 'w')
      .where('u.id IN (:...ids)', { ids: descendantIds });

    if (query.role)      qb.andWhere('r.slug = :role',           { role:      query.role });
    if (query.status)    qb.andWhere('u.status = :status',       { status:    query.status });
    if (query.parent_id) qb.andWhere('u."parent_id" = :parentId',{ parentId:  query.parent_id });
    if (query.search)    qb.andWhere('(u.username ILIKE :q OR u.email ILIKE :q)', { q: `%${query.search}%` });
    if (query.from)      qb.andWhere('u.created_at >= :from',    { from:      query.from });
    if (query.to)        qb.andWhere('u.created_at <= :to',      { to:        query.to });

    const page     = Math.max(1, query.page     ?? 1);
    const perPage  = Math.min(100, Math.max(1, query.per_page ?? 25));

    // Use separate count query to avoid TypeORM getManyAndCount + join + orderBy bug
    const total = await qb.getCount();

    const users = await qb
      .addOrderBy('u.id', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return { data: users, meta: { total, per_page: perPage, current_page: page, last_page: Math.ceil(total / perPage) } };
  }

  // ── Get single user ───────────────────────────────────────────────────────

  async getUser(id: number, actor: UserEntity): Promise<UserEntity> {
    const target = await this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'wallet', 'parent', 'parent.roles'],
    });
    if (!target) throw new NotFoundException('User not found.');
    await this.assertInHierarchy(actor, target);
    return target;
  }

  // ── Update user ───────────────────────────────────────────────────────────

  async updateUser(id: number, dto: UpdateUserDto, actor: UserEntity): Promise<UserEntity> {
    const target = await this.userRepo.findOne({ where: { id }, relations: ['roles', 'wallet'] });
    if (!target) throw new NotFoundException('User not found.');
    await this.assertInHierarchy(actor, target);

    const changes: Record<string, { old: any; new: any }> = {};
    const allowed: (keyof UpdateUserDto)[] = ['username', 'email', 'status', 'shop_id'];

    for (const field of allowed) {
      const val = (dto as any)[field];
      if (val !== undefined && val !== (target as any)[field === 'shop_id' ? 'shopId' : field]) {
        changes[field] = { old: (target as any)[field === 'shop_id' ? 'shopId' : field], new: val };
        if (field === 'shop_id') target.shopId = val;
        else (target as any)[field] = val;
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.userRepo.save(target);
      await this.activityRepo.save({ userId: target.id, actorId: actor.id, action: 'user_updated', metadata: { changes } } as any);
    }

    return target;
  }

  // ── Block / Unblock ───────────────────────────────────────────────────────

  async blockUser(id: number, actor: UserEntity) {
    const target = await this.userRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!target) throw new NotFoundException('User not found.');
    await this.assertInHierarchy(actor, target);

    target.status = UserStatus.BLOCKED;
    await this.userRepo.save(target);
    await this.activityRepo.save({ userId: target.id, actorId: actor.id, action: 'user_blocked' } as any);
  }

  async unblockUser(id: number, actor: UserEntity) {
    const target = await this.userRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!target) throw new NotFoundException('User not found.');
    await this.assertInHierarchy(actor, target);

    target.status = UserStatus.ACTIVE;
    await this.userRepo.save(target);
    await this.activityRepo.save({ userId: target.id, actorId: actor.id, action: 'user_unblocked' } as any);
  }

  // ── Hierarchy helpers ─────────────────────────────────────────────────────

  async getDescendantIds(userId: number): Promise<number[]> {
    const result = await this.dataSource.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM w_users WHERE parent_id = $1
        UNION ALL
        SELECT u.id FROM w_users u
        INNER JOIN descendants d ON u.parent_id = d.id
      )
      SELECT id FROM descendants
    `, [userId]);
    return result.map((r: any) => r.id);
  }

  async assertInHierarchy(actor: UserEntity, target: UserEntity): Promise<void> {
    if (actor.roleLevel === 1) return; // Admin has global access
    const ids = await this.getDescendantIds(actor.id);
    if (!ids.includes(target.id)) {
      throw new NotFoundException('User not found.'); // 404 to prevent enumeration
    }
  }

  assertCanAssignRole(actor: UserEntity, roleSlug: RoleSlug): void {
    const targetLevel = ROLE_LEVELS[roleSlug];
    if (targetLevel === undefined) throw new ForbiddenException('Invalid role.');
    if (targetLevel <= actor.roleLevel) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own.');
    }
  }
}
