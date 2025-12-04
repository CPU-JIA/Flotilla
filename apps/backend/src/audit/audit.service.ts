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

export interface CreateAuditLogDto {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMsg?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建审计日志（异步非阻塞）
   *
   * @param dto 审计日志数据
   * @returns Promise<void> - 异步执行，不阻塞主流程
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
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
    } catch (error) {
      // 审计日志写入失败不应影响业务操作
      // 仅记录错误日志，不抛出异常
      this.logger.error(
        `❌ Failed to create audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 批量创建审计日志
   *
   * @param logs 审计日志数组
   */
  async logMany(logs: CreateAuditLogDto[]): Promise<void> {
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
    } catch (error) {
      this.logger.error(
        `❌ Failed to create batch audit logs: ${error.message}`,
        error.stack,
      );
    }
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
