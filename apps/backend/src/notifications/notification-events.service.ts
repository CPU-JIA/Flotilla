/**
 * Notification Events Service - 解耦通知服务与WebSocket网关的事件总线
 *
 * 🔧 ECP-A2: 高内聚低耦合 - 使用事件总线模式避免循环依赖
 *
 * 问题：NotificationsService 需要调用 NotificationsGateway.sendToUser()
 *       NotificationsGateway 不需要依赖 NotificationsService
 *       但直接注入会导致循环依赖，使用 forwardRef 是反模式
 *
 * 解决：引入事件总线，Service 发布事件，Gateway 订阅事件
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject, Subscription } from 'rxjs';
import type { Notification } from '@prisma/client';

/**
 * 通知事件类型
 */
export interface NotificationEvent {
  type: 'NOTIFICATION_CREATED' | 'NOTIFICATION_READ' | 'NOTIFICATIONS_CLEARED';
  payload: {
    userId: string;
    notification?: Notification;
    notificationIds?: string[];
  };
}

@Injectable()
export class NotificationEventsService implements OnModuleDestroy {
  /**
   * 事件流 - 使用 RxJS Subject 实现发布/订阅模式
   */
  private readonly eventSubject = new Subject<NotificationEvent>();

  /**
   * 跟踪订阅以便清理
   */
  private subscriptions: Subscription[] = [];

  /**
   * 发布通知创建事件
   */
  emitNotificationCreated(userId: string, notification: Notification): void {
    this.eventSubject.next({
      type: 'NOTIFICATION_CREATED',
      payload: { userId, notification },
    });
  }

  /**
   * 发布通知已读事件
   */
  emitNotificationRead(userId: string, notificationIds: string[]): void {
    this.eventSubject.next({
      type: 'NOTIFICATION_READ',
      payload: { userId, notificationIds },
    });
  }

  /**
   * 发布通知清空事件
   */
  emitNotificationsCleared(userId: string): void {
    this.eventSubject.next({
      type: 'NOTIFICATIONS_CLEARED',
      payload: { userId },
    });
  }

  /**
   * 订阅所有通知事件
   */
  subscribe(handler: (event: NotificationEvent) => void): Subscription {
    const subscription = this.eventSubject.asObservable().subscribe(handler);
    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * 模块销毁时清理所有订阅，防止内存泄漏
   * ECP-C3: 性能意识 - 确保资源正确释放
   */
  onModuleDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
    this.eventSubject.complete();
  }
}
