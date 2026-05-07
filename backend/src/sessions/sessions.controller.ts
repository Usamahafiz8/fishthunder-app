import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { SessionsService } from './sessions.service';
import { SpinService } from './spin.service';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { SpinDto } from './dto/spin.dto';

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly spinService: SpinService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a game session — transfers funds from main wallet to session balance' })
  @ApiResponse({ status: 201, description: 'Session started' })
  @ApiResponse({ status: 409, description: 'Active session already exists for this game' })
  start(@CurrentUser() user: UserEntity, @Body() dto: StartSessionDto, @Request() req: any) {
    return this.sessionsService.startSession(user, dto, req.ip ?? '');
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a session — returns remaining balance to main wallet' })
  end(
    @CurrentUser() user: UserEntity,
    @Param('sessionId') sessionId: string,
    @Body() dto: EndSessionDto,
    @Request() req: any,
  ) {
    return this.sessionsService.endSession(user, sessionId, dto.reason ?? '', req.ip ?? '');
  }

  @Post(':sessionId/spin')
  @ApiOperation({ summary: 'Place a spin — atomically deducts bet and credits win' })
  @ApiResponse({ status: 201, description: 'Spin result' })
  @ApiResponse({ status: 200, description: 'Duplicate request — returning cached result (idempotency)' })
  spin(
    @CurrentUser() user: UserEntity,
    @Param('sessionId') sessionId: string,
    @Body() dto: SpinDto,
    @Request() req: any,
  ) {
    return this.spinService.spin(user, sessionId, dto, req.ip ?? '');
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session details' })
  getSession(@CurrentUser() user: UserEntity, @Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId, user.id);
  }

  @Get(':sessionId/spins')
  @ApiOperation({ summary: 'Get spin history for a session' })
  getSpins(@CurrentUser() user: UserEntity, @Param('sessionId') sessionId: string) {
    return this.spinService.getSpinHistory(sessionId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get my active sessions' })
  getActiveSessions(@CurrentUser() user: UserEntity) {
    return this.sessionsService.getActiveSessions(user.id);
  }

  @Get('history/all')
  @ApiOperation({ summary: 'Get my session history' })
  getHistory(@CurrentUser() user: UserEntity) {
    return this.sessionsService.getMySessionHistory(user.id);
  }
}
