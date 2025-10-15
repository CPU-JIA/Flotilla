/**
 * Raft集群配置服务
 *
 * 管理Raft集群的配置和节点信息
 * ECP-A1: 单一职责 - 专注于配置管理
 * ECP-C1: 防御性编程 - 配置验证和默认值
 */

import { Injectable } from '@nestjs/common'
import type { ClusterConfig } from '../raft/types'

export interface RaftClusterSettings {
  nodeId: string
  nodes: string[]
  ports: Record<string, number>
  electionTimeoutMin: number
  electionTimeoutMax: number
  heartbeatInterval: number
  rpcTimeout: number
  autoStart: boolean
}

@Injectable()
export class ClusterConfigService {
  private readonly defaultConfig: Partial<RaftClusterSettings> = {
    electionTimeoutMin: 150,
    electionTimeoutMax: 300,
    heartbeatInterval: 50,
    rpcTimeout: 100,
    autoStart: false,
  }

  /**
   * 获取集群配置
   */
  getClusterSettings(): RaftClusterSettings {
    // 从环境变量读取配置
    const nodeId = process.env.RAFT_NODE_ID || this.generateNodeId()
    const nodeList = process.env.RAFT_NODES?.split(',') || [nodeId]
    const basePort = parseInt(process.env.RAFT_BASE_PORT || '8000')

    // 生成端口映射
    const ports: Record<string, number> = {}
    nodeList.forEach((node, index) => {
      ports[node] = basePort + index
    })

    return {
      nodeId,
      nodes: nodeList,
      ports,
      electionTimeoutMin: parseInt(process.env.RAFT_ELECTION_TIMEOUT_MIN || '150'),
      electionTimeoutMax: parseInt(process.env.RAFT_ELECTION_TIMEOUT_MAX || '300'),
      heartbeatInterval: parseInt(process.env.RAFT_HEARTBEAT_INTERVAL || '50'),
      rpcTimeout: parseInt(process.env.RAFT_RPC_TIMEOUT || '100'),
      autoStart: process.env.RAFT_AUTO_START === 'true',
      ...this.defaultConfig,
    }
  }

  /**
   * 转换为Raft配置格式
   */
  toRaftConfig(settings: RaftClusterSettings): ClusterConfig {
    return {
      nodeId: settings.nodeId,
      nodes: settings.nodes,
      electionTimeoutMin: settings.electionTimeoutMin,
      electionTimeoutMax: settings.electionTimeoutMax,
      heartbeatInterval: settings.heartbeatInterval,
      rpcTimeout: settings.rpcTimeout,
    }
  }

  /**
   * 验证配置有效性
   */
  validateConfig(settings: RaftClusterSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!settings.nodeId) {
      errors.push('nodeId is required')
    }

    if (!settings.nodes || settings.nodes.length === 0) {
      errors.push('At least one node is required')
    }

    if (!settings.nodes.includes(settings.nodeId)) {
      errors.push('Current nodeId must be included in nodes list')
    }

    if (settings.electionTimeoutMin >= settings.electionTimeoutMax) {
      errors.push('electionTimeoutMin must be less than electionTimeoutMax')
    }

    if (settings.heartbeatInterval >= settings.electionTimeoutMin) {
      errors.push('heartbeatInterval must be less than electionTimeoutMin')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  }
}