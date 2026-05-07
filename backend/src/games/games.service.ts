import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEntity, GameStatus } from '../database/entities/game.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
  ) {}

  async create(dto: CreateGameDto): Promise<GameEntity> {
    const existing = await this.gameRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A game with this slug already exists.');

    const game = this.gameRepo.create({
      name:        dto.name,
      slug:        dto.slug,
      type:        dto.type,
      status:      dto.status,
      rtpTarget:   dto.rtpTarget?.toFixed(2),
      minBet:      dto.minBet?.toFixed(2),
      maxBet:      dto.maxBet?.toFixed(2),
      description: dto.description ?? null,
    });

    return this.gameRepo.save(game);
  }

  async findAll(status?: GameStatus): Promise<GameEntity[]> {
    const qb = this.gameRepo.createQueryBuilder('g').orderBy('g.name', 'ASC');
    if (status) qb.where('g.status = :status', { status });
    return qb.getMany();
  }

  async findOne(id: number): Promise<GameEntity> {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) throw new NotFoundException('Game not found.');
    return game;
  }

  async findBySlug(slug: string): Promise<GameEntity> {
    const game = await this.gameRepo.findOne({ where: { slug } });
    if (!game) throw new NotFoundException('Game not found.');
    return game;
  }

  async update(id: number, dto: UpdateGameDto): Promise<GameEntity> {
    const game = await this.findOne(id);

    if (dto.slug && dto.slug !== game.slug) {
      const conflict = await this.gameRepo.findOne({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException('A game with this slug already exists.');
    }

    Object.assign(game, {
      ...(dto.name        !== undefined && { name:        dto.name }),
      ...(dto.slug        !== undefined && { slug:        dto.slug }),
      ...(dto.type        !== undefined && { type:        dto.type }),
      ...(dto.status      !== undefined && { status:      dto.status }),
      ...(dto.rtpTarget   !== undefined && { rtpTarget:   dto.rtpTarget.toFixed(2) }),
      ...(dto.minBet      !== undefined && { minBet:      dto.minBet.toFixed(2) }),
      ...(dto.maxBet      !== undefined && { maxBet:      dto.maxBet.toFixed(2) }),
      ...(dto.description !== undefined && { description: dto.description }),
    });

    return this.gameRepo.save(game);
  }

  async disable(id: number): Promise<GameEntity> {
    const game = await this.findOne(id);
    game.status = GameStatus.DISABLED;
    return this.gameRepo.save(game);
  }
}
