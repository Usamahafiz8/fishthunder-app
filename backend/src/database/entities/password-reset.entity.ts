import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('w_password_resets')
export class PasswordResetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 150 })
  email: string;

  @Index()
  @Column({ length: 100 })
  token: string;

  @Column({ default: false })
  used: boolean;

  @Index()
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
