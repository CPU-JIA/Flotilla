/**
 * Memory-based Persistent Storage for Raft
 *
 * 基于内存的持久化存储实现（用于测试和快速原型）
 * 生产环境应使用真实的持久化存储（如LevelDB、RocksDB等）
 *
 * ECP-A1: SOLID - 存储层职责分离
 * ECP-C1: 防御性编程 - 数据完整性检查
 * ECP-D1: 可测试性 - 便于单元测试
 */

import type { PersistentStorage, PersistentState, LogEntry } from './types';

export class MemoryPersistentStorage implements PersistentStorage {
  private currentTerm: number = 0;
  private votedFor: string | null = null;
  private log: LogEntry[] = [];

  constructor(private readonly nodeId: string) {}

  /**
   * 保存当前任期
   */
  saveTerm(term: number): Promise<void> {
    if (term < this.currentTerm) {
      return Promise.reject(
        new Error(
          `Cannot save term ${term} less than current term ${this.currentTerm}`,
        ),
      );
    }
    this.currentTerm = term;
    this.debugLog(`Saved term: ${term}`);
    return Promise.resolve();
  }

  /**
   * 保存投票信息
   */
  saveVotedFor(votedFor: string | null): Promise<void> {
    this.votedFor = votedFor;
    this.debugLog(`Saved votedFor: ${votedFor}`);
    return Promise.resolve();
  }

  /**
   * 保存日志条目
   */
  saveLogEntry(entry: LogEntry): Promise<void> {
    // 验证日志条目的有效性
    if (entry.index <= 0) {
      return Promise.reject(
        new Error(`Invalid log entry index: ${entry.index}`),
      );
    }

    if (entry.term < 0) {
      return Promise.reject(new Error(`Invalid log entry term: ${entry.term}`));
    }

    // 确保日志索引连续
    const expectedIndex = this.log.length + 1;
    if (entry.index !== expectedIndex) {
      // 如果是替换现有条目
      if (entry.index <= this.log.length) {
        this.log[entry.index - 1] = entry;
        this.debugLog(`Replaced log entry at index ${entry.index}`);
        return Promise.resolve();
      } else {
        return Promise.reject(
          new Error(
            `Log entry index ${entry.index} is not consecutive, expected ${expectedIndex}`,
          ),
        );
      }
    }

    // 追加新日志条目
    this.log.push(entry);
    this.debugLog(`Saved log entry ${entry.index}: ${entry.command.type}`);
    return Promise.resolve();
  }

  /**
   * 加载持久化状态
   */
  loadState(): Promise<PersistentState> {
    const state: PersistentState = {
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      log: [...this.log], // 返回副本，防止外部修改
    };

    this.debugLog(
      `Loaded state: term=${state.currentTerm}, votedFor=${state.votedFor}, logLength=${state.log.length}`,
    );
    return Promise.resolve(state);
  }

  /**
   * 从指定索引截断日志
   */
  truncateLogFrom(index: number): Promise<void> {
    if (index <= 0) {
      return Promise.reject(new Error(`Invalid truncate index: ${index}`));
    }

    const oldLength = this.log.length;
    this.log = this.log.slice(0, index - 1);

    this.debugLog(
      `Truncated log from index ${index}, old length: ${oldLength}, new length: ${this.log.length}`,
    );
    return Promise.resolve();
  }

  /**
   * 获取日志条目（用于调试）
   */
  getLogEntry(index: number): LogEntry | undefined {
    if (index <= 0 || index > this.log.length) {
      return undefined;
    }
    return this.log[index - 1];
  }

  /**
   * 获取日志长度（用于调试）
   */
  getLogLength(): number {
    return this.log.length;
  }

  /**
   * 清空所有数据（用于测试）
   */
  clear(): void {
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.debugLog('Cleared all persistent data');
  }

  /**
   * 导出状态快照（用于调试）
   */
  exportSnapshot(): any {
    return {
      nodeId: this.nodeId,
      currentTerm: this.currentTerm,
      votedFor: this.votedFor,
      logLength: this.log.length,
      log: this.log.map((entry) => ({
        index: entry.index,
        term: entry.term,
        commandType: entry.command.type,
        timestamp: entry.timestamp,
      })),
    };
  }

  /**
   * 调试日志
   */
  private debugLog(message: string): void {
    console.log(`[${this.nodeId}] [STORAGE] ${message}`);
  }
}

/**
 * 基于文件的持久化存储（未来扩展）
 *
 * 这个类展示了如何实现真正的持久化存储
 * 生产环境中应该使用更成熟的存储引擎
 */
export class FilePersistentStorage implements PersistentStorage {
  constructor(
    private readonly _nodeId: string,
    private readonly _dataDir: string,
  ) {}

  saveTerm(_term: number): Promise<void> {
    // TODO: 实现文件持久化
    return Promise.reject(
      new Error('FilePersistentStorage not implemented yet'),
    );
  }

  saveVotedFor(_votedFor: string | null): Promise<void> {
    // TODO: 实现文件持久化
    return Promise.reject(
      new Error('FilePersistentStorage not implemented yet'),
    );
  }

  saveLogEntry(_entry: LogEntry): Promise<void> {
    // TODO: 实现文件持久化
    return Promise.reject(
      new Error('FilePersistentStorage not implemented yet'),
    );
  }

  loadState(): Promise<PersistentState> {
    // TODO: 实现文件持久化
    return Promise.reject(
      new Error('FilePersistentStorage not implemented yet'),
    );
  }

  truncateLogFrom(_index: number): Promise<void> {
    // TODO: 实现文件持久化
    return Promise.reject(
      new Error('FilePersistentStorage not implemented yet'),
    );
  }
}
