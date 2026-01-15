import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@prisma/client';
import { PermissionService } from '../services/permission.service';

/**
 * Authenticated user object set by JwtAuthGuard
 * ECP-P0: Type Safety - Replaces 'any' with concrete type
 */
export type AuthenticatedUser = User;

/**
 * Express Request with authenticated user attached
 * ECP-P0: Type Safety - Provides type-safe access to request.user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Abstract base class for role-based guards using Template Method pattern
 * ECP-A1: DRY - Eliminates code duplication across Organization/Team/Project guards
 * ECP-A1: SOLID - Open/Closed Principle - open for extension, closed for modification
 *
 * Subclasses must implement:
 * - getDecoratorKey(): Return the metadata key for required role
 * - getRequiredRole(): Extract required role from decorator metadata
 * - checkPermission(): Call appropriate PermissionService method and cache entity
 */
export abstract class BaseRoleGuard<
  TRole extends string,
> implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly permissionService: PermissionService,
  ) {}

  /**
   * Template method - defines the skeleton of the algorithm
   * ECP-A2: Template Method Pattern - consistent flow across all role guards
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Get required role from decorator (subclass-specific)
    const requiredRole = this.getRequiredRole(context);

    // If no role specified, allow access
    if (!requiredRole) {
      return true;
    }

    // Step 2: Extract request and user (common logic)
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user) {
      return false;
    }

    // Step 3: Check permission and cache entity (subclass-specific)
    await this.checkPermission(request, user, requiredRole);

    return true;
  }

  /**
   * Get the metadata key for the required role decorator
   * @returns The decorator metadata key (e.g., 'requireOrgRole')
   */
  protected abstract getDecoratorKey(): string;

  /**
   * Extract required role from decorator metadata
   * Subclasses can override to use `get()` or `getAllAndOverride()`
   */
  protected getRequiredRole(context: ExecutionContext): TRole | undefined {
    return this.reflector.getAllAndOverride<TRole>(this.getDecoratorKey(), [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  /**
   * Check if user has required permission and cache entity in request
   * Subclasses implement this to:
   * 1. Extract entity identifiers from request.params
   * 2. Call appropriate PermissionService method
   * 3. Cache the returned entity in request (e.g., request.organization)
   *
   * @throws ForbiddenException if insufficient permissions
   * @throws NotFoundException if entity not found
   */
  protected abstract checkPermission(
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
    requiredRole: TRole,
  ): Promise<void>;
}
