/**
 * WebSocket Transport Layer for Raft
 *
 * 基于WebSocket的Raft节点间通信实现
 * 支持RequestVote和AppendEntries RPC
 *
 * ECP-A1: SOLID - 传输层职责分离
 * ECP-C1: 防御性编程 - 网络异常处理
 * ECP-C3: 性能意识 - 连接池和消息批处理
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type {
  RaftTransport,
  RaftRPCHandler,
  RequestVoteRequest,
  RequestVoteResponse,
  AppendEntriesRequest,
  AppendEntriesResponse,
} from './types';

interface RaftMessage {
  type:
    | 'RequestVote'
    | 'AppendEntries'
    | 'RequestVoteResponse'
    | 'AppendEntriesResponse';
  requestId: string;
  data: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class WebSocketTransport extends EventEmitter implements RaftTransport {
  private server: WebSocket.Server | null = null;
  private connections: Map<string, WebSocket> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private handler: RaftRPCHandler | null = null;
  private readonly ports: Map<string, number> = new Map();

  constructor(
    private readonly nodeId: string,
    portMapping: Record<string, number>,
  ) {
    super();

    // 设置端口映射
    for (const [nodeId, port] of Object.entries(portMapping)) {
      this.ports.set(nodeId, port);
    }
  }

  /**
   * 启动WebSocket服务器
   */
  async startServer(nodeId: string, handler: RaftRPCHandler): Promise<void> {
    const port = this.ports.get(nodeId);
    if (!port) {
      throw new Error(`No port configured for node ${nodeId}`);
    }

    this.handler = handler;

    return new Promise((resolve, reject) => {
      try {
        this.server = new WebSocket.Server({ port });

        this.server.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.server.on('listening', () => {
          // Server listening - console.log 已移除（ECP 禁止项）
          resolve();
        });

        this.server.on('error', (error) => {
          // Server error - console.error 已移除（ECP 禁止项）
          reject(error);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * 停止WebSocket服务器
   */
  async stopServer(): Promise<void> {
    return new Promise((resolve) => {
      // 关闭所有连接
      for (const ws of this.connections.values()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
      this.connections.clear();

      // 拒绝所有待处理的请求
      for (const [_requestId, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Server stopped'));
      }
      this.pendingRequests.clear();

      // 关闭服务器，带超时保护
      if (this.server) {
        const server = this.server;
        this.server = null;

        // 设置强制超时
        const forceTimeout = setTimeout(() => {
          // WebSocket server force stopped - console.log 已移除（ECP 禁止项）
          // ECP-C3: Performance Awareness - 清理EventEmitter监听器防止内存泄漏
          this.removeAllListeners();
          resolve();
        }, 1000);

        server.close(() => {
          clearTimeout(forceTimeout);
          // WebSocket server stopped - console.log 已移除（ECP 禁止项）
          // ECP-C3: Performance Awareness - 清理EventEmitter监听器防止内存泄漏
          this.removeAllListeners();
          resolve();
        });
      } else {
        // ECP-C3: Performance Awareness - 即使没有服务器也要清理监听器
        this.removeAllListeners();
        resolve();
      }
    });
  }

  /**
   * 发送RequestVote RPC
   */
  async sendRequestVote(
    nodeId: string,
    request: RequestVoteRequest,
  ): Promise<RequestVoteResponse> {
    const result = await this.sendRPC(nodeId, 'RequestVote', request);
    return result as RequestVoteResponse;
  }

  /**
   * 发送AppendEntries RPC
   */
  async sendAppendEntries(
    nodeId: string,
    request: AppendEntriesRequest,
  ): Promise<AppendEntriesResponse> {
    const result = await this.sendRPC(nodeId, 'AppendEntries', request);
    return result as AppendEntriesResponse;
  }

  /**
   * 处理新连接
   */
  private handleConnection(ws: WebSocket, req: { url?: string }): void {
    // 从查询参数中获取节点ID
    const url = new URL(req.url || '', 'ws://localhost');
    const remoteNodeId = url.searchParams.get('nodeId');

    if (!remoteNodeId) {
      // Connection without nodeId - console.warn 已移除（ECP 禁止项）
      ws.close();
      return;
    }

    // New connection - console.log 已移除（ECP 禁止项）

    // 存储连接
    this.connections.set(remoteNodeId, ws);

    // 设置消息处理
    ws.on('message', (data) => {
      let message: string;
      if (Buffer.isBuffer(data)) {
        message = data.toString('utf8');
      } else if (data instanceof ArrayBuffer) {
        message = Buffer.from(data).toString('utf8');
      } else if (Array.isArray(data)) {
        message = Buffer.concat(data).toString('utf8');
      } else {
        message = '';
      }
      void this.handleMessage(ws, message).catch((_error) => {
        // Error handling message - console.error 已移除（ECP 禁止项）
      });
    });

    // 处理连接关闭
    ws.on('close', () => {
      // Connection closed - console.log 已移除（ECP 禁止项）
      this.connections.delete(remoteNodeId);
    });

    // 处理连接错误
    ws.on('error', (_error) => {
      // WebSocket error - console.error 已移除（ECP 禁止项）
      this.connections.delete(remoteNodeId);
    });
  }

  /**
   * 处理收到的消息
   */
  private async handleMessage(ws: WebSocket, data: string): Promise<void> {
    try {
      const message: RaftMessage = JSON.parse(data);

      if (message.type === 'RequestVote') {
        // 处理RequestVote请求
        if (!this.handler) {
          throw new Error('No RPC handler registered');
        }

        const response = await this.handler.handleRequestVote(
          message.data as import('./types').RequestVoteRequest,
        );
        const responseMessage: RaftMessage = {
          type: 'RequestVoteResponse',
          requestId: message.requestId,
          data: response,
        };

        ws.send(JSON.stringify(responseMessage));
      } else if (message.type === 'AppendEntries') {
        // 处理AppendEntries请求
        if (!this.handler) {
          throw new Error('No RPC handler registered');
        }

        const response = await this.handler.handleAppendEntries(
          message.data as import('./types').AppendEntriesRequest,
        );
        const responseMessage: RaftMessage = {
          type: 'AppendEntriesResponse',
          requestId: message.requestId,
          data: response,
        };

        ws.send(JSON.stringify(responseMessage));
      } else if (
        message.type === 'RequestVoteResponse' ||
        message.type === 'AppendEntriesResponse'
      ) {
        // 处理RPC响应
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(message.requestId);
          pending.resolve(message.data);
        }
      }
    } catch (_error) {
      // Error parsing message - console.error 已移除（ECP 禁止项）
    }
  }

  /**
   * 发送RPC请求
   */
  private async sendRPC(
    nodeId: string,
    type: 'RequestVote' | 'AppendEntries',
    data: RequestVoteRequest | AppendEntriesRequest,
  ): Promise<unknown> {
    // 获取或创建连接（在 Promise 外部进行异步操作）
    let ws: WebSocket;
    try {
      ws = await this.getConnection(nodeId);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const message: RaftMessage = {
        type,
        requestId,
        data,
      };

      // 设置超时
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('RPC timeout'));
      }, 5000); // 5秒超时

      // 存储待处理的请求
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
      });

      try {
        // 发送消息
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * 获取到指定节点的连接
   */
  private async getConnection(nodeId: string): Promise<WebSocket> {
    // 如果已有连接且状态正常，直接返回
    const existingWs = this.connections.get(nodeId);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return existingWs;
    }

    // 创建新连接
    return this.createConnection(nodeId);
  }

  /**
   * 创建到指定节点的连接
   */
  private async createConnection(nodeId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const port = this.ports.get(nodeId);
      if (!port) {
        reject(new Error(`No port configured for node ${nodeId}`));
        return;
      }

      const url = `ws://localhost:${port}?nodeId=${this.nodeId}`;
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout to ${nodeId}`));
      }, 3000);

      ws.on('open', () => {
        clearTimeout(timeout);
        // Connected to node - console.log 已移除（ECP 禁止项）
        this.connections.set(nodeId, ws);

        // 设置连接关闭处理
        ws.on('close', () => {
          // Connection to node closed - console.log 已移除（ECP 禁止项）
          this.connections.delete(nodeId);
        });

        ws.on('error', (_error) => {
          // Connection error to node - console.error 已移除（ECP 禁止项）
          this.connections.delete(nodeId);
        });

        // 设置消息处理
        ws.on('message', (data) => {
          let message: string;
          if (Buffer.isBuffer(data)) {
            message = data.toString('utf8');
          } else if (data instanceof ArrayBuffer) {
            message = Buffer.from(data).toString('utf8');
          } else if (Array.isArray(data)) {
            message = Buffer.concat(data).toString('utf8');
          } else {
            message = '';
          }
          void this.handleMessage(ws, message).catch((_error) => {
            // Error handling message from node - console.error 已移除（ECP 禁止项）
          });
        });

        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
