import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { UserActivityEntity } from '../database/entities/user-activity.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { UsersModule } from '../users/users.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, TransactionEntity, UserActivityEntity]),
    UsersModule,
  ],
  controllers: [WalletController],
  providers:   [WalletService],
  exports:     [WalletService],
})
export class WalletModule {}
