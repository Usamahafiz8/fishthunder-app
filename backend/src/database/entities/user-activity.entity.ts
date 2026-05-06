import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('w_user_activity')
export class UserActivityEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', name: 'user_id', nullable: true })
  userId: number | null;

  @Index()
  @Column({ type: 'int', name: 'actor_id', nullable: true })
  actorId: number | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', name: 'attempted_username', length: 50, nullable: true })
  attemptedUsername: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.activities, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: UserEntity | null;
}
