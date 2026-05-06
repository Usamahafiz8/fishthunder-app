import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserEntity } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { MassCreateUsersDto } from './dto/mass-create-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

function formatUser(u: UserEntity) {
  const role   = u.roles?.[0];
  const wallet = u.wallet;
  return {
    id:         u.id,
    username:   u.username,
    email:      u.email,
    role:       role ? { id: role.id, name: role.name, slug: role.slug } : null,
    parent_id:  u.parentId,
    shop_id:    u.shopId,
    status:     u.status,
    balance:    wallet ? parseFloat(wallet.balance).toFixed(2) : null,
    currency:   wallet?.currency ?? 'USD',
    created_at: u.createdAt?.toISOString(),
    last_login: u.lastLoginAt?.toISOString() ?? null,
  };
}

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users
  @Get()
  @ApiOperation({ summary: 'List users in your hierarchy (paginated)' })
  @ApiQuery({ name: 'role',      required: false, description: 'Filter by role slug' })
  @ApiQuery({ name: 'status',    required: false, description: 'active | blocked' })
  @ApiQuery({ name: 'search',    required: false, description: 'Username / email contains' })
  @ApiQuery({ name: 'parent_id', required: false, type: Number })
  @ApiQuery({ name: 'from',      required: false, description: 'ISO date lower bound on created_at' })
  @ApiQuery({ name: 'to',        required: false, description: 'ISO date upper bound on created_at' })
  @ApiQuery({ name: 'page',      required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'per_page',  required: false, type: Number, example: 25 })
  @ApiResponse({ status: 200, description: 'Paginated list of users.' })
  async index(@CurrentUser() actor: UserEntity, @Query() query: any) {
    const result = await this.usersService.listUsers(actor, {
      role:      query.role,
      status:    query.status,
      parent_id: query.parent_id ? parseInt(query.parent_id) : undefined,
      search:    query.search,
      from:      query.from,
      to:        query.to,
      page:      query.page     ? parseInt(query.page)     : 1,
      per_page:  query.per_page ? parseInt(query.per_page) : 25,
    });

    return {
      success: true,
      data:    result.data.map(formatUser),
      error:   null,
      message: 'Users retrieved.',
      meta:    result.meta,
    };
  }

  // POST /api/users
  @Post()
  @ApiOperation({ summary: 'Create a new user (must be a lower role than yours)' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 403, description: 'Forbidden – cannot assign equal/higher role.' })
  @ApiResponse({ status: 409, description: 'Username or email already taken.' })
  async store(@Body() dto: CreateUserDto, @CurrentUser() actor: UserEntity) {
    const user = await this.usersService.createUser(dto, actor);
    return { success: true, data: formatUser(user), error: null, message: 'User created successfully.' };
  }

  // POST /api/users/mass
  @Post('mass')
  @ApiOperation({ summary: 'Cashier: bulk-create up to 100 players in one request' })
  @ApiResponse({ status: 201, description: 'Returns count of created + list of failures.' })
  @ApiResponse({ status: 403, description: 'Only Cashiers can use this endpoint.' })
  async massCreate(@Body() dto: MassCreateUsersDto, @CurrentUser() actor: UserEntity) {
    const result = await this.usersService.massCreatePlayers(dto.users, actor);
    return { success: true, data: result, error: null, message: `${result.created} player(s) created.` };
  }

  // GET /api/users/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID (must be in your hierarchy)' })
  @ApiResponse({ status: 200, description: 'User detail including hierarchy path.' })
  @ApiResponse({ status: 404, description: 'User not found (or outside your hierarchy).' })
  async show(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserEntity) {
    const user = await this.usersService.getUser(id, actor);
    const data = formatUser(user);

    const parents: Array<{ id: number; username: string }> = [];
    let current = user.parent;
    while (current) {
      parents.unshift({ id: current.id, username: current.username });
      current = current.parent ?? null;
    }

    return { success: true, data: { ...data, parents }, error: null, message: 'User retrieved.' };
  }

  // PUT /api/users/:id
  @Put(':id')
  @ApiOperation({ summary: 'Update a user (username, email, status, shop_id)' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: UserEntity,
  ) {
    const user = await this.usersService.updateUser(id, dto, actor);
    return { success: true, data: formatUser(user), error: null, message: 'User updated.' };
  }

  // DELETE /api/users/:id  (soft-delete via block)
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete (block) a user' })
  @ApiResponse({ status: 200, description: 'User blocked/deactivated.' })
  async destroy(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserEntity) {
    await this.usersService.blockUser(id, actor);
    return { success: true, data: null, error: null, message: 'User has been deactivated.' };
  }

  // POST /api/users/:id/block
  @Post(':id/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked.' })
  async block(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserEntity) {
    await this.usersService.blockUser(id, actor);
    return { success: true, data: null, error: null, message: 'User has been blocked.' };
  }

  // POST /api/users/:id/unblock
  @Post(':id/unblock')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked.' })
  async unblock(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserEntity) {
    await this.usersService.unblockUser(id, actor);
    return { success: true, data: null, error: null, message: 'User has been unblocked.' };
  }
}
