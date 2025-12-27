import {
  Injectable,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole, User } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import { REQUIRE_ORG_ROLE_KEY } from '../decorators/require-org-role.decorator';
import { BaseRoleGuard } from '../../common/guards/base-role.guard';

/**
 * Guard to check if user has required role in an organization
 *
 * Role hierarchy: OWNER (3) > ADMIN (2) > MEMBER (1)
 *
 * Special cases:
 * - SUPER_ADMIN users bypass all organization role checks
 * - Caches organization object in request for Service layer reuse
 *
 * ECP-A1: Inheritance - extends BaseRoleGuard to eliminate code duplication
 */
@Injectable()
export class OrganizationRoleGuard extends BaseRoleGuard<OrgRole> {
  constructor(reflector: Reflector, permissionService: PermissionService) {
    super(reflector, permissionService);
  }

  protected getDecoratorKey(): string {
    return REQUIRE_ORG_ROLE_KEY;
  }

  /**
   * Override to use reflector.get() instead of getAllAndOverride()
   * Only checks handler-level decorator, not class-level
   */
  protected getRequiredRole(context: ExecutionContext): OrgRole | undefined {
    return this.reflector.get<OrgRole>(
      this.getDecoratorKey(),
      context.getHandler(),
    );
  }

  protected async checkPermission(
    request: any,
    user: User,
    requiredRole: OrgRole,
  ): Promise<void> {
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
  }
}
