/**
 * Token Blacklist Service - 测试套件
 * 使用RedisService进行Token黑名单管理
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '../redis/redis.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: jest.Mocked<RedisService>;
  let redisStore: Map<string, string>;

  beforeEach(async () => {
    // 模拟Redis Store
    redisStore = new Map();

    // Mock Redis Service
    const mockRedisService = {
      get: jest.fn((key: string) => {
        const value = redisStore.get(key);
        return Promise.resolve(value ?? null);
      }),
      set: jest.fn((key: string, value: string, _ttl?: number) => {
        redisStore.set(key, value);
        return Promise.resolve(true);
      }),
      del: jest.fn((key: string) => {
        redisStore.delete(key);
        return Promise.resolve(true);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    redisStore.clear();
  });

  describe('addToBlacklist', () => {
    it('should add token to blacklist', async () => {
      const jti = 'test-jti-123';
      const expiresIn = 3600;

      await service.addToBlacklist(jti, expiresIn);

      expect(redisService.set).toHaveBeenCalledWith(
        'token:blacklist:test-jti-123',
        '1',
        3600,
      );
      expect(redisStore.has('token:blacklist:test-jti-123')).toBe(true);
    });

    it('should handle redis errors gracefully', async () => {
      const jti = 'test-jti-error';
      const expiresIn = 3600;

      redisService.set = jest
        .fn()
        .mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.addToBlacklist(jti, expiresIn)).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const jti = 'blacklisted-token';
      redisStore.set('token:blacklist:blacklisted-token', '1');

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith(
        'token:blacklist:blacklisted-token',
      );
    });

    it('should return false for non-blacklisted token', async () => {
      const jti = 'valid-token';

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false);
    });

    it('should return true on redis errors (fail-closed strategy)', async () => {
      const jti = 'test-token';
      redisService.get = jest.fn().mockRejectedValue(new Error('Redis down'));

      const result = await service.isBlacklisted(jti);

      // Fail-closed策略：Redis故障时视为已撤销（安全优先）
      expect(result).toBe(true);
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove token from blacklist', async () => {
      const jti = 'to-remove-token';
      redisStore.set('token:blacklist:to-remove-token', '1');

      await service.removeFromBlacklist(jti);

      expect(redisService.del).toHaveBeenCalledWith(
        'token:blacklist:to-remove-token',
      );
      expect(redisStore.has('token:blacklist:to-remove-token')).toBe(false);
    });

    it('should handle deletion errors', async () => {
      const jti = 'error-token';
      redisService.del = jest
        .fn()
        .mockRejectedValue(new Error('Delete failed'));

      await expect(service.removeFromBlacklist(jti)).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('addManyToBlacklist', () => {
    it('should batch add multiple tokens to blacklist', async () => {
      const jtis = ['token1', 'token2', 'token3'];
      const expiresIn = 3600;

      await service.addManyToBlacklist(jtis, expiresIn);

      expect(redisService.set).toHaveBeenCalledTimes(3);
      expect(redisStore.has('token:blacklist:token1')).toBe(true);
      expect(redisStore.has('token:blacklist:token2')).toBe(true);
      expect(redisStore.has('token:blacklist:token3')).toBe(true);
    });

    it('should handle empty array', async () => {
      await service.addManyToBlacklist([], 3600);

      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should propagate errors from individual adds', async () => {
      const jtis = ['token1', 'token2'];
      redisService.set = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Batch failed'));

      await expect(service.addManyToBlacklist(jtis, 3600)).rejects.toThrow(
        'Batch failed',
      );
    });
  });

  describe('getBlacklistStats', () => {
    it('should return stats object', () => {
      const stats = service.getBlacklistStats();

      expect(stats).toEqual({ count: 0 });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete token lifecycle', async () => {
      const jti = 'lifecycle-token';
      const expiresIn = 3600;

      // 1. Token initially not blacklisted
      expect(await service.isBlacklisted(jti)).toBe(false);

      // 2. Add to blacklist
      await service.addToBlacklist(jti, expiresIn);
      expect(await service.isBlacklisted(jti)).toBe(true);

      // 3. Remove from blacklist
      await service.removeFromBlacklist(jti);
      expect(await service.isBlacklisted(jti)).toBe(false);
    });

    it('should handle concurrent blacklist operations', async () => {
      const jtis = Array.from(
        { length: 10 },
        (_, i) => `concurrent-token-${i}`,
      );
      const expiresIn = 3600;

      // 并发添加
      await Promise.all(
        jtis.map((jti) => service.addToBlacklist(jti, expiresIn)),
      );

      // 验证所有Token都已加入黑名单
      const results = await Promise.all(
        jtis.map((jti) => service.isBlacklisted(jti)),
      );
      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in jti', async () => {
      const jti = 'token-with-special-chars-!@#$%^&*()';
      const expiresIn = 3600;

      await service.addToBlacklist(jti, expiresIn);
      expect(await service.isBlacklisted(jti)).toBe(true);
    });

    it('should handle very short TTL', async () => {
      const jti = 'short-ttl-token';
      const expiresIn = 1; // 1秒

      await service.addToBlacklist(jti, expiresIn);
      expect(await service.isBlacklisted(jti)).toBe(true);
    });

    it('should handle very long TTL', async () => {
      const jti = 'long-ttl-token';
      const expiresIn = 2592000; // 30天

      await service.addToBlacklist(jti, expiresIn);
      expect(await service.isBlacklisted(jti)).toBe(true);
    });
  });
});
