import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { UserEntity } from '../database/entities/user.entity';
import { UsersService } from '../users/users.service';

function formatTx(tx: TransactionEntity) {
  return {
    transaction_id: tx.transactionId,
    user_id:        tx.userId,
    admin_id:       tx.adminId ?? null,
    type:           tx.type,
    amount:         parseFloat(tx.amount).toFixed(2),
    balance_before: parseFloat(tx.balanceBefore).toFixed(2),
    balance_after:  parseFloat(tx.balanceAfter).toFixed(2),
    reason:         tx.reason,
    reference_id:   tx.referenceId ?? null,
    status:         tx.status,
    ip_address:     tx.ipAddress ?? null,
    created_at:     tx.createdAt?.toISOString(),
  };
}

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@Controller('api')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
    private readonly usersService: UsersService,
  ) {}

  // GET /api/admin/transactions
  @Get('admin/transactions')
  @ApiOperation({ summary: 'Admin: list all transactions scoped to your user hierarchy' })
  @ApiQuery({ name: 'user_id', required: false, type: Number })
  @ApiQuery({ name: 'type',    required: false, description: 'credit | debit' })
  @ApiQuery({ name: 'status',  required: false, description: 'completed | pending | failed' })
  @ApiQuery({ name: 'from',    required: false, description: 'ISO date lower bound' })
  @ApiQuery({ name: 'to',      required: false, description: 'ISO date upper bound' })
  @ApiQuery({ name: 'page',    required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page',required: false, type: Number, example: 25 })
  @ApiResponse({ status: 200, description: 'Paginated transaction list.' })
  async adminIndex(@CurrentUser() actor: UserEntity, @Query() query: any) {
    const descendantIds = await this.usersService.getDescendantIds(actor.id);
    const scopedIds     = [actor.id, ...descendantIds];

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.user_id IN (:...ids)', { ids: scopedIds });

    if (query.user_id) qb.andWhere('tx.user_id = :uid',   { uid:    parseInt(query.user_id) });
    if (query.type)    qb.andWhere('tx.type = :type',     { type:   query.type });
    if (query.status)  qb.andWhere('tx.status = :status', { status: query.status });
    if (query.from)    qb.andWhere('tx.created_at >= :from', { from: query.from });
    if (query.to)      qb.andWhere('tx.created_at <= :to',   { to:   query.to });

    const page    = Math.max(1, parseInt(query.page     ?? '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page ?? '25')));

    const [txs, total] = await qb
      .orderBy('tx.created_at', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      success: true,
      data:    txs.map(formatTx),
      error:   null,
      message: 'Transactions retrieved.',
      meta:    { total, per_page: perPage, current_page: page, last_page: Math.ceil(total / perPage) },
    };
  }

  // GET /api/transactions/my
  @Get('transactions/my')
  @ApiOperation({ summary: 'Get your own transaction history' })
  @ApiQuery({ name: 'page',    required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page',required: false, type: Number, example: 25 })
  @ApiResponse({ status: 200, description: 'Your paginated transaction history.' })
  async myTransactions(@CurrentUser() actor: UserEntity, @Query() query: any) {
    const page    = Math.max(1, parseInt(query.page     ?? '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page ?? '25')));

    const [txs, total] = await this.txRepo.findAndCount({
      where:  { userId: actor.id },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * perPage,
      take:   perPage,
    });

    return {
      success: true,
      data:    txs.map(formatTx),
      error:   null,
      message: 'Your transactions.',
      meta:    { total, per_page: perPage, current_page: page, last_page: Math.ceil(total / perPage) },
    };
  }
}
