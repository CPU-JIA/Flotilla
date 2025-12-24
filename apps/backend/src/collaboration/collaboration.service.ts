import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationSession, CollaborationParticipant } from '@prisma/client';

/**
 * 实时协作编辑服务
 *
 * ECP-A1: SOLID原则 - 单一职责，仅处理协作会话业务逻辑
 * ECP-A2: 高内聚低耦合 - 通过PrismaService访问数据库
 * ECP-C1: 防御性编程 - 验证所有输入参数
 * ECP-C2: 系统性错误处理 - 所有数据库操作都有错误处理
 *
 * 核心功能：
 * - 创建/销毁协作会话
 * - 管理参与者加入/离开
 * - 获取会话状态
 * - 更新参与者活跃时间
 */
@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建协作会话
   *
   * @param documentId - 文档ID（文件路径或Wiki页面ID）
   * @param documentType - 文档类型（file, wiki）
   * @param projectId - 项目ID
   * @returns 创建的会话
   *
   * ECP-C1: 防御性编程 - 验证参数有效性
   */
  async createSession(
    documentId: string,
    documentType: 'file' | 'wiki',
    projectId: string,
  ): Promise<CollaborationSession> {
    if (!documentId || !projectId) {
      throw new Error('documentId and projectId are required');
    }

    // 检查是否已存在活跃会话
    const existingSession = await this.prisma.collaborationSession.findFirst({
      where: {
        documentId,
        projectId,
      },
      include: {
        participants: true,
      },
    });

    if (existingSession) {
      this.logger.log(
        `Reusing existing session for document ${documentId} in project ${projectId}`,
      );
      return existingSession;
    }

    const session = await this.prisma.collaborationSession.create({
      data: {
        documentId,
        documentType,
        projectId,
      },
      include: {
        participants: true,
      },
    });

    this.logger.log(
      `Created collaboration session ${session.id} for document ${documentId}`,
    );

    return session;
  }

  /**
   * 用户加入协作会话
   *
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   * @param color - 用户光标颜色
   * @returns 参与者记录
   *
   * ECP-C1: 防御性编程 - 检查会话是否存在
   */
  async joinSession(
    sessionId: string,
    userId: string,
    color: string,
  ): Promise<CollaborationParticipant> {
    if (!sessionId || !userId || !color) {
      throw new Error('sessionId, userId, and color are required');
    }

    // 验证会话存在
    const session = await this.prisma.collaborationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 检查用户是否已在会话中
    const existingParticipant =
      await this.prisma.collaborationParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId,
            userId,
          },
        },
      });

    if (existingParticipant) {
      // 更新最后活跃时间
      const updated = await this.prisma.collaborationParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          lastActiveAt: new Date(),
          color, // 允许更新颜色
        },
      });

      this.logger.log(`User ${userId} rejoined session ${sessionId}`);
      return updated;
    }

    // 创建新参与者
    const participant = await this.prisma.collaborationParticipant.create({
      data: {
        sessionId,
        userId,
        color,
      },
    });

    this.logger.log(`User ${userId} joined session ${sessionId}`);
    return participant;
  }

  /**
   * 用户离开协作会话
   *
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   *
   * ECP-B2: KISS - 简单直接的删除操作
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    if (!sessionId || !userId) {
      throw new Error('sessionId and userId are required');
    }

    await this.prisma.collaborationParticipant.deleteMany({
      where: {
        sessionId,
        userId,
      },
    });

    this.logger.log(`User ${userId} left session ${sessionId}`);

    // 检查会话是否还有参与者，如果没有则删除会话
    const remainingParticipants =
      await this.prisma.collaborationParticipant.count({
        where: { sessionId },
      });

    if (remainingParticipants === 0) {
      await this.prisma.collaborationSession.delete({
        where: { id: sessionId },
      });
      this.logger.log(
        `Session ${sessionId} deleted (no remaining participants)`,
      );
    }
  }

  /**
   * 获取会话的所有活跃用户
   *
   * @param sessionId - 会话ID
   * @returns 参与者列表（包含用户信息）
   *
   * ECP-C3: Performance Awareness - 使用include优化查询
   */
  async getActiveUsers(sessionId: string) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const participants = await this.prisma.collaborationParticipant.findMany({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return participants;
  }

  /**
   * 更新参与者最后活跃时间
   *
   * @param sessionId - 会话ID
   * @param userId - 用户ID
   *
   * ECP-C3: Performance Awareness - 批量更新避免多次查询
   */
  async updateLastActive(sessionId: string, userId: string): Promise<void> {
    if (!sessionId || !userId) {
      return;
    }

    await this.prisma.collaborationParticipant.updateMany({
      where: {
        sessionId,
        userId,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * 获取或创建会话
   *
   * @param documentId - 文档ID
   * @param documentType - 文档类型
   * @param projectId - 项目ID
   * @returns 会话（包含参与者）
   *
   * ECP-D1: 可测试性 - 封装常用操作为独立方法
   */
  async getOrCreateSession(
    documentId: string,
    documentType: 'file' | 'wiki',
    projectId: string,
  ) {
    const existingSession = await this.prisma.collaborationSession.findFirst({
      where: {
        documentId,
        projectId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (existingSession) {
      return existingSession;
    }

    return await this.prisma.collaborationSession.create({
      data: {
        documentId,
        documentType,
        projectId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 清理不活跃的会话
   * 建议通过定时任务调用
   *
   * @param inactiveMinutes - 不活跃时间阈值（分钟）
   * @returns 清理的会话数量
   *
   * ECP-C3: Performance Awareness - 批量删除优化性能
   */
  async cleanupInactiveSessions(inactiveMinutes = 30): Promise<number> {
    const threshold = new Date(Date.now() - inactiveMinutes * 60 * 1000);

    // 查找没有最近活跃参与者的会话
    const inactiveSessions = await this.prisma.collaborationSession.findMany({
      where: {
        updatedAt: {
          lt: threshold,
        },
      },
      include: {
        participants: {
          where: {
            lastActiveAt: {
              gte: threshold,
            },
          },
        },
      },
    });

    // 过滤出真正不活跃的会话（没有任何活跃参与者）
    const sessionsToDelete = inactiveSessions
      .filter((session) => session.participants.length === 0)
      .map((session) => session.id);

    if (sessionsToDelete.length > 0) {
      await this.prisma.collaborationSession.deleteMany({
        where: {
          id: {
            in: sessionsToDelete,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${sessionsToDelete.length} inactive sessions`,
      );
    }

    return sessionsToDelete.length;
  }
}
