import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';

describe('OAuthService', () => {
  let service: OAuthService;
  let _prisma: PrismaService;
  let _tokenService: TokenService;

  // 设置测试环境变量
  beforeAll(() => {
    process.env.OAUTH_ENCRYPTION_KEY = 'test-oauth-encryption-key-32chars!';
  });

  const mockPrisma = {
    oAuthAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTokenService = {
    generateTokens: jest.fn(),
  };

  const mockGithubProfile: OAuthProfileDto = {
    provider: 'github',
    providerId: 'github123',
    email: 'test@example.com',
    displayName: 'Test User',
    username: 'testuser',
    avatar: 'https://avatar.url',
    accessToken: 'github_access_token',
    refreshToken: 'github_refresh_token',
    scope: 'user:email',
    metadata: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    _prisma = module.get<PrismaService>(PrismaService);
    _tokenService = module.get<TokenService>(TokenService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('loginWithOAuth', () => {
    it('should login with existing OAuth account', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER',
        avatar: 'https://avatar.url',
        tokenVersion: 0,
      };

      const mockOAuth = {
        id: 'oauth1',
        userId: 'user1',
        provider: 'github',
        providerId: 'github123',
        user: mockUser,
      };

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(mockOAuth);
      mockPrisma.oAuthAccount.update.mockResolvedValue(mockOAuth);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const result = await service.loginWithOAuth(mockGithubProfile);

      expect(result).toEqual({
        user: {
          id: 'user1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'USER',
          avatar: 'https://avatar.url',
        },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(mockPrisma.oAuthAccount.update).toHaveBeenCalled();
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
    });

    it('should throw error when email exists but not linked', async () => {
      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
      });

      await expect(service.loginWithOAuth(mockGithubProfile)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.loginWithOAuth(mockGithubProfile)).rejects.toThrow(
        'Email test@example.com is already registered',
      );
    });

    it('should create new user when email does not exist', async () => {
      const mockNewUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER',
        avatar: 'https://avatar.url',
        tokenVersion: 0,
      };

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username uniqueness check
      mockPrisma.user.create.mockResolvedValue(mockNewUser);
      mockTokenService.generateTokens.mockResolvedValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const result = await service.loginWithOAuth(mockGithubProfile);

      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('linkOAuthToUser', () => {
    it('should link OAuth account to user', async () => {
      const userId = 'user1';

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.oAuthAccount.findFirst.mockResolvedValue(null);
      mockPrisma.oAuthAccount.create.mockResolvedValue({
        id: 'oauth1',
        userId,
        provider: 'github',
        providerId: 'github123',
      });

      const result = await service.linkOAuthToUser(userId, mockGithubProfile);

      expect(result.userId).toBe(userId);
      expect(result.provider).toBe('github');
      expect(mockPrisma.oAuthAccount.create).toHaveBeenCalled();
    });

    it('should throw error when OAuth already linked to another user', async () => {
      const userId = 'user1';

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth1',
        userId: 'user2', // Different user
        provider: 'github',
        providerId: 'github123',
      });

      await expect(
        service.linkOAuthToUser(userId, mockGithubProfile),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.linkOAuthToUser(userId, mockGithubProfile),
      ).rejects.toThrow('already linked to another user');
    });

    it('should throw error when user already linked same provider', async () => {
      const userId = 'user1';

      mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
      mockPrisma.oAuthAccount.findFirst.mockResolvedValue({
        id: 'oauth1',
        userId,
        provider: 'github',
        providerId: 'github456', // Different account
      });

      await expect(
        service.linkOAuthToUser(userId, mockGithubProfile),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.linkOAuthToUser(userId, mockGithubProfile),
      ).rejects.toThrow('already linked a github account');
    });
  });

  describe('unlinkOAuth', () => {
    it('should unlink OAuth account', async () => {
      const userId = 'user1';
      const provider = 'github';

      mockPrisma.oAuthAccount.findFirst.mockResolvedValue({
        id: 'oauth1',
        userId,
        provider,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: 'hashed_password', // User has password
      });
      mockPrisma.oAuthAccount.count.mockResolvedValue(2); // Multiple OAuth accounts
      mockPrisma.oAuthAccount.delete.mockResolvedValue({
        id: 'oauth1',
      });

      const result = await service.unlinkOAuth(userId, provider);

      expect(mockPrisma.oAuthAccount.delete).toHaveBeenCalled();
      expect(result.id).toBe('oauth1');
    });

    it('should throw error when OAuth not found', async () => {
      const userId = 'user1';
      const provider = 'github';

      mockPrisma.oAuthAccount.findFirst.mockResolvedValue(null);

      await expect(service.unlinkOAuth(userId, provider)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when unlinking last login method', async () => {
      const userId = 'user1';
      const provider = 'github';

      mockPrisma.oAuthAccount.findFirst.mockResolvedValue({
        id: 'oauth1',
        userId,
        provider,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHash: '', // No password
      });
      mockPrisma.oAuthAccount.count.mockResolvedValue(1); // Only one OAuth

      await expect(service.unlinkOAuth(userId, provider)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.unlinkOAuth(userId, provider)).rejects.toThrow(
        'Cannot unlink the last login method',
      );
    });
  });

  describe('getUserOAuthAccounts', () => {
    it('should return user OAuth accounts', async () => {
      const userId = 'user1';
      const mockAccounts = [
        {
          id: 'oauth1',
          provider: 'github',
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: new Date(),
        },
        {
          id: 'oauth2',
          provider: 'google',
          email: 'test@gmail.com',
          displayName: 'Test User',
          createdAt: new Date(),
        },
      ];

      mockPrisma.oAuthAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getUserOAuthAccounts(userId);

      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(2);
      expect(mockPrisma.oAuthAccount.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: expect.objectContaining({
          id: true,
          provider: true,
          email: true,
          displayName: true,
          createdAt: true,
        }),
      });
    });
  });
});
