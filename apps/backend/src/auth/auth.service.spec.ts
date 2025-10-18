/**
 * 认证服务单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 * ECP-C1: 防御性编程 - 测试边界条件和错误情况
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt at module level
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null); // username check
      mockPrismaService.user.findUnique.mockResolvedValue(null); // email check
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('accessToken')
        .mockResolvedValueOnce('refreshToken');

      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe(registerDto.username);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('当用户名已存在时应抛出 ConflictException', async () => {
      // Mock findUnique to return existing user for username check
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        '用户名已被使用',
      );
    });

    it('当邮箱已存在时应抛出 ConflictException', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // username check passes
        .mockResolvedValueOnce({ id: '1', email: registerDto.email }); // email check fails

      await expect(service.register(registerDto)).rejects.toThrow(
        '邮箱已被注册',
      );
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应该成功登录并返回令牌', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('accessToken')
        .mockResolvedValueOnce('refreshToken');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe(user.username);
      expect(result.user).not.toHaveProperty('passwordHash');
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
      const payload = {
        sub: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('newAccessToken');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('newAccessToken');
    });

    it('应该在刷新令牌无效时抛出 UnauthorizedException', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      const payload = {
        sub: '999',
        username: 'nonexistent',
        email: 'test@test.com',
        role: 'USER',
      };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        '用户不存在',
      );
    });
  });
});
