import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { WalletEntity } from './entities/wallet.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { UserActivityEntity } from './entities/user-activity.entity';
import { ShopEntity } from './entities/shop.entity';
import { PasswordResetEntity } from './entities/password-reset.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST', 'localhost'),
        port:     config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
        entities: [
          UserEntity,
          RoleEntity,
          WalletEntity,
          TransactionEntity,
          UserActivityEntity,
          ShopEntity,
          PasswordResetEntity,
        ],
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
  ],
})
export class DatabaseModule {}
