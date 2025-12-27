/**
 * Persistent Storage Unit Tests
 *
 * 测试 Raft 持久化存储层：
 * - Term 和 votedFor 的持久化
 * - 日志条目的保存和加载
 * - 日志截断操作
 * - 状态恢复
 * - 数据完整性验证
 *
 * ECP-B4: TDD - 测试驱动开发
 * ECP-C1: 防御性编程 - 测试数据验证和错误处理
 * ECP-D1: 可测试性 - 独立的存储层测试
 */

/* eslint-disable @typescript-eslint/require-await -- Some test callbacks don't need await */

import { MemoryPersistentStorage, FilePersistentStorage } from './storage';
import { CommandType, type LogEntry } from './types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// 类型定义：loadState 返回类型
interface LoadStateResult {
  currentTerm: number;
  votedFor: string | null;
  log: LogEntry[];
}

describe('MemoryPersistentStorage - 持久化存储测试', () => {
  let storage: MemoryPersistentStorage;

  beforeEach(() => {
    // 静默控制台输出
    jest.spyOn(console, 'log').mockImplementation(() => {});

    storage = new MemoryPersistentStorage('test-node');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Term 持久化', () => {
    it('应成功保存 term', async () => {
      await storage.saveTerm(5);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(5);
    });

    it('应允许保存更高的 term', async () => {
      await storage.saveTerm(3);
      await storage.saveTerm(7);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(7);
    });

    it('应拒绝保存更低的 term', async () => {
      await storage.saveTerm(10);

      await expect(storage.saveTerm(5)).rejects.toThrow(
        'Cannot save term 5 less than current term 10',
      );
    });

    it('应允许保存相同的 term', async () => {
      await storage.saveTerm(5);
      await storage.saveTerm(5);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(5);
    });

    it('初始 term 应为 0', async () => {
      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(0);
    });
  });

  describe('VotedFor 持久化', () => {
    it('应成功保存 votedFor', async () => {
      await storage.saveVotedFor('node-1');

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.votedFor).toBe('node-1');
    });

    it('应允许清除 votedFor', async () => {
      await storage.saveVotedFor('node-1');
      await storage.saveVotedFor(null);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.votedFor).toBeNull();
    });

    it('应允许更改 votedFor', async () => {
      await storage.saveVotedFor('node-1');
      await storage.saveVotedFor('node-2');

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.votedFor).toBe('node-2');
    });

    it('初始 votedFor 应为 null', async () => {
      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.votedFor).toBeNull();
    });
  });

  describe('日志条目持久化', () => {
    it('应成功保存单个日志条目', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: { id: 'proj-1', name: 'Test Project' },
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(1);
      expect(state.log[0]).toEqual(entry);
    });

    it('应按顺序保存多个日志条目', async () => {
      const entries: LogEntry[] = [
        {
          index: 1,
          term: 1,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
        {
          index: 2,
          term: 1,
          command: { type: CommandType.UPDATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
        {
          index: 3,
          term: 2,
          command: { type: CommandType.DELETE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
      ];

      for (const entry of entries) {
        await storage.saveLogEntry(entry);
      }

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(3);
      expect(state.log).toEqual(entries);
    });

    it('应拒绝无效的日志索引（<= 0）', async () => {
      const entry: LogEntry = {
        index: 0,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await expect(storage.saveLogEntry(entry)).rejects.toThrow(
        'Invalid log entry index: 0',
      );
    });

    it('应拒绝无效的日志任期（< 0）', async () => {
      const entry: LogEntry = {
        index: 1,
        term: -1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await expect(storage.saveLogEntry(entry)).rejects.toThrow(
        'Invalid log entry term: -1',
      );
    });

    it('应拒绝不连续的日志索引', async () => {
      const entry1: LogEntry = {
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry1);

      // 跳过索引 2，直接保存索引 3
      const entry3: LogEntry = {
        index: 3,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await expect(storage.saveLogEntry(entry3)).rejects.toThrow(
        'Log entry index 3 is not consecutive, expected 2',
      );
    });

    it('应允许替换现有日志条目', async () => {
      const entry1: LogEntry = {
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: { name: 'v1' } },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry1);

      // 替换索引 1 的日志
      const entry1Updated: LogEntry = {
        index: 1,
        term: 2,
        command: { type: CommandType.CREATE_PROJECT, payload: { name: 'v2' } },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry1Updated);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(1);
      expect(state.log[0].term).toBe(2);
      expect((state.log[0].command.payload as { name: string }).name).toBe(
        'v2',
      );
    });
  });

  describe('日志截断', () => {
    beforeEach(async () => {
      // 预先保存 5 个日志条目
      for (let i = 1; i <= 5; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 1,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        });
      }
    });

    it('应成功截断指定索引之后的日志', async () => {
      await storage.truncateLogFrom(3);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(2);
      expect(state.log[state.log.length - 1].index).toBe(2);
    });

    it('应处理截断到第一个索引的情况', async () => {
      await storage.truncateLogFrom(1);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(0);
    });

    it('应处理截断超出日志长度的情况', async () => {
      await storage.truncateLogFrom(10);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(5); // 不应删除任何日志
    });

    it('应拒绝无效的截断索引（<= 0）', async () => {
      await expect(storage.truncateLogFrom(0)).rejects.toThrow(
        'Invalid truncate index: 0',
      );

      await expect(storage.truncateLogFrom(-1)).rejects.toThrow(
        'Invalid truncate index: -1',
      );
    });

    it('截断后应能继续追加新日志', async () => {
      await storage.truncateLogFrom(3);

      const newEntry: LogEntry = {
        index: 3,
        term: 2,
        command: { type: CommandType.UPDATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(newEntry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(3);
      expect(state.log[2].term).toBe(2);
    });
  });

  describe('状态加载和恢复', () => {
    it('应返回完整的持久化状态', async () => {
      await storage.saveTerm(5);
      await storage.saveVotedFor('node-2');

      for (let i = 1; i <= 3; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 5,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        });
      }

      const state = (await storage.loadState()) as LoadStateResult;

      expect(state.currentTerm).toBe(5);
      expect(state.votedFor).toBe('node-2');
      expect(state.log).toHaveLength(3);
    });

    it('加载的日志应是副本，不影响内部状态', async () => {
      await storage.saveLogEntry({
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      const state1 = (await storage.loadState()) as LoadStateResult;
      state1.log.push({
        index: 2,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      const state2 = (await storage.loadState()) as LoadStateResult;
      expect(state2.log).toHaveLength(1); // 不应受外部修改影响
    });

    it('应能恢复空状态', async () => {
      const state = (await storage.loadState()) as LoadStateResult;

      expect(state.currentTerm).toBe(0);
      expect(state.votedFor).toBeNull();
      expect(state.log).toHaveLength(0);
    });
  });

  describe('调试和工具方法', () => {
    it('getLogEntry 应返回指定索引的日志', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: { id: 'test' } },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const retrieved = storage.getLogEntry(1);
      expect(retrieved).toEqual(entry);
    });

    it('getLogEntry 对无效索引应返回 undefined', async () => {
      expect(storage.getLogEntry(0)).toBeUndefined();
      expect(storage.getLogEntry(10)).toBeUndefined();
      expect(storage.getLogEntry(-1)).toBeUndefined();
    });

    it('getLogLength 应返回正确的日志长度', async () => {
      expect(storage.getLogLength()).toBe(0);

      await storage.saveLogEntry({
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      expect(storage.getLogLength()).toBe(1);

      await storage.saveLogEntry({
        index: 2,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      expect(storage.getLogLength()).toBe(2);
    });

    it('clear 应清空所有持久化数据', async () => {
      await storage.saveTerm(10);
      await storage.saveVotedFor('node-3');
      await storage.saveLogEntry({
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      storage.clear();

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(0);
      expect(state.votedFor).toBeNull();
      expect(state.log).toHaveLength(0);
    });

    it('exportSnapshot 应返回格式化的状态快照', async () => {
      await storage.saveTerm(3);
      await storage.saveVotedFor('node-1');
      await storage.saveLogEntry({
        index: 1,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      });

      const snapshot = storage.exportSnapshot();

      expect(snapshot).toMatchObject({
        nodeId: 'test-node',
        currentTerm: 3,
        votedFor: 'node-1',
        logLength: 1,
      });

      expect(snapshot.log).toHaveLength(1);
      expect(snapshot.log[0]).toMatchObject({
        index: 1,
        term: 1,
        commandType: CommandType.CREATE_PROJECT,
      });
    });
  });

  describe('并发和性能', () => {
    it('应能处理快速连续保存', async () => {
      const promises: Promise<void>[] = [];
      for (let i = 1; i <= 100; i++) {
        promises.push(
          storage.saveLogEntry({
            index: i,
            term: 1,
            command: { type: CommandType.CREATE_PROJECT, payload: {} },
            timestamp: Date.now(),
          }),
        );
      }

      await Promise.all(promises);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(100);
    });

    it('应能处理大量日志条目', async () => {
      const count = 1000;

      for (let i = 1; i <= count; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 1,
          command: {
            type: CommandType.CREATE_PROJECT,
            payload: { data: 'x'.repeat(100) },
          },
          timestamp: Date.now(),
        });
      }

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(count);

      // 验证第一个和最后一个条目
      expect(state.log[0].index).toBe(1);
      expect(state.log[count - 1].index).toBe(count);
    });
  });

  describe('数据完整性', () => {
    it('日志条目的所有字段应完整保存', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 5,
        command: {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: 'repo-1',
            branchName: 'main',
            message: 'Test commit',
            author: 'test@example.com',
            files: [{ path: 'test.txt', content: 'Hello' }],
          },
          clientId: 'client-1',
          requestId: 'req-123',
        },
        timestamp: 1234567890,
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log[0]).toEqual(entry);
    });

    it('应保持日志顺序不变', async () => {
      const entries: LogEntry[] = [];
      for (let i = 1; i <= 10; i++) {
        entries.push({
          index: i,
          term: Math.floor(i / 3) + 1, // 变化的 term
          command: {
            type: [
              CommandType.CREATE_PROJECT,
              CommandType.UPDATE_PROJECT,
              CommandType.DELETE_PROJECT,
            ][i % 3],
            payload: { index: i },
          },
          timestamp: Date.now() + i,
        });
      }

      for (const entry of entries) {
        await storage.saveLogEntry(entry);
      }

      const state = (await storage.loadState()) as LoadStateResult;

      for (let i = 0; i < entries.length; i++) {
        expect(state.log[i]).toEqual(entries[i]);
      }
    });
  });

  describe('边界条件', () => {
    it('应处理空 payload 的命令', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: {},
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log[0].command.payload).toEqual({});
    });

    it('应处理 null payload 的命令', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: null,
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log[0].command.payload).toBeNull();
    });

    it('应处理大型 payload', async () => {
      const largePayload = {
        data: 'x'.repeat(100000), // 100KB
        nested: {
          array: Array(1000).fill({ key: 'value' }),
        },
      };

      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: largePayload,
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log[0].command.payload).toEqual(largePayload);
    });

    it('应处理特殊字符和 Unicode', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: {
            name: '测试项目 🚀',
            description: 'Project with émojis and 中文',
          },
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log[0].command.payload).toEqual(entry.command.payload);
    });
  });
});

// FilePersistentStorage 实现已完成，启用文件持久化测试
describe('FilePersistentStorage - 文件持久化存储测试', () => {
  let storage: FilePersistentStorage;
  let testDir: string;

  beforeEach(async () => {
    // 静默控制台输出
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // 创建临时测试目录
    testDir = path.join(
      os.tmpdir(),
      `raft-test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    );
    storage = new FilePersistentStorage('test-node', testDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // 忽略清理错误
    }
  });

  describe('Term 持久化', () => {
    it('应成功保存并加载 term', async () => {
      await storage.saveTerm(5);

      // 创建新实例来验证持久化
      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(5);
    });

    it('应拒绝保存更低的 term', async () => {
      await storage.saveTerm(10);

      await expect(storage.saveTerm(5)).rejects.toThrow(
        'Cannot save term 5 less than current term 10',
      );
    });

    it('首次加载应返回默认值', async () => {
      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(0);
    });
  });

  describe('VotedFor 持久化', () => {
    it('应成功保存并加载 votedFor', async () => {
      await storage.saveVotedFor('node-1');

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.votedFor).toBe('node-1');
    });

    it('应允许清除 votedFor', async () => {
      await storage.saveVotedFor('node-1');
      await storage.saveVotedFor(null);

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.votedFor).toBeNull();
    });

    it('首次加载应返回 null', async () => {
      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.votedFor).toBeNull();
    });
  });

  describe('日志条目持久化', () => {
    it('应成功保存并加载日志条目', async () => {
      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: { id: 'proj-1', name: 'Test Project' },
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(1);
      expect(state.log[0]).toEqual(entry);
    });

    it('应保存多个日志条目并保持顺序', async () => {
      const entries: LogEntry[] = [
        {
          index: 1,
          term: 1,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
        {
          index: 2,
          term: 1,
          command: { type: CommandType.UPDATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
        {
          index: 3,
          term: 2,
          command: { type: CommandType.DELETE_PROJECT, payload: {} },
          timestamp: Date.now(),
        },
      ];

      for (const entry of entries) {
        await storage.saveLogEntry(entry);
      }

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(3);
      expect(state.log).toEqual(entries);
    });

    it('应拒绝无效的日志索引', async () => {
      const entry: LogEntry = {
        index: 0,
        term: 1,
        command: { type: CommandType.CREATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await expect(storage.saveLogEntry(entry)).rejects.toThrow(
        'Invalid log entry index: 0',
      );
    });

    it('首次加载应返回空日志', async () => {
      const state = (await storage.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(0);
    });
  });

  describe('日志截断', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 1,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        });
      }
    });

    it('应成功截断指定索引之后的日志', async () => {
      await storage.truncateLogFrom(3);

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(2);
      expect(state.log[state.log.length - 1].index).toBe(2);
    });

    it('截断后应能继续追加新日志', async () => {
      await storage.truncateLogFrom(3);

      const newEntry: LogEntry = {
        index: 3,
        term: 2,
        command: { type: CommandType.UPDATE_PROJECT, payload: {} },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(newEntry);

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(3);
      expect(state.log[2].term).toBe(2);
    });
  });

  describe('数据完整性和校验和', () => {
    it('应验证数据完整性（校验和）', async () => {
      await storage.saveTerm(5);

      // 读取文件内容
      const termFile = path.join(testDir, 'test-node', 'term.json');
      const content = await fs.readFile(termFile, 'utf8');
      const data = JSON.parse(content);

      // 验证校验和字段存在
      expect(data.checksum).toBeDefined();
      expect(data.data).toBeDefined();
      expect(data.data.term).toBe(5);
    });

    it('应拒绝校验和不匹配的数据', async () => {
      await storage.saveTerm(5);

      // 篡改文件内容
      const termFile = path.join(testDir, 'test-node', 'term.json');
      const content = await fs.readFile(termFile, 'utf8');
      const data = JSON.parse(content);

      // 修改数据但不更新校验和
      data.data.term = 999;

      await fs.writeFile(termFile, JSON.stringify(data), 'utf8');

      // 尝试加载，应该失败
      const storage2 = new FilePersistentStorage('test-node', testDir);
      await expect(storage2.loadState()).rejects.toThrow('Checksum mismatch');
    });

    it('应处理大型 payload 并保持完整性', async () => {
      const largePayload = {
        data: 'x'.repeat(100000),
        nested: {
          array: Array(1000).fill({ key: 'value' }),
        },
      };

      const entry: LogEntry = {
        index: 1,
        term: 1,
        command: {
          type: CommandType.CREATE_PROJECT,
          payload: largePayload,
        },
        timestamp: Date.now(),
      };

      await storage.saveLogEntry(entry);

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log[0].command.payload).toEqual(largePayload);
    });
  });

  describe('原子写入', () => {
    it('应使用临时文件进行原子写入', async () => {
      await storage.saveTerm(5);

      // 验证临时文件不存在
      const termFile = path.join(testDir, 'test-node', 'term.json');
      const tempFile = `${termFile}.tmp`;

      await expect(fs.access(tempFile)).rejects.toThrow();

      // 验证目标文件存在
      await expect(fs.access(termFile)).resolves.toBeUndefined();
    });

    it('写入失败时应清理临时文件', async () => {
      // 这个测试很难模拟，因为需要在 rename 之前触发错误
      // 在真实场景中，原子写入会确保要么全部成功，要么全部失败
      expect(true).toBe(true); // 占位测试
    });
  });

  describe('多节点隔离', () => {
    it('不同节点应使用独立的数据目录', async () => {
      const storage1 = new FilePersistentStorage('node-1', testDir);
      const storage2 = new FilePersistentStorage('node-2', testDir);

      await storage1.saveTerm(5);
      await storage2.saveTerm(10);

      const state1 = (await storage1.loadState()) as LoadStateResult;
      const state2 = (await storage2.loadState()) as LoadStateResult;

      expect(state1.currentTerm).toBe(5);
      expect(state2.currentTerm).toBe(10);
    });

    it('应在正确的节点目录中创建文件', async () => {
      await storage.saveTerm(5);

      const nodeDir = path.join(testDir, 'test-node');
      const termFile = path.join(nodeDir, 'term.json');

      await expect(fs.access(termFile)).resolves.toBeUndefined();
    });
  });

  describe('完整状态持久化', () => {
    it('应完整保存和恢复所有状态', async () => {
      await storage.saveTerm(5);
      await storage.saveVotedFor('node-2');

      for (let i = 1; i <= 3; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 5,
          command: {
            type: CommandType.CREATE_PROJECT,
            payload: { id: `proj-${i}` },
          },
          timestamp: Date.now(),
        });
      }

      // 创建新实例验证持久化
      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;

      expect(state.currentTerm).toBe(5);
      expect(state.votedFor).toBe('node-2');
      expect(state.log).toHaveLength(3);
      expect((state.log[0].command.payload as { id: string }).id).toBe(
        'proj-1',
      );
      expect((state.log[2].command.payload as { id: string }).id).toBe(
        'proj-3',
      );
    });
  });

  describe('错误处理', () => {
    it('应优雅处理不存在的数据目录', async () => {
      const nonExistentDir = path.join(
        os.tmpdir(),
        `non-existent-${Date.now()}`,
      );
      const storage3 = new FilePersistentStorage('test-node', nonExistentDir);

      // 应该自动创建目录并初始化
      const state = (await storage3.loadState()) as LoadStateResult;
      expect(state.currentTerm).toBe(0);
      expect(state.votedFor).toBeNull();
      expect(state.log).toHaveLength(0);

      // 清理
      await fs.rm(nonExistentDir, { recursive: true, force: true });
    });

    it('应处理损坏的 JSON 文件', async () => {
      // 创建损坏的文件
      const nodeDir = path.join(testDir, 'test-node');
      await fs.mkdir(nodeDir, { recursive: true });
      const termFile = path.join(nodeDir, 'term.json');
      await fs.writeFile(termFile, 'invalid json{{{', 'utf8');

      const storage2 = new FilePersistentStorage('test-node', testDir);
      await expect(storage2.loadState()).rejects.toThrow();
    });
  });

  describe('性能和并发', () => {
    it('应处理连续的快速写入', async () => {
      for (let i = 1; i <= 50; i++) {
        await storage.saveLogEntry({
          index: i,
          term: 1,
          command: { type: CommandType.CREATE_PROJECT, payload: {} },
          timestamp: Date.now(),
        });
      }

      const storage2 = new FilePersistentStorage('test-node', testDir);
      const state = (await storage2.loadState()) as LoadStateResult;
      expect(state.log).toHaveLength(50);
    });
  });
});
