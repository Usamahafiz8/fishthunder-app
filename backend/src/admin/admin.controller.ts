import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { UsersService } from '../users/users.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
  ) {}

  @Get('stats/chart')
  @ApiOperation({ summary: 'Daily transaction totals for the last 14 days (for charts)' })
  @ApiResponse({ status: 200, description: 'Array of {date, credits, debits, net} for the past 14 days.' })
  async chartData(@CurrentUser() actor: UserEntity) {
    const descendantIds = await this.usersService.getDescendantIds(actor.id);
    const allIds        = [actor.id, ...descendantIds];

    // Generate last 14 days array
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    if (allIds.length === 0) {
      return {
        success: true,
        data: days.map((date) => ({ date, credits: 0, debits: 0, net: 0 })),
        error: null, message: 'Chart data.',
      };
    }

    const rows: Array<{ date: any; type: string; total: string }> = await this.txRepo
      .createQueryBuilder('tx')
      .select(`DATE(tx.created_at AT TIME ZONE 'UTC')`, 'date')
      .addSelect('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.user_id IN (:...ids)', { ids: allIds })
      .andWhere(`tx.created_at >= NOW() - INTERVAL '14 days'`)
      .groupBy(`DATE(tx.created_at AT TIME ZONE 'UTC')`)
      .addGroupBy('tx.type')
      .orderBy('date', 'ASC')
      .getRawMany();

    const byDate: Record<string, { credits: number; debits: number }> = {};
    for (const row of rows) {
      // row.date may be a JS Date or a string depending on PG driver
      const raw = row.date instanceof Date ? row.date.toISOString() : String(row.date);
      const d   = raw.slice(0, 10);
      if (!byDate[d]) byDate[d] = { credits: 0, debits: 0 };
      if (row.type === 'credit') byDate[d].credits += parseFloat(row.total ?? '0');
      else                       byDate[d].debits  += parseFloat(row.total ?? '0');
    }

    const result = days.map((date) => ({
      date,
      label:   new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      credits: parseFloat((byDate[date]?.credits ?? 0).toFixed(2)),
      debits:  parseFloat((byDate[date]?.debits  ?? 0).toFixed(2)),
      net:     parseFloat(((byDate[date]?.credits ?? 0) - (byDate[date]?.debits ?? 0)).toFixed(2)),
    }));

    return { success: true, data: result, error: null, message: 'Chart data.' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics scoped to your hierarchy' })
  @ApiResponse({
    status: 200,
    description: 'Counts of users by role, total balance, and transaction summary.',
  })
  async stats(@CurrentUser() actor: UserEntity) {
    const descendantIds = await this.usersService.getDescendantIds(actor.id);
    const allIds        = [actor.id, ...descendantIds];

    // Users count by role
    const roleCounts: Record<string, number> = {};
    if (allIds.length > 0) {
      const rows = await this.userRepo
        .createQueryBuilder('u')
        .leftJoin('u.roles', 'r')
        .select('r.slug', 'slug')
        .addSelect('COUNT(u.id)', 'count')
        .where('u.id IN (:...ids)', { ids: allIds })
        .groupBy('r.slug')
        .getRawMany();

      for (const row of rows) {
        roleCounts[row.slug] = parseInt(row.count);
      }
    }

    // Total balance in hierarchy
    let totalBalance = '0.00';
    if (allIds.length > 0) {
      const row = await this.walletRepo
        .createQueryBuilder('w')
        .select('SUM(w.balance)', 'total')
        .where('w.user_id IN (:...ids)', { ids: allIds })
        .getRawOne();
      totalBalance = parseFloat(row?.total ?? 0).toFixed(2);
    }

    // Transaction stats (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let txStats = { total: 0, credits: 0, debits: 0, credit_amount: '0.00', debit_amount: '0.00' };
    if (allIds.length > 0) {
      const rows = await this.txRepo
        .createQueryBuilder('tx')
        .select('tx.type', 'type')
        .addSelect('COUNT(tx.transaction_id)', 'count')
        .addSelect('SUM(tx.amount)', 'sum')
        .where('tx.user_id IN (:...ids)', { ids: allIds })
        .andWhere('tx.created_at >= :from', { from: thirtyDaysAgo })
        .groupBy('tx.type')
        .getRawMany();

      for (const row of rows) {
        const cnt = parseInt(row.count);
        const amt = parseFloat(row.sum ?? 0).toFixed(2);
        txStats.total += cnt;
        if (row.type === 'credit') { txStats.credits = cnt; txStats.credit_amount = amt; }
        if (row.type === 'debit')  { txStats.debits  = cnt; txStats.debit_amount  = amt; }
      }
    }

    // Recent transactions (last 5) — raw query avoids entity relation ordering bug
    const recentTxs: any[] = allIds.length > 0
      ? await this.txRepo
          .createQueryBuilder('tx')
          .where('tx.user_id IN (:...ids)', { ids: allIds })
          .orderBy('tx.created_at', 'DESC')
          .take(5)
          .getMany()
      : [];

    return {
      success: true,
      data: {
        total_users:      allIds.length,
        users_by_role:    roleCounts,
        total_balance:    totalBalance,
        currency:         'USD',
        transactions_30d: txStats,
        recent_transactions: recentTxs.map((tx) => ({
          transaction_id: tx.transactionId,
          user_id:        tx.userId,
          type:           tx.type,
          amount:         parseFloat(tx.amount).toFixed(2),
          reason:         tx.reason,
          status:         tx.status,
          created_at:     tx.createdAt?.toISOString(),
        })),
      },
      error:   null,
      message: 'Stats retrieved.',
    };
  }
}
