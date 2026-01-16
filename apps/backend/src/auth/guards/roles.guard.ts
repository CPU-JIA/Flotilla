import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ECP-C1: 跳过 CORS 预检请求 (OPTIONS)
    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = request;

    // 🔍 DEBUG: 输出用户信息
    this.logger.debug(`Required roles: ${requiredRoles.join(', ')}`);
    this.logger.debug(
      `User: ${JSON.stringify({ id: user?.id, email: user?.email, role: user?.role })}`,
    );

    if (!user) {
      throw new ForbiddenException('未找到用户信息');
    }

    // 检查用户是否被激活
    if (user.isActive === false) {
      throw new ForbiddenException('您的账户已被停用，请联系管理员');
    }

    // SUPER_ADMIN bypasses all role checks
    if (user.role === UserRole.SUPER_ADMIN) {
      this.logger.debug('✅ SUPER_ADMIN access granted');
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `❌ Access denied. User role: ${user.role}, Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('您没有权限访问此资源');
    }

    return true;
  }
}
