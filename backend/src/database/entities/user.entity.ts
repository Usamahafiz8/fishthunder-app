import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { ShopEntity } from './shop.entity';
import { WalletEntity } from './wallet.entity';
import { TransactionEntity } from './transaction.entity';
import { UserActivityEntity } from './user-activity.entity';

export enum UserStatus {
  ACTIVE   = 'active',
  BLOCKED  = 'blocked',
  INACTIVE = 'inactive',
}

@Entity('w_users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index({ unique: true })
  @Column({ length: 50, unique: true })
  username: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email: string | null;

  @Column({ select: false })
  password: string;

  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parentId: number | null;

  @Column({ type: 'int', name: 'shop_id', nullable: true })
  shopId: number | null;

  @Index()
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'timestamptz', name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'w_role_user',
    joinColumn:        { name: 'user_id',  referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id',  referencedColumnName: 'id' },
  })
  roles: RoleEntity[];

  @ManyToOne(() => UserEntity, (user) => user.children, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent: UserEntity | null;

  @OneToMany(() => UserEntity, (user) => user.parent)
  children: UserEntity[];

  @ManyToOne(() => ShopEntity, (shop) => shop.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop: ShopEntity | null;

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  wallet: WalletEntity;

  @OneToMany(() => TransactionEntity, (tx) => tx.user)
  transactions: TransactionEntity[];

  @OneToMany(() => UserActivityEntity, (a) => a.user)
  activities: UserActivityEntity[];

  // ── Helpers ───────────────────────────────────────────────────────────────

  get role(): RoleEntity | null {
    return this.roles?.[0] ?? null;
  }

  get roleLevel(): number {
    return this.role?.level ?? 99;
  }

  isBlocked(): boolean {
    return this.status === UserStatus.BLOCKED;
  }
}
