import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { GitHttpAuthGuard } from './git-http-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, MemberRole, ProjectVisibility } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createMockUser, MockUser } from '../../test-utils/mock-user';

/**
 * Git HTTP Auth Guard 单元测试
 *
 * ECP-B4: Context-Aware TDD - 关键安全组件必须有测试覆盖
 * 🔒 SECURITY TEST: 验证 Git HTTP 认证和权限控制
 */
describe('GitHttpAuthGuard', () => {
  let guard: GitHttpAuthGuard;
  let prismaService: PrismaService;

  // Mock数据 - passwordHash 将在 beforeEach 中设置
  let mockUser: MockUser;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    ownerId: 'owner-1',
    visibility: ProjectVisibility.PRIVATE,
    members: [],
  };

  beforeEach(async () => {
    // 生成密码hash (password: 'testpass123')
    const passwordHash = await bcrypt.hash('testpass123', 12);

    // 使用 createMockUser 初始化 mockUser
    mockUser = createMockUser({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHttpAuthGuard,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn() as any,
            },
            project: {
              findUnique: jest.fn() as any,
            },
          },
        },
      ],
    }).compile();

    guard = module.get<GitHttpAuthGuard>(GitHttpAuthGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  /**
   * 创建Mock ExecutionContext
   */
  function createMockContext(
    authHeader?: string,
    projectId?: string,
    path?: string,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
          params: {
            projectId,
          },
          path: path || '/repo/project-1/info/refs',
        }),
      }),
    } as ExecutionContext;
  }

  describe('Basic Auth 解析', () => {
    it('应该拒绝缺少 Authorization header 的请求', async () => {
      const context = createMockContext(undefined, 'project-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication required for Git operations',
      );
    });

    it('应该拒绝无效的 Basic Auth 格式', async () => {
      const context = createMockContext('InvalidFormat', 'project-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('应该拒绝无效的 Base64 编码', async () => {
      const context = createMockContext('Basic invalid!!!base64', 'project-1');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('应该拒绝缺少 projectId 的请求', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Project ID is required',
      );
    });
  });

  describe('用户凭据验证', () => {
    it('应该接受正确的用户名和密码', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      // Mock Prisma查询
      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'testuser') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id, // 用户是项目所有者
        members: [],
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('应该接受邮箱登录', async () => {
      const validAuth =
        'Basic ' +
        Buffer.from('test@example.com:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      // Mock Prisma查询 (username查询返回null, email查询返回用户)
      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.email === 'test@example.com') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id,
        members: [],
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const invalidAuth =
        'Basic ' + Buffer.from('testuser:wrongpassword').toString('base64');
      const context = createMockContext(invalidAuth, 'project-1');

      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'testuser') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid username or password',
      );
    });

    it('应该拒绝不存在的用户', async () => {
      const validAuth =
        'Basic ' + Buffer.from('nonexistent:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('应该拒绝被禁用的用户', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        isActive: false, // 用户被禁用
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('项目权限检查', () => {
    beforeEach(() => {
      const _validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'testuser') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });
    });

    it('SUPER_ADMIN 应该bypass所有权限检查', async () => {
      const validAuth =
        'Basic ' + Buffer.from('admin:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-receive-pack',
      );

      const adminUser = {
        ...mockUser,
        username: 'admin',
        role: UserRole.SUPER_ADMIN,
      };

      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'admin') {
          return Promise.resolve(adminUser as any);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: 'other-user', // Admin不是所有者
        members: [], // Admin不是成员
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('Public项目应该允许任何人读取', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-upload-pack',
      );

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        visibility: ProjectVisibility.PUBLIC, // Public项目
        ownerId: 'other-user',
        members: [],
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('项目所有者应该有写权限', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-receive-pack',
      );

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id, // 用户是所有者
        members: [],
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('MEMBER 应该有写权限', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-receive-pack',
      );

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: 'owner-1',
        members: [
          {
            userId: mockUser.id,
            role: MemberRole.MEMBER,
          },
        ],
      } as any);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('VIEWER 应该只有读权限', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');

      // 读取操作应该成功
      const readContext = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-upload-pack',
      );

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: 'owner-1',
        members: [
          {
            userId: mockUser.id,
            role: MemberRole.VIEWER,
          },
        ],
      } as any);

      const readResult = await guard.canActivate(readContext);
      expect(readResult).toBe(true);

      // 写入操作应该失败
      const writeContext = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-receive-pack',
      );

      await expect(guard.canActivate(writeContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(writeContext)).rejects.toThrow(
        "You don't have write permission for this repository",
      );
    });

    it('非成员应该被拒绝访问私有项目', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        visibility: ProjectVisibility.PRIVATE,
        ownerId: 'other-user',
        members: [], // 用户不是成员
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('不存在的项目应该返回403', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'nonexistent-project');

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('操作类型识别', () => {
    beforeEach(() => {
      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'testuser') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id,
        members: [],
      } as any);
    });

    it('git-upload-pack 应该识别为read操作', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-upload-pack',
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('git-receive-pack 应该识别为write操作', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/git-receive-pack',
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('info/refs 应该识别为read操作', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(
        validAuth,
        'project-1',
        '/repo/project-1/info/refs',
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('安全特性', () => {
    it('应该防止时序攻击 (并行查询用户名和邮箱)', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      const findUniqueSpy = jest.spyOn(prismaService.user, 'findUnique');
      findUniqueSpy.mockResolvedValue(mockUser as any);

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id,
        members: [],
      } as any);

      await guard.canActivate(context);

      // 验证并行查询 (应该调用2次: username和email)
      expect(findUniqueSpy).toHaveBeenCalledTimes(2);
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: 'testuser' },
      });
    });

    it('应该记录认证成功日志', async () => {
      const validAuth =
        'Basic ' + Buffer.from('testuser:testpass123').toString('base64');
      const context = createMockContext(validAuth, 'project-1');

      (
        jest.spyOn(prismaService.user, 'findUnique') as jest.Mock
      ).mockImplementation((args: any) => {
        if (args.where.username === 'testuser') {
          return Promise.resolve(mockUser as any);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(prismaService.project, 'findUnique').mockResolvedValue({
        ...mockProject,
        ownerId: mockUser.id,
        members: [],
      } as any);

      const logSpy = jest.spyOn(guard['logger'], 'log');

      await guard.canActivate(context);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Git HTTP auth success: testuser'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Git HTTP permission granted'),
      );
    });
  });
});
