import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import { REQUIRED_PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';

/**
 * Guard for checking project-level permissions
 * Validates user has required role in project (considering both direct membership and team permissions)
 * SUPER_ADMIN bypasses all checks
 *
 * Usage:
 * @UseGuards(ProjectRoleGuard)
 * @RequireProjectRole('MAINTAINER')
 */
@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required role from decorator metadata
    const requiredRole = this.reflector.getAllAndOverride<MemberRole>(
      REQUIRED_PROJECT_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRole) {
      // No role requirement, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id || request.params.projectId;

    if (!user) {
      return false;
    }

    if (!projectId) {
      throw new Error(
        'ProjectRoleGuard requires :id or :projectId route parameter',
      );
    }

    // Check permission and attach project to request
    const project = await this.permissionService.checkProjectPermission(
      user,
      projectId,
      requiredRole,
    );

    // Attach project to request for use in controller (avoid duplicate query)
    request.project = project;

    return true;
  }
}
