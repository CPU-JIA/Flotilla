import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CollaborationService } from './collaboration.service'
import * as Y from 'yjs'
import { encoding, decoding } from 'lib0'

/**
 * 实时协作编辑 WebSocket Gateway
 *
 * 提供多用户实时协作编辑功能，基于 Yjs CRDT 算法
 *
 * ECP-A1: SOLID原则 - Gateway仅负责WebSocket通信和CRDT同步
 * ECP-A2: 高内聚低耦合 - 使用CollaborationService处理业务逻辑
 * ECP-C1: 防御性编程 - JWT验证失败立即断开连接
 * ECP-C2: 系统性错误处理 - 所有关键操作都有try-catch
 *
 * 功能：
 * - JWT身份验证
 * - Yjs CRDT 状态同步
 * - 用户光标和选区同步（Awareness）
 * - 会话管理
 */
@WebSocketGateway({
  namespace: 'collaboration',
  cors: {
    origin: '*', // 生产环境应限制具体域名
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(CollaborationGateway.name)

  /**
   * 每个文档的 Yjs 文档实例
   * Map<documentId, Y.Doc>
   *
   * ECP-C3: Performance Awareness - 内存中缓存避免重复创建
   */
  private docs = new Map<string, Y.Doc>()

  /**
   * 用户会话映射
   * Map<socketId, { userId, sessionId, documentId }>
   */
  private userSessions = new Map<
    string,
    {
      userId: string
      sessionId: string
      documentId: string
      projectId: string
    }
  >()

  /**
   * 生成随机用户颜色
   * ECP-D3: No Magic Numbers - 定义颜色常量
   */
  private readonly COLORS = [
    '#FF6B6B', // 红色
    '#4ECDC4', // 青色
    '#45B7D1', // 蓝色
    '#FFA07A', // 橙色
    '#98D8C8', // 绿色
    '#F7DC6F', // 黄色
    '#BB8FCE', // 紫色
    '#85C1E2', // 浅蓝
    '#F8B195', // 粉色
    '#C7CEEA', // 淡紫
  ]

  constructor(
    private jwtService: JwtService,
    private collaborationService: CollaborationService,
  ) {}

  /**
   * 客户端连接时触发
   *
   * 流程：
   * 1. 从query或header提取JWT token
   * 2. 验证token有效性
   * 3. 验证成功：允许连接
   * 4. 验证失败：断开连接
   *
   * ECP-C1: 防御性编程 - 验证失败立即断开
   */
  handleConnection(client: Socket) {
    try {
      // 支持两种token传递方式
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.split(' ')[1]

      if (!token) {
        this.logger.warn(
          `❌ Connection rejected: No token provided (socket: ${client.id})`,
        )
        client.disconnect()
        return
      }

      // 验证JWT token
      const payload = this.jwtService.verify(token)
      const userId = payload.sub

      // 将userId存储到socket实例的data属性中
      client.data.userId = userId

      this.logger.log(`✅ User ${userId} connected (socket: ${client.id})`)

      // 向客户端发送连接成功消息
      client.emit('connected', {
        message: 'Successfully connected to collaboration service',
        userId,
      })
    } catch (error) {
      this.logger.error(
        `❌ Connection authentication failed (socket: ${client.id}): ${error.message}`,
      )
      client.disconnect()
    }
  }

  /**
   * 客户端断开连接时触发
   *
   * 清理用户会话和资源
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId
    const sessionInfo = this.userSessions.get(client.id)

    if (userId && sessionInfo) {
      try {
        // 离开会话
        await this.collaborationService.leaveSession(
          sessionInfo.sessionId,
          userId,
        )

        // 通知其他用户该用户离开
        client.to(sessionInfo.documentId).emit('user-left', {
          userId,
          sessionId: sessionInfo.sessionId,
        })

        // 清理本地映射
        this.userSessions.delete(client.id)

        this.logger.log(
          `👋 User ${userId} disconnected from session ${sessionInfo.sessionId}`,
        )
      } catch (error) {
        this.logger.error(
          `Error handling disconnect for user ${userId}: ${error.message}`,
        )
      }
    }
  }

  /**
   * 加入文档编辑
   *
   * 客户端发送：socket.emit('join-document', { documentId, projectId, documentType })
   * 服务器响应：当前会话状态和参与者列表
   */
  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @MessageBody()
    data: {
      documentId: string
      projectId: string
      documentType: 'file' | 'wiki'
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId
      const { documentId, projectId, documentType } = data

      if (!documentId || !projectId) {
        return {
          event: 'error',
          data: { message: 'documentId and projectId are required' },
        }
      }

      // 获取或创建会话
      const session = await this.collaborationService.getOrCreateSession(
        documentId,
        documentType,
        projectId,
      )

      // 生成随机颜色
      const color =
        this.COLORS[Math.floor(Math.random() * this.COLORS.length)]

      // 加入会话
      const participant = await this.collaborationService.joinSession(
        session.id,
        userId,
        color,
      )

      // 加入Socket.IO房间
      client.join(documentId)

      // 保存会话信息
      this.userSessions.set(client.id, {
        userId,
        sessionId: session.id,
        documentId,
        projectId,
      })

      // 获取或创建 Yjs 文档
      if (!this.docs.has(documentId)) {
        this.docs.set(documentId, new Y.Doc())
      }

      // 获取活跃用户列表
      const activeUsers = await this.collaborationService.getActiveUsers(
        session.id,
      )

      // 通知其他用户有新用户加入
      client.to(documentId).emit('user-joined', {
        user: {
          id: userId,
          username: participant.user?.username || 'Unknown',
          avatar: participant.user?.avatar,
          color: participant.color,
        },
        sessionId: session.id,
      })

      this.logger.log(
        `User ${userId} joined document ${documentId} in project ${projectId}`,
      )

      // 返回会话状态
      return {
        event: 'document-joined',
        data: {
          sessionId: session.id,
          documentId,
          activeUsers: activeUsers.map((p) => ({
            id: p.userId,
            username: p.user.username,
            avatar: p.user.avatar,
            color: p.color,
            lastActiveAt: p.lastActiveAt,
          })),
          yourColor: color,
        },
      }
    } catch (error) {
      this.logger.error(
        `Error in handleJoinDocument: ${error.message}`,
        error.stack,
      )
      return {
        event: 'error',
        data: { message: error.message },
      }
    }
  }

  /**
   * 离开文档编辑
   *
   * 客户端发送：socket.emit('leave-document', { documentId })
   */
  @SubscribeMessage('leave-document')
  async handleLeaveDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId
      const { documentId } = data
      const sessionInfo = this.userSessions.get(client.id)

      if (!sessionInfo) {
        return { event: 'error', data: { message: 'Not in any session' } }
      }

      // 离开会话
      await this.collaborationService.leaveSession(sessionInfo.sessionId, userId)

      // 离开Socket.IO房间
      client.leave(documentId)

      // 通知其他用户
      client.to(documentId).emit('user-left', {
        userId,
        sessionId: sessionInfo.sessionId,
      })

      // 清理本地映射
      this.userSessions.delete(client.id)

      this.logger.log(`User ${userId} left document ${documentId}`)

      return {
        event: 'document-left',
        data: { documentId },
      }
    } catch (error) {
      this.logger.error(`Error in handleLeaveDocument: ${error.message}`)
      return {
        event: 'error',
        data: { message: error.message },
      }
    }
  }

  /**
   * 同步 Yjs 更新
   *
   * 客户端发送：socket.emit('sync-update', { documentId, update: Uint8Array })
   * 服务器广播给房间内其他用户
   *
   * ECP-C3: Performance Awareness - 使用二进制数据传输优化带宽
   */
  @SubscribeMessage('sync-update')
  async handleSyncUpdate(
    @MessageBody() data: { documentId: string; update: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId
      const { documentId, update } = data
      const sessionInfo = this.userSessions.get(client.id)

      if (!sessionInfo) {
        return { event: 'error', data: { message: 'Not in any session' } }
      }

      // 更新最后活跃时间
      await this.collaborationService.updateLastActive(
        sessionInfo.sessionId,
        userId,
      )

      // 获取 Yjs 文档
      const doc = this.docs.get(documentId)
      if (!doc) {
        return { event: 'error', data: { message: 'Document not found' } }
      }

      // 应用更新到服务器的 Yjs 文档
      // 将 update 转换为 Uint8Array
      const updateArray = new Uint8Array(update)
      Y.applyUpdate(doc, updateArray)

      // 广播更新给房间内其他用户（不包括发送者）
      client.to(documentId).emit('sync-update', {
        update: Array.from(updateArray), // 转换为普通数组以便JSON传输
        senderId: userId,
      })

      return {
        event: 'sync-update-ack',
        data: { success: true },
      }
    } catch (error) {
      this.logger.error(`Error in handleSyncUpdate: ${error.message}`)
      return {
        event: 'error',
        data: { message: error.message },
      }
    }
  }

  /**
   * 同步用户状态（光标、选区）
   *
   * 客户端发送：socket.emit('awareness-update', { documentId, state: { cursor, selection } })
   * 服务器广播给房间内其他用户
   */
  @SubscribeMessage('awareness-update')
  async handleAwarenessUpdate(
    @MessageBody()
    data: {
      documentId: string
      state: {
        cursor?: { line: number; column: number }
        selection?: { start: any; end: any }
      }
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId
      const { documentId, state } = data
      const sessionInfo = this.userSessions.get(client.id)

      if (!sessionInfo) {
        return { event: 'error', data: { message: 'Not in any session' } }
      }

      // 更新最后活跃时间
      await this.collaborationService.updateLastActive(
        sessionInfo.sessionId,
        userId,
      )

      // 广播给房间内其他用户
      client.to(documentId).emit('awareness-update', {
        userId,
        state,
      })

      return {
        event: 'awareness-update-ack',
        data: { success: true },
      }
    } catch (error) {
      this.logger.error(`Error in handleAwarenessUpdate: ${error.message}`)
      return {
        event: 'error',
        data: { message: error.message },
      }
    }
  }

  /**
   * 获取在线用户数量（用于监控）
   */
  getOnlineSessionCount(): number {
    return this.userSessions.size
  }

  /**
   * 获取文档的活跃连接数
   */
  getDocumentConnectionCount(documentId: string): number {
    let count = 0
    this.userSessions.forEach((session) => {
      if (session.documentId === documentId) {
        count++
      }
    })
    return count
  }
}
