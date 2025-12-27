/**
 * Raft Consensus Algorithm Core Types
 *
 * Based on "In Search of an Understandable Consensus Algorithm"
 * by Diego Ongaro and John Ousterhout
 *
 * ECP-A1: SOLID - 单一职责，类型定义分离
 * ECP-B3: 清晰命名约定
 */

// Node States - Raft节点的三种状态
export enum NodeState {
  FOLLOWER = 'FOLLOWER',
  CANDIDATE = 'CANDIDATE',
  LEADER = 'LEADER',
}

// Command Types - 状态机命令类型
export enum CommandType {
  // Git相关操作
  GIT_COMMIT = 'GIT_COMMIT',
  GIT_CREATE_BRANCH = 'GIT_CREATE_BRANCH',
  GIT_MERGE = 'GIT_MERGE',

  // 项目管理操作
  CREATE_PROJECT = 'CREATE_PROJECT',
  UPDATE_PROJECT = 'UPDATE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',

  // 文件操作
  CREATE_FILE = 'CREATE_FILE',
  UPDATE_FILE = 'UPDATE_FILE',
  DELETE_FILE = 'DELETE_FILE',

  // 集群管理
  ADD_NODE = 'ADD_NODE',
  REMOVE_NODE = 'REMOVE_NODE',
}

// 日志条目接口
export interface LogEntry {
  index: number; // 日志索引（从1开始）
  term: number; // 任期号
  command: Command; // 状态机命令
  timestamp: number; // 创建时间戳
}

// 状态机命令接口
export interface Command {
  type: CommandType; // 操作类型
  payload: unknown; // 操作数据
  clientId?: string; // 客户端标识（用于去重）
  requestId?: string; // 请求ID（用于幂等性）
}

// RequestVote RPC 接口
export interface RequestVoteRequest {
  term: number; // Candidate的任期
  candidateId: string; // Candidate的节点ID
  lastLogIndex: number; // Candidate最后一条日志的索引
  lastLogTerm: number; // Candidate最后一条日志的任期
}

export interface RequestVoteResponse {
  term: number; // 当前任期（用于Candidate更新自己）
  voteGranted: boolean; // 是否投票给Candidate
}

// AppendEntries RPC 接口
export interface AppendEntriesRequest {
  term: number; // Leader的任期
  leaderId: string; // Leader的节点ID
  prevLogIndex: number; // 前一个日志的索引
  prevLogTerm: number; // 前一个日志的任期
  entries: LogEntry[]; // 要复制的日志条目（心跳时为空）
  leaderCommit: number; // Leader的commitIndex
}

export interface AppendEntriesResponse {
  term: number; // Follower的当前任期
  success: boolean; // 是否成功追加
  conflictIndex?: number; // 冲突的日志索引（用于快速恢复）
  conflictTerm?: number; // 冲突的任期
}

// 客户端请求结果
export interface ClientResponse {
  success: boolean;
  error?: string;
  data?: unknown;
  leaderId?: string; // 重定向到Leader
}

// 节点状态快照（用于调试和监控）
export interface NodeStateSnapshot {
  nodeId: string;
  state: NodeState;
  currentTerm: number;
  votedFor: string | null;
  commitIndex: number;
  lastApplied: number;
  logLength: number;
  lastLogTerm?: number;
  leaderId?: string;
  clusterSize: number;
}

// 集群配置
export interface ClusterConfig {
  nodeId: string;
  nodes: string[]; // 所有节点的ID列表
  electionTimeoutMin: number; // 选举超时最小值（ms）
  electionTimeoutMax: number; // 选举超时最大值（ms）
  heartbeatInterval: number; // 心跳间隔（ms）
  rpcTimeout: number; // RPC超时时间（ms）
}

// 持久化状态接口
export interface PersistentState {
  currentTerm: number;
  votedFor: string | null;
  log: LogEntry[];
}

// RPC传输层接口
export interface RaftTransport {
  sendRequestVote(
    nodeId: string,
    request: RequestVoteRequest,
  ): Promise<RequestVoteResponse>;
  sendAppendEntries(
    nodeId: string,
    request: AppendEntriesRequest,
  ): Promise<AppendEntriesResponse>;
  startServer(nodeId: string, handler: RaftRPCHandler): Promise<void>;
  stopServer(): Promise<void>;
}

// RPC处理器接口
export interface RaftRPCHandler {
  handleRequestVote(request: RequestVoteRequest): Promise<RequestVoteResponse>;
  handleAppendEntries(
    request: AppendEntriesRequest,
  ): Promise<AppendEntriesResponse>;
}

// 状态机接口
export interface StateMachine {
  apply(command: Command): Promise<unknown>;
  getState(): unknown;
  createSnapshot(): Promise<Buffer>;
  restoreFromSnapshot(snapshot: Buffer): Promise<void>;
}

// 持久化存储接口
export interface PersistentStorage {
  saveTerm(term: number): Promise<void>;
  saveVotedFor(votedFor: string | null): Promise<void>;
  saveLogEntry(entry: LogEntry): Promise<void>;
  loadState(): Promise<PersistentState>;
  truncateLogFrom(index: number): Promise<void>;
}

// 定时器接口（便于测试Mock）
export interface RaftTimer {
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout;
  setInterval(callback: () => void, interval: number): NodeJS.Timeout;
  clearTimeout(timer: NodeJS.Timeout): void;
  clearInterval(timer: NodeJS.Timeout): void;
}

// 事件类型
export enum RaftEvent {
  STATE_CHANGED = 'STATE_CHANGED',
  LEADER_ELECTED = 'LEADER_ELECTED',
  LOG_COMMITTED = 'LOG_COMMITTED',
  NODE_JOINED = 'NODE_JOINED',
  NODE_LEFT = 'NODE_LEFT',
  ERROR = 'ERROR',
}

// 事件载荷
export interface RaftEventPayload {
  [RaftEvent.STATE_CHANGED]: {
    oldState: NodeState;
    newState: NodeState;
    term: number;
  };
  [RaftEvent.LEADER_ELECTED]: {
    leaderId: string;
    term: number;
  };
  [RaftEvent.LOG_COMMITTED]: {
    index: number;
    command: Command;
  };
  [RaftEvent.NODE_JOINED]: {
    nodeId: string;
  };
  [RaftEvent.NODE_LEFT]: {
    nodeId: string;
  };
  [RaftEvent.ERROR]: {
    error: Error;
    context: string;
  };
}

// 配置常量
export const RAFT_CONSTANTS = {
  DEFAULT_ELECTION_TIMEOUT_MIN: 150, // 150ms
  DEFAULT_ELECTION_TIMEOUT_MAX: 450, // 450ms（增加随机范围，防止活锁）
  DEFAULT_HEARTBEAT_INTERVAL: 100, // 100ms（心跳应小于选举超时最小值）
  DEFAULT_RPC_TIMEOUT: 100, // 100ms
  MAX_BATCH_SIZE: 100, // 批量日志复制大小
  COMMIT_TIMEOUT: 5000, // 等待提交超时（ms）
} as const;
