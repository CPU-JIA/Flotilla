import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamRole } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import { REQUIRE_TEAM_ROLE_KEY } from '../decorators/require-team-role.decorator';

/**
 * Guard to check if user has required team role
 * ECP-C1: Defensive Programming - validate team membership and role hierarchy
 * ECP-A1: SOLID - Single responsibility (team permission checking)
 */
@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<TeamRole>(
      REQUIRE_TEAM_ROLE_KEY,
      context.getHandler(),
    );

    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationSlug = request.params.organizationSlug;
    const teamSlug = request.params.teamSlug;

    if (!user || !organizationSlug || !teamSlug) {
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

    return true;
  }
}
