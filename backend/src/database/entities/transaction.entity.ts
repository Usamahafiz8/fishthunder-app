import {
  BeforeInsert,
  BeforeUpdate,
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

export enum TransactionType {
  CREDIT      = 'credit',
  DEBIT       = 'debit',
  ADJUSTMENT  = 'adjustment',
  SYSTEM      = 'system',
  SESSION_IN  = 'session_in',
  SESSION_OUT = 'session_out',
  BET         = 'bet',
  WIN         = 'win',
  REFUND      = 'refund',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REVERSED  = 'reversed',
  PENDING   = 'pending',
}

@Entity('w_transactions')
@Check(`"amount" > 0`)
export class TransactionEntity {
  @PrimaryColumn({ type: 'uuid', name: 'transaction_id' })
  transactionId: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @Index()
  @Column({ type: 'int', name: 'admin_id', nullable: true })
  adminId: number | null;

  @Index()
  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'balance_before' })
  balanceBefore: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'balance_after' })
  balanceAfter: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Index()
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
  status: TransactionStatus;

  @Column({ type: 'varchar', name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', name: 'idempotency_key', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'uuid', name: 'session_id', nullable: true })
  sessionId: string | null;

  @Column({ type: 'int', name: 'game_id', nullable: true })
  gameId: number | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, (user) => user.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admin_id' })
  admin: UserEntity | null;

  @BeforeInsert()
  generateId() {
    if (!this.transactionId) {
      this.transactionId = uuidv4();
    }
  }

  // Guard immutable columns on update
  @BeforeUpdate()
  preventImmutableUpdate() {
    // TypeORM BeforeUpdate fires on entity save — service layer enforces no-update rule
    throw new Error('Transactions are immutable. Create a new record instead.');
  }
}
