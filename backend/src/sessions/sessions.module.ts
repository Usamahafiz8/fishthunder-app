import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSessionEntity } from '../database/entities/game-session.entity';
import { SpinEntity } from '../database/entities/spin.entity';
import { GameEntity } from '../database/entities/game.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { SessionsService } from './sessions.service';
import { SpinService } from './spin.service';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSessionEntity,
      SpinEntity,
      GameEntity,
      WalletEntity,
      TransactionEntity,
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SpinService, SessionsCron],
  exports: [SessionsService, SpinService],
})
export class SessionsModule {}
