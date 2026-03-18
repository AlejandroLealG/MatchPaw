import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@matchpaw/shared';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.guard';

/** Mark a route as public — skips JwtAuthGuard */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restrict a route to one or more roles */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
