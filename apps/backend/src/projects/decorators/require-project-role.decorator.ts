import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export const REQUIRED_PROJECT_ROLE_KEY = 'requiredProjectRole';

/**
 * Decorator to specify required project role for route access
 * Used in conjunction with ProjectRoleGuard
 *
 * @example
 * @UseGuards(ProjectRoleGuard)
 * @RequireProjectRole('MAINTAINER')
 * async updateProject() { }
 */
export const RequireProjectRole = (role: MemberRole) =>
  SetMetadata(REQUIRED_PROJECT_ROLE_KEY, role);
