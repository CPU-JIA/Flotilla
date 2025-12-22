/**
 * Git State Machine Unit Tests
 *
 * 测试基于 Raft 的 Git 状态机：
 * - 项目和仓库管理命令
 * - Git 操作命令（commit, branch, merge）
 * - 文件操作命令
 * - 快照创建和恢复
 * - 状态查询
 *
 * ECP-B4: TDD - 测试驱动开发
 * ECP-C1: 防御性编程 - 测试命令验证和错误处理
 * ECP-D1: 可测试性 - 状态机独立测试
 */

import { GitStateMachine } from './git-state-machine';
import { CommandType, type Command } from './types';

describe('GitStateMachine - Git 状态机测试', () => {
  let stateMachine: GitStateMachine;

  beforeEach(() => {
    // 静默控制台输出
    jest.spyOn(console, 'log').mockImplementation(() => {});

    stateMachine = new GitStateMachine('test-node');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('项目管理命令', () => {
    describe('CREATE_PROJECT', () => {
      it('应成功创建项目和关联仓库', async () => {
        const command: Command = {
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Test Project',
            description: 'A test project',
            ownerId: 'user-1',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.project).toMatchObject({
          id: 'proj-1',
          name: 'Test Project',
          description: 'A test project',
          ownerId: 'user-1',
        });

        expect(result.repository).toBeDefined();
        expect(result.repository.name).toBe('Test Project');
        expect(result.repository.defaultBranch).toBe('main');
      });

      it('创建的项目应自动关联仓库', async () => {
        const command: Command = {
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Test Project',
            description: 'Test',
            ownerId: 'user-1',
          },
        };

        await stateMachine.apply(command);

        const project = stateMachine.getProject('proj-1');
        expect(project?.repositoryId).toBeDefined();

        const repo = stateMachine.getRepository(project!.repositoryId!);
        expect(repo).toBeDefined();
      });

      it('新创建的仓库应有默认 main 分支', async () => {
        const command: Command = {
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Test Project',
            description: 'Test',
            ownerId: 'user-1',
          },
        };

        const result = await stateMachine.apply(command);

        const branches = Array.from(result.repository.branches.keys());
        expect(branches).toContain('main');
      });

      it('应拒绝创建重复 ID 的项目', async () => {
        const command: Command = {
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Test Project',
            ownerId: 'user-1',
          },
        };

        await stateMachine.apply(command);

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Project proj-1 already exists',
        );
      });
    });

    describe('UPDATE_PROJECT', () => {
      beforeEach(async () => {
        await stateMachine.apply({
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Original Name',
            description: 'Original Description',
            ownerId: 'user-1',
          },
        });
      });

      it('应成功更新项目信息', async () => {
        const command: Command = {
          type: CommandType.UPDATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Updated Name',
            description: 'Updated Description',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.name).toBe('Updated Name');
        expect(result.description).toBe('Updated Description');
      });

      it('应保留未更新的字段', async () => {
        const command: Command = {
          type: CommandType.UPDATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'New Name',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.name).toBe('New Name');
        expect(result.description).toBe('Original Description');
        expect(result.ownerId).toBe('user-1');
      });

      it('应拒绝更新不存在的项目', async () => {
        const command: Command = {
          type: CommandType.UPDATE_PROJECT,
          payload: {
            id: 'non-existent',
            name: 'New Name',
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Project non-existent not found',
        );
      });
    });

    describe('DELETE_PROJECT', () => {
      beforeEach(async () => {
        await stateMachine.apply({
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: 'proj-1',
            name: 'Test Project',
            ownerId: 'user-1',
          },
        });
      });

      it('应成功删除项目', async () => {
        const command: Command = {
          type: CommandType.DELETE_PROJECT,
          payload: { id: 'proj-1' },
        };

        const result = await stateMachine.apply(command);

        expect(result.deleted).toBe(true);
        expect(stateMachine.getProject('proj-1')).toBeUndefined();
      });

      it('删除项目时应同时删除关联仓库', async () => {
        const project = stateMachine.getProject('proj-1');
        const repoId = project?.repositoryId;

        await stateMachine.apply({
          type: CommandType.DELETE_PROJECT,
          payload: { id: 'proj-1' },
        });

        expect(stateMachine.getRepository(repoId!)).toBeUndefined();
      });

      it('应拒绝删除不存在的项目', async () => {
        const command: Command = {
          type: CommandType.DELETE_PROJECT,
          payload: { id: 'non-existent' },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Project non-existent not found',
        );
      });
    });
  });

  describe('Git 操作命令', () => {
    let repoId: string;

    beforeEach(async () => {
      const result = await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Test Project',
          ownerId: 'user-1',
        },
      });
      repoId = result.repository.id;
    });

    describe('GIT_COMMIT', () => {
      it('应成功创建提交', async () => {
        const command: Command = {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Initial commit',
            author: 'test@example.com',
            files: [
              {
                path: 'README.md',
                content: '# Test Project',
                mimeType: 'text/markdown',
              },
            ],
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.commit).toBeDefined();
        expect(result.commit.message).toBe('Initial commit');
        expect(result.commit.author).toBe('test@example.com');
        expect(result.branch).toBe('main');
      });

      it('提交应包含文件变更', async () => {
        const command: Command = {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Add files',
            author: 'test@example.com',
            files: [
              { path: 'file1.txt', content: 'Content 1' },
              { path: 'file2.txt', content: 'Content 2' },
            ],
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.commit.files.size).toBe(2);
        expect(result.commit.files.has('file1.txt')).toBe(true);
        expect(result.commit.files.has('file2.txt')).toBe(true);
      });

      it('提交应更新分支 HEAD', async () => {
        const command: Command = {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Test commit',
            author: 'test@example.com',
            files: [{ path: 'test.txt', content: 'test' }],
          },
        };

        const result = await stateMachine.apply(command);

        const commits = stateMachine.getBranchCommits(repoId, 'main');
        const latestCommit = commits[commits.length - 1];

        expect(latestCommit.hash).toBe(result.commit.hash);
      });

      it('提交应记录父提交', async () => {
        // 第一次提交
        const commit1 = await stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'First commit',
            author: 'test@example.com',
            files: [{ path: 'file1.txt', content: 'content' }],
          },
        });

        // 第二次提交
        const commit2 = await stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Second commit',
            author: 'test@example.com',
            files: [{ path: 'file2.txt', content: 'content' }],
          },
        });

        expect(commit2.commit.parent).toBe(commit1.commit.hash);
      });

      it('应拒绝不存在的仓库', async () => {
        const command: Command = {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: 'non-existent',
            branchName: 'main',
            message: 'Test',
            author: 'test@example.com',
            files: [],
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Repository non-existent not found',
        );
      });

      it('应拒绝不存在的分支', async () => {
        const command: Command = {
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'non-existent',
            message: 'Test',
            author: 'test@example.com',
            files: [],
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Branch non-existent not found',
        );
      });
    });

    describe('GIT_CREATE_BRANCH', () => {
      beforeEach(async () => {
        // 先在 main 分支创建一些提交
        await stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Initial commit',
            author: 'test@example.com',
            files: [{ path: 'README.md', content: '# Test' }],
          },
        });
      });

      it('应成功创建新分支', async () => {
        const command: Command = {
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'develop',
            fromBranch: 'main',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.branch).toBe('develop');
        expect(result.repository).toBe(repoId);
      });

      it('新分支应复制源分支的提交历史', async () => {
        const mainCommits = stateMachine.getBranchCommits(repoId, 'main');

        await stateMachine.apply({
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'feature',
            fromBranch: 'main',
          },
        });

        const featureCommits = stateMachine.getBranchCommits(repoId, 'feature');

        expect(featureCommits.length).toBe(mainCommits.length);
        expect(featureCommits[0].hash).toBe(mainCommits[0].hash);
      });

      it('未指定源分支时应从默认分支创建', async () => {
        const command: Command = {
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'feature',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.branch).toBe('feature');
      });

      it('应拒绝创建重复的分支', async () => {
        await stateMachine.apply({
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'develop',
          },
        });

        const command: Command = {
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'develop',
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Branch develop already exists',
        );
      });

      it('应拒绝从不存在的源分支创建', async () => {
        const command: Command = {
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'feature',
            fromBranch: 'non-existent',
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Source branch non-existent not found',
        );
      });
    });

    describe('GIT_MERGE', () => {
      beforeEach(async () => {
        // 在 main 上创建初始提交
        await stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Initial commit',
            author: 'test@example.com',
            files: [{ path: 'README.md', content: '# Test' }],
          },
        });

        // 创建 feature 分支
        await stateMachine.apply({
          type: CommandType.GIT_CREATE_BRANCH,
          payload: {
            repositoryId: repoId,
            branchName: 'feature',
            fromBranch: 'main',
          },
        });

        // 在 feature 分支上创建提交
        await stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'feature',
            message: 'Feature work',
            author: 'test@example.com',
            files: [{ path: 'feature.txt', content: 'New feature' }],
          },
        });
      });

      it('应成功合并分支', async () => {
        const command: Command = {
          type: CommandType.GIT_MERGE,
          payload: {
            repositoryId: repoId,
            sourceBranch: 'feature',
            targetBranch: 'main',
            message: 'Merge feature into main',
            author: 'test@example.com',
          },
        };

        const result = await stateMachine.apply(command);

        // ECP-B2: KISS - 合并提交测试合并到一起
        expect(result.mergeCommit).toBeDefined();
        expect(result.targetBranch).toBe('main');
        expect(result.mergeCommit.message).toBe('Merge feature into main');
      });

      it('应拒绝不存在的源分支', async () => {
        const command: Command = {
          type: CommandType.GIT_MERGE,
          payload: {
            repositoryId: repoId,
            sourceBranch: 'non-existent',
            targetBranch: 'main',
            message: 'Merge',
            author: 'test@example.com',
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Source or target branch not found',
        );
      });

      it('应拒绝不存在的目标分支', async () => {
        const command: Command = {
          type: CommandType.GIT_MERGE,
          payload: {
            repositoryId: repoId,
            sourceBranch: 'feature',
            targetBranch: 'non-existent',
            message: 'Merge',
            author: 'test@example.com',
          },
        };

        await expect(stateMachine.apply(command)).rejects.toThrow(
          'Source or target branch not found',
        );
      });
    });
  });

  describe('文件操作命令', () => {
    let repoId: string;

    beforeEach(async () => {
      const result = await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Test Project',
          ownerId: 'user-1',
        },
      });
      repoId = result.repository.id;
    });

    describe('CREATE_FILE', () => {
      it('应通过 Git 提交创建文件', async () => {
        const command: Command = {
          type: CommandType.CREATE_FILE,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            filePath: 'src/index.ts',
            content: 'console.log("Hello")',
            author: 'test@example.com',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.commit).toBeDefined();
        expect(result.commit.message).toContain('create');
      });
    });

    describe('UPDATE_FILE', () => {
      it('应通过 Git 提交更新文件', async () => {
        const command: Command = {
          type: CommandType.UPDATE_FILE,
          payload: {
            repositoryId: repoId,
            filePath: 'README.md',
            content: 'Updated content',
            author: 'test@example.com',
            message: 'Update README',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.commit).toBeDefined();
        expect(result.commit.message).toBe('Update README');
      });
    });

    describe('DELETE_FILE', () => {
      it('应通过 Git 提交删除文件', async () => {
        const command: Command = {
          type: CommandType.DELETE_FILE,
          payload: {
            repositoryId: repoId,
            filePath: 'old-file.txt',
            author: 'test@example.com',
          },
        };

        const result = await stateMachine.apply(command);

        expect(result.commit).toBeDefined();
        expect(result.commit.message).toContain('delete');
      });
    });
  });

  describe('快照管理', () => {
    beforeEach(async () => {
      // 创建一些测试数据
      await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Project 1',
          ownerId: 'user-1',
        },
      });

      await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-2',
          name: 'Project 2',
          ownerId: 'user-2',
        },
      });
    });

    it('应成功创建快照', async () => {
      const snapshot = await stateMachine.createSnapshot();

      expect(snapshot).toBeInstanceOf(Buffer);
      expect(snapshot.length).toBeGreaterThan(0);
    });

    it('快照应包含完整状态', async () => {
      const snapshot = await stateMachine.createSnapshot();
      const data = JSON.parse(snapshot.toString());

      expect(data.projects).toBeDefined();
      expect(data.repositories).toBeDefined();
      expect(data.users).toBeDefined();
      expect(data.lastAppliedIndex).toBeDefined();
    });

    it('应成功从快照恢复状态', async () => {
      const snapshot = await stateMachine.createSnapshot();

      const newStateMachine = new GitStateMachine('test-node-2');
      await newStateMachine.restoreFromSnapshot(snapshot);

      expect(newStateMachine.getProject('proj-1')).toBeDefined();
      expect(newStateMachine.getProject('proj-2')).toBeDefined();
    });

    it('恢复后应有相同的项目数量', async () => {
      const originalState = stateMachine.getState();
      const snapshot = await stateMachine.createSnapshot();

      const newStateMachine = new GitStateMachine('test-node-2');
      await newStateMachine.restoreFromSnapshot(snapshot);

      const restoredState = newStateMachine.getState();
      expect(restoredState.projectCount).toBe(originalState.projectCount);
      expect(restoredState.repositoryCount).toBe(originalState.repositoryCount);
    });

    it('应拒绝无效的快照数据', async () => {
      const invalidSnapshot = Buffer.from('invalid json');

      await expect(
        stateMachine.restoreFromSnapshot(invalidSnapshot),
      ).rejects.toThrow('Failed to restore from snapshot');
    });
  });

  describe('状态查询', () => {
    let repoId: string;

    beforeEach(async () => {
      const result = await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Test Project',
          ownerId: 'user-1',
        },
      });
      repoId = result.repository.id;

      await stateMachine.apply({
        type: CommandType.GIT_COMMIT,
        payload: {
          repositoryId: repoId,
          branchName: 'main',
          message: 'Initial commit',
          author: 'test@example.com',
          files: [{ path: 'README.md', content: '# Test' }],
        },
      });
    });

    it('getState 应返回状态摘要', () => {
      const state = stateMachine.getState();

      expect(state.projectCount).toBe(1);
      expect(state.repositoryCount).toBe(1);
      expect(state.nodeId).toBe('test-node');
    });

    it('getProject 应返回指定项目', () => {
      const project = stateMachine.getProject('proj-1');

      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
    });

    it('getRepository 应返回指定仓库', () => {
      const repo = stateMachine.getRepository(repoId);

      expect(repo).toBeDefined();
      expect(repo?.name).toBe('Test Project');
    });

    it('getAllProjects 应返回所有项目', () => {
      const projects = stateMachine.getAllProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('proj-1');
    });

    it('getProjectRepository 应返回项目关联的仓库', () => {
      const repo = stateMachine.getProjectRepository('proj-1');

      expect(repo).toBeDefined();
      expect(repo?.id).toBe(repoId);
    });

    it('getBranchCommits 应返回分支的提交历史', () => {
      const commits = stateMachine.getBranchCommits(repoId, 'main');

      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Initial commit');
    });

    it('查询不存在的项目应返回 undefined', () => {
      expect(stateMachine.getProject('non-existent')).toBeUndefined();
    });

    it('查询不存在的仓库应返回 undefined', () => {
      expect(stateMachine.getRepository('non-existent')).toBeUndefined();
    });

    it('查询不存在的分支应返回空数组', () => {
      const commits = stateMachine.getBranchCommits(repoId, 'non-existent');
      expect(commits).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    it('应拒绝未知的命令类型', async () => {
      const command: Command = {
        type: 'UNKNOWN_COMMAND' as CommandType,
        payload: {},
      };

      await expect(stateMachine.apply(command)).rejects.toThrow(
        'Unknown command type',
      );
    });

    it('应处理缺失的命令 payload 字段', async () => {
      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {},
      };

      // 不应崩溃，应创建项目（可能字段为 undefined）
      await expect(stateMachine.apply(command)).resolves.toBeDefined();
    });

    it('apply 失败应返回明确的错误信息', async () => {
      const command: Command = {
        type: CommandType.UPDATE_PROJECT,
        payload: { id: 'non-existent' },
      };

      await expect(stateMachine.apply(command)).rejects.toThrow(
        'Project non-existent not found',
      );
    });
  });

  describe('并发和数据一致性', () => {
    it('应顺序处理多个命令', async () => {
      const commands: Command[] = [];

      for (let i = 1; i <= 10; i++) {
        commands.push({
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: `proj-${i}`,
            name: `Project ${i}`,
            ownerId: 'user-1',
          },
        });
      }

      for (const command of commands) {
        await stateMachine.apply(command);
      }

      const projects = stateMachine.getAllProjects();
      expect(projects).toHaveLength(10);
    });

    it('应保持项目和仓库的关联一致性', async () => {
      await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Test',
          ownerId: 'user-1',
        },
      });

      const project = stateMachine.getProject('proj-1');
      const repo = stateMachine.getRepository(project!.repositoryId!);

      expect(repo).toBeDefined();
      expect(repo?.name).toBe(project?.name);
    });
  });

  describe('边界条件', () => {
    it('应处理空 payload', async () => {
      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {},
      };

      await expect(stateMachine.apply(command)).resolves.toBeDefined();
    });

    it('应处理特殊字符', async () => {
      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: '测试项目 🚀',
          description: 'Project with émojis and 中文',
          ownerId: 'user-1',
        },
      };

      const result = await stateMachine.apply(command);
      expect(result.project.name).toBe('测试项目 🚀');
    });

    it('应处理大型 payload', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB

      const result = await stateMachine.apply({
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'proj-1',
          name: 'Test',
          ownerId: 'user-1',
        },
      });

      const repoId = result.repository.id;

      await expect(
        stateMachine.apply({
          type: CommandType.GIT_COMMIT,
          payload: {
            repositoryId: repoId,
            branchName: 'main',
            message: 'Large commit',
            author: 'test@example.com',
            files: [{ path: 'large.txt', content: largeContent }],
          },
        }),
      ).resolves.toBeDefined();
    });
  });
});
