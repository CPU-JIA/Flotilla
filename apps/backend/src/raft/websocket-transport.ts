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
  data: any;
}

interface PendingRequest {
  resolve: (value: any) => void;
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
          console.log(`[${nodeId}] WebSocket server listening on port ${port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error(`[${nodeId}] WebSocket server error:`, error);
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
          console.log(`[${this.nodeId}] WebSocket server force stopped`);
          resolve();
        }, 1000);

        server.close(() => {
          clearTimeout(forceTimeout);
          console.log(`[${this.nodeId}] WebSocket server stopped`);
          resolve();
        });
      } else {
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
    return this.sendRPC(nodeId, 'RequestVote', request);
  }

  /**
   * 发送AppendEntries RPC
   */
  async sendAppendEntries(
    nodeId: string,
    request: AppendEntriesRequest,
  ): Promise<AppendEntriesResponse> {
    return this.sendRPC(nodeId, 'AppendEntries', request);
  }

  /**
   * 处理新连接
   */
  private handleConnection(ws: WebSocket, req: any): void {
    // 从查询参数中获取节点ID
    const url = new URL(req.url, 'ws://localhost');
    const remoteNodeId = url.searchParams.get('nodeId');

    if (!remoteNodeId) {
      console.warn(`[${this.nodeId}] Connection without nodeId, closing`);
      ws.close();
      return;
    }

    console.log(`[${this.nodeId}] New connection from ${remoteNodeId}`);

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
      void this.handleMessage(ws, message).catch((error) => {
        console.error(`[${this.nodeId}] Error handling message:`, error);
      });
    });

    // 处理连接关闭
    ws.on('close', () => {
      console.log(`[${this.nodeId}] Connection closed with ${remoteNodeId}`);
      this.connections.delete(remoteNodeId);
    });

    // 处理连接错误
    ws.on('error', (error) => {
      console.error(
        `[${this.nodeId}] WebSocket error with ${remoteNodeId}:`,
        error,
      );
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

        const response = await this.handler.handleRequestVote(message.data);
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

        const response = await this.handler.handleAppendEntries(message.data);
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
    } catch (error) {
      console.error(`[${this.nodeId}] Error parsing message:`, error);
    }
  }

  /**
   * 发送RPC请求
   */
  private async sendRPC(
    nodeId: string,
    type: 'RequestVote' | 'AppendEntries',
    data: any,
  ): Promise<any> {
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
        console.log(`[${this.nodeId}] Connected to ${nodeId}`);
        this.connections.set(nodeId, ws);

        // 设置连接关闭处理
        ws.on('close', () => {
          console.log(`[${this.nodeId}] Connection to ${nodeId} closed`);
          this.connections.delete(nodeId);
        });

        ws.on('error', (error) => {
          console.error(
            `[${this.nodeId}] Connection error to ${nodeId}:`,
            error,
          );
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
          void this.handleMessage(ws, message).catch((error) => {
            console.error(
              `[${this.nodeId}] Error handling message from ${nodeId}:`,
              error,
            );
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
