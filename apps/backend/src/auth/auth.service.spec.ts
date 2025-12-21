/**
 * 认证服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 * ECP-C1: 防御性编程 - 测试边界条件和错误情况
 * P1-2: SOLID - 职责分离后的测试更新
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt at module level
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(), // 🔐 Bootstrap Admin: 支持user.count()调用
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
    },
    userSession: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  };

  // P1-2: Mock for new specialized services
  const mockTokenService = {
    generateTokens: jest.fn().mockResolvedValue({
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    }),
    refreshTokens: jest.fn(),
    verifyAccessToken: jest.fn(),
    decodeToken: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue(undefined),
    getUserSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue({ message: '设备已登出成功' }),
    revokeAllSessions: jest.fn().mockResolvedValue(1),
    parseExpiration: jest.fn().mockReturnValue(30 * 24 * 60 * 60 * 1000),
    parseUserAgent: jest.fn().mockReturnValue({
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
    }),
  };

  const mockPasswordService = {
    forgotPassword: jest
      .fn()
      .mockResolvedValue({ message: '如果该邮箱已注册，您将收到密码重置邮件' }),
    resetPassword: jest
      .fn()
      .mockResolvedValue({ message: '密码重置成功，请使用新密码登录' }),
    verifyResetToken: jest
      .fn()
      .mockResolvedValue({ valid: true, message: '重置链接有效' }),
    getResetTokenForTest: jest.fn(),
  };

  const mockEmailVerificationService = {
    verifyEmail: jest.fn().mockResolvedValue({ message: '邮箱验证成功！' }),
    resendVerificationEmail: jest
      .fn()
      .mockResolvedValue({ message: '验证邮件已发送，请检查您的邮箱' }),
    verifyEmailToken: jest
      .fn()
      .mockResolvedValue({ valid: true, message: '验证链接有效' }),
    getEmailTokenForTest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        // P1-2: Add new specialized service providers
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    // 🔐 Bootstrap Admin: 默认返回1表示有用户存在,不触发首个用户自动提升
    mockPrismaService.user.count.mockResolvedValue(1);
    // Reset mock implementations for new services
    mockTokenService.generateTokens.mockResolvedValue({
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    });
  });

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined();
  });

  describe('register - 用户注册', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('应该成功注册新用户并返回令牌', async () => {
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: '1',
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: hashedPassword,
        role: UserRole.USER,
        avatar: null,
        bio: null,
        isActive: true,
        tokenVersion: 0,
        emailVerified: false,
        emailVerifyToken: 'verify-token-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null); // username check
      mockPrismaService.user.findUnique.mockResolvedValue(null); // email check
      mockPrismaService.user.count.mockResolvedValue(1); // Not first user
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.organization.create.mockResolvedValue({
        id: 'org-1',
        name: `${createdUser.username}'s Organization`,
        slug: `user-${createdUser.username}`,
      });
      mockPrismaService.organizationMember.create.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: createdUser.id,
        role: 'OWNER',
      });
      // P1-2: Now using TokenService instead of JwtService directly
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe(registerDto.username);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
    });

    it('当用户名已存在时应抛出 ConflictException', async () => {
      // Mock findUnique to return existing user for username check
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        '用户名或邮箱已被使用',
      );
    });

    it('当邮箱已存在时应抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // username check passes
        .mockResolvedValueOnce({ id: '1', email: registerDto.email }); // email check fails

      await expect(service.register(registerDto)).rejects.toThrow(
        '用户名或邮箱已被使用',
      );
    });

    it('🔐 Bootstrap Admin: 首个用户应自动提升为SUPER_ADMIN', async () => {
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: '1',
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: hashedPassword,
        role: UserRole.SUPER_ADMIN, // 期望首个用户为SUPER_ADMIN
        avatar: null,
        bio: null,
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 模拟数据库为空(首个用户)
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue(null); // username check
      mockPrismaService.user.findUnique.mockResolvedValue(null); // email check
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.organization.create.mockResolvedValue({
        id: 'org-1',
        name: `${createdUser.username}'s Organization`,
        slug: `user-${createdUser.username}`,
      });
      mockPrismaService.organizationMember.create.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: createdUser.id,
        role: 'OWNER',
      });
      // P1-2: Now using TokenService instead of JwtService directly
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.register(registerDto);

      // 验证create被调用时传入的role是SUPER_ADMIN
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.SUPER_ADMIN,
        }),
      });
      expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
    });
  });

  describe('login - 用户登录', () => {
    const loginDto = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };

    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      avatar: null,
      bio: null,
      isActive: true,
      tokenVersion: 0,
      emailVerified: true, // 🔐 Required for login to succeed
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应该成功登录并返回令牌', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // P1-2: Now using TokenService instead of JwtService directly
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe(user.username);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误');
    });

    it('应该在密码错误时抛出 UnauthorizedException', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('validateUser - 用户验证', () => {
    const userId = '1';
    const user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      avatar: null,
      bio: null,
      isActive: true,
      tokenVersion: 0,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应该成功返回用户信息（不包含密码）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser(userId);

      expect(result).toBeDefined();
      expect(result.username).toBe(user.username);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('999')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser('999')).rejects.toThrow('用户不存在');
    });
  });

  describe('refreshTokens - 刷新令牌', () => {
    const refreshToken = 'validRefreshToken';

    it('应该成功刷新访问令牌', async () => {
      // P1-2: Now delegating to TokenService
      mockTokenService.refreshTokens.mockResolvedValue({
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      });

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('newAccessToken');
      expect(mockTokenService.refreshTokens).toHaveBeenCalledWith(refreshToken);
    });

    it('应该在刷新令牌无效时抛出 UnauthorizedException', async () => {
      mockTokenService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      mockTokenService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('用户不存在'),
      );

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        '用户不存在',
      );
    });
  });
});
