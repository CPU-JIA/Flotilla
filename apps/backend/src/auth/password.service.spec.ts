/**
 * PasswordService Unit Tests
 * 测试覆盖：密码重置、Token验证、密码历史检查
 *
 * 测试场景：
 * - 忘记密码（发送重置邮件）
 * - 密码重置Token过期验证
 * - 密码历史检查（防止重用）
 * - 重置Token验证
 * - 测试API安全限制
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordService, TokenValidationResult } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;

  // Mock 用户数据
  const mockUser = {
    id: 'user-id-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'old-hashed-password',
    passwordResetToken: 'valid-reset-token-12345678901234567890',
    passwordResetExpires: new Date(Date.now() + 3600000), // 1小时后过期
    tokenVersion: 1,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    // 重置环境变量
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue({
        success: true,
      });

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toBe('如果该邮箱已注册，您将收到密码重置邮件');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',
        expect.any(String),
      );
    });

    it('should return same message for non-existent user (prevent email enumeration)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      // 安全：即使用户不存在也返回相同消息
      expect(result.message).toBe('如果该邮箱已注册，您将收到密码重置邮件');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when email sending fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue({
        success: false,
      });

      await expect(service.forgotPassword('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate reset token with 1 hour expiry', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue({
        success: true,
      });

      const beforeCall = Date.now();
      await service.forgotPassword('test@example.com');

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const expiresAt = updateCall.data.passwordResetExpires.getTime();

      // 验证过期时间约为1小时后
      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + 3600000 - 1000);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600000 + 1000);
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    });

    it('should reset password successfully with valid token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordHistory.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          passwordHistory: {
            create: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn(),
          },
          user: {
            update: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      const result = await service.resetPassword(
        'valid-reset-token-12345678901234567890',
        'NewSecurePassword123!',
      );

      expect(result.message).toBe('密码重置成功，请使用新密码登录');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePassword123!', 12);
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const expiredUser = {
        ...mockUser,
        passwordResetExpires: new Date(Date.now() - 3600000), // 1小时前过期
      };
      mockPrismaService.user.findUnique.mockResolvedValue(expiredUser);

      await expect(
        service.resetPassword(
          'valid-reset-token-12345678901234567890',
          'NewPassword123!',
        ),
      ).rejects.toThrow('重置链接已过期，请重新申请密码重置');
    });

    it('should reject password that matches recent history', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordHistory.findMany.mockResolvedValue([
        { id: 'history-1', passwordHash: 'old-hash-1', createdAt: new Date() },
        { id: 'history-2', passwordHash: 'old-hash-2', createdAt: new Date() },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // 匹配历史密码

      await expect(
        service.resetPassword(
          'valid-reset-token-12345678901234567890',
          'ReusedPassword123!',
        ),
      ).rejects.toThrow('新密码不能与最近使用的3次密码相同');
    });

    it('should increment tokenVersion after password reset', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordHistory.findMany.mockResolvedValue([]);

      let capturedUserUpdate: any = null;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          passwordHistory: {
            create: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn(),
          },
          user: {
            update: jest.fn().mockImplementation((args) => {
              capturedUserUpdate = args;
            }),
          },
        };
        return callback(mockTx);
      });

      await service.resetPassword(
        'valid-reset-token-12345678901234567890',
        'NewPassword123!',
      );

      // 验证tokenVersion递增
      expect(capturedUserUpdate.data.tokenVersion).toEqual({ increment: 1 });
      // 验证重置token被清除
      expect(capturedUserUpdate.data.passwordResetToken).toBeNull();
      expect(capturedUserUpdate.data.passwordResetExpires).toBeNull();
    });
  });

  describe('verifyResetToken', () => {
    it('should return valid for unexpired token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordResetExpires: new Date(Date.now() + 3600000),
      });

      const result = await service.verifyResetToken(
        'valid-reset-token-12345678901234567890',
      );

      expect(result.valid).toBe(true);
      expect(result.message).toBe('重置链接有效');
    });

    it('should return invalid for short token format', async () => {
      const result = await service.verifyResetToken('short');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('无效的重置链接格式');
    });

    it('should return invalid for non-existent token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.verifyResetToken(
        'nonexistent-token-12345678901234567890',
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('重置链接不存在或已被使用');
    });

    it('should return invalid for expired token with expiry info', async () => {
      const expiredDate = new Date(Date.now() - 3600000);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordResetExpires: expiredDate,
      });

      const result = await service.verifyResetToken(
        'expired-token-12345678901234567890',
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('重置链接已过期（有效期1小时）');
      expect(result.expiresAt).toEqual(expiredDate);
    });
  });

  describe('getResetTokenForTest', () => {
    it('should return token in test environment', async () => {
      process.env.NODE_ENV = 'test';
      mockPrismaService.user.findUnique.mockResolvedValue({
        passwordResetToken: 'test-token-123',
        passwordResetExpires: new Date(),
      });

      const result = await service.getResetTokenForTest('test@example.com');

      expect(result.token).toBe('test-token-123');
    });

    it('should throw BadRequestException in production environment', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        service.getResetTokenForTest('test@example.com'),
      ).rejects.toThrow('Test API is disabled in production environment');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      process.env.NODE_ENV = 'test';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getResetTokenForTest('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Password History Check (via resetPassword)', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    });

    it('should allow password not in history', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordHistory.findMany.mockResolvedValue([
        { id: 'h1', passwordHash: 'hash1', createdAt: new Date() },
        { id: 'h2', passwordHash: 'hash2', createdAt: new Date() },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // 不匹配任何历史

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          passwordHistory: {
            create: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn(),
          },
          user: { update: jest.fn() },
        };
        return callback(mockTx);
      });

      const result = await service.resetPassword(
        'valid-reset-token-12345678901234567890',
        'BrandNewPassword123!',
      );

      expect(result.message).toBe('密码重置成功，请使用新密码登录');
    });

    it('should check only last 3 passwords in history', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordHistory.findMany.mockResolvedValue([
        { id: 'h1', passwordHash: 'hash1', createdAt: new Date() },
        { id: 'h2', passwordHash: 'hash2', createdAt: new Date() },
        { id: 'h3', passwordHash: 'hash3', createdAt: new Date() },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          passwordHistory: {
            create: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn(),
          },
          user: { update: jest.fn() },
        };
        return callback(mockTx);
      });

      await service.resetPassword(
        'valid-reset-token-12345678901234567890',
        'NewPassword123!',
      );

      // 验证只查询最近3条历史
      expect(mockPrismaService.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    });
  });
});
