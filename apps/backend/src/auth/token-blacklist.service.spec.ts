/**
 * Token Blacklist Service - 测试套件
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let cacheManager: Record<string, any>;
  let cacheStore: Map<string, { value: string; ttl?: number }>;

  beforeEach(async () => {
    // 模拟Cache Store
    cacheStore = new Map();

    // Mock Cache Manager
    cacheManager = {
      get: jest.fn((key: string) => {
        const item = cacheStore.get(key);
        return Promise.resolve(item?.value);
      }),
      set: jest.fn((key: string, value: string, ttl?: number) => {
        cacheStore.set(key, { value, ttl });
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        cacheStore.delete(key);
        return Promise.resolve();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    cacheStore.clear();
  });

  describe('addToBlacklist', () => {
    it('should add token to blacklist', async () => {
      const jti = 'test-jti-123';
      const expiresIn = 3600;

      await service.addToBlacklist(jti, expiresIn);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'token:blacklist:test-jti-123',
        '1',
        3600000, // 转换为毫秒
      );
      expect(cacheStore.has('token:blacklist:test-jti-123')).toBe(true);
    });

    it('should handle cache errors gracefully', async () => {
      const jti = 'test-jti-error';
      const expiresIn = 3600;

      cacheManager.set = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.addToBlacklist(jti, expiresIn)).rejects.toThrow('Redis connection failed');
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const jti = 'blacklisted-token';
      cacheStore.set('token:blacklist:blacklisted-token', { value: '1' });

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('token:blacklist:blacklisted-token');
    });

    it('should return false for non-blacklisted token', async () => {
      const jti = 'valid-token';

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false);
    });

    it('should return false on cache errors (fail-open)', async () => {
      const jti = 'test-token';
      cacheManager.get = jest.fn().mockRejectedValue(new Error('Redis down'));

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false); // Fail-open策略
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove token from blacklist', async () => {
      const jti = 'to-remove-token';
      cacheStore.set('token:blacklist:to-remove-token', { value: '1' });

      await service.removeFromBlacklist(jti);

      expect(cacheManager.del).toHaveBeenCalledWith('token:blacklist:to-remove-token');
      expect(cacheStore.has('token:blacklist:to-remove-token')).toBe(false);
    });

    it('should handle deletion errors', async () => {
      const jti = 'error-token';
      cacheManager.del = jest.fn().mockRejectedValue(new Error('Delete failed'));

      await expect(service.removeFromBlacklist(jti)).rejects.toThrow('Delete failed');
    });
  });

  describe('addManyToBlacklist', () => {
    it('should batch add multiple tokens to blacklist', async () => {
      const jtis = ['token1', 'token2', 'token3'];
      const expiresIn = 3600;

      await service.addManyToBlacklist(jtis, expiresIn);

      expect(cacheManager.set).toHaveBeenCalledTimes(3);
      expect(cacheStore.has('token:blacklist:token1')).toBe(true);
      expect(cacheStore.has('token:blacklist:token2')).toBe(true);
      expect(cacheStore.has('token:blacklist:token3')).toBe(true);
    });

    it('should handle empty array', async () => {
      await service.addManyToBlacklist([], 3600);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should propagate errors from individual adds', async () => {
      const jtis = ['token1', 'token2'];
      cacheManager.set = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Batch failed'));

      await expect(service.addManyToBlacklist(jtis, 3600)).rejects.toThrow('Batch failed');
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
      const jtis = Array.from({ length: 10 }, (_, i) => `concurrent-token-${i}`);
      const expiresIn = 3600;

      // 并发添加
      await Promise.all(jtis.map(jti => service.addToBlacklist(jti, expiresIn)));

      // 验证所有Token都已加入黑名单
      const results = await Promise.all(jtis.map(jti => service.isBlacklisted(jti)));
      expect(results.every(r => r === true)).toBe(true);
    });

    it('should use correct TTL for expiring tokens', async () => {
      const jti = 'expiring-token';
      const expiresIn = 7200; // 2小时

      await service.addToBlacklist(jti, expiresIn);

      const storedItem = cacheStore.get('token:blacklist:expiring-token');
      expect(storedItem).toBeDefined();
      expect(storedItem?.ttl).toBe(7200000); // 毫秒
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

      const storedItem = cacheStore.get('token:blacklist:long-ttl-token');
      expect(storedItem?.ttl).toBe(2592000000);
    });
  });
});
