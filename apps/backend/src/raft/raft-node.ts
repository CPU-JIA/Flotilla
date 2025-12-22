/**
 * Raft Node Core Implementation
 *
 * 实现Raft共识算法的核心逻辑
 * 包括Leader选举、日志复制、安全性保证
 *
 * ECP-A1: SOLID原则 - RaftNode专注于共识算法逻辑
 * ECP-C1: 防御性编程 - 完善的错误处理和状态检查
 * ECP-D1: 可测试性 - 依赖注入，便于单元测试
 */

import { EventEmitter } from 'events';
import type {
  NodeState,
  LogEntry,
  Command,
  RequestVoteRequest,
  RequestVoteResponse,
  AppendEntriesRequest,
  AppendEntriesResponse,
  ClientResponse,
  NodeStateSnapshot,
  ClusterConfig,
  RaftTransport,
  RaftRPCHandler,
  StateMachine,
  PersistentStorage,
  RaftTimer,
  RaftEventPayload,
} from './types';
import { NodeState as States, RAFT_CONSTANTS, RaftEvent } from './types';

export class RaftNode extends EventEmitter implements RaftRPCHandler {
  // 持久化状态（需要保存到存储）
  private currentTerm: number = 0;
  private votedFor: string | null = null;
  private logEntries: LogEntry[] = [];

  // 易失状态（重启后重建）
  private commitIndex: number = 0;
  private lastApplied: number = 0;
  private state: NodeState = States.FOLLOWER;
  private leaderId: string | null = null;

  // Leader特有状态（选举后初始化）
  private nextIndex: Map<string, number> = new Map();
  private matchIndex: Map<string, number> = new Map();

  // 定时器
  private electionTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // 投票统计（选举期间使用）
  private votes: number = 0;

  // 依赖注入
  private readonly transport: RaftTransport;
  private readonly stateMachine: StateMachine;
  private readonly storage: PersistentStorage;
  private readonly timer: RaftTimer;

  constructor(
    private readonly config: ClusterConfig,
    transport: RaftTransport,
    stateMachine: StateMachine,
    storage: PersistentStorage,
    timer: RaftTimer = {
      setTimeout: global.setTimeout.bind(global),
      setInterval: global.setInterval.bind(global),
      clearTimeout: global.clearTimeout.bind(global),
      clearInterval: global.clearInterval.bind(global),
    },
  ) {
    super();

    this.transport = transport;
    this.stateMachine = stateMachine;
    this.storage = storage;
    this.timer = timer;

    this.log(`Node created with config: ${JSON.stringify(config)}`);
  }

  /**
   * 启动节点
   * ECP-C2: 系统错误处理
   */
  async start(): Promise<void> {
    try {
      // 1. 从存储恢复持久化状态
      await this.loadPersistentState();

      // 2. 初始化为Follower
      this.state = States.FOLLOWER;
      this.leaderId = null;

      // 3. 启动RPC服务器
      await this.transport.startServer(this.config.nodeId, this);

      // 4. 启动选举超时定时器
      this.resetElectionTimeout();

      this.log(`Node started as FOLLOWER in term ${this.currentTerm}`);
      this.emitEvent(RaftEvent.STATE_CHANGED, {
        oldState: States.FOLLOWER,
        newState: States.FOLLOWER,
        term: this.currentTerm,
      });
    } catch (error) {
      this.logError('Failed to start node', error as Error);
      throw error;
    }
  }

  /**
   * 停止节点
   */
  async stop(): Promise<void> {
    this.clearAllTimers();
    await this.transport.stopServer();
    this.log('Node stopped');
  }

  /**
   * 处理客户端写请求
   * ECP-A1: 单一职责 - 专注于写请求处理
   */
  async handleClientWrite(command: Command): Promise<ClientResponse> {
    // 只有Leader能处理写请求
    if (this.state !== States.LEADER) {
      return {
        success: false,
        error: `Not leader, redirect to ${this.leaderId}`,
        leaderId: this.leaderId || undefined,
      };
    }

    try {
      // 创建日志条目
      const entry: LogEntry = {
        index: this.logEntries.length + 1,
        term: this.currentTerm,
        command,
        timestamp: Date.now(),
      };

      // 追加到本地日志
      this.logEntries.push(entry);
      await this.storage.saveLogEntry(entry);

      this.log(`Received client command, appended log index ${entry.index}`);

      // 立即复制到Followers
      this.broadcastAppendEntries();

      // 等待提交
      return this.waitForCommit(entry.index);
    } catch (error) {
      this.logError('Failed to handle client write', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * RequestVote RPC 处理器
   * ECP-C1: 防御性编程 - 严格的参数检查和原子性保证
   *
   * Raft论文5.2节和5.4节：
   * - 每个任期最多投一票，先到先得
   * - 只投给日志至少和自己一样新的候选人
   * - 投票必须持久化
   */
  async handleRequestVote(
    request: RequestVoteRequest,
  ): Promise<RequestVoteResponse> {
    this.log(
      `Received RequestVote from ${request.candidateId}, term ${request.term}`,
    );

    try {
      // 1. 拒绝：任期太旧
      if (request.term < this.currentTerm) {
        this.log(
          `Rejecting vote: term ${request.term} < current term ${this.currentTerm}`,
        );
        return { term: this.currentTerm, voteGranted: false };
      }

      // 2. 发现更高任期，转为Follower并重置投票
      if (request.term > this.currentTerm) {
        await this.updateTerm(request.term);
        this.becomeFollower(null);
        // updateTerm 已经将 votedFor 设为 null
      }

      // 3. 投票条件检查（原子性保证）
      const hasNotVoted = this.votedFor === null;
      const alreadyVotedForCandidate = this.votedFor === request.candidateId;
      const canVote = hasNotVoted || alreadyVotedForCandidate;

      const isUpToDate = this.isLogUpToDate(
        request.lastLogIndex,
        request.lastLogTerm,
      );

      // 4. 投票决策：必须同时满足两个条件
      if (canVote && isUpToDate) {
        // 原子性保存投票信息（防止竞态条件）
        this.votedFor = request.candidateId;
        await this.storage.saveVotedFor(this.votedFor);

        // 投票后重置选举超时（防止干扰当选的候选人）
        this.resetElectionTimeout();

        this.log(
          `Granted vote to ${request.candidateId} for term ${this.currentTerm}`,
        );
        return { term: this.currentTerm, voteGranted: true };
      }

      // 5. 拒绝投票，记录原因
      this.log(
        `Denied vote to ${request.candidateId}: canVote=${canVote} (votedFor=${this.votedFor}), isUpToDate=${isUpToDate}`,
      );
      return { term: this.currentTerm, voteGranted: false };
    } catch (error) {
      this.logError('Error handling RequestVote', error as Error);
      return { term: this.currentTerm, voteGranted: false };
    }
  }

  /**
   * AppendEntries RPC 处理器
   * ECP-C2: 错误处理 - 完善的异常捕获
   */
  async handleAppendEntries(
    request: AppendEntriesRequest,
  ): Promise<AppendEntriesResponse> {
    const isHeartbeat = request.entries.length === 0;

    if (!isHeartbeat) {
      this.log(
        `Received AppendEntries from ${request.leaderId}: ${request.entries.length} entries`,
      );
    }

    try {
      // 任期检查
      if (request.term < this.currentTerm) {
        return { term: this.currentTerm, success: false };
      }

      // 更新任期和Leader信息
      if (request.term > this.currentTerm) {
        await this.updateTerm(request.term);
      }

      this.becomeFollower(request.leaderId);

      // 日志一致性检查
      if (request.prevLogIndex > 0) {
        const prevLog = this.logEntries[request.prevLogIndex - 1];
        if (!prevLog || prevLog.term !== request.prevLogTerm) {
          // 日志不一致，返回冲突信息
          this.log(`Log inconsistency at index ${request.prevLogIndex}`);
          return {
            term: this.currentTerm,
            success: false,
            conflictIndex: this.logEntries.length,
            conflictTerm: prevLog?.term,
          };
        }
      }

      // 处理日志条目
      if (request.entries.length > 0) {
        await this.appendEntries(request.prevLogIndex, request.entries);
      }

      // 更新commitIndex并应用已提交的日志
      if (request.leaderCommit > this.commitIndex) {
        const prevCommitIndex = this.commitIndex;
        this.commitIndex = Math.min(
          request.leaderCommit,
          this.logEntries.length,
        );

        // 应用新提交的日志
        for (let i = prevCommitIndex + 1; i <= this.commitIndex; i++) {
          await this.applyLogEntry(this.logEntries[i - 1]);
        }
      }

      return { term: this.currentTerm, success: true };
    } catch (error) {
      this.logError('Error handling AppendEntries', error as Error);
      return { term: this.currentTerm, success: false };
    }
  }

  /**
   * 选举超时处理
   * ECP-A1: 单一职责 - 专注选举逻辑
   */
  private async handleElectionTimeout(): Promise<void> {
    try {
      this.log(
        `Election timeout, starting election for term ${this.currentTerm + 1}`,
      );

      // 转换为Candidate
      await this.becomeCandidate();

      // 发起选举
      await this.startElection();
    } catch (error) {
      this.logError('Error during election timeout', error as Error);
    }
  }

  /**
   * 成为Candidate并开始选举
   */
  private async becomeCandidate(): Promise<void> {
    this.state = States.CANDIDATE;
    this.currentTerm++;
    this.votedFor = this.config.nodeId;
    this.leaderId = null;
    this.votes = 1;

    // 持久化状态
    await this.storage.saveTerm(this.currentTerm);
    await this.storage.saveVotedFor(this.votedFor);

    // 重置选举超时
    this.resetElectionTimeout();

    this.log(`Became CANDIDATE for term ${this.currentTerm}`);
    this.emitEvent(RaftEvent.STATE_CHANGED, {
      oldState: States.FOLLOWER,
      newState: States.CANDIDATE,
      term: this.currentTerm,
    });
  }

  /**
   * 发起选举
   */
  private async startElection(): Promise<void> {
    const lastLog = this.logEntries[this.logEntries.length - 1];
    const lastLogIndex = lastLog?.index || 0;
    const lastLogTerm = lastLog?.term || 0;

    const otherNodes = this.config.nodes.filter(
      (nodeId) => nodeId !== this.config.nodeId,
    );

    // 并行发送RequestVote RPC
    const promises = otherNodes.map((nodeId) =>
      this.sendRequestVoteWithTimeout(nodeId, {
        term: this.currentTerm,
        candidateId: this.config.nodeId,
        lastLogIndex,
        lastLogTerm,
      }),
    );

    const responses = await Promise.allSettled(promises);

    for (const result of responses) {
      if (result.status === 'fulfilled') {
        const response = result.value;

        // 发现更高任期，转为Follower
        if (response.term > this.currentTerm) {
          await this.updateTerm(response.term);
          this.becomeFollower(null);
          return;
        }

        if (response.voteGranted) {
          this.votes++;
        }
      }
    }

    // 检查是否获得多数票
    const majority = Math.floor(this.config.nodes.length / 2) + 1;
    if (this.state === States.CANDIDATE && this.votes >= majority) {
      this.becomeLeader();
    }
  }

  /**
   * 成为Leader
   * ECP-C1: 防御性编程 - 完整初始化Leader状态
   *
   * Raft论文5.3节：Leader初始化时需要：
   * - 将 nextIndex[] 初始化为日志最后索引+1
   * - 将 matchIndex[] 初始化为0（除了自己）
   * - Leader自己的 matchIndex 应该设为当前日志长度
   */
  private becomeLeader(): void {
    this.log(
      `Became LEADER for term ${this.currentTerm} with ${this.votes} votes`,
    );

    this.state = States.LEADER;
    this.leaderId = this.config.nodeId;

    // 初始化Leader状态
    const lastLogIndex = this.logEntries.length;

    // 清空之前的状态
    this.nextIndex.clear();
    this.matchIndex.clear();

    for (const nodeId of this.config.nodes) {
      if (nodeId !== this.config.nodeId) {
        // 其他节点：nextIndex = lastLogIndex + 1, matchIndex = 0
        this.nextIndex.set(nodeId, lastLogIndex + 1);
        this.matchIndex.set(nodeId, 0);
      } else {
        // Leader自己：matchIndex = lastLogIndex（已经拥有所有日志）
        this.matchIndex.set(nodeId, lastLogIndex);
      }
    }

    // 停止选举定时器，启动心跳定时器
    this.clearElectionTimeout();
    this.startHeartbeat();

    // 立即发送心跳，宣告领导权
    this.broadcastAppendEntries();

    this.emitEvent(RaftEvent.STATE_CHANGED, {
      oldState: States.CANDIDATE,
      newState: States.LEADER,
      term: this.currentTerm,
    });

    this.emitEvent(RaftEvent.LEADER_ELECTED, {
      leaderId: this.config.nodeId,
      term: this.currentTerm,
    });
  }

  /**
   * 成为Follower
   */
  private becomeFollower(leaderId: string | null): void {
    const oldState = this.state;

    this.state = States.FOLLOWER;
    this.leaderId = leaderId;
    this.clearHeartbeatTimeout();
    this.resetElectionTimeout();

    if (oldState !== States.FOLLOWER) {
      this.log(`Became FOLLOWER, leader: ${leaderId || 'unknown'}`);
      this.emitEvent(RaftEvent.STATE_CHANGED, {
        oldState,
        newState: States.FOLLOWER,
        term: this.currentTerm,
      });
    }
  }

  /**
   * 启动心跳定时器
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimeout();
    this.heartbeatTimer = this.timer.setInterval(() => {
      if (this.state === States.LEADER) {
        this.broadcastAppendEntries();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 广播AppendEntries
   */
  private broadcastAppendEntries(): void {
    for (const nodeId of this.config.nodes) {
      if (nodeId !== this.config.nodeId) {
        void this.sendAppendEntriesToNode(nodeId);
      }
    }
  }

  /**
   * 向指定节点发送AppendEntries
   */
  private async sendAppendEntriesToNode(nodeId: string): Promise<void> {
    try {
      const nextIdx = this.nextIndex.get(nodeId) || 1;
      const prevLogIndex = nextIdx - 1;
      const prevLogTerm =
        prevLogIndex > 0 ? this.logEntries[prevLogIndex - 1]?.term || 0 : 0;

      const entries: LogEntry[] = [];
      for (let i = nextIdx; i <= this.logEntries.length; i++) {
        entries.push(this.logEntries[i - 1]);
      }

      const request: AppendEntriesRequest = {
        term: this.currentTerm,
        leaderId: this.config.nodeId,
        prevLogIndex,
        prevLogTerm,
        entries,
        leaderCommit: this.commitIndex,
      };

      const response = await this.transport.sendAppendEntries(nodeId, request);

      // 处理响应
      if (response.term > this.currentTerm) {
        await this.updateTerm(response.term);
        this.becomeFollower(null);
        return;
      }

      if (response.success) {
        // 成功复制
        if (entries.length > 0) {
          this.nextIndex.set(nodeId, nextIdx + entries.length);
          this.matchIndex.set(nodeId, nextIdx + entries.length - 1);
          this.checkCommit();
        }
      } else {
        // 复制失败，回退nextIndex
        const newNextIndex = Math.max(1, nextIdx - 1);
        this.nextIndex.set(nodeId, newNextIndex);
      }
    } catch (_error) {
      // RPC失败，稍后重试
    }
  }

  /**
   * 检查是否可以提交新的日志
   */
  private checkCommit(): void {
    for (let n = this.commitIndex + 1; n <= this.logEntries.length; n++) {
      // 只能提交当前任期的日志
      if (this.logEntries[n - 1].term !== this.currentTerm) {
        continue;
      }

      // 检查是否复制到多数节点
      let replicatedCount = 1; // Leader自己
      for (const [, matchIndex] of this.matchIndex) {
        if (matchIndex >= n) {
          replicatedCount++;
        }
      }

      const majority = Math.floor(this.config.nodes.length / 2) + 1;
      if (replicatedCount >= majority) {
        this.commitIndex = n;
        void this.applyLogEntry(this.logEntries[n - 1]);
      }
    }
  }

  /**
   * 应用日志条目到状态机
   */
  private async applyLogEntry(entry: LogEntry): Promise<void> {
    try {
      if (entry.index <= this.lastApplied) {
        return; // 已经应用过
      }

      await this.stateMachine.apply(entry.command);
      this.lastApplied = entry.index;

      this.log(`Applied log entry ${entry.index}: ${entry.command.type}`);
      this.emitEvent(RaftEvent.LOG_COMMITTED, {
        index: entry.index,
        command: entry.command,
      });
    } catch (error) {
      this.logError(`Failed to apply log entry ${entry.index}`, error as Error);
    }
  }

  /**
   * 等待日志提交
   */
  private async waitForCommit(index: number): Promise<ClientResponse> {
    const startTime = Date.now();
    const timeout = RAFT_CONSTANTS.COMMIT_TIMEOUT;

    while (this.commitIndex < index) {
      if (Date.now() - startTime > timeout) {
        return { success: false, error: 'Commit timeout' };
      }

      if (this.state !== States.LEADER) {
        return { success: false, error: 'No longer leader' };
      }

      await this.sleep(10);
    }

    return { success: true };
  }

  /**
   * 工具方法
   */
  private async loadPersistentState(): Promise<void> {
    const state = await this.storage.loadState();
    this.currentTerm = state.currentTerm;
    this.votedFor = state.votedFor;
    this.logEntries = state.log;
  }

  private async updateTerm(newTerm: number): Promise<void> {
    this.currentTerm = newTerm;
    this.votedFor = null;
    await this.storage.saveTerm(newTerm);
    await this.storage.saveVotedFor(null);
  }

  private isLogUpToDate(
    candidateLogIndex: number,
    candidateLogTerm: number,
  ): boolean {
    const lastLog = this.logEntries[this.logEntries.length - 1];
    if (!lastLog) return true;

    if (candidateLogTerm > lastLog.term) return true;
    if (
      candidateLogTerm === lastLog.term &&
      candidateLogIndex >= this.logEntries.length
    )
      return true;

    return false;
  }

  /**
   * 追加日志条目
   * ECP-C1: 防御性编程 - 确保日志连续性，避免稀疏数组
   *
   * Raft论文5.3节：如果现有日志条目与新条目冲突（相同索引但不同任期），
   * 删除现有条目及其后的所有条目，然后追加新条目
   */
  private async appendEntries(
    prevLogIndex: number,
    entries: LogEntry[],
  ): Promise<void> {
    if (entries.length === 0) {
      return; // 心跳，无需处理
    }

    // 检查是否存在冲突
    let conflictIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      const logIndex = prevLogIndex + i + 1;
      const existingEntry = this.logEntries[logIndex - 1];
      const newEntry = entries[i];

      // 发现冲突：相同索引但不同任期
      if (existingEntry && existingEntry.term !== newEntry.term) {
        conflictIndex = logIndex;
        this.log(
          `Log conflict at index ${logIndex}: existing term ${existingEntry.term} vs new term ${newEntry.term}`,
        );
        break;
      }
    }

    // 如果发现冲突，截断日志
    if (conflictIndex > 0) {
      const oldLength = this.logEntries.length;
      this.logEntries = this.logEntries.slice(0, conflictIndex - 1);
      await this.storage.truncateLogFrom(conflictIndex);
      this.log(
        `Truncated log from index ${conflictIndex}, old length: ${oldLength}, new length: ${this.logEntries.length}`,
      );
    }

    // 顺序追加新日志（避免稀疏数组）
    for (const entry of entries) {
      const expectedIndex = this.logEntries.length + 1;

      // 验证索引连续性
      if (entry.index !== expectedIndex) {
        // 如果索引小于等于当前日志长度，说明已存在
        if (entry.index <= this.logEntries.length) {
          const existingEntry = this.logEntries[entry.index - 1];
          if (existingEntry.term === entry.term) {
            // 相同任期的重复条目，跳过
            continue;
          }
        } else {
          // 索引不连续，记录错误但继续执行（防御性编程）
          this.logError(
            `Non-consecutive log index: expected ${expectedIndex}, got ${entry.index}`,
            new Error('Log index gap'),
          );
        }
      }

      // 使用push追加，确保数组连续
      this.logEntries.push(entry);
      await this.storage.saveLogEntry(entry);
    }

    this.log(
      `Appended ${entries.length} entries, log length now: ${this.logEntries.length}`,
    );
  }

  private async sendRequestVoteWithTimeout(
    nodeId: string,
    request: RequestVoteRequest,
  ): Promise<RequestVoteResponse> {
    return Promise.race([
      this.transport.sendRequestVote(nodeId, request),
      this.createTimeoutPromise<RequestVoteResponse>(),
    ]);
  }

  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      this.timer.setTimeout(
        () => reject(new Error('RPC timeout')),
        this.config.rpcTimeout,
      );
    });
  }

  private resetElectionTimeout(): void {
    this.clearElectionTimeout();
    const timeout = this.getRandomElectionTimeout();
    this.electionTimer = this.timer.setTimeout(() => {
      void this.handleElectionTimeout();
    }, timeout);
  }

  private getRandomElectionTimeout(): number {
    const { electionTimeoutMin, electionTimeoutMax } = this.config;
    return (
      Math.floor(
        Math.random() * (electionTimeoutMax - electionTimeoutMin + 1),
      ) + electionTimeoutMin
    );
  }

  private clearElectionTimeout(): void {
    if (this.electionTimer) {
      this.timer.clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimer) {
      this.timer.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearElectionTimeout();
    this.clearHeartbeatTimeout();
  }

  private emitEvent<T extends RaftEvent>(
    event: T,
    payload: RaftEventPayload[T],
  ): void {
    this.emit(event, payload);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => this.timer.setTimeout(resolve, ms));
  }

  private log(message: string): void {
    console.log(
      `[${this.config.nodeId}] [TERM ${this.currentTerm}] [${this.state}] ${message}`,
    );
  }

  private logError(message: string, error: Error): void {
    console.error(
      `[${this.config.nodeId}] [TERM ${this.currentTerm}] [${this.state}] ERROR: ${message}`,
      error,
    );
    this.emitEvent(RaftEvent.ERROR, { error, context: message });
  }

  /**
   * 获取节点状态快照（用于调试和监控）
   */
  exportState(): NodeStateSnapshot {
    return {
      nodeId: this.config.nodeId,
      state: this.state,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      logLength: this.logEntries.length,
      lastLogTerm: this.logEntries[this.logEntries.length - 1]?.term,
      leaderId: this.leaderId || undefined,
      clusterSize: this.config.nodes.length,
    };
  }
}
