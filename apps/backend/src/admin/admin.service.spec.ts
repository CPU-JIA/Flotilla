/**
 * 管理员服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 *
 * 测试覆盖:
 * - 用户管理功能 (CRUD)
 * - 角色变更权限检查
 * - 用户禁用/启用操作
 * - 分页查询
 * - 系统统计
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  createMockUser,
  mockAdminUser as _mockAdminUser,
} from '../test-utils/mock-user';

// Mock bcrypt at module level
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('AdminService', () => {
  let service: AdminService;

  // Mock PrismaService with all required methods
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    commit: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // createUser - 创建用户测试
  // ============================================
  describe('createUser - 创建用户', () => {
    const createUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    };

    it('应该成功创建新用户', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const createdUser = {
        id: 'new-user-id',
        username: createUserDto.username,
        email: createUserDto.email,
        avatar: null,
        bio: null,
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await service.createUser(createUserDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.username).toBe(createUserDto.username);
      expect(result.email).toBe(createUserDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('应该在用户名已存在时抛出 ConflictException', async () => {
      // Arrange
      const existingUser = createMockUser({ username: createUserDto.username });
      mockPrismaService.user.findUnique.mockResolvedValueOnce(existingUser);

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new ConflictException('用户名已被使用'),
      );
    });

    it('应该在邮箱已存在时抛出 ConflictException', async () => {
      // Arrange
      const existingUser = createMockUser({ email: createUserDto.email });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // username check - not found
        .mockResolvedValueOnce(existingUser); // email check - found

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new ConflictException('邮箱已被注册'),
      );
    });

    it('应该使用默认角色 USER 当未指定角色时', async () => {
      // Arrange
      const dtoWithoutRole = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const createdUser = {
        id: 'new-user-id',
        username: dtoWithoutRole.username,
        email: dtoWithoutRole.email,
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      // Act
      await service.createUser(dtoWithoutRole as any);

      // Assert
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.USER,
          }),
        }),
      );
    });
  });

  // ============================================
  // getAllUsers - 获取用户列表测试
  // ============================================
  describe('getAllUsers - 获取用户列表（分页）', () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', username: 'user1' }),
      createMockUser({ id: 'user-2', username: 'user2' }),
      createMockUser({ id: 'user-3', username: 'user3' }),
    ];

    it('应该返回分页的用户列表', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(3);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.getAllUsers({ page: 1, pageSize: 10 });

      // Assert
      expect(result.users).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应该正确计算分页参数', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(50);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.getAllUsers({ page: 2, pageSize: 20 });

      // Assert
      expect(result.totalPages).toBe(3); // 50 / 20 = 2.5 -> 3
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2 - 1) * 20
          take: 20,
        }),
      );
    });

    it('应该支持搜索功能', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);

      // Act
      const result = await service.getAllUsers({
        page: 1,
        pageSize: 10,
        search: 'user1',
      });

      // Assert
      expect(result.users).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                username: { contains: 'user1', mode: 'insensitive' },
              }),
              expect.objectContaining({
                email: { contains: 'user1', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('应该支持按角色筛选', async () => {
      // Arrange
      const adminUser = createMockUser({
        id: 'admin-1',
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.user.findMany.mockResolvedValue([adminUser]);

      // Act
      const result = await service.getAllUsers({
        page: 1,
        pageSize: 10,
        role: UserRole.SUPER_ADMIN,
      });

      // Assert
      expect(result.users).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.SUPER_ADMIN,
          }),
        }),
      );
    });

    it('应该支持按激活状态筛选', async () => {
      // Arrange
      const activeUsers = mockUsers.filter((u) => u.isActive);
      mockPrismaService.user.count.mockResolvedValue(activeUsers.length);
      mockPrismaService.user.findMany.mockResolvedValue(activeUsers);

      // Act
      const result = await service.getAllUsers({
        page: 1,
        pageSize: 10,
        isActive: true,
      });

      // Assert
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('应该使用默认分页参数', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAllUsers({});

      // Assert
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  // ============================================
  // getUserById - 获取用户详情测试
  // ============================================
  describe('getUserById - 获取用户详情', () => {
    it('应该成功返回用户详情', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-1' });
      const userWithRelations = {
        ...user,
        ownedProjects: [],
        projectMembers: [],
        commits: [],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithRelations);

      // Act
      const result = await service.getUserById('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        }),
      );
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserById('non-existent')).rejects.toThrow(
        '用户不存在',
      );
    });
  });

  // ============================================
  // updateUserRole - 更新用户角色测试
  // ============================================
  describe('updateUserRole - 更新用户角色', () => {
    const adminId = 'admin-1';
    const targetUserId = 'user-1';

    it('应该成功更新用户角色', async () => {
      // Arrange
      const targetUser = createMockUser({
        id: targetUserId,
        role: UserRole.USER,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(targetUser);

      const updatedUser = { ...targetUser, role: UserRole.SUPER_ADMIN };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUserRole(
        targetUserId,
        { role: UserRole.SUPER_ADMIN },
        adminId,
      );

      // Assert
      expect(result.role).toBe(UserRole.SUPER_ADMIN);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: { role: UserRole.SUPER_ADMIN },
        }),
      );
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateUserRole(
          targetUserId,
          { role: UserRole.SUPER_ADMIN },
          adminId,
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateUserRole(
          targetUserId,
          { role: UserRole.SUPER_ADMIN },
          adminId,
        ),
      ).rejects.toThrow('用户不存在');
    });

    it('应该禁止修改自己的角色', async () => {
      // Arrange
      const admin = createMockUser({
        id: adminId,
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(admin);

      // Act & Assert - 管理员尝试修改自己的角色
      await expect(
        service.updateUserRole(adminId, { role: UserRole.USER }, adminId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateUserRole(adminId, { role: UserRole.USER }, adminId),
      ).rejects.toThrow('不能修改自己的角色');
    });

    it('应该禁止降级最后一个超级管理员', async () => {
      // Arrange
      const lastSuperAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(lastSuperAdmin);
      mockPrismaService.user.count.mockResolvedValue(1); // 只有一个超级管理员

      // Act & Assert
      await expect(
        service.updateUserRole(targetUserId, { role: UserRole.USER }, adminId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateUserRole(targetUserId, { role: UserRole.USER }, adminId),
      ).rejects.toThrow('不能移除最后一个超级管理员');
    });

    it('应该允许降级超级管理员当存在多个时', async () => {
      // Arrange
      const superAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(superAdmin);
      mockPrismaService.user.count.mockResolvedValue(2); // 存在多个超级管理员

      const updatedUser = { ...superAdmin, role: UserRole.USER };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUserRole(
        targetUserId,
        { role: UserRole.USER },
        adminId,
      );

      // Assert
      expect(result.role).toBe(UserRole.USER);
    });
  });

  // ============================================
  // toggleUserActive - 切换用户激活状态测试
  // ============================================
  describe('toggleUserActive - 切换用户激活状态（封禁/解封）', () => {
    const adminId = 'admin-1';
    const targetUserId = 'user-1';

    it('应该成功禁用用户', async () => {
      // Arrange
      const activeUser = createMockUser({
        id: targetUserId,
        isActive: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(activeUser);

      const disabledUser = { ...activeUser, isActive: false };
      mockPrismaService.user.update.mockResolvedValue(disabledUser);

      // Act
      const result = await service.toggleUserActive(
        targetUserId,
        { isActive: false },
        adminId,
      );

      // Assert
      expect(result.isActive).toBe(false);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: { isActive: false },
        }),
      );
    });

    it('应该成功启用用户', async () => {
      // Arrange
      const inactiveUser = createMockUser({
        id: targetUserId,
        isActive: false,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      const enabledUser = { ...inactiveUser, isActive: true };
      mockPrismaService.user.update.mockResolvedValue(enabledUser);

      // Act
      const result = await service.toggleUserActive(
        targetUserId,
        { isActive: true },
        adminId,
      );

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.toggleUserActive(targetUserId, { isActive: false }, adminId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.toggleUserActive(targetUserId, { isActive: false }, adminId),
      ).rejects.toThrow('用户不存在');
    });

    it('应该禁止封禁自己', async () => {
      // Arrange
      const admin = createMockUser({
        id: adminId,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(admin);

      // Act & Assert
      await expect(
        service.toggleUserActive(adminId, { isActive: false }, adminId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.toggleUserActive(adminId, { isActive: false }, adminId),
      ).rejects.toThrow('不能封禁自己');
    });

    it('应该禁止封禁最后一个激活的超级管理员', async () => {
      // Arrange
      const lastActiveSuperAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(lastActiveSuperAdmin);
      mockPrismaService.user.count.mockResolvedValue(1); // 只有一个激活的超级管理员

      // Act & Assert
      await expect(
        service.toggleUserActive(targetUserId, { isActive: false }, adminId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.toggleUserActive(targetUserId, { isActive: false }, adminId),
      ).rejects.toThrow('不能封禁最后一个激活的超级管理员');
    });

    it('应该允许封禁超级管理员当存在多个激活的超级管理员时', async () => {
      // Arrange
      const superAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(superAdmin);
      mockPrismaService.user.count.mockResolvedValue(2); // 存在多个激活的超级管理员

      const disabledAdmin = { ...superAdmin, isActive: false };
      mockPrismaService.user.update.mockResolvedValue(disabledAdmin);

      // Act
      const result = await service.toggleUserActive(
        targetUserId,
        { isActive: false },
        adminId,
      );

      // Assert
      expect(result.isActive).toBe(false);
    });
  });

  // ============================================
  // deleteUser - 删除用户测试
  // ============================================
  describe('deleteUser - 删除用户', () => {
    const adminId = 'admin-1';
    const targetUserId = 'user-1';

    it('应该成功删除用户', async () => {
      // Arrange
      const targetUser = createMockUser({ id: targetUserId });
      mockPrismaService.user.findUnique.mockResolvedValue(targetUser);
      mockPrismaService.user.delete.mockResolvedValue(targetUser);

      // Act
      const result = await service.deleteUser(targetUserId, adminId);

      // Assert
      expect(result.message).toBe('用户已删除');
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: targetUserId },
      });
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteUser(targetUserId, adminId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteUser(targetUserId, adminId)).rejects.toThrow(
        '用户不存在',
      );
    });

    it('应该禁止删除自己', async () => {
      // Arrange
      const admin = createMockUser({ id: adminId });
      mockPrismaService.user.findUnique.mockResolvedValue(admin);

      // Act & Assert
      await expect(service.deleteUser(adminId, adminId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(adminId, adminId)).rejects.toThrow(
        '不能删除自己',
      );
    });

    it('应该禁止删除最后一个超级管理员', async () => {
      // Arrange
      const lastSuperAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(lastSuperAdmin);
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act & Assert
      await expect(service.deleteUser(targetUserId, adminId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(targetUserId, adminId)).rejects.toThrow(
        '不能删除最后一个超级管理员',
      );
    });

    it('应该允许删除超级管理员当存在多个时', async () => {
      // Arrange
      const superAdmin = createMockUser({
        id: targetUserId,
        role: UserRole.SUPER_ADMIN,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(superAdmin);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.user.delete.mockResolvedValue(superAdmin);

      // Act
      const result = await service.deleteUser(targetUserId, adminId);

      // Assert
      expect(result.message).toBe('用户已删除');
    });
  });

  // ============================================
  // getAllProjects - 获取项目列表测试
  // ============================================
  describe('getAllProjects - 获取项目列表（管理员视图）', () => {
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Project 1',
        description: 'Description 1',
        visibility: 'PUBLIC',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'user-1', username: 'user1', email: 'user1@example.com' },
        _count: { members: 3 },
      },
      {
        id: 'project-2',
        name: 'Project 2',
        description: 'Description 2',
        visibility: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'user-2', username: 'user2', email: 'user2@example.com' },
        _count: { members: 5 },
      },
    ];

    it('应该返回分页的项目列表', async () => {
      // Arrange
      mockPrismaService.project.count.mockResolvedValue(2);
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      // Act
      const result = await service.getAllProjects(1, 10);

      // Assert
      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('应该支持搜索功能', async () => {
      // Arrange
      mockPrismaService.project.count.mockResolvedValue(1);
      mockPrismaService.project.findMany.mockResolvedValue([mockProjects[0]]);

      // Act
      const result = await service.getAllProjects(1, 10, 'Project 1');

      // Assert
      expect(result.projects).toHaveLength(1);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ============================================
  // deleteProject - 删除项目测试
  // ============================================
  describe('deleteProject - 删除项目（管理员强制删除）', () => {
    it('应该成功删除项目', async () => {
      // Arrange
      const project = {
        id: 'project-1',
        name: 'Test Project',
      };
      mockPrismaService.project.findUnique.mockResolvedValue(project);
      mockPrismaService.project.delete.mockResolvedValue(project);

      // Act
      const result = await service.deleteProject('project-1');

      // Assert
      expect(result.message).toBe('项目已删除');
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('应该在项目不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProject('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteProject('non-existent')).rejects.toThrow(
        '项目不存在',
      );
    });
  });

  // ============================================
  // getSystemStats - 获取系统统计信息测试
  // ============================================
  describe('getSystemStats - 获取系统统计信息', () => {
    it('应该返回完整的系统统计信息', async () => {
      // Arrange
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(90) // activeUsers
        .mockResolvedValueOnce(2); // superAdmins

      mockPrismaService.project.count
        .mockResolvedValueOnce(50) // totalProjects
        .mockResolvedValueOnce(30) // publicProjects
        .mockResolvedValueOnce(20); // privateProjects

      mockPrismaService.commit.count.mockResolvedValue(500);

      const recentUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'u1@test.com',
          createdAt: new Date(),
        },
      ];
      const recentProjects = [
        {
          id: 'proj-1',
          name: 'Project1',
          owner: { username: 'user1' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(recentUsers);
      mockPrismaService.project.findMany.mockResolvedValue(recentProjects);

      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.users.total).toBe(100);
      expect(result.users.active).toBe(90);
      expect(result.users.inactive).toBe(10);
      expect(result.users.superAdmins).toBe(2);
      expect(result.projects.total).toBe(50);
      expect(result.projects.public).toBe(30);
      expect(result.projects.private).toBe(20);
      expect(result.commits.total).toBe(500);
      expect(result.recent.users).toHaveLength(1);
      expect(result.recent.projects).toHaveLength(1);
    });

    it('应该正确计算用户统计', async () => {
      // Arrange
      mockPrismaService.user.count
        .mockResolvedValueOnce(50) // totalUsers
        .mockResolvedValueOnce(45) // activeUsers
        .mockResolvedValueOnce(3); // superAdmins

      mockPrismaService.project.count.mockResolvedValue(0);
      mockPrismaService.commit.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.project.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.users.regularUsers).toBe(47); // 50 - 3
    });
  });
});
