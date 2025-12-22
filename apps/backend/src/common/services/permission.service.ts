import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  MemberRole,
  OrgRole,
  TeamRole,
  User,
  Project,
  Organization,
  Team,
} from '@prisma/client';

/**
 * Centralized permission checking service
 * Implements three-layer permission hierarchy:
 * Platform (SUPER_ADMIN) → Organization (OWNER/ADMIN/MEMBER) → Team (MAINTAINER/MEMBER) → Project (OWNER/MAINTAINER/MEMBER/VIEWER)
 * ECP-C3: Performance optimization - Redis caching for project permissions
 */
@Injectable()
export class PermissionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // Role hierarchy definitions
  private readonly memberRoleHierarchy: Record<MemberRole, number> = {
    OWNER: 4,
    MAINTAINER: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  private readonly orgRoleHierarchy: Record<OrgRole, number> = {
    OWNER: 3,
    ADMIN: 2,
    MEMBER: 1,
  };

  private readonly teamRoleHierarchy: Record<TeamRole, number> = {
    MAINTAINER: 2,
    MEMBER: 1,
  };

  /**
   * Check if user is SUPER_ADMIN
   */
  isSuperAdmin(user: User): boolean {
    return user.role === 'SUPER_ADMIN';
  }

  /**
   * Get effective project role by merging direct membership and team permissions
   * Returns the highest role among all access paths
   * ECP-C3: Performance optimization - Redis caching (TTL: 60s)
   */
  async getEffectiveProjectRole(
    userId: string,
    projectId: string,
  ): Promise<MemberRole | null> {
    // Try cache first
    const cacheKey = `user:${userId}:project:${projectId}:role`;
    const cached = await this.redis.get<MemberRole | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Parallel queries for performance
    const [directMember, teamPermissions] = await Promise.all([
      // Direct project membership
      this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: { role: true },
      }),

      // Team-based permissions
      this.prisma.teamProjectPermission.findMany({
        where: {
          projectId,
          team: {
            members: {
              some: { userId },
            },
          },
        },
        select: { role: true },
      }),
    ]);

    // Collect all roles
    const allRoles: MemberRole[] = [
      directMember?.role,
      ...teamPermissions.map((tp) => tp.role),
    ].filter((role): role is MemberRole => role !== undefined);

    const effectiveRole =
      allRoles.length === 0 ? null : this.getHighestMemberRole(allRoles);

    // Cache result (TTL: 60 seconds)
    await this.redis.set(cacheKey, effectiveRole, 60);

    return effectiveRole;
  }

  /**
   * Check project permission and return project if authorized
   * @throws ForbiddenException if insufficient permissions
   * @throws NotFoundException if project not found
   * ECP-C3: Performance optimization - Single query with include
   */
  async checkProjectPermission(
    user: User,
    projectId: string,
    requiredRole: MemberRole,
  ): Promise<Project> {
    // SUPER_ADMIN bypass
    if (this.isSuperAdmin(user)) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      return project;
    }

    // Single query with include to fetch project + members + teamPermissions
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
        teamPermissions: {
          where: {
            team: {
              members: {
                some: { userId: user.id },
              },
            },
          },
          select: { role: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate effective role from included data
    const allRoles: MemberRole[] = [
      project.members[0]?.role,
      ...project.teamPermissions.map((tp) => tp.role),
    ].filter((role): role is MemberRole => role !== undefined);

    if (allRoles.length === 0) {
      throw new ForbiddenException('Not a member of this project');
    }

    const effectiveRole = this.getHighestMemberRole(allRoles);

    // Check role hierarchy
    if (
      !this.hasPermission(effectiveRole, requiredRole, this.memberRoleHierarchy)
    ) {
      throw new ForbiddenException(
        `Requires ${requiredRole} role or higher in this project`,
      );
    }

    // Return project without extra included fields
    const {
      members: _members,
      teamPermissions: _teamPermissions,
      ...projectData
    } = project;
    return projectData as Project;
  }

  /**
   * Check organization permission and return organization if authorized
   * @throws ForbiddenException if insufficient permissions
   * @throws NotFoundException if organization not found
   */
  async checkOrganizationPermission(
    user: User,
    organizationSlug: string,
    requiredRole: OrgRole,
  ): Promise<Organization> {
    // SUPER_ADMIN bypass
    if (this.isSuperAdmin(user)) {
      const organization = await this.prisma.organization.findUnique({
        where: { slug: organizationSlug },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      return organization;
    }

    // Find organization and user's membership
    const organization = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const membership = organization.members[0];

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    // Check role hierarchy
    if (
      !this.hasPermission(membership.role, requiredRole, this.orgRoleHierarchy)
    ) {
      throw new ForbiddenException(
        `Requires ${requiredRole} role or higher in this organization`,
      );
    }

    return organization;
  }

  /**
   * Check team permission and return team if authorized
   * @throws ForbiddenException if insufficient permissions
   * @throws NotFoundException if team not found
   */
  async checkTeamPermission(
    user: User,
    organizationSlug: string,
    teamSlug: string,
    requiredRole: TeamRole,
  ): Promise<Team> {
    // SUPER_ADMIN bypass
    if (this.isSuperAdmin(user)) {
      const team = await this.prisma.team.findFirst({
        where: {
          slug: teamSlug,
          organization: { slug: organizationSlug },
        },
        include: { organization: true },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      return team;
    }

    // Find team and user's membership
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
      include: {
        organization: true,
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = team.members[0];

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }

    // Check role hierarchy
    if (
      !this.hasPermission(membership.role, requiredRole, this.teamRoleHierarchy)
    ) {
      throw new ForbiddenException(
        `Requires ${requiredRole} role or higher in this team`,
      );
    }

    return team;
  }

  /**
   * Get the highest role from an array of MemberRoles
   */
  private getHighestMemberRole(roles: MemberRole[]): MemberRole {
    return roles.reduce((highest, current) =>
      this.memberRoleHierarchy[current] > this.memberRoleHierarchy[highest]
        ? current
        : highest,
    );
  }

  /**
   * Check if userRole has sufficient permissions for requiredRole
   */
  private hasPermission<T extends string>(
    userRole: T,
    requiredRole: T,
    hierarchy: Record<T, number>,
  ): boolean {
    return hierarchy[userRole] >= hierarchy[requiredRole];
  }

  /**
   * Invalidate project permission cache for a specific user
   * Call this when project permissions are modified
   * ECP-C3: Performance optimization - Cache invalidation on permission changes
   */
  async invalidateProjectPermissionCache(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const cacheKey = `user:${userId}:project:${projectId}:role`;
    await this.redis.del(cacheKey);
  }

  /**
   * Invalidate all project permission caches for a project
   * Call this when team permissions or project settings change
   */
  async invalidateAllProjectPermissionCaches(projectId: string): Promise<void> {
    const pattern = `user:*:project:${projectId}:role`;
    await this.redis.delPattern(pattern);
  }
}
