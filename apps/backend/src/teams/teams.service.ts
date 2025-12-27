import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { AssignProjectPermissionDto } from './dto/assign-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Find all teams a user is a member of
   */
  async findAllByUser(userId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            projectPermissions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      organization: team.organization,
      myRole: team.members[0]?.role || null,
      memberCount: team._count.members,
      projectCount: team._count.projectPermissions,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));
  }

  /**
   * Find a specific team by organization and team slug
   * ECP-C3: 性能意识 - Redis缓存优化
   */
  async findBySlug(
    organizationSlug: string,
    teamSlug: string,
    userId?: string,
  ) {
    // ✅ Cache-Aside模式: 先检查缓存（缓存团队数据，不包含userId相关的myRole）
    const cacheKey = `team:${organizationSlug}:${teamSlug}`;
    const cachedTeam = await this.redisService.get<any>(cacheKey);

    let team;

    if (cachedTeam) {
      team = cachedTeam;
    } else {
      // Cache miss: 查询数据库
      team = await this.prisma.team.findFirst({
        where: {
          slug: teamSlug,
          organization: { slug: organizationSlug },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatar: true,
                },
              },
            },
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          },
          _count: {
            select: {
              projectPermissions: true,
            },
          },
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // 填充缓存 (TTL: 300秒)
      await this.redisService.set(cacheKey, team, 300);
    }

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Calculate user's role if userId provided (在应用层动态计算，不缓存)
    const myMember = userId
      ? team.members.find((m: { user: { id: string } }) => m.user.id === userId)
      : null;

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      organization: team.organization,
      myRole: myMember?.role || null,
      members: team.members.map(
        (m: {
          id: string;
          role: string;
          joinedAt: Date;
          user: {
            id: string;
            username: string;
            email: string;
            avatar: string | null;
          };
        }) => ({
          id: m.id,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user,
        }),
      ),
      memberCount: team.members.length,
      projectCount: team._count.projectPermissions,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * Create a new team within an organization
   */
  async create(userId: string, dto: CreateTeamDto) {
    // Verify user is a member of the organization
    const organization = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
      include: {
        members: {
          where: {
            userId,
            role: { in: ['OWNER', 'ADMIN'] },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.members.length === 0) {
      throw new ForbiddenException('Only organization admins can create teams');
    }

    // Check slug uniqueness within organization
    const existingTeam = await this.prisma.team.findFirst({
      where: {
        slug: dto.slug,
        organizationId: organization.id,
      },
    });

    if (existingTeam) {
      throw new ConflictException(
        `Team slug '${dto.slug}' already exists in this organization`,
      );
    }

    // Create team with creator as MAINTAINER
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        organizationId: organization.id,
        members: {
          create: {
            userId,
            role: 'MAINTAINER',
          },
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      organization: team.organization,
      myRole: 'MAINTAINER' as const,
      memberCount: 1,
      projectCount: 0,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * Update team information
   */
  async update(organizationSlug: string, teamSlug: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const updated = await this.prisma.team.update({
      where: { id: team.id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    // ✅ 缓存失效: 删除团队详情缓存
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a team
   */
  async remove(organizationSlug: string, teamSlug: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.team.delete({
      where: { id: team.id },
    });

    // ✅ 缓存失效: 删除团队详情缓存
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      message: 'Team deleted successfully',
      slug: team.slug,
    };
  }

  /**
   * Get all members of a team
   */
  async findMembers(organizationSlug: string, teamSlug: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    }));
  }

  /**
   * Add a new member to a team
   */
  async addMember(
    organizationSlug: string,
    teamSlug: string,
    dto: AddTeamMemberDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
      include: {
        organization: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(`User with email '${dto.email}' not found`);
    }

    // Verify user is a member of the organization
    const orgMember = team.organization.members.find(
      (m) => m.userId === user.id,
    );

    if (!orgMember) {
      throw new BadRequestException(
        'User must be a member of the organization first',
      );
    }

    // Check if user is already a team member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    // Create team membership
    const member = await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // ✅ 缓存失效: 删除团队详情缓存（成员列表已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    };
  }

  /**
   * Update a team member's role
   */
  async updateMemberRole(
    organizationSlug: string,
    teamSlug: string,
    targetUserId: string,
    dto: UpdateTeamMemberRoleDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find the member
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this team');
    }

    // Update role
    const updated = await this.prisma.teamMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // ✅ 缓存失效: 删除团队详情缓存（成员角色已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      id: updated.id,
      role: updated.role,
      joinedAt: updated.joinedAt,
      user: updated.user,
    };
  }

  /**
   * Remove a member from a team
   */
  async removeMember(
    organizationSlug: string,
    teamSlug: string,
    targetUserId: string,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
      include: {
        members: {
          where: { role: 'MAINTAINER' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find the member to remove
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this team');
    }

    // Prevent removing the last MAINTAINER
    if (member.role === 'MAINTAINER' && team.members.length === 1) {
      throw new BadRequestException(
        'Cannot remove the last maintainer of the team. Transfer maintainer role first or delete the team.',
      );
    }

    // Delete membership
    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    // ✅ 缓存失效: 删除团队详情缓存（成员列表已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      message: 'Member removed successfully',
      userId: targetUserId,
    };
  }

  /**
   * Get all project permissions for a team
   */
  async findPermissions(organizationSlug: string, teamSlug: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
      include: {
        projectPermissions: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.projectPermissions.map((perm) => ({
      id: perm.id,
      role: perm.role,
      grantedAt: perm.createdAt,
      project: perm.project,
    }));
  }

  /**
   * Assign project permission to a team
   */
  async assignPermission(
    organizationSlug: string,
    teamSlug: string,
    dto: AssignProjectPermissionDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify project exists and belongs to the same organization
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== team.organizationId) {
      throw new BadRequestException(
        'Project must belong to the same organization as the team',
      );
    }

    // Check if permission already exists
    const existingPermission =
      await this.prisma.teamProjectPermission.findUnique({
        where: {
          teamId_projectId: {
            teamId: team.id,
            projectId: dto.projectId,
          },
        },
      });

    if (existingPermission) {
      throw new ConflictException('Permission for this project already exists');
    }

    // Create permission
    const permission = await this.prisma.teamProjectPermission.create({
      data: {
        teamId: team.id,
        projectId: dto.projectId,
        role: dto.role,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // ✅ 缓存失效: 删除团队详情缓存（项目权限已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      id: permission.id,
      role: permission.role,
      grantedAt: permission.createdAt,
      project: permission.project,
    };
  }

  /**
   * Update project permission for a team
   */
  async updatePermission(
    organizationSlug: string,
    teamSlug: string,
    projectId: string,
    dto: UpdateProjectPermissionDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find the permission
    const permission = await this.prisma.teamProjectPermission.findUnique({
      where: {
        teamId_projectId: {
          teamId: team.id,
          projectId: projectId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Update permission
    const updated = await this.prisma.teamProjectPermission.update({
      where: { id: permission.id },
      data: { role: dto.role },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // ✅ 缓存失效: 删除团队详情缓存（项目权限已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      id: updated.id,
      role: updated.role,
      grantedAt: updated.createdAt,
      project: updated.project,
    };
  }

  /**
   * Revoke project permission from a team
   */
  async revokePermission(
    organizationSlug: string,
    teamSlug: string,
    projectId: string,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        organization: { slug: organizationSlug },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Find the permission
    const permission = await this.prisma.teamProjectPermission.findUnique({
      where: {
        teamId_projectId: {
          teamId: team.id,
          projectId: projectId,
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Delete permission
    await this.prisma.teamProjectPermission.delete({
      where: { id: permission.id },
    });

    // ✅ 缓存失效: 删除团队详情缓存（项目权限已变化）
    await this.redisService.del(`team:${organizationSlug}:${teamSlug}`);

    return {
      message: 'Permission revoked successfully',
      projectId: projectId,
    };
  }
}
