import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import { REQUIRE_ORG_ROLE_KEY } from '../decorators/require-org-role.decorator';

/**
 * Guard to check if user has required role in an organization
 *
 * Role hierarchy: OWNER (3) > ADMIN (2) > MEMBER (1)
 *
 * Special cases:
 * - SUPER_ADMIN users bypass all organization role checks
 * - Caches organization object in request for Service layer reuse
 */
@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required role from decorator
    const requiredRole = this.reflector.get<OrgRole>(
      REQUIRE_ORG_ROLE_KEY,
      context.getHandler(),
    );

    // If no role specified, allow access (shouldn't happen in practice)
    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard
    // Support both :slug (organizations routes) and :organizationSlug (teams routes)
    const slug = request.params.slug || request.params.organizationSlug;

    if (!slug) {
      throw new NotFoundException('Organization slug not provided');
    }

    // Check permission via centralized service
    const organization =
      await this.permissionService.checkOrganizationPermission(
        user,
        slug,
        requiredRole,
      );

    // Cache organization in request for Service layer
    request.organization = organization;

    return true;
  }
}
