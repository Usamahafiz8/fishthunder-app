import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum RoleSlug {
  ADMIN       = 'admin',
  AGENT       = 'agent',
  DISTRIBUTOR = 'distributor',
  MANAGER     = 'manager',
  CASHIER     = 'cashier',
  PLAYER      = 'player',
}

export const ROLE_LEVELS: Record<RoleSlug, number> = {
  [RoleSlug.ADMIN]:       1,
  [RoleSlug.AGENT]:       2,
  [RoleSlug.DISTRIBUTOR]: 3,
  [RoleSlug.MANAGER]:     4,
  [RoleSlug.CASHIER]:     5,
  [RoleSlug.PLAYER]:      6,
};

@Entity('w_roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: RoleSlug;

  @Column({ type: 'smallint' })
  level: number;

  @Column({ length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users: UserEntity[];
}
