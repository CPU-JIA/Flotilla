import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis服务
 * ECP-A1: 单一职责 - 专注于Redis缓存操作
 * ECP-C1: 防御性编程 - 处理连接错误和超时
 * ECP-C4: 无状态原则 - 缓存服务无状态，支持水平扩展
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  /**
   * 模块初始化时连接Redis
   * ECP-C2: 系统化错误处理
   */
  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('⚠️ REDIS_URL not configured, Redis cache disabled');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.logger.error('❌ Redis connection error:', error);
      });

      this.client.on('ready', () => {
        this.logger.log('🚀 Redis client ready');
      });
    } catch (error) {
      this.logger.error('❌ Failed to initialize Redis client:', error);
    }
  }

  /**
   * 模块销毁时断开Redis连接
   * ECP-C1: 资源清理
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('👋 Redis connection closed');
    }
  }

  /**
   * 检查Redis是否可用
   * ECP-C1: 防御性编程
   */
  isAvailable(): boolean {
    return this.client && this.client.status === 'ready';
  }

  /**
   * 获取缓存值
   * ECP-C2: 错误处理 - 缓存失败不影响业务
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      this.logger.warn(`⚠️ Redis unavailable, skipping GET ${key}`);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存值
   * ECP-B3: 明确参数命名 - ttl表示过期时间（秒）
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认60秒
   */
  async set(key: string, value: unknown, ttl: number = 60): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logger.warn(`⚠️ Redis unavailable, skipping SET ${key}`);
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      this.logger.debug(`✅ Redis SET ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除缓存值
   * ECP-A1: 单一职责 - 专注于缓存失效
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logger.warn(`⚠️ Redis unavailable, skipping DEL ${key}`);
      return false;
    }

    try {
      await this.client.del(key);
      this.logger.debug(`🗑️ Redis DEL ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   * ECP-B2: KISS原则 - 使用Redis SCAN命令安全删除
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      this.logger.warn(`⚠️ Redis unavailable, skipping DEL pattern ${pattern}`);
      return 0;
    }

    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        stream.on('end', () => {
          if (keys.length > 0) {
            this.client
              .del(...keys)
              .then((count) => {
                this.logger.debug(
                  `🗑️ Redis DEL pattern ${pattern}: ${count} keys`,
                );
                resolve(count);
              })
              .catch((error) => {
                this.logger.error(`❌ Redis DEL error for ${pattern}:`, error);
                reject(
                  error instanceof Error ? error : new Error(String(error)),
                );
              });
          } else {
            resolve(0);
          }
        });

        stream.on('error', (error) => {
          this.logger.error(
            `❌ Redis DEL pattern error for ${pattern}:`,
            error,
          );
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } catch (error) {
      this.logger.error(`❌ Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * 获取缓存键的剩余TTL
   * ECP-D1: 可测试性 - 便于测试缓存过期逻辑
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -2; // Redis标准：-2表示key不存在
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`❌ Redis TTL error for key ${key}:`, error);
      return -2;
    }
  }
}
