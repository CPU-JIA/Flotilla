import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamRole, User } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../../common/guards/base-role.guard';
import { REQUIRE_TEAM_ROLE_KEY } from '../decorators/require-team-role.decorator';
import { BaseRoleGuard } from '../../common/guards/base-role.guard';

/**
 * Guard to check if user has required team role
 * ECP-C1: Defensive Programming - validate team membership and role hierarchy
 * ECP-A1: SOLID - Single responsibility (team permission checking)
 * ECP-A1: Inheritance - extends BaseRoleGuard to eliminate code duplication
 */
@Injectable()
export class TeamRoleGuard extends BaseRoleGuard<TeamRole> {
  constructor(reflector: Reflector, permissionService: PermissionService) {
    super(reflector, permissionService);
  }

  protected getDecoratorKey(): string {
    return REQUIRE_TEAM_ROLE_KEY;
  }

  /**
   * Override to use reflector.get() instead of getAllAndOverride()
   * Only checks handler-level decorator, not class-level
   */
  protected getRequiredRole(context: ExecutionContext): TeamRole | undefined {
    return this.reflector.get<TeamRole>(
      this.getDecoratorKey(),
      context.getHandler(),
    );
  }

  protected async checkPermission(
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
    requiredRole: TeamRole,
  ): Promise<void> {
    const organizationSlug = request.params.organizationSlug;
    const teamSlug = request.params.teamSlug;

    if (!organizationSlug || !teamSlug) {
      throw new ForbiddenException('Invalid request parameters');
    }

    // Check permission via centralized service
    const team = await this.permissionService.checkTeamPermission(
      user,
      organizationSlug,
      teamSlug,
      requiredRole,
    );

    // Attach team to request for use in controllers
    request.team = team;
  }
}
