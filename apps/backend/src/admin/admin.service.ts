import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  AdminQueryUsersDto,
  UpdateUserRoleDto,
  ToggleUserActiveDto,
} from './dto';
import { UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * 管理员服务
 * ECP-A1: 单一职责 - 处理管理员相关的业务逻辑
 * ECP-C1: 防御性编程 - 输入验证和错误处理
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新用户
   * ECP-C1: 防御性编程 - 输入验证和错误处理
   */
  async createUser(dto: CreateUserDto) {
    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash: hashedPassword,
        role: (dto.role as UserRole) || UserRole.USER,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * 获取所有用户列表（分页）
   * ECP-C2: 系统化错误处理
   */
  async getAllUsers(query: AdminQueryUsersDto) {
    const { page = 1, pageSize = 20, search, role, isActive } = query;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 获取总数
    const total = await this.prisma.user.count({ where });

    // 获取用户列表
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedProjects: true,
            projectMembers: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取用户详情
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ownedProjects: {
          select: {
            id: true,
            name: true,
            visibility: true,
            createdAt: true,
          },
        },
        projectMembers: {
          select: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            role: true,
            joinedAt: true,
          },
        },
        commits: {
          select: {
            id: true,
            message: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 更新用户角色
   * ECP-C1: 防御性编程 - 不允许修改最后一个超级管理员
   */
  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 不允许修改自己的角色
    if (userId === adminId) {
      throw new BadRequestException('不能修改自己的角色');
    }

    // 如果要降级超级管理员，检查是否是最后一个
    if (
      user.role === UserRole.SUPER_ADMIN &&
      dto.role !== UserRole.SUPER_ADMIN
    ) {
      const superAdminCount = await this.prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException('不能移除最后一个超级管理员');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 切换用户激活状态（封禁/解封）
   * ECP-C1: 防御性编程 - 不允许封禁自己和最后一个超级管理员
   */
  async toggleUserActive(
    userId: string,
    dto: ToggleUserActiveDto,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 不允许封禁自己
    if (userId === adminId) {
      throw new BadRequestException('不能封禁自己');
    }

    // 如果要封禁超级管理员，检查是否是最后一个
    if (user.role === UserRole.SUPER_ADMIN && !dto.isActive) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: {
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException('不能封禁最后一个激活的超级管理员');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 删除用户
   * ECP-C1: 防御性编程 - 不允许删除自己和最后一个超级管理员
   */
  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 不允许删除自己
    if (userId === adminId) {
      throw new BadRequestException('不能删除自己');
    }

    // 如果要删除超级管理员，检查是否是最后一个
    if (user.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException('不能删除最后一个超级管理员');
      }
    }

    // 删除用户（由于设置了 Cascade，相关数据会自动删除）
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: '用户已删除' };
  }

  /**
   * 获取所有项目列表（管理员视图）
   */
  async getAllProjects(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
  ) {
    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.project.count({ where });

    const projects = await this.prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    return {
      projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 删除项目（管理员强制删除）
   */
  async deleteProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { message: '项目已删除' };
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      publicProjects,
      privateProjects,
      totalCommits,
      superAdmins,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { visibility: 'PUBLIC' } }),
      this.prisma.project.count({ where: { visibility: 'PRIVATE' } }),
      this.prisma.commit.count(),
      this.prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
    ]);

    // 获取最近注册的用户
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // 获取最近创建的项目
    const recentProjects = await this.prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            username: true,
          },
        },
        createdAt: true,
      },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        superAdmins,
        admins: 0, // ADMIN角色已移除，保留字段兼容前端
        regularUsers: totalUsers - superAdmins,
      },
      projects: {
        total: totalProjects,
        public: publicProjects,
        private: privateProjects,
      },
      commits: {
        total: totalCommits,
      },
      recent: {
        users: recentUsers,
        projects: recentProjects,
      },
    };
  }
}
