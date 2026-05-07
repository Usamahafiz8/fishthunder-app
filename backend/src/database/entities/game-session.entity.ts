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

export enum SessionStatus {
  ACTIVE    = 'active',
  ENDED     = 'ended',
  ABANDONED = 'abandoned',
}

@Entity('w_game_sessions')
@Check(`"session_balance" >= 0`)
export class GameSessionEntity {
  @PrimaryColumn({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Index()
  @Column({ name: 'player_id' })
  playerId: number;

  @Index()
  @Column({ name: 'game_id' })
  gameId: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'session_balance', default: '0.00' })
  sessionBalance: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'initial_transfer', default: '0.00' })
  initialTransfer: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'total_bet', default: '0.00' })
  totalBet: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'total_win', default: '0.00' })
  totalWin: string;

  @Index()
  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: UserEntity;

  @ManyToOne(() => GameEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'game_id' })
  game: GameEntity;

  @BeforeInsert()
  generateId() {
    if (!this.sessionId) this.sessionId = uuidv4();
  }
}
