import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '@prisma/client';

export const REQUIRE_TEAM_ROLE_KEY = 'requireTeamRole';

/**
 * Decorator to specify the minimum team role required to access a route
 * @param role Minimum team role required
 */
export const RequireTeamRole = (role: TeamRole) =>
  SetMetadata(REQUIRE_TEAM_ROLE_KEY, role);
