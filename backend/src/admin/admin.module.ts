import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, WalletEntity, TransactionEntity]),
    UsersModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
