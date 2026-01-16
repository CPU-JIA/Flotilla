import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditEntityType } from '@prisma/client';

/**
 * 审计日志服务
 *
 * Phase 4: 安全审计日志系统
 *
 * ECP-C1: 防御性编程 - 记录所有敏感操作用于安全审计
 * ECP-C2: 系统化错误处理 - 审计日志写入失败不影响业务操作
 *
 * 核心功能：
 * - 记录用户操作审计日志
 * - 支持异步写入（非阻塞）
 * - 自动捕获 IP 地址和 User-Agent
 * - 支持元数据 JSON 存储
 *
 * 合规要求：
 * - SOC2: 审计日志保留至少 90 天
 * - ISO27001: 记录安全相关事件
 * - GDPR: 记录个人数据访问
 */

/**
 * 审计元数据类型定义
 * ECP-C1: 类型安全 - 使用联合类型替代 any
 */
type SerializableValue = string | number | boolean | null;

export type AuditMetadata =
  | { action: 'user.login'; ip: string; userAgent: string; sessionId?: string }
  | { action: 'user.logout'; sessionDuration: number; sessionId: string }
  | { action: 'user.register'; registrationMethod: string; verified: boolean }
  | {
      action: 'project.create';
      projectId: string;
      projectName: string;
      visibility: string;
    }
  | {
      action: 'project.delete';
      projectId: string;
      projectName: string;
      memberCount: number;
    }
  | {
      action: 'repository.create';
      repositoryId: string;
      repositoryName: string;
      projectId: string;
    }
  | {
      action: 'repository.delete';
      repositoryId: string;
      repositoryName: string;
    }
  | {
      action: 'file.upload';
      fileSize: number;
      mimeType: string;
      path: string;
      repositoryId?: string;
    }
  | {
      action: 'file.delete';
      path: string;
      fileSize: number;
      repositoryId?: string;
    }
  | {
      action: 'permission.change';
      targetUserId: string;
      targetUsername?: string;
      oldRole: string;
      newRole: string;
      scope: string;
    }
  | {
      action: 'team.create';
      teamId: string;
      teamName: string;
      organizationId: string;
    }
  | {
      action: 'team.delete';
      teamId: string;
      teamName: string;
      memberCount: number;
    }
  | {
      action: 'webhook.create';
      webhookId: string;
      url: string;
      events: string[];
    }
  | { action: 'webhook.delete'; webhookId: string; url: string }
  | {
      action: 'api.key.create';
      keyId: string;
      scopes: string[];
      expiresAt?: string;
    }
  | { action: 'api.key.revoke'; keyId: string; reason?: string }
  | {
      action: 'security.breach';
      severity: 'low' | 'medium' | 'high' | 'critical';
      details: string;
    }
  | { action: 'generic'; [key: string]: SerializableValue };

export interface CreateAuditLogDto {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: AuditMetadata;
  success?: boolean;
  errorMsg?: string;
}

export interface AuditLogResult {
  success: boolean;
  error?: string;
  retries?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditLogFailureCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 100;

  constructor(private prisma: PrismaService) {}

  /**
   * 获取审计日志失败计数
   */
  getFailureCount(): number {
    return this.auditLogFailureCount;
  }

  /**
   * 重置失败计数
   */
  resetFailureCount(): void {
    this.auditLogFailureCount = 0;
  }

  /**
   * 带重试的延迟函数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 创建审计日志（异步非阻塞）
   *
   * @param dto 审计日志数据
   * @returns Promise<AuditLogResult> - 包含成功状态和错误信息
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLogResult> {
    let lastError: Error | null = null;
    let retryCount = 0;

    // 关键安全操作（登录失败、权限拒绝等）需要重试
    const isCriticalOperation =
      dto.action === 'LOGIN_FAILED' ||
      dto.action === 'PERMISSION_DENIED' ||
      dto.action === 'UNAUTHORIZED_ACCESS';

    const maxAttempts = isCriticalOperation ? this.MAX_RETRIES : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: dto.action,
            entityType: dto.entityType,
            entityId: dto.entityId,
            userId: dto.userId,
            username: dto.username,
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent,
            description: dto.description,
            metadata: dto.metadata || {},
            success: dto.success !== undefined ? dto.success : true,
            errorMsg: dto.errorMsg,
          },
        });

        this.logger.debug(
          `📝 Audit log created: ${dto.action} ${dto.entityType} by ${dto.username || 'system'}`,
        );

        return { success: true, retries: attempt };
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        const errorContext = {
          action: dto.action,
          entityType: dto.entityType,
          userId: dto.userId,
          attempt: attempt + 1,
          maxAttempts,
          errorName: error.name,
          errorCode: error.code,
        };

        if (attempt < maxAttempts - 1) {
          const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt);
          this.logger.warn(
            `⚠️  Audit log write failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms: ${error.message}`,
            JSON.stringify(errorContext),
          );
          await this.delay(delayMs);
        } else {
          this.logger.error(
            `❌ Failed to create audit log after ${maxAttempts} attempts: ${error.message}`,
            JSON.stringify(errorContext),
          );
        }
      }
    }

    // 记录失败计数
    this.auditLogFailureCount++;

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries: retryCount,
    };
  }

  /**
   * 批量创建审计日志
   *
   * @param logs 审计日志数组
   * @returns Promise<AuditLogResult> - 包含成功状态和错误信息
   */
  async logMany(logs: CreateAuditLogDto[]): Promise<AuditLogResult> {
    if (!logs || logs.length === 0) {
      return { success: true, retries: 0 };
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    // 批量操作最多重试 2 次
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.prisma.auditLog.createMany({
          data: logs.map((log) => ({
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            userId: log.userId,
            username: log.username,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            description: log.description,
            metadata: log.metadata || {},
            success: log.success !== undefined ? log.success : true,
            errorMsg: log.errorMsg,
          })),
          skipDuplicates: true,
        });

        this.logger.debug(`📝 ${logs.length} audit logs created in batch`);
        return { success: true, retries: attempt };
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        const errorContext = {
          batchSize: logs.length,
          attempt: attempt + 1,
          maxAttempts,
          errorName: error.name,
          errorCode: error.code,
          sampleActions: logs.slice(0, 3).map((l) => l.action),
        };

        if (attempt < maxAttempts - 1) {
          const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt);
          this.logger.warn(
            `⚠️  Batch audit log write failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms: ${error.message}`,
            JSON.stringify(errorContext),
          );
          await this.delay(delayMs);
        } else {
          this.logger.error(
            `❌ Failed to create batch audit logs (${logs.length} logs) after ${maxAttempts} attempts: ${error.message}`,
            JSON.stringify(errorContext),
          );
        }
      }
    }

    // 记录失败计数
    this.auditLogFailureCount++;

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries: retryCount,
    };
  }

  /**
   * 查询用户审计日志
   *
   * @param userId 用户 ID
   * @param limit 返回数量限制（默认 100）
   * @param offset 偏移量
   */
  async getUserLogs(userId: string, limit = 100, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 查询实体审计日志
   *
   * @param entityType 实体类型
   * @param entityId 实体 ID
   * @param limit 返回数量限制（默认 100）
   */
  async getEntityLogs(
    entityType: AuditEntityType,
    entityId: string,
    limit = 100,
  ) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 查询失败操作日志
   *
   * @param limit 返回数量限制（默认 100）
   * @param offset 偏移量
   */
  async getFailedLogs(limit = 100, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { success: false },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 统计用户操作次数
   *
   * @param userId 用户 ID
   * @param action 操作类型（可选）
   * @param startDate 开始时间
   * @param endDate 结束时间
   */
  async getUserActionCount(
    userId: string,
    action?: AuditAction,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        userId,
        action,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  /**
   * 清理过期审计日志
   *
   * SOC2 合规要求：保留至少 90 天
   * 此方法用于定期清理超过保留期的日志
   *
   * @param retentionDays 保留天数（默认 90 天）
   */
  async cleanupOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `🗑️  Cleaned up ${result.count} audit logs older than ${retentionDays} days`,
    );

    return result.count;
  }

  /**
   * 导出审计日志（CSV 格式）
   *
   * 用于合规审计或安全分析
   *
   * @param startDate 开始时间
   * @param endDate 结束时间
   */
  async exportLogs(startDate: Date, endDate: Date): Promise<string> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    // CSV header
    const header = [
      'ID',
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'User ID',
      'Username',
      'IP Address',
      'Description',
      'Success',
      'Error Message',
    ].join(',');

    // CSV rows
    const rows = logs.map((log) =>
      [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.entityType,
        log.entityId || '',
        log.userId || '',
        log.username || '',
        log.ipAddress || '',
        `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
        log.success,
        log.errorMsg ? `"${log.errorMsg.replace(/"/g, '""')}"` : '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
