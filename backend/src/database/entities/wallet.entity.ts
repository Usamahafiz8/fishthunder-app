import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('w_wallets')
@Check(`"balance" >= 0`)
export class WalletEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id', unique: true })
  userId: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: '0.00' })
  balance: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
