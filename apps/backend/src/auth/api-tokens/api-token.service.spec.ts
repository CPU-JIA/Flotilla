import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ApiTokenService } from './api-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

describe('ApiTokenService', () => {
  let service: ApiTokenService;
  let prisma: PrismaService;

  const mockPrismaService = {
    apiToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ApiTokenService>(ApiTokenService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    it('should create a new API token', async () => {
      const userId = 'user123';
      const dto: CreateApiTokenDto = {
        name: 'CI/CD Token',
        scopes: ['read', 'write'],
        expiresAt: new Date('2025-12-31'),
      };

      const mockToken = {
        id: 'token123',
        userId,
        name: dto.name,
        tokenHash: 'hash123',
        tokenPrefix: 'flo_1234',
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
        lastUsedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.apiToken.create.mockResolvedValue(mockToken);

      const result = await service.createToken(userId, dto);

      expect(result).toHaveProperty('token');
      expect(result.token).toMatch(/^flo_[a-f0-9]{56}$/); // 验证令牌格式
      expect(result.token.length).toBe(60);
      expect(result.name).toBe(dto.name);
      expect(result.scopes).toEqual(dto.scopes);
      expect(prisma.apiToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: dto.name,
          tokenHash: expect.any(String),
          tokenPrefix: expect.stringMatching(/^flo_[a-f0-9]{4}$/),
          scopes: dto.scopes,
          expiresAt: dto.expiresAt,
        },
      });
    });

    it('should throw error if expiration date is in the past', async () => {
      const userId = 'user123';
      const dto: CreateApiTokenDto = {
        name: 'Expired Token',
        scopes: ['read'],
        expiresAt: new Date('2020-01-01'), // 过去的日期
      };

      await expect(service.createToken(userId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.createToken(userId, dto)).rejects.toThrow(
        '过期时间必须在未来',
      );
    });

    it('should create token without expiration date', async () => {
      const userId = 'user123';
      const dto: CreateApiTokenDto = {
        name: 'Permanent Token',
        scopes: ['read'],
      };

      const mockToken = {
        id: 'token123',
        userId,
        name: dto.name,
        tokenHash: 'hash123',
        tokenPrefix: 'flo_1234',
        scopes: dto.scopes,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.apiToken.create.mockResolvedValue(mockToken);

      const result = await service.createToken(userId, dto);

      expect(result.expiresAt).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const token = 'flo_' + '0'.repeat(56); // 有效格式
      const mockToken = {
        id: 'token123',
        userId: 'user123',
        scopes: ['read', 'write'],
        expiresAt: new Date('2025-12-31'),
      };

      mockPrismaService.apiToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.apiToken.update.mockResolvedValue({});

      const result = await service.validateToken(token);

      expect(result).toEqual({
        userId: 'user123',
        scopes: ['read', 'write'],
      });
      expect(prisma.apiToken.findUnique).toHaveBeenCalled();
    });

    it('should return null for invalid token format', async () => {
      const invalidTokens = [
        'invalid',
        'flo_short',
        'wrong_prefix' + '0'.repeat(52),
        '',
        null as any,
      ];

      for (const token of invalidTokens) {
        const result = await service.validateToken(token);
        expect(result).toBeNull();
      }

      // 不应该调用数据库
      expect(prisma.apiToken.findUnique).not.toHaveBeenCalled();
    });

    it('should return null for non-existent token', async () => {
      const token = 'flo_' + '0'.repeat(56);
      mockPrismaService.apiToken.findUnique.mockResolvedValue(null);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const token = 'flo_' + '0'.repeat(56);
      const mockToken = {
        id: 'token123',
        userId: 'user123',
        scopes: ['read'],
        expiresAt: new Date('2020-01-01'), // 过期
      };

      mockPrismaService.apiToken.findUnique.mockResolvedValue(mockToken);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should validate token without expiration', async () => {
      const token = 'flo_' + '0'.repeat(56);
      const mockToken = {
        id: 'token123',
        userId: 'user123',
        scopes: ['admin'],
        expiresAt: null, // 永不过期
      };

      mockPrismaService.apiToken.findUnique.mockResolvedValue(mockToken);
      mockPrismaService.apiToken.update.mockResolvedValue({});

      const result = await service.validateToken(token);

      expect(result).toEqual({
        userId: 'user123',
        scopes: ['admin'],
      });
    });
  });

  describe('listTokens', () => {
    it('should list all tokens for a user', async () => {
      const userId = 'user123';
      const mockTokens = [
        {
          id: 'token1',
          name: 'Token 1',
          tokenPrefix: 'flo_1234',
          scopes: ['read'],
          expiresAt: new Date('2025-12-31'),
          lastUsedAt: new Date(),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'token2',
          name: 'Token 2',
          tokenPrefix: 'flo_5678',
          scopes: ['read', 'write'],
          expiresAt: null,
          lastUsedAt: null,
          createdAt: new Date('2024-02-01'),
        },
      ];

      mockPrismaService.apiToken.findMany.mockResolvedValue(mockTokens);

      const result = await service.listTokens(userId);

      expect(result).toEqual(mockTokens);
      expect(prisma.apiToken.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          scopes: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
        },
      });
    });

    it('should return empty array if user has no tokens', async () => {
      const userId = 'user123';
      mockPrismaService.apiToken.findMany.mockResolvedValue([]);

      const result = await service.listTokens(userId);

      expect(result).toEqual([]);
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token owned by the user', async () => {
      const userId = 'user123';
      const tokenId = 'token123';
      const mockToken = {
        id: tokenId,
        userId,
        name: 'Test Token',
      };

      mockPrismaService.apiToken.findFirst.mockResolvedValue(mockToken);
      mockPrismaService.apiToken.delete.mockResolvedValue(mockToken);

      await service.revokeToken(userId, tokenId);

      expect(prisma.apiToken.findFirst).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      });
      expect(prisma.apiToken.delete).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });

    it('should throw error if token does not exist', async () => {
      const userId = 'user123';
      const tokenId = 'nonexistent';

      mockPrismaService.apiToken.findFirst.mockResolvedValue(null);

      await expect(service.revokeToken(userId, tokenId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.revokeToken(userId, tokenId)).rejects.toThrow(
        '令牌不存在或无权访问',
      );
      expect(prisma.apiToken.delete).not.toHaveBeenCalled();
    });

    it('should throw error if token belongs to another user', async () => {
      const userId = 'user123';
      const tokenId = 'token456';

      // 令牌属于其他用户
      mockPrismaService.apiToken.findFirst.mockResolvedValue(null);

      await expect(service.revokeToken(userId, tokenId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.apiToken.delete).not.toHaveBeenCalled();
    });
  });
});
