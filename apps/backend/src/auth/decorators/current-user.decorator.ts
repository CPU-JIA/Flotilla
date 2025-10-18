import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Custom decorator to extract current user from request
 * Usage: @CurrentUser() user: User
 *
 * Works with JwtAuthGuard which attaches user to request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
