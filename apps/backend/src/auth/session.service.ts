/**
 * Session Service - 会话管理
 * ECP-A1: SOLID - 单一职责原则，专注于用户会话生命周期管理
 * ECP-A2: 高内聚 - 会话创建、查询、撤销集中管理
 *
 * 从AuthService分离出来的职责：
 * - 会话创建与记录
 * - 活跃会话查询
 * - 单个/全部会话撤销
 * - User-Agent解析
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 会话信息接口
 */
export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * User-Agent解析结果
 */
export interface ParsedUserAgent {
  device: string | null;
  browser: string | null;
  os: string | null;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新会话
   * @param userId 用户ID
   * @param ipAddress IP地址
   * @param userAgent User-Agent字符串
   * @param tokenVersion 当前Token版本
   * @param expiresIn 过期时间（毫秒）
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    tokenVersion: number,
    expiresIn: number,
  ): Promise<void> {
    const parsedUA = this.parseUserAgent(userAgent);
    const expiresAt = new Date(Date.now() + expiresIn);

    await this.prisma.userSession.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        device: parsedUA.device,
        browser: parsedUA.browser,
        os: parsedUA.os,
        tokenVersion,
        expiresAt,
      },
    });

    this.logger.log(
      `📱 Session created for user ${userId} from ${ipAddress} (${parsedUA.browser}/${parsedUA.os})`,
    );
  }

  /**
   * 获取用户所有活跃会话
   * @param userId 用户ID
   * @returns 活跃会话列表
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        device: true,
        browser: true,
        os: true,
        location: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }

  /**
   * 撤销特定会话（单个设备登出）
   * @param userId 用户ID
   * @param sessionId 会话ID
   */
  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在或无权限操作');
    }

    if (!session.isActive) {
      throw new BadRequestException('会话已失效');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    this.logger.log(`✅ Session revoked: ${sessionId} for user ${userId}`);

    return { message: '设备已登出成功' };
  }

  /**
   * 撤销用户所有会话
   * @param userId 用户ID
   * @returns 撤销的会话数量
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    this.logger.log(
      `✅ All sessions revoked for user ${userId}: ${result.count} sessions`,
    );

    return result.count;
  }

  /**
   * 更新会话最后使用时间
   * @param sessionId 会话ID
   */
  async updateLastUsed(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * 清理过期会话
   * 可由定时任务调用
   * @returns 清理的会话数量
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      this.logger.log(`🧹 Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * 解析User-Agent字符串（提取设备、浏览器、OS信息）
   * 简化版实现，生产环境建议使用ua-parser-js库
   * @param userAgent User-Agent字符串
   */
  parseUserAgent(userAgent: string): ParsedUserAgent {
    if (!userAgent) {
      return { device: null, browser: null, os: null };
    }

    // 设备检测
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      device = 'Tablet';
    }

    // 浏览器检测
    let browser = 'Unknown';
    if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge/')) {
      browser = 'Edge';
    }

    // 操作系统检测
    let os = 'Unknown';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
      os = 'iOS';
    }

    return { device, browser, os };
  }

  /**
   * 解析过期时间字符串为毫秒数
   * 支持格式: "7d", "24h", "30m", "60s"
   * @param expiration 过期时间字符串
   * @returns 毫秒数
   */
  parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // 默认30天

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
