import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { UsersModule } from '../users/users.module';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEntity]), UsersModule],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
