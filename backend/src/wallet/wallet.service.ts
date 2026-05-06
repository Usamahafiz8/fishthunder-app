import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from '../database/entities/transaction.entity';
import { UserActivityEntity } from '../database/entities/user-activity.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WalletEntity } from '../database/entities/wallet.entity';

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
    @InjectRepository(UserActivityEntity)
    private readonly activityRepo: Repository<UserActivityEntity>,
  ) {}

  async addBalance(target: UserEntity, amount: number, reason: string, admin: UserEntity, ip: string): Promise<TransactionEntity> {
    return this.dataSource.transaction(async (em) => {
      const wallet = await em
        .getRepository(WalletEntity)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.user_id = :id', { id: target.id })
        .getOne();

      if (!wallet) throw new NotFoundException('Wallet not found.');

      const before = parseFloat(wallet.balance);
      const after  = +(before + amount).toFixed(2);

      const tx = em.create(TransactionEntity, {
        transactionId: uuidv4(),
        userId:        target.id,
        adminId:       admin.id,
        type:          TransactionType.CREDIT,
        amount:        amount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter:  after.toFixed(2),
        reason,
        status:        TransactionStatus.COMPLETED,
        ipAddress:     ip,
      });

      // Save tx first (before wallet update) to ensure both succeed
      await em.insert(TransactionEntity, tx);

      wallet.balance = after.toFixed(2);
      await em.save(wallet);

      await em.save(UserActivityEntity, {
        userId: target.id, actorId: admin.id, action: 'balance_add',
        ipAddress: ip,
        metadata: { amount: amount.toFixed(2), balance_before: before.toFixed(2), balance_after: after.toFixed(2), reason, transaction_id: tx.transactionId },
      } as any);

      return tx;
    });
  }

  async removeBalance(target: UserEntity, amount: number, reason: string, admin: UserEntity, ip: string): Promise<TransactionEntity> {
    return this.dataSource.transaction(async (em) => {
      const wallet = await em
        .getRepository(WalletEntity)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.user_id = :id', { id: target.id })
        .getOne();

      if (!wallet) throw new NotFoundException('Wallet not found.');

      const before = parseFloat(wallet.balance);
      if (amount > before) {
        throw new UnprocessableEntityException({
          error:   'insufficient_balance',
          message: 'Amount exceeds current balance.',
          errors:  { amount: [`Amount ${amount.toFixed(2)} exceeds current balance ${before.toFixed(2)}.`] },
        });
      }

      const after = +(before - amount).toFixed(2);

      const tx = em.create(TransactionEntity, {
        transactionId: uuidv4(),
        userId:        target.id,
        adminId:       admin.id,
        type:          TransactionType.DEBIT,
        amount:        amount.toFixed(2),
        balanceBefore: before.toFixed(2),
        balanceAfter:  after.toFixed(2),
        reason,
        status:        TransactionStatus.COMPLETED,
        ipAddress:     ip,
      });

      await em.insert(TransactionEntity, tx);

      wallet.balance = after.toFixed(2);
      await em.save(wallet);

      await em.save(UserActivityEntity, {
        userId: target.id, actorId: admin.id, action: 'balance_remove',
        ipAddress: ip,
        metadata: { amount: amount.toFixed(2), balance_before: before.toFixed(2), balance_after: after.toFixed(2), reason, transaction_id: tx.transactionId },
      } as any);

      return tx;
    });
  }

  async getBalance(userId: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found.');
    return wallet;
  }
}
