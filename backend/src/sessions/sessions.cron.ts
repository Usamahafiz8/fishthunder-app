import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';
import { SpinService } from './spin.service';

@Injectable()
export class SessionsCron {
  private readonly logger = new Logger(SessionsCron.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly spinService: SpinService,
  ) {}

  /** Every 5 minutes — return balances from expired sessions to main wallet */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverExpiredSessions() {
    const count = await this.sessionsService.recoverExpiredSessions();
    if (count > 0) this.logger.log(`Recovered ${count} expired session(s).`);
  }

  /** Every 5 minutes — refund stuck pending spins older than 5 min */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverStuckSpins() {
    const count = await this.spinService.recoverStuckSpins();
    if (count > 0) this.logger.log(`Refunded ${count} stuck spin(s).`);
  }
}
