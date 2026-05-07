import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum GameType {
  SLOT    = 'slot',
  FISHING = 'fishing',
  TABLE   = 'table',
}

export enum GameStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled',
}

@Entity('w_games')
export class GameEntity {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ length: 100 })
  @ApiProperty()
  name: string;

  @Column({ length: 50, unique: true })
  @ApiProperty()
  slug: string;

  @Column({ type: 'enum', enum: GameType, default: GameType.SLOT })
  @ApiProperty({ enum: GameType })
  type: GameType;

  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.ACTIVE })
  @ApiProperty({ enum: GameStatus })
  status: GameStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'rtp_target', default: '96.00' })
  @ApiProperty({ example: '96.00' })
  rtpTarget: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'bank_balance', default: '0.00' })
  @ApiProperty({ example: '0.00' })
  bankBalance: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'min_bet', default: '0.10' })
  @ApiProperty({ example: '0.10' })
  minBet: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, name: 'max_bet', default: '100.00' })
  @ApiProperty({ example: '100.00' })
  maxBet: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
