import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GameSessionEntity, SessionStatus } from '../database/entities/game-session.entity';
import { GameEntity, GameStatus } from '../database/entities/game.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from '../database/entities/transaction.entity';
import { UserEntity } from '../database/entities/user.entity';
import { StartSessionDto } from './dto/start-session.dto';

const SESSION_TTL_HOURS = 4;

@Injectable()
export class SessionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(GameSessionEntity)
    private readonly sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
  ) {}

  async startSession(player: UserEntity, dto: StartSessionDto, ip: string): Promise<GameSessionEntity> {
    const game = await this.gameRepo.findOne({ where: { id: dto.gameId } });
    if (!game) throw new NotFoundException('Game not found.');
    if (game.status !== GameStatus.ACTIVE) throw new ForbiddenException('Game is not active.');

    return this.dataSource.transaction(async (em) => {
      // Lock wallet — prevents concurrent transfers
      const wallet = await em
        .getRepository(WalletEntity)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.user_id = :id', { id: player.id })
        .getOne();

      if (!wallet) throw new NotFoundException('Wallet not found.');

      const balance = parseFloat(wallet.balance);
      if (dto.transferAmount > balance) {
        throw new UnprocessableEntityException({
          error: 'insufficient_balance',
          message: `Transfer amount ${dto.transferAmount.toFixed(2)} exceeds wallet balance ${balance.toFixed(2)}.`,
        });
      }

      // Check for existing active session — only one allowed per player per game
      const existing = await em
        .getRepository(GameSessionEntity)
        .findOne({ where: { playerId: player.id, gameId: dto.gameId, status: SessionStatus.ACTIVE } });

      if (existing) {
        throw new ConflictException({
          error: 'session_exists',
          message: 'You already have an active session for this game.',
          session_id: existing.sessionId,
        });
      }

      const after = +(balance - dto.transferAmount).toFixed(2);

      // Deduct from main wallet
      const tx = em.create(TransactionEntity, {
        transactionId:  uuidv4(),
        userId:         player.id,
        adminId:        null,
        type:           TransactionType.SESSION_IN,
        amount:         dto.transferAmount.toFixed(2),
        balanceBefore:  balance.toFixed(2),
        balanceAfter:   after.toFixed(2),
        reason:         `Session transfer to game "${game.name}"`,
        status:         TransactionStatus.COMPLETED,
        ipAddress:      ip,
        gameId:         game.id,
      });
      await em.insert(TransactionEntity, tx);

      wallet.balance = after.toFixed(2);
      await em.save(wallet);

      // Create session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

      const session = em.create(GameSessionEntity, {
        playerId:        player.id,
        gameId:          game.id,
        sessionBalance:  dto.transferAmount.toFixed(2),
        initialTransfer: dto.transferAmount.toFixed(2),
        status:          SessionStatus.ACTIVE,
        expiresAt,
      });
      await em.insert(GameSessionEntity, session);

      // Attach session_id to tx
      await em
        .getRepository(TransactionEntity)
        .createQueryBuilder()
        .update()
        .set({ sessionId: session.sessionId })
        .where('transaction_id = :id', { id: tx.transactionId })
        .execute();

      return session;
    });
  }

  async endSession(player: UserEntity, sessionId: string, reason: string, ip: string): Promise<GameSessionEntity> {
    return this.dataSource.transaction(async (em) => {
      const session = await em
        .getRepository(GameSessionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.session_id = :sessionId', { sessionId })
        .getOne();

      if (!session) throw new NotFoundException('Session not found.');
      if (session.playerId !== player.id) throw new ForbiddenException('Not your session.');
      if (session.status !== SessionStatus.ACTIVE) {
        throw new ConflictException(`Session is already ${session.status}.`);
      }

      const remaining = parseFloat(session.sessionBalance);

      if (remaining > 0) {
        const wallet = await em
          .getRepository(WalletEntity)
          .createQueryBuilder('w')
          .setLock('pessimistic_write')
          .where('w.user_id = :id', { id: player.id })
          .getOne();

        if (!wallet) throw new NotFoundException('Wallet not found.');

        const before = parseFloat(wallet.balance);
        const after  = +(before + remaining).toFixed(2);

        const tx = em.create(TransactionEntity, {
          transactionId:  uuidv4(),
          userId:         player.id,
          adminId:        null,
          type:           TransactionType.SESSION_OUT,
          amount:         remaining.toFixed(2),
          balanceBefore:  before.toFixed(2),
          balanceAfter:   after.toFixed(2),
          reason:         reason || `Session ended — balance returned from game "${session.gameId}"`,
          status:         TransactionStatus.COMPLETED,
          ipAddress:      ip,
          sessionId:      session.sessionId,
          gameId:         session.gameId,
        });
        await em.insert(TransactionEntity, tx);

        wallet.balance = after.toFixed(2);
        await em.save(wallet);
      }

      session.status           = SessionStatus.ENDED;
      session.endedAt          = new Date();
      session.sessionBalance   = '0.00';
      await em.save(session);

      return session;
    });
  }

  async getSession(sessionId: string, playerId: number): Promise<GameSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId },
      relations: ['game'],
    });
    if (!session) throw new NotFoundException('Session not found.');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session.');
    return session;
  }

  async getActiveSessions(playerId: number): Promise<GameSessionEntity[]> {
    return this.sessionRepo.find({
      where: { playerId, status: SessionStatus.ACTIVE },
      relations: ['game'],
      order: { startedAt: 'DESC' },
    });
  }

  async getMySessionHistory(playerId: number, limit = 20): Promise<GameSessionEntity[]> {
    return this.sessionRepo.find({
      where: { playerId },
      relations: ['game'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  /** Called by cron — returns abandoned session balances to main wallet */
  async recoverExpiredSessions(): Promise<number> {
    const expired = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SessionStatus.ACTIVE })
      .andWhere('s.expires_at < NOW()')
      .getMany();

    let recovered = 0;
    for (const session of expired) {
      try {
        await this.dataSource.transaction(async (em) => {
          const locked = await em
            .getRepository(GameSessionEntity)
            .createQueryBuilder('s')
            .setLock('pessimistic_write')
            .where('s.session_id = :id', { id: session.sessionId })
            .andWhere('s.status = :status', { status: SessionStatus.ACTIVE })
            .getOne();

          if (!locked) return;

          const remaining = parseFloat(locked.sessionBalance);

          if (remaining > 0) {
            const wallet = await em
              .getRepository(WalletEntity)
              .createQueryBuilder('w')
              .setLock('pessimistic_write')
              .where('w.user_id = :id', { id: locked.playerId })
              .getOne();

            if (wallet) {
              const before = parseFloat(wallet.balance);
              const after  = +(before + remaining).toFixed(2);

              const tx = em.create(TransactionEntity, {
                transactionId:  uuidv4(),
                userId:         locked.playerId,
                adminId:        null,
                type:           TransactionType.SESSION_OUT,
                amount:         remaining.toFixed(2),
                balanceBefore:  before.toFixed(2),
                balanceAfter:   after.toFixed(2),
                reason:         'Session expired — balance auto-returned',
                status:         TransactionStatus.COMPLETED,
                sessionId:      locked.sessionId,
                gameId:         locked.gameId,
              });
              await em.insert(TransactionEntity, tx);

              wallet.balance = after.toFixed(2);
              await em.save(wallet);
            }
          }

          locked.status         = SessionStatus.ABANDONED;
          locked.endedAt        = new Date();
          locked.sessionBalance = '0.00';
          await em.save(locked);
        });
        recovered++;
      } catch {
        // Log and continue — don't let one failure block others
      }
    }

    return recovered;
  }
}
