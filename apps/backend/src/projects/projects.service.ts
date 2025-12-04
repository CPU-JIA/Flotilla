import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RepositoriesService } from '../repositories/repositories.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  QueryProjectsDto,
} from './dto';
import type { User, Project, ProjectMember } from '@prisma/client';
import { UserRole, MemberRole, ProjectVisibility } from '@prisma/client';

export interface ProjectListResponse {
  projects: (Project & {
    owner: { id: string; username: string };
    _count: { members: number };
  })[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectDetailResponse extends Project {
  owner: { id: string; username: string; email: string };
  members: (ProjectMember & {
    user: { id: string; username: string; email: string };
  })[];
  repository: any;
  _count: { members: number };
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    @Inject(forwardRef(() => RepositoriesService))
    private repositoriesService: RepositoriesService,
  ) {}

  /**
   * 创建项目
   * ECP-A1: SOLID原则 - 单一职责
   * ECP-C1: 防御性编程 - 检查唯一性
   * Phase 3.1: 自动创建Repository和main分支
   */
  async create(
    createDto: CreateProjectDto,
    currentUser: User,
  ): Promise<Project> {
    // 检查项目名称是否已存在（同一用户下）
    const existingProject = await this.prisma.project.findUnique({
      where: {
        ownerId_name: {
          ownerId: currentUser.id,
          name: createDto.name,
        },
      },
    });

    if (existingProject) {
      throw new ConflictException('您已有同名项目');
    }

    const project = await this.prisma.project.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        visibility: createDto.visibility || ProjectVisibility.PRIVATE,
        ownerId: currentUser.id,
        // PR approval settings
        ...(createDto.requireApprovals !== undefined && {
          requireApprovals: createDto.requireApprovals,
        }),
        ...(createDto.allowSelfMerge !== undefined && {
          allowSelfMerge: createDto.allowSelfMerge,
        }),
        ...(createDto.requireReviewFromOwner !== undefined && {
          requireReviewFromOwner: createDto.requireReviewFromOwner,
        }),
      },
    });

    this.logger.log(
      `📦 Project "${project.name}" created by ${currentUser.username}`,
    );

    // Phase 3.1: 自动创建Repository和默认分支
    // Pass currentUser to ensure Git commit uses real user information (not "System")
    try {
      await this.repositoriesService.createRepository(project.id, currentUser);
      this.logger.log(
        `✅ Repository with main branch auto-created for project ${project.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to create repository for project ${project.id}:`,
        error,
      );
      // 如果Repository创建失败，删除项目并抛出异常
      // RepositoriesService已清理了Repository和Branch记录，这里只需清理Project
      await this.prisma.project.delete({ where: { id: project.id } });
      throw new BadRequestException('创建项目仓库失败，请重试');
    }

    return project;
  }

  /**
   * 获取项目列表（当前用户可见的项目）
   * ECP-C3: 性能意识 - 分页查询
   */
  async findAll(
    query: QueryProjectsDto,
    currentUser: User,
  ): Promise<ProjectListResponse> {
    const { search, visibility, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      OR: [
        // 用户拥有的项目
        { ownerId: currentUser.id },
        // 用户是成员的项目
        {
          members: {
            some: {
              userId: currentUser.id,
            },
          },
        },
        // 公开项目
        { visibility: ProjectVisibility.PUBLIC },
      ],
    };

    if (search) {
      where.AND = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (visibility) {
      where.visibility = visibility;
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: { id: true, username: true },
          },
          _count: {
            select: { members: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    this.logger.log(
      `📋 Retrieved ${projects.length} projects (total: ${total})`,
    );

    return {
      projects,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取项目详情
   * ECP-C2: 系统性错误处理
   * ECP-C3: 性能意识 - Redis缓存优化
   */
  async findOne(id: string, currentUser: User): Promise<ProjectDetailResponse> {
    // ✅ Cache-Aside模式: 先检查缓存
    const cacheKey = `project:${id}:detail`;
    const cachedProject =
      await this.redisService.get<ProjectDetailResponse>(cacheKey);

    if (cachedProject) {
      this.logger.debug(`✅ Cache hit for project ${id}`);
      return cachedProject;
    }

    // Cache miss: 查询数据库
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        repository: true,
        _count: {
          select: { members: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // 填充缓存 (TTL: 300秒)
    await this.redisService.set(
      cacheKey,
      project as ProjectDetailResponse,
      300,
    );
    this.logger.debug(`📝 Cached project ${id} for 300s`);

    return project as ProjectDetailResponse;
  }

  /**
   * 更新项目
   * ECP-C1: 防御性编程 - 权限检查
   */
  async update(
    id: string,
    updateDto: UpdateProjectDto,
    currentUser: User,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // 检查名称冲突
    if (updateDto.name && updateDto.name !== project.name) {
      const existingProject = await this.prisma.project.findUnique({
        where: {
          ownerId_name: {
            ownerId: project.ownerId,
            name: updateDto.name,
          },
        },
      });

      if (existingProject) {
        throw new ConflictException('您已有同名项目');
      }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: updateDto,
    });

    // ✅ 缓存失效: 删除项目详情缓存
    await this.redisService.del(`project:${id}:detail`);

    this.logger.log(`✏️ Project ${id} updated by ${currentUser.username}`);

    return updatedProject;
  }

  /**
   * 删除项目
   * ECP-A1: 单一职责原则
   */
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    await this.prisma.project.delete({ where: { id } });

    this.logger.warn(`🗑️ Project ${id} deleted by ${currentUser.username}`);

    return { message: '项目已删除' };
  }

  /**
   * 添加项目成员
   * ECP-C1: 防御性编程 - 验证用户和角色
   */
  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
    currentUser: User,
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

    this.logger.log(
      `👥 User ${user.username} added to project ${projectId} as ${addMemberDto.role}`,
    );

    return member;
  }

  /**
   * 移除项目成员
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

    // 不能移除所有者
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

    // ✅ 缓存失效: 删除项目详情缓存和成员列表缓存
    await this.redisService.del(`project:${projectId}:detail`);
    await this.redisService.del(`project:${projectId}:members`);

    this.logger.log(`👤 User ${userId} removed from project ${projectId}`);

    return { message: '成员已移除' };
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    updateRoleDto: UpdateMemberRoleDto,
    currentUser: User,
  ): Promise<ProjectMember> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

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
      data: { role: updateRoleDto.role },
    });

    // ✅ 缓存失效: 删除项目详情缓存和成员列表缓存
    await this.redisService.del(`project:${projectId}:detail`);
    await this.redisService.del(`project:${projectId}:members`);

    this.logger.log(
      `🔄 Member ${userId} role updated to ${updateRoleDto.role} in project ${projectId}`,
    );

    return updatedMember;
  }

  /**
   * 获取项目成员列表
   * ECP-A1: 单一职责原则
   * ECP-C3: 性能意识 - Redis缓存优化
   */
  async getMembers(
    projectId: string,
    currentUser: User,
  ): Promise<
    (ProjectMember & {
      user: { id: string; username: string; email: string };
    })[]
  > {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    // ✅ Cache-Aside模式: 先检查缓存
    const cacheKey = `project:${projectId}:members`;
    const cachedMembers = await this.redisService.get<
      (ProjectMember & {
        user: { id: string; username: string; email: string };
      })[]
    >(cacheKey);

    if (cachedMembers) {
      this.logger.debug(`✅ Cache hit for project ${projectId} members`);
      return cachedMembers;
    }

    // Cache miss: 查询数据库
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // 填充缓存 (TTL: 180秒)
    await this.redisService.set(cacheKey, members, 180);
    this.logger.log(
      `👥 Retrieved ${members.length} members for project ${projectId}`,
    );

    return members;
  }

  /**
   * 归档项目
   * ECP-C1: 防御性编程 - 仅OWNER可归档
   */
  async archive(id: string, currentUser: User): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    if (project.isArchived) {
      throw new BadRequestException('项目已经归档');
    }

    const archivedProject = await this.prisma.project.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    // ✅ 缓存失效: 删除项目详情缓存
    await this.redisService.del(`project:${id}:detail`);

    this.logger.warn(`📦 Project ${id} archived by ${currentUser.username}`);

    return archivedProject;
  }

  /**
   * 取消归档项目
   * ECP-C1: 防御性编程 - 仅OWNER可取消归档
   */
  async unarchive(id: string, currentUser: User): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`项目 ID ${id} 不存在`);
    }

    // 权限检查已由ProjectRoleGuard处理

    if (!project.isArchived) {
      throw new BadRequestException('项目未归档');
    }

    const unarchivedProject = await this.prisma.project.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    // ✅ 缓存失效: 删除项目详情缓存
    await this.redisService.del(`project:${id}:detail`);

    this.logger.log(`📦 Project ${id} unarchived by ${currentUser.username}`);

    return unarchivedProject;
  }
}
