import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PermissionService } from '../common/services/permission.service';
import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import type { User, ProjectMember } from '@prisma/client';

/**
 * Project Members Service
 *
 * ECP-A1: 单一职责原则 - 专注于项目成员管理
 * 从 ProjectsService 拆分出来，降低服务复杂度
 */
@Injectable()
export class ProjectMembersService {
  private readonly logger = new Logger(ProjectMembersService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private permissionService: PermissionService,
  ) {}

  /**
   * 添加项目成员
   * ECP-C1: 防御性编程 - 验证用户和角色
   */
  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
    _currentUser: User,
  ): Promise<ProjectMember> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // 不能添加所有者为成员
    if (addMemberDto.userId === project.ownerId) {
      throw new BadRequestException('项目所有者无需添加为成员');
    }

    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ID ${addMemberDto.userId} 不存在`);
    }

    // 检查是否已是成员
    const existingMember = project.members.find(
      (m) => m.userId === addMemberDto.userId,
    );
    if (existingMember) {
      throw new ConflictException('该用户已是项目成员');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: addMemberDto.userId,
        role: addMemberDto.role,
      },
    });

    // ✅ 缓存失效: 删除项目详情缓存和成员列表缓存
    await this.redisService.del(`project:${projectId}:detail`);
    await this.redisService.del(`project:${projectId}:members`);
    // 🔒 ECP-A1防御编程: 清除用户项目权限缓存
    await this.permissionService.invalidateProjectPermissionCache(
      addMemberDto.userId,
      projectId,
    );

    this.logger.log(
      `👥 User ${user.username} added to project ${projectId} as ${addMemberDto.role}`,
    );

    return member;
  }

  /**
   * 移除项目成员
   * ECP-C1: 防御性编程 - 防止移除所有者
   */
  async removeMember(
    projectId: string,
    userId: string,
    currentUser: User,
  ): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // 不能移除项目所有者
    if (userId === project.ownerId) {
      throw new BadRequestException('不能移除项目所有者');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('该用户不是项目成员');
    }

    await this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    // ✅ 缓存失效
    await this.redisService.del(`project:${projectId}:detail`);
    await this.redisService.del(`project:${projectId}:members`);
    // 🔒 ECP-A1防御编程: 清除用户项目权限缓存
    await this.permissionService.invalidateProjectPermissionCache(
      userId,
      projectId,
    );

    this.logger.log(
      `👥 User ${userId} removed from project ${projectId} by ${currentUser.username}`,
    );

    return { message: '成员已移除' };
  }

  /**
   * 更新成员角色
   * ECP-C1: 防御性编程 - 验证角色权限
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    updateRoleDto: UpdateMemberRoleDto,
    _currentUser: User,
  ): Promise<ProjectMember> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // 不能修改所有者角色
    if (userId === project.ownerId) {
      throw new BadRequestException('不能修改项目所有者的角色');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('该用户不是项目成员');
    }

    const updatedMember = await this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: {
        role: updateRoleDto.role,
      },
    });

    // ✅ 缓存失效
    await this.redisService.del(`project:${projectId}:detail`);
    await this.redisService.del(`project:${projectId}:members`);
    // 🔒 ECP-A1防御编程: 清除用户项目权限缓存
    await this.permissionService.invalidateProjectPermissionCache(
      userId,
      projectId,
    );

    this.logger.log(
      `👥 Member ${userId} role updated to ${updateRoleDto.role} in project ${projectId}`,
    );

    return updatedMember;
  }

  /**
   * 获取项目成员列表
   * ECP-C3: 性能优化 - Redis缓存
   */
  async getMembers(projectId: string): Promise<
    (ProjectMember & {
      user: {
        id: string;
        username: string;
        email: string;
        avatar: string | null;
      };
    })[]
  > {
    // ✅ Cache-Aside模式
    const cacheKey = `project:${projectId}:members`;
    const cached = await this.redisService.get<
      (ProjectMember & {
        user: {
          id: string;
          username: string;
          email: string;
          avatar: string | null;
        };
      })[]
    >(cacheKey);

    if (cached) {
      this.logger.debug(`✅ Cache hit for project ${projectId} members`);
      return cached;
    }

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // 缓存 (TTL: 120秒)
    await this.redisService.set(cacheKey, members, 120);

    return members;
  }
}
