import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * 通知WebSocket Gateway
 *
 * 提供实时通知推送功能
 *
 * ECP-A1: SOLID原则 - Gateway仅负责WebSocket通信
 * ECP-C1: 防御性编程 - JWT验证失败立即断开连接
 * ECP-C2: 系统性错误处理 - 所有关键操作都有try-catch
 *
 * 功能：
 * - JWT身份验证
 * - 用户连接管理（支持多设备）
 * - 实时通知推送
 * - 客户端事件处理
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*', // 生产环境应限制具体域名
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /**
   * 用户连接映射
   *
   * 格式：Map<userId, Set<socketId>>
   * 为什么用Set？因为同一用户可能有多个设备连接（手机+电脑）
   *
   * ECP-C3: Performance Awareness - 使用Map快速查找用户的所有连接
   */
  private userSockets = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  /**
   * 客户端连接时触发
   *
   * 流程：
   * 1. 从query或header提取JWT token
   * 2. 验证token有效性
   * 3. 验证成功：建立userId → socketId映射
   * 4. 验证失败：断开连接
   *
   * ECP-C1: 防御性编程 - 验证失败立即断开，防止未授权访问
   */
  async handleConnection(client: Socket) {
    try {
      // 支持两种token传递方式：
      // 1. Query参数：?token=JWT_TOKEN
      // 2. Authorization header：Bearer JWT_TOKEN
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(
          `❌ Connection rejected: No token provided (socket: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      // 验证JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub; // JWT payload中的用户ID

      // 将userId存储到socket实例的data属性中
      client.data.userId = userId;

      // 建立userId → socketId映射
      this.addUserSocket(userId, client.id);

      this.logger.log(
        `✅ User ${userId} connected (socket: ${client.id}, total sockets: ${this.userSockets.get(userId)?.size})`,
      );

      // 向客户端发送连接成功消息
      client.emit('connected', {
        message: 'Successfully connected to notifications service',
        userId,
      });
    } catch (error) {
      this.logger.error(
        `❌ Connection authentication failed (socket: ${client.id}): ${error.message}`,
      );
      client.disconnect();
    }
  }

  /**
   * 客户端断开连接时触发
   *
   * 清理用户连接映射
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      this.removeUserSocket(userId, client.id);
      this.logger.log(
        `👋 User ${userId} disconnected (socket: ${client.id}, remaining sockets: ${this.userSockets.get(userId)?.size || 0})`,
      );
    }
  }

  /**
   * 添加用户连接映射
   *
   * ECP-B2: KISS - 简单直接的Map操作
   */
  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * 移除用户连接映射
   *
   * 如果用户的所有设备都断开，清理Map中的key
   */
  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      // 如果用户没有任何连接，清理Map
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * 发送通知给特定用户的所有设备
   *
   * 这是核心方法，供NotificationsService调用
   *
   * @param userId - 用户ID
   * @param event - 事件名称（如'notification'）
   * @param data - 通知数据
   *
   * ECP-D1: 可测试性 - 公共方法，可独立测试
   */
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);

    if (!sockets || sockets.size === 0) {
      this.logger.debug(
        `📭 User ${userId} is offline, notification will be queued`,
      );
      return;
    }

    // 向用户的所有设备发送通知
    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });

    this.logger.log(
      `📨 Sent ${event} to user ${userId} (${sockets.size} devices)`,
    );
  }

  /**
   * 广播通知给所有在线用户
   *
   * 使用场景：系统维护通知、紧急公告等
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(
      `📢 Broadcast ${event} to all users (${this.userSockets.size} online)`,
    );
  }

  /**
   * 客户端订阅通知流
   *
   * 客户端发送：socket.emit('subscribe_notifications')
   * 服务器响应：当前未读通知数量
   */
  @SubscribeMessage('subscribe_notifications')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`📥 User ${userId} subscribed to notifications`);

    // 返回订阅成功消息
    return {
      event: 'subscribed',
      data: {
        message: 'Successfully subscribed to notifications',
        userId,
      },
    };
  }

  /**
   * 客户端标记通知为已读
   *
   * 客户端发送：socket.emit('mark_read', { notificationId: 'xxx' })
   * 服务器广播给用户的其他设备同步已读状态
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    this.logger.log(
      `✅ User ${userId} marked notification ${data.notificationId} as read`,
    );

    // 广播给该用户的其他设备，同步已读状态
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        if (socketId !== client.id) {
          // 不发给当前设备
          this.server.to(socketId).emit('notification_read', data);
        }
      });
    }

    return {
      event: 'mark_read_success',
      data: { notificationId: data.notificationId },
    };
  }

  /**
   * 获取在线用户数量（用于监控）
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * 获取指定用户的连接数量
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
