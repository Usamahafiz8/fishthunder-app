import {
  BeforeInsert,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from './user.entity';
import { GameEntity } from './game.entity';
import { GameSessionEntity } from './game-session.entity';

export enum SpinStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
}

@Entity('w_spins')
@Check(`"bet_amount" > 0`)
@Check(`"win_amount" >= 0`)
export class SpinEntity {
  @PrimaryColumn({ type: 'uuid', name: 'spin_id' })
  spinId: string;

  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Index()
  @Column({ name: 'player_id' })
  playerId: number;

  @Index()
  @Column({ name: 'game_id' })
  gameId: number;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', length: 100 })
  idempotencyKey: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'bet_amount' })
  betAmount: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'win_amount', default: '0.00' })
  winAmount: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'balance_before' })
  balanceBefore: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'balance_after' })
  balanceAfter: string;

  @Column({ type: 'jsonb', name: 'outcome_data', nullable: true })
  outcomeData: Record<string, any> | null;

  @Index()
  @Column({ type: 'enum', enum: SpinStatus, default: SpinStatus.PENDING })
  status: SpinStatus;

  @Column({ name: 'bet_tx_id', type: 'uuid', nullable: true })
  betTxId: string | null;

  @Column({ name: 'win_tx_id', type: 'uuid', nullable: true })
  winTxId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => GameSessionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'session_id' })
  session: GameSessionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: UserEntity;

  @ManyToOne(() => GameEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'game_id' })
  game: GameEntity;

  @BeforeInsert()
  generateId() {
    if (!this.spinId) this.spinId = uuidv4();
  }
}
