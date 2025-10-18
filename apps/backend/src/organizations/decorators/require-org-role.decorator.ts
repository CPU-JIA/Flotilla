import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '@prisma/client';

/**
 * Metadata key for organization role requirement
 */
export const REQUIRE_ORG_ROLE_KEY = 'requireOrgRole';

/**
 * Decorator to specify the minimum organization role required for an endpoint
 *
 * Usage:
 * @RequireOrgRole('ADMIN')
 * async updateOrganization() { ... }
 *
 * Role hierarchy: OWNER > ADMIN > MEMBER
 * - OWNER: Can do everything (delete organization, transfer ownership)
 * - ADMIN: Can manage settings and members (cannot delete organization)
 * - MEMBER: Can only view organization details
 *
 * Note: SUPER_ADMIN users bypass organization role checks
 */
export const RequireOrgRole = (role: OrgRole) =>
  SetMetadata(REQUIRE_ORG_ROLE_KEY, role);
