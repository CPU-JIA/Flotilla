import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole, User } from '@prisma/client';
import { PermissionService } from '../../common/services/permission.service';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../../common/guards/base-role.guard';
import { REQUIRED_PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';
import { BaseRoleGuard } from '../../common/guards/base-role.guard';

/**
 * Guard for checking project-level permissions
 * Validates user has required role in project (considering both direct membership and team permissions)
 * SUPER_ADMIN bypasses all checks
 *
 * Usage:
 * @UseGuards(ProjectRoleGuard)
 * @RequireProjectRole('MAINTAINER')
 *
 * ECP-A1: Inheritance - extends BaseRoleGuard to eliminate code duplication
 */
@Injectable()
export class ProjectRoleGuard extends BaseRoleGuard<MemberRole> {
  constructor(reflector: Reflector, permissionService: PermissionService) {
    super(reflector, permissionService);
  }

  protected getDecoratorKey(): string {
    return REQUIRED_PROJECT_ROLE_KEY;
  }

  protected async checkPermission(
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
    requiredRole: MemberRole,
  ): Promise<void> {
    const projectId = request.params.id || request.params.projectId;

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
  }
}
