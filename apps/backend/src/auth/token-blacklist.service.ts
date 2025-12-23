/**
 * Token Blacklist Service - JWT Token黑名单管理
 * ECP-A1: SOLID - 单一职责原则，专注于Token撤销和黑名单管理
 * ECP-A2: 高内聚低耦合 - 使用Redis进行分布式黑名单存储
 *
 * 🔒 SECURITY: Token黑名单机制（细粒度Token撤销）
 * - 支持单个Token撤销（相比tokenVersion的全局撤销更灵活）
 * - 使用Redis存储，支持分布式部署
 * - 自动过期清理（Redis TTL）
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Token黑名单键前缀
 */
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 将Token加入黑名单
   *
   * @param jti JWT ID（Token唯一标识符）
   * @param expiresIn Token过期时间（秒）
   * @returns 是否成功
   */
  async addToBlacklist(jti: string, expiresIn: number): Promise<void> {
    try {
      const key = this.getBlacklistKey(jti);

      // 将Token加入黑名单，设置TTL为Token的剩余有效期
      // ECP-C3: 性能优化 - Redis会自动清理过期数据，无需手动清理
      const success = await this.redisService.set(key, '1', expiresIn);

      if (success) {
        this.logger.debug(
          `Token ${jti} added to blacklist (TTL: ${expiresIn}s)`,
        );
      } else {
        this.logger.warn(
          `Failed to add token ${jti} to blacklist - Redis unavailable`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to add token ${jti} to blacklist: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 检查Token是否在黑名单中
   *
   * @param jti JWT ID
   * @returns 是否在黑名单中
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      const key = this.getBlacklistKey(jti);
      const value = await this.redisService.get<string>(key);

      return value !== null && value !== undefined;
    } catch (error) {
      // 🔒 SECURITY: Fail-closed策略 - 如果Redis不可用，拒绝Token
      // 这比fail-open更安全，因为已撤销的Token不会被错误地接受
      // 权衡：可能导致用户需要重新登录，但比安全漏洞更可接受
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check blacklist for token ${jti}: ${errorMessage}. ` +
          `Using fail-closed strategy - token rejected for safety.`,
      );
      return true; // Fail-closed策略：Redis故障时视为已撤销
    }
  }

  /**
   * 从黑名单中移除Token（通常用于测试）
   *
   * @param jti JWT ID
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    try {
      const key = this.getBlacklistKey(jti);
      await this.redisService.del(key);

      this.logger.debug(`Token ${jti} removed from blacklist`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to remove token ${jti} from blacklist: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 批量将Token加入黑名单
   * 用于用户登出所有设备时撤销所有Token
   *
   * @param jtis JWT ID数组
   * @param expiresIn Token过期时间（秒）
   */
  async addManyToBlacklist(jtis: string[], expiresIn: number): Promise<void> {
    try {
      await Promise.all(jtis.map((jti) => this.addToBlacklist(jti, expiresIn)));

      this.logger.log(`Batch blacklisted ${jtis.length} tokens`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to batch blacklist tokens: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 生成黑名单键
   *
   * @param jti JWT ID
   * @returns Redis键
   */
  private getBlacklistKey(jti: string): string {
    return `${TOKEN_BLACKLIST_PREFIX}${jti}`;
  }

  /**
   * 获取黑名单统计信息（调试用）
   * 注意：此方法在生产环境中可能性能较差，仅用于监控
   */
  getBlacklistStats(): { count: number } {
    // 注意：需要使用Redis SCAN来统计，这里返回基本值
    // 实际监控可以通过Redis的INFO命令获取
    return {
      count: 0, // 需要根据实际Redis SCAN实现
    };
  }
}
