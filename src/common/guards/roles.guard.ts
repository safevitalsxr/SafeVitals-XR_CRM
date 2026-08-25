import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied: Authentication required');
    }

    // Super Admin bypasses all role constraints
    if (user.isSuperAdmin || user.role === 'Super Admin') {
      return true;
    }

    const userRole = user.role || 'Employee';
    const hasRole = requiredRoles.some(role => role.toLowerCase() === userRole.toLowerCase());

    if (!hasRole) {
      throw new ForbiddenException(`Access denied: Requires one of the following roles: [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}
