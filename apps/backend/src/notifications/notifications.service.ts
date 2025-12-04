import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  UpdateNotificationPreferenceDto,
} from './dto';
import type { Notification, NotificationPreference } from '@prisma/client';

/**
 * 通知列表响应接口
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

/**
 * 通知服务
 *
 * ECP-A1: SOLID原则 - 单一职责，仅处理通知业务逻辑
 * ECP-C2: 系统性错误处理 - 所有数据库操作都有错误处理
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
  ) {}

  /**
   * 创建通知
   *
   * ECP-C1: 防御性编程 - 验证用户是否存在
   */
  async create(createDto: CreateNotificationDto): Promise<Notification | null> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ID ${createDto.userId} 不存在`);
    }

    // 检查用户的通知偏好设置
    const preference = await this.getPreference(createDto.userId);
    if (!this.shouldSendNotification(createDto.type, preference)) {
      this.logger.log(
        `🔕 Notification skipped for user ${createDto.userId} due to preferences: ${createDto.type}`,
      );
      return null; // 不发送通知
    }

    const notification = await this.prisma.notification.create({
      data: createDto,
    });

    this.logger.log(
      `🔔 Notification created: ${notification.type} for user ${notification.userId}`,
    );

    // 🚀 WebSocket实时推送通知给在线用户
    try {
      this.gateway.sendToUser(
        notification.userId,
        'notification',
        notification,
      );
    } catch (error) {
      // WebSocket推送失败不影响通知创建
      this.logger.warn(
        `⚠️ Failed to push notification via WebSocket: ${error.message}`,
      );
    }

    return notification;
  }

  /**
   * 批量创建通知
   *
   * 用于同时通知多个用户（如PR被创建时通知所有项目成员）
   */
  async createBatch(
    createDtos: CreateNotificationDto[],
  ): Promise<(Notification | null)[]> {
    const notifications = await Promise.all(
      createDtos.map((dto) => this.create(dto)),
    );

    return notifications; // 返回所有结果（包括null）
  }

  /**
   * 获取用户的通知列表
   *
   * ECP-C3: Performance Awareness - 分页查询，优化性能
   */
  async findAll(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<NotificationListResponse> {
    const { read, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (read !== undefined) {
      where.read = read;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }, // 最新通知在前
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }), // 未读总数
    ]);

    this.logger.log(
      `📋 Retrieved ${notifications.length} notifications for user ${userId} (total: ${total}, unread: ${unreadCount})`,
    );

    return {
      notifications,
      total,
      unreadCount,
      page,
      pageSize,
    };
  }

  /**
   * 获取单条通知详情
   */
  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`通知 ID ${id} 不存在`);
    }

    // 权限检查：只能查看自己的通知
    if (notification.userId !== userId) {
      throw new BadRequestException('无权查看此通知');
    }

    return notification;
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id, userId); // 权限检查已在findOne中完成

    if (notification.read) {
      return notification; // 已读则直接返回，避免无意义更新
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    this.logger.log(`✅ Notification ${id} marked as read by user ${userId}`);

    return updated;
  }

  /**
   * 批量标记通知为已读
   *
   * 支持两种模式：
   * 1. 传入notificationIds数组 - 标记指定通知
   * 2. 不传notificationIds - 标记当前用户的所有未读通知
   */
  async markAllAsRead(
    userId: string,
    notificationIds?: string[],
  ): Promise<{ count: number }> {
    const where: any = { userId, read: false };

    if (notificationIds && notificationIds.length > 0) {
      where.id = { in: notificationIds };
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { read: true },
    });

    this.logger.log(
      `✅ Marked ${result.count} notifications as read for user ${userId}`,
    );

    return { count: result.count };
  }

  /**
   * 删除通知
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOne(id, userId); // 权限检查

    await this.prisma.notification.delete({ where: { id } });

    this.logger.log(`🗑️ Notification ${id} deleted by user ${userId}`);

    return { message: '通知已删除' };
  }

  /**
   * 获取用户的通知偏好设置
   *
   * 如果不存在则自动创建默认配置
   */
  async getPreference(userId: string): Promise<NotificationPreference> {
    let preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // 如果用户还没有偏好设置，自动创建默认配置
    if (!preference) {
      preference = await this.prisma.notificationPreference.create({
        data: { userId },
      });
      this.logger.log(
        `🔧 Created default notification preferences for user ${userId}`,
      );
    }

    return preference;
  }

  /**
   * 更新用户的通知偏好设置
   */
  async updatePreference(
    userId: string,
    updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    // 确保偏好设置存在
    await this.getPreference(userId);

    const updated = await this.prisma.notificationPreference.update({
      where: { userId },
      data: updateDto,
    });

    this.logger.log(`🔧 Updated notification preferences for user ${userId}`);

    return updated;
  }

  /**
   * 辅助方法：根据用户偏好判断是否发送通知
   *
   * ECP-B2: KISS - 简单直接的映射逻辑
   */
  private shouldSendNotification(
    type: string,
    preference: NotificationPreference,
  ): boolean {
    const mapping: Record<string, keyof NotificationPreference> = {
      PR_CREATED: 'prCreated',
      PR_MERGED: 'prMerged',
      PR_REVIEWED: 'prReviewed',
      PR_COMMENTED: 'prCommented',
      ISSUE_MENTIONED: 'issueMentioned',
      ISSUE_ASSIGNED: 'issueAssigned',
      ISSUE_COMMENTED: 'issueCommented',
    };

    const preferenceKey = mapping[type];
    if (!preferenceKey) {
      return true; // 未知类型默认发送
    }

    return preference[preferenceKey] === true;
  }
}
