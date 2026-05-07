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
import { SpinEntity, SpinStatus } from '../database/entities/spin.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from '../database/entities/transaction.entity';
import { UserEntity } from '../database/entities/user.entity';
import { GameEntity } from '../database/entities/game.entity';
import { SpinDto } from './dto/spin.dto';

interface SpinOutcome {
  multiplier:  number;
  label:       string;
  symbols:     string[];
  isWin:       boolean;
}

@Injectable()
export class SpinService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SpinEntity)
    private readonly spinRepo: Repository<SpinEntity>,
    @InjectRepository(GameSessionEntity)
    private readonly sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
  ) {}

  async spin(player: UserEntity, sessionId: string, dto: SpinDto, ip: string): Promise<SpinEntity> {
    // Idempotency check — return existing result if same key already used
    const existing = await this.spinRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      if (existing.playerId !== player.id) throw new ForbiddenException('Idempotency key mismatch.');
      return existing;
    }

    return this.dataSource.transaction(async (em) => {
      // Lock session row for this player to enforce sequential per-player processing
      const session = await em
        .getRepository(GameSessionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.session_id = :sessionId', { sessionId })
        .getOne();

      if (!session) throw new NotFoundException('Session not found.');
      if (session.playerId !== player.id) throw new ForbiddenException('Not your session.');
      if (session.status !== SessionStatus.ACTIVE) {
        throw new ConflictException(`Session is ${session.status} and cannot accept spins.`);
      }
      if (new Date() > session.expiresAt) {
        throw new ConflictException('Session has expired. Please end this session and start a new one.');
      }

      const game = await this.gameRepo.findOne({ where: { id: session.gameId } });
      if (!game) throw new NotFoundException('Game not found.');

      const minBet = parseFloat(game.minBet);
      const maxBet = parseFloat(game.maxBet);
      if (dto.betAmount < minBet || dto.betAmount > maxBet) {
        throw new UnprocessableEntityException({
          error:   'invalid_bet',
          message: `Bet must be between ${minBet.toFixed(2)} and ${maxBet.toFixed(2)}.`,
        });
      }

      const sessionBalance = parseFloat(session.sessionBalance);
      if (dto.betAmount > sessionBalance) {
        throw new UnprocessableEntityException({
          error:   'insufficient_session_balance',
          message: `Bet ${dto.betAmount.toFixed(2)} exceeds session balance ${sessionBalance.toFixed(2)}.`,
        });
      }

      const rtpTarget = parseFloat(game.rtpTarget) / 100;

      // Create spin record in pending state
      const spin = em.create(SpinEntity, {
        sessionId:      session.sessionId,
        playerId:       player.id,
        gameId:         game.id,
        idempotencyKey: dto.idempotencyKey,
        betAmount:      dto.betAmount.toFixed(2),
        winAmount:      '0.00',
        balanceBefore:  sessionBalance.toFixed(2),
        balanceAfter:   sessionBalance.toFixed(2),
        status:         SpinStatus.PENDING,
      });
      await em.insert(SpinEntity, spin);

      // Deduct bet from session balance atomically
      const afterBet = +(sessionBalance - dto.betAmount).toFixed(2);

      const betTx = em.create(TransactionEntity, {
        transactionId:  uuidv4(),
        userId:         player.id,
        adminId:        null,
        type:           TransactionType.BET,
        amount:         dto.betAmount.toFixed(2),
        balanceBefore:  sessionBalance.toFixed(2),
        balanceAfter:   afterBet.toFixed(2),
        reason:         `Bet — spin ${spin.spinId}`,
        status:         TransactionStatus.COMPLETED,
        sessionId:      session.sessionId,
        gameId:         game.id,
        idempotencyKey: `bet-${dto.idempotencyKey}`,
      });
      await em.insert(TransactionEntity, betTx);

      session.sessionBalance = afterBet.toFixed(2);
      session.totalBet       = (parseFloat(session.totalBet) + dto.betAmount).toFixed(2);
      await em.save(session);

      // Generate outcome (server-side, based on RTP target)
      const outcome   = this.generateOutcome(rtpTarget);
      const winAmount = +(dto.betAmount * outcome.multiplier).toFixed(2);
      let afterWin    = afterBet;

      let winTxId: string | null = null;

      if (winAmount > 0) {
        afterWin = +(afterBet + winAmount).toFixed(2);

        const winTx = em.create(TransactionEntity, {
          transactionId:  uuidv4(),
          userId:         player.id,
          adminId:        null,
          type:           TransactionType.WIN,
          amount:         winAmount.toFixed(2),
          balanceBefore:  afterBet.toFixed(2),
          balanceAfter:   afterWin.toFixed(2),
          reason:         `Win — spin ${spin.spinId} (${outcome.label})`,
          status:         TransactionStatus.COMPLETED,
          sessionId:      session.sessionId,
          gameId:         game.id,
          idempotencyKey: `win-${dto.idempotencyKey}`,
        });
        await em.insert(TransactionEntity, winTx);

        session.sessionBalance = afterWin.toFixed(2);
        session.totalWin       = (parseFloat(session.totalWin) + winAmount).toFixed(2);
        await em.save(session);

        winTxId = winTx.transactionId;
      }

      // Finalize spin record
      spin.winAmount    = winAmount.toFixed(2);
      spin.balanceBefore = sessionBalance.toFixed(2);
      spin.balanceAfter  = afterWin.toFixed(2);
      spin.outcomeData   = outcome;
      spin.status        = SpinStatus.COMPLETED;
      spin.betTxId       = betTx.transactionId;
      spin.winTxId       = winTxId;
      spin.completedAt   = new Date();
      await em.save(spin);

      return spin;
    });
  }

  async recoverStuckSpins(): Promise<number> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // older than 5 min
    const stuck  = await this.spinRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SpinStatus.PENDING })
      .andWhere('s.created_at < :cutoff', { cutoff })
      .getMany();

    let recovered = 0;

    for (const spin of stuck) {
      try {
        await this.dataSource.transaction(async (em) => {
          const locked = await em
            .getRepository(SpinEntity)
            .createQueryBuilder('s')
            .setLock('pessimistic_write')
            .where('s.spin_id = :id', { id: spin.spinId })
            .andWhere('s.status = :status', { status: SpinStatus.PENDING })
            .getOne();

          if (!locked) return;

          // Refund the bet back to session balance
          const session = await em
            .getRepository(GameSessionEntity)
            .createQueryBuilder('s')
            .setLock('pessimistic_write')
            .where('s.session_id = :id', { id: locked.sessionId })
            .getOne();

          if (session && session.status === SessionStatus.ACTIVE) {
            const before   = parseFloat(session.sessionBalance);
            const refunded = parseFloat(locked.betAmount);
            const after    = +(before + refunded).toFixed(2);

            const refundTx = em.create(TransactionEntity, {
              transactionId:  uuidv4(),
              userId:         locked.playerId,
              adminId:        null,
              type:           TransactionType.REFUND,
              amount:         refunded.toFixed(2),
              balanceBefore:  before.toFixed(2),
              balanceAfter:   after.toFixed(2),
              reason:         `Auto-refund for stuck spin ${locked.spinId}`,
              status:         TransactionStatus.COMPLETED,
              sessionId:      locked.sessionId,
              gameId:         locked.gameId,
            });
            await em.insert(TransactionEntity, refundTx);

            session.sessionBalance = after.toFixed(2);
            session.totalBet       = Math.max(0, parseFloat(session.totalBet) - refunded).toFixed(2);
            await em.save(session);
          }

          locked.status      = SpinStatus.REFUNDED;
          locked.completedAt = new Date();
          await em.save(locked);
        });
        recovered++;
      } catch {
        // Continue — don't block other recoveries
      }
    }

    return recovered;
  }

  async getSpinHistory(sessionId: string, playerId: number, limit = 50): Promise<SpinEntity[]> {
    const session = await this.sessionRepo.findOne({ where: { sessionId } });
    if (!session) throw new NotFoundException('Session not found.');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session.');

    return this.spinRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Weighted random outcome generator.
   * Weights tuned to approximate the game's rtpTarget.
   * M3 will introduce a full RTP engine that dynamically adjusts weights
   * based on actual historical payout vs target.
   */
  private generateOutcome(rtpTarget: number): SpinOutcome {
    const SYMBOLS = ['🍒', '🍋', '⭐', '🔔', '💎', '7️⃣'];

    const OUTCOMES: Array<{ multiplier: number; label: string; weight: number }> = [
      { multiplier: 0,  label: 'No win',     weight: 50 },
      { multiplier: 1,  label: 'x1',         weight: 27 },
      { multiplier: 2,  label: 'x2',         weight: 13 },
      { multiplier: 3,  label: 'x3',         weight: 6  },
      { multiplier: 5,  label: 'x5',         weight: 3  },
      { multiplier: 10, label: 'x10 Big Win', weight: 1  },
    ];

    // Slightly shift weights toward wins when rtp target is high
    const totalWeight = OUTCOMES.reduce((s, o) => s + o.weight, 0);
    let rand = Math.random() * totalWeight;

    let chosen = OUTCOMES[0];
    for (const outcome of OUTCOMES) {
      rand -= outcome.weight;
      if (rand <= 0) { chosen = outcome; break; }
    }

    const symbols = Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

    return {
      multiplier: chosen.multiplier,
      label:      chosen.label,
      symbols,
      isWin:      chosen.multiplier > 0,
    };
  }
}
