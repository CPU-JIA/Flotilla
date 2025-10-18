/**
 * Raft集群管理服务
 *
 * 管理Raft节点的生命周期和集群状态
 * ECP-A1: SOLID原则 - 专注于集群管理逻辑
 * ECP-C2: 系统错误处理 - 完善的异常处理机制
 * ECP-D1: 可测试性 - 依赖注入设计
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { RaftNode } from '../raft/raft-node';
import { WebSocketTransport } from '../raft/websocket-transport';
import { MemoryPersistentStorage } from '../raft/storage';
import { GitStateMachine } from '../raft/git-state-machine';
import {
  ClusterConfigService,
  type RaftClusterSettings,
} from './cluster-config.service';
import { CommandType, NodeState as States } from '../raft/types';
import type { Command, NodeStateSnapshot, ClientResponse } from '../raft/types';

export interface ClusterStatus {
  nodeId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  isLeader: boolean;
  currentTerm: number;
  clusterSize: number;
  nodesState: NodeStateSnapshot[];
  lastError?: string;
}

export interface ClusterMetrics {
  totalCommands: number;
  commandsPerSecond: number;
  averageResponseTime: number;
  leaderElections: number;
  uptime: number;
}

@Injectable()
export class RaftClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RaftClusterService.name);
  private raftNode: RaftNode | null = null;
  private clusterStatus: ClusterStatus['status'] = 'stopped';
  private startTime: number = 0;
  private metrics: ClusterMetrics = {
    totalCommands: 0,
    commandsPerSecond: 0,
    averageResponseTime: 0,
    leaderElections: 0,
    uptime: 0,
  };

  constructor(private readonly configService: ClusterConfigService) {}

  async onModuleInit() {
    this.logger.log('Raft Cluster Service initializing...');

    const settings = this.configService.getClusterSettings();
    const validation = this.configService.validateConfig(settings);

    if (!validation.valid) {
      this.logger.error('Invalid cluster configuration:', validation.errors);
      return;
    }

    if (settings.autoStart) {
      try {
        await this.startCluster();
      } catch (error) {
        this.logger.error('Failed to auto-start cluster:', error);
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Raft Cluster Service shutting down...');
    await this.stopCluster();
  }

  /**
   * 启动Raft集群
   */
  async startCluster(): Promise<void> {
    if (this.clusterStatus === 'running') {
      throw new Error('Cluster is already running');
    }

    this.clusterStatus = 'starting';
    this.startTime = Date.now();

    try {
      const settings = this.configService.getClusterSettings();
      const config = this.configService.toRaftConfig(settings);

      // 创建Raft组件
      const transport = new WebSocketTransport(settings.nodeId, settings.ports);
      const storage = new MemoryPersistentStorage(settings.nodeId);
      const stateMachine = new GitStateMachine(settings.nodeId);

      // 创建Raft节点
      this.raftNode = new RaftNode(config, transport, stateMachine, storage);

      // 监听事件
      this.setupEventHandlers();

      // 启动节点
      await this.raftNode.start();

      this.clusterStatus = 'running';
      this.logger.log(
        `Raft cluster started successfully. Node ID: ${settings.nodeId}`,
      );
    } catch (error) {
      this.clusterStatus = 'error';
      this.logger.error('Failed to start Raft cluster:', error);
      throw error;
    }
  }

  /**
   * 停止Raft集群
   */
  async stopCluster(): Promise<void> {
    if (this.clusterStatus === 'stopped') {
      return;
    }

    this.clusterStatus = 'stopping';

    try {
      if (this.raftNode) {
        await this.raftNode.stop();
        this.raftNode = null;
      }

      this.clusterStatus = 'stopped';
      this.logger.log('Raft cluster stopped successfully');
    } catch (error) {
      this.clusterStatus = 'error';
      this.logger.error('Failed to stop Raft cluster:', error);
      throw error;
    }
  }

  /**
   * 重启集群
   */
  async restartCluster(): Promise<void> {
    await this.stopCluster();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待清理完成
    await this.startCluster();
  }

  /**
   * 获取集群状态
   */
  getClusterStatus(): ClusterStatus {
    const settings = this.configService.getClusterSettings();
    const nodeState = this.raftNode?.exportState();

    return {
      nodeId: settings.nodeId,
      status: this.clusterStatus,
      isLeader: nodeState?.state === States.LEADER,
      currentTerm: nodeState?.currentTerm || 0,
      clusterSize: settings.nodes.length,
      nodesState: nodeState ? [nodeState] : [],
    };
  }

  /**
   * 获取集群指标
   */
  getClusterMetrics(): ClusterMetrics {
    const uptime = this.startTime > 0 ? Date.now() - this.startTime : 0;

    return {
      ...this.metrics,
      uptime: Math.floor(uptime / 1000), // 秒
    };
  }

  /**
   * 执行分布式命令
   */
  async executeCommand(command: Command): Promise<ClientResponse> {
    if (!this.raftNode) {
      throw new Error('Raft cluster is not running');
    }

    const startTime = Date.now();

    try {
      const result = await this.raftNode.handleClientWrite(command);

      // 更新指标
      this.metrics.totalCommands++;
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;

      return result;
    } catch (error) {
      this.logger.error('Failed to execute command:', error);
      throw error;
    }
  }

  /**
   * 创建项目（便捷方法）
   */
  async createProject(projectData: {
    id: string;
    name: string;
    description: string;
    ownerId: string;
  }): Promise<ClientResponse> {
    const command: Command = {
      type: CommandType.CREATE_PROJECT,
      payload: projectData,
    };

    return this.executeCommand(command);
  }

  /**
   * Git提交（便捷方法）
   */
  async gitCommit(commitData: {
    repositoryId: string;
    branchName: string;
    message: string;
    author: { name: string; email: string };
    files: Array<{ path: string; content: string; mimeType: string }>;
  }): Promise<ClientResponse> {
    const command: Command = {
      type: CommandType.GIT_COMMIT,
      payload: commitData,
    };

    return this.executeCommand(command);
  }

  /**
   * Git创建分支（便捷方法）
   */
  async gitCreateBranch(branchData: {
    repositoryId: string;
    branchName: string;
    fromBranch: string;
  }): Promise<ClientResponse> {
    const command: Command = {
      type: CommandType.GIT_CREATE_BRANCH,
      payload: branchData,
    };

    return this.executeCommand(command);
  }

  /**
   * 检查是否为Leader
   */
  isLeader(): boolean {
    const state = this.raftNode?.exportState();
    return state?.state === States.LEADER;
  }

  /**
   * 获取Leader节点ID
   */
  getLeaderId(): string | null {
    const state = this.raftNode?.exportState();
    return state?.leaderId || null;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.raftNode) return;

    // Leader选举事件
    this.raftNode.on('leader_elected', (data) => {
      this.metrics.leaderElections++;
      this.logger.log(`Leader elected: ${data.leaderId} for term ${data.term}`);
    });

    // 错误事件
    this.raftNode.on('error', (error) => {
      this.logger.error('Raft node error:', error);
    });

    // 状态变更事件
    this.raftNode.on('state_changed', (data) => {
      this.logger.debug(`Node state changed to: ${data.newState}`);
    });
  }
}
