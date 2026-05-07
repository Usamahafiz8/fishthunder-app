import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleSlug } from '../database/entities/role.entity';
import { GameStatus } from '../database/entities/game.entity';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@ApiTags('Games')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @Roles(RoleSlug.ADMIN, RoleSlug.AGENT)
  @ApiOperation({ summary: 'Create a new game' })
  @ApiResponse({ status: 201, description: 'Game created' })
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all games' })
  @ApiQuery({ name: 'status', required: false, enum: GameStatus })
  findAll(@Query('status') status?: GameStatus) {
    return this.gamesService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleSlug.ADMIN, RoleSlug.AGENT)
  @ApiOperation({ summary: 'Update game configuration' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }

  @Patch(':id/disable')
  @Roles(RoleSlug.ADMIN)
  @ApiOperation({ summary: 'Disable a game' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.disable(id);
  }
}
