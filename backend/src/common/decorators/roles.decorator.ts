import { SetMetadata } from '@nestjs/common';
import { RoleSlug } from '../../database/entities/role.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleSlug[]) => SetMetadata(ROLES_KEY, roles);
