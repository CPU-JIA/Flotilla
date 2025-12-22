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
 * 基于文件的持久化存储
 *
 * 实现真正的文件持久化存储，确保 Raft 状态在节点重启后不丢失
 * - 使用原子写入（先写临时文件，再 rename）
 * - 添加 CRC32 校验确保数据完整性
 * - 每个节点独立的数据目录
 *
 * ECP-A1: SOLID - 存储层职责分离
 * ECP-C1: 防御性编程 - 数据完整性检查和错误处理
 * ECP-C2: 系统错误处理 - 完善的异常处理
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

interface StoredData {
  data: any;
  checksum: string;
}

export class FilePersistentStorage implements PersistentStorage {
  private readonly termFile: string;
  private readonly votedForFile: string;
  private readonly logFile: string;

  // 内存缓存，减少磁盘 I/O
  private currentTerm: number = 0;
  private votedFor: string | null = null;
  private log: LogEntry[] = [];
  private initialized: boolean = false;

  constructor(
    private readonly nodeId: string,
    private readonly dataDir: string,
  ) {
    // 为每个节点创建独立的数据目录
    const nodeDataDir = path.join(dataDir, nodeId);
    this.termFile = path.join(nodeDataDir, 'term.json');
    this.votedForFile = path.join(nodeDataDir, 'voted-for.json');
    this.logFile = path.join(nodeDataDir, 'log.json');

    this.debugLog(`Initialized with data directory: ${nodeDataDir}`);
  }

  /**
   * 初始化存储（创建目录结构）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const nodeDataDir = path.dirname(this.termFile);
      await fs.mkdir(nodeDataDir, { recursive: true });
      this.initialized = true;
      this.debugLog('Storage directory initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize storage: ${(error as Error).message}`,
      );
    }
  }

  /**
   * 保存当前任期
   * ECP-C1: 防御性编程 - 验证任期有效性
   */
  async saveTerm(term: number): Promise<void> {
    if (term < 0) {
      throw new Error(`Invalid term: ${term}`);
    }

    if (term < this.currentTerm) {
      throw new Error(
        `Cannot save term ${term} less than current term ${this.currentTerm}`,
      );
    }

    await this.ensureInitialized();

    try {
      await this.writeAtomic(this.termFile, { term });
      this.currentTerm = term;
      this.debugLog(`Saved term: ${term}`);
    } catch (error) {
      throw new Error(`Failed to save term: ${(error as Error).message}`);
    }
  }

  /**
   * 保存投票信息
   */
  async saveVotedFor(votedFor: string | null): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.writeAtomic(this.votedForFile, { votedFor });
      this.votedFor = votedFor;
      this.debugLog(`Saved votedFor: ${votedFor}`);
    } catch (error) {
      throw new Error(`Failed to save votedFor: ${(error as Error).message}`);
    }
  }

  /**
   * 保存日志条目
   * ECP-C1: 防御性编程 - 验证日志条目有效性
   */
  async saveLogEntry(entry: LogEntry): Promise<void> {
    // 验证日志条目的有效性
    if (entry.index <= 0) {
      throw new Error(`Invalid log entry index: ${entry.index}`);
    }

    if (entry.term < 0) {
      throw new Error(`Invalid log entry term: ${entry.term}`);
    }

    await this.ensureInitialized();

    try {
      // 确保日志索引连续
      const expectedIndex = this.log.length + 1;
      if (entry.index !== expectedIndex) {
        // 如果是替换现有条目
        if (entry.index <= this.log.length) {
          this.log[entry.index - 1] = entry;
          await this.persistLog();
          this.debugLog(`Replaced log entry at index ${entry.index}`);
          return;
        } else {
          throw new Error(
            `Log entry index ${entry.index} is not consecutive, expected ${expectedIndex}`,
          );
        }
      }

      // 追加新日志条目
      this.log.push(entry);
      await this.persistLog();
      this.debugLog(`Saved log entry ${entry.index}: ${entry.command.type}`);
    } catch (error) {
      throw new Error(`Failed to save log entry: ${(error as Error).message}`);
    }
  }

  /**
   * 加载持久化状态
   * ECP-C2: 系统错误处理 - 处理文件不存在的情况
   */
  async loadState(): Promise<PersistentState> {
    await this.ensureInitialized();

    try {
      // 加载 term
      try {
        const termData = await this.readAtomic(this.termFile);
        this.currentTerm = termData.term || 0;
      } catch (error) {
        // 文件不存在，使用默认值；其他错误需要抛出
        if (error.code === 'ENOENT') {
          this.currentTerm = 0;
          this.debugLog('Term file not found, using default value 0');
        } else {
          throw error;
        }
      }

      // 加载 votedFor
      try {
        const votedForData = await this.readAtomic(this.votedForFile);
        this.votedFor = votedForData.votedFor || null;
      } catch (error) {
        // 文件不存在，使用默认值；其他错误需要抛出
        if (error.code === 'ENOENT') {
          this.votedFor = null;
          this.debugLog('VotedFor file not found, using default value null');
        } else {
          throw error;
        }
      }

      // 加载日志
      try {
        const logData = await this.readAtomic(this.logFile);
        this.log = logData.entries || [];
      } catch (error) {
        // 文件不存在，使用默认值；其他错误需要抛出
        if (error.code === 'ENOENT') {
          this.log = [];
          this.debugLog('Log file not found, using empty log');
        } else {
          throw error;
        }
      }

      const state: PersistentState = {
        currentTerm: this.currentTerm,
        votedFor: this.votedFor,
        log: [...this.log], // 返回副本
      };

      this.debugLog(
        `Loaded state: term=${state.currentTerm}, votedFor=${state.votedFor}, logLength=${state.log.length}`,
      );
      return state;
    } catch (error) {
      throw new Error(`Failed to load state: ${(error as Error).message}`);
    }
  }

  /**
   * 从指定索引截断日志
   */
  async truncateLogFrom(index: number): Promise<void> {
    if (index <= 0) {
      throw new Error(`Invalid truncate index: ${index}`);
    }

    await this.ensureInitialized();

    try {
      const oldLength = this.log.length;
      this.log = this.log.slice(0, index - 1);
      await this.persistLog();

      this.debugLog(
        `Truncated log from index ${index}, old length: ${oldLength}, new length: ${this.log.length}`,
      );
    } catch (error) {
      throw new Error(`Failed to truncate log: ${(error as Error).message}`);
    }
  }

  /**
   * 持久化整个日志到磁盘
   */
  private async persistLog(): Promise<void> {
    await this.writeAtomic(this.logFile, { entries: this.log });
  }

  /**
   * 原子写入：先写临时文件，再 rename
   * ECP-C1: 防御性编程 - 确保写入的原子性
   */
  private async writeAtomic(filePath: string, data: any): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      // 序列化数据并计算校验和
      const jsonData = JSON.stringify(data, null, 2);
      const checksum = this.calculateChecksum(jsonData);

      const storedData: StoredData = {
        data,
        checksum,
      };

      // 写入临时文件
      await fs.writeFile(tempPath, JSON.stringify(storedData, null, 2), 'utf8');

      // 原子性 rename
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(tempPath);
      } catch {
        // 忽略清理错误
      }
      throw error;
    }
  }

  /**
   * 原子读取：读取并验证校验和
   * ECP-C1: 防御性编程 - 验证数据完整性
   */
  private async readAtomic(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf8');
    const storedData: StoredData = JSON.parse(content);

    // 验证校验和
    const jsonData = JSON.stringify(storedData.data, null, 2);
    const calculatedChecksum = this.calculateChecksum(jsonData);

    if (calculatedChecksum !== storedData.checksum) {
      throw new Error(
        `Checksum mismatch for ${filePath}: expected ${storedData.checksum}, got ${calculatedChecksum}`,
      );
    }

    return storedData.data;
  }

  /**
   * 计算 CRC32 校验和
   * ECP-D3: 使用常量而不是魔术字符串
   */
  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * 调试日志
   */
  private debugLog(message: string): void {
    console.log(`[${this.nodeId}] [FILE_STORAGE] ${message}`);
  }
}
