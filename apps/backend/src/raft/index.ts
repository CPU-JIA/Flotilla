/**
 * Raft Consensus Algorithm Module
 *
 * 完整的Raft共识算法实现
 * 用于基于云计算的开发协作平台
 */

// 核心实现
export { RaftNode } from './raft-node'
export { WebSocketTransport } from './websocket-transport'
export { MemoryPersistentStorage, FilePersistentStorage } from './storage'
export { GitStateMachine } from './git-state-machine'

// 测试工具 (仅在需要时导出)
// export { TestCluster, RaftClusterTests, RaftPerformanceTests } from './cluster-test'

// 类型定义
export type {
  NodeState,
  LogEntry,
  Command,
  CommandType,
  RequestVoteRequest,
  RequestVoteResponse,
  AppendEntriesRequest,
  AppendEntriesResponse,
  ClientResponse,
  NodeStateSnapshot,
  ClusterConfig,
  PersistentState,
  RaftTransport,
  RaftRPCHandler,
  StateMachine,
  PersistentStorage,
  RaftTimer,
  RaftEvent,
  RaftEventPayload,
} from './types'

// 常量和枚举
export { NodeState as NodeStates, CommandType as CommandTypes, RAFT_CONSTANTS } from './types'