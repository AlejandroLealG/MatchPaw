import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@matchpaw/shared';
import { JwtPayload } from '../../modules/auth/auth.service';

export const ROLES_KEY = 'roles';

/**
 * Guard that checks whether the authenticated user has the required role(s).
 * Must be used after JwtAuthGuard (requires request.user to be set).
 * Routes without @Roles() decorator are accessible to any authenticated user.
 */
@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required — any authenticated user can access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para realizar esta acción',
        },
      });
    }

    return true;
  }
}
