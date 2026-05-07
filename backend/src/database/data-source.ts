import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { WalletEntity } from './entities/wallet.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { UserActivityEntity } from './entities/user-activity.entity';
import { ShopEntity } from './entities/shop.entity';
import { PasswordResetEntity } from './entities/password-reset.entity';
import { GameEntity } from './entities/game.entity';
import { GameSessionEntity } from './entities/game-session.entity';
import { SpinEntity } from './entities/spin.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging:  process.env.NODE_ENV === 'development',
  entities: [
    UserEntity,
    RoleEntity,
    WalletEntity,
    TransactionEntity,
    UserActivityEntity,
    ShopEntity,
    PasswordResetEntity,
    GameEntity,
    GameSessionEntity,
    SpinEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
});
