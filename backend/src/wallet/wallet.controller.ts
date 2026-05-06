import {
  Body, Controller, ForbiddenException, Get, HttpCode,
  NotFoundException, Param, ParseIntPipe, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleSlug } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { UsersService } from '../users/users.service';
import { BalanceDto } from './dto/balance.dto';
import { WalletService } from './wallet.service';

function formatTx(tx: any) {
  return {
    transaction_id: tx.transactionId,
    user_id:        tx.userId,
    admin_id:       tx.adminId,
    type:           tx.type,
    amount:         parseFloat(tx.amount).toFixed(2),
    balance_before: parseFloat(tx.balanceBefore).toFixed(2),
    balance_after:  parseFloat(tx.balanceAfter).toFixed(2),
    reason:         tx.reason,
    reference_id:   tx.referenceId ?? null,
    status:         tx.status,
    ip_address:     tx.ipAddress,
    created_at:     tx.createdAt?.toISOString(),
  };
}

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@Controller('api')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly usersService:  UsersService,
  ) {}

  // GET /api/users/:id/balance
  @Get('users/:id/balance')
  @ApiOperation({ summary: "Get a user's current wallet balance" })
  @ApiResponse({ status: 200, description: 'Balance object with user_id, balance, currency.' })
  @ApiResponse({ status: 403, description: 'Players can only view their own balance.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getBalance(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserEntity) {
    if (actor.roleLevel === 6 && actor.id !== id) {
      throw new ForbiddenException('You may only view your own balance.');
    }
    if (actor.id !== id) {
      const target = await this.usersService.getUser(id, actor).catch(() => { throw new NotFoundException('User not found.'); });
      await this.usersService.assertInHierarchy(actor, target);
    }

    const wallet = await this.walletService.getBalance(id);
    return {
      success: true,
      data: { user_id: id, balance: parseFloat(wallet.balance).toFixed(2), currency: wallet.currency },
      error: null,
      message: 'Balance retrieved.',
    };
  }

  // POST /api/admin/users/:id/balance/add
  @Post('admin/users/:id/balance/add')
  @HttpCode(201)
  @ApiOperation({ summary: 'Credit balance — add funds to a user wallet' })
  @ApiResponse({ status: 201, description: 'Transaction record of the credit.' })
  @ApiResponse({ status: 400, description: 'Invalid amount.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async add(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BalanceDto,
    @CurrentUser() actor: UserEntity,
    @Req() req: Request,
  ) {
    const target = await this.usersService.getUser(id, actor);
    const tx     = await this.walletService.addBalance(target, parseFloat(dto.amount), dto.reason, actor, req.ip ?? '');
    return { success: true, data: formatTx(tx), error: null, message: 'Balance added successfully.' };
  }

  // POST /api/admin/users/:id/balance/remove
  @Post('admin/users/:id/balance/remove')
  @HttpCode(201)
  @ApiOperation({ summary: 'Debit balance — remove funds from a user wallet' })
  @ApiResponse({ status: 201, description: 'Transaction record of the debit.' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid amount.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BalanceDto,
    @CurrentUser() actor: UserEntity,
    @Req() req: Request,
  ) {
    const target = await this.usersService.getUser(id, actor);
    const tx     = await this.walletService.removeBalance(target, parseFloat(dto.amount), dto.reason, actor, req.ip ?? '');
    return { success: true, data: formatTx(tx), error: null, message: 'Balance removed successfully.' };
  }
}
