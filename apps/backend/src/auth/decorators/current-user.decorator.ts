import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Custom decorator to extract current user from request
 * Usage:
 *   @CurrentUser() user: User  // Returns full user object
 *   @CurrentUser('id') userId: string  // Returns user.id only
 *
 * Works with JwtAuthGuard which attaches user to request
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific field is requested (e.g., 'id'), return that field
    // Otherwise return the full user object
    return data ? user?.[data] : user;
  },
);
