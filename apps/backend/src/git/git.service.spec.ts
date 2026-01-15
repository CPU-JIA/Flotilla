/**
 * Git Service (Facade) Unit Tests
 *
 * Tests for the GitService facade pattern:
 * - Verifies correct delegation to sub-services
 * - Tests all public API methods
 *
 * ECP-D1: Testability - Facade delegation verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GitService } from './git.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitRepositoryService } from './services/git-repository.service';
import { GitBranchService } from './services/git-branch.service';
import { GitCommitService } from './services/git-commit.service';
import { GitDiffService } from './services/git-diff.service';
import { GitMergeService } from './services/git-merge.service';

describe('GitService (Facade)', () => {
  let service: GitService;
  let repositoryService: jest.Mocked<GitRepositoryService>;
  let branchService: jest.Mocked<GitBranchService>;
  let commitService: jest.Mocked<GitCommitService>;
  let diffService: jest.Mocked<GitDiffService>;
  let mergeService: jest.Mocked<GitMergeService>;

  const mockProjectId = 'test-project-789';
  const mockAuthor = { name: 'Test User', email: 'test@example.com' };

  beforeEach(async () => {
    // Create mock implementations
    const mockRepositoryService = {
      initRepository: jest.fn(),
      createInitialCommit: jest.fn(),
    };

    const mockBranchService = {
      createBranch: jest.fn(),
      deleteBranch: jest.fn(),
      listBranches: jest.fn(),
      getCurrentBranch: jest.fn(),
    };

    const mockCommitService = {
      createCommit: jest.fn(),
      getCommitLog: jest.fn(),
      readBlob: jest.fn(),
      listFiles: jest.fn(),
    };

    const mockDiffService = {
      getDiff: jest.fn(),
    };

    const mockMergeService = {
      mergeCommit: jest.fn(),
      squashMerge: jest.fn(),
      rebaseMerge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitService,
        { provide: PrismaService, useValue: {} },
        { provide: GitRepositoryService, useValue: mockRepositoryService },
        { provide: GitBranchService, useValue: mockBranchService },
        { provide: GitCommitService, useValue: mockCommitService },
        { provide: GitDiffService, useValue: mockDiffService },
        { provide: GitMergeService, useValue: mockMergeService },
      ],
    }).compile();

    service = module.get<GitService>(GitService);
    repositoryService = module.get(GitRepositoryService);
    branchService = module.get(GitBranchService);
    commitService = module.get(GitCommitService);
    diffService = module.get(GitDiffService);
    mergeService = module.get(GitMergeService);
  });

  describe('Repository Management Delegation', () => {
    it('should delegate init to GitRepositoryService', async () => {
      repositoryService.initRepository.mockResolvedValue(undefined);

      await service.init(mockProjectId, 'main');

      expect(repositoryService.initRepository).toHaveBeenCalledWith(
        mockProjectId,
        'main',
      );
    });

    it('should use default branch "main" when not specified', async () => {
      repositoryService.initRepository.mockResolvedValue(undefined);

      await service.init(mockProjectId);

      expect(repositoryService.initRepository).toHaveBeenCalledWith(
        mockProjectId,
        'main',
      );
    });

    it('should delegate createInitialCommit to GitRepositoryService', async () => {
      const expectedSha = 'initial-commit-sha';
      repositoryService.createInitialCommit.mockResolvedValue(expectedSha);

      const result = await service.createInitialCommit(
        mockProjectId,
        mockAuthor,
      );

      expect(result).toBe(expectedSha);
      expect(repositoryService.createInitialCommit).toHaveBeenCalledWith(
        mockProjectId,
        mockAuthor,
      );
    });
  });

  describe('Branch Operations Delegation', () => {
    it('should delegate createBranch to GitBranchService', async () => {
      branchService.createBranch.mockResolvedValue(undefined);

      await service.createBranch(mockProjectId, 'feature', 'main');

      expect(branchService.createBranch).toHaveBeenCalledWith(
        mockProjectId,
        'feature',
        'main',
      );
    });

    it('should delegate deleteBranch to GitBranchService', async () => {
      branchService.deleteBranch.mockResolvedValue(undefined);

      await service.deleteBranch(mockProjectId, 'old-branch');

      expect(branchService.deleteBranch).toHaveBeenCalledWith(
        mockProjectId,
        'old-branch',
      );
    });

    it('should delegate listBranches to GitBranchService', async () => {
      const mockBranches = [
        {
          name: 'main',
          commit: { oid: 'sha1', message: 'msg', author: 'a', date: 'd' },
        },
      ];
      branchService.listBranches.mockResolvedValue(mockBranches);

      const result = await service.listBranches(mockProjectId);

      expect(result).toEqual(mockBranches);
      expect(branchService.listBranches).toHaveBeenCalledWith(mockProjectId);
    });

    it('should delegate currentBranch to GitBranchService', async () => {
      branchService.getCurrentBranch.mockResolvedValue('develop');

      const result = await service.currentBranch(mockProjectId);

      expect(result).toBe('develop');
      expect(branchService.getCurrentBranch).toHaveBeenCalledWith(
        mockProjectId,
      );
    });
  });

  describe('Commit Operations Delegation', () => {
    it('should delegate commit to GitCommitService', async () => {
      const files = [{ path: 'test.txt', content: 'hello' }];
      const expectedSha = 'commit-sha-123';
      commitService.createCommit.mockResolvedValue(expectedSha);

      const result = await service.commit(
        mockProjectId,
        'main',
        files,
        'Test commit',
        mockAuthor,
      );

      expect(result).toBe(expectedSha);
      expect(commitService.createCommit).toHaveBeenCalledWith(
        mockProjectId,
        'main',
        files,
        'Test commit',
        mockAuthor,
      );
    });

    it('should delegate log to GitCommitService', async () => {
      const mockLog = [{ oid: 'sha1' }, { oid: 'sha2' }];
      commitService.getCommitLog.mockResolvedValue(mockLog);

      const result = await service.log(mockProjectId, { depth: 10 });

      expect(result).toEqual(mockLog);
      expect(commitService.getCommitLog).toHaveBeenCalledWith(mockProjectId, {
        depth: 10,
      });
    });

    it('should delegate readBlob to GitCommitService', async () => {
      const mockContent = Buffer.from('file content');
      commitService.readBlob.mockResolvedValue(mockContent);

      const result = await service.readBlob(mockProjectId, 'file.txt', 'HEAD');

      expect(result).toEqual(mockContent);
      expect(commitService.readBlob).toHaveBeenCalledWith(
        mockProjectId,
        'file.txt',
        'HEAD',
      );
    });

    it('should delegate listFiles to GitCommitService', async () => {
      const mockFiles = ['a.txt', 'b.txt'];
      commitService.listFiles.mockResolvedValue(mockFiles);

      const result = await service.listFiles(mockProjectId, 'main');

      expect(result).toEqual(mockFiles);
      expect(commitService.listFiles).toHaveBeenCalledWith(
        mockProjectId,
        'main',
      );
    });
  });

  describe('Diff Operations Delegation', () => {
    it('should delegate getDiff to GitDiffService', async () => {
      const mockDiff = {
        files: [
          {
            path: 'a.txt',
            status: 'modified' as const,
            additions: 1,
            deletions: 0,
          },
        ],
        summary: { totalFiles: 1, totalAdditions: 1, totalDeletions: 0 },
      };
      diffService.getDiff.mockResolvedValue(mockDiff);

      const result = await service.getDiff(mockProjectId, 'feature', 'main');

      expect(result).toEqual(mockDiff);
      expect(diffService.getDiff).toHaveBeenCalledWith(
        mockProjectId,
        'feature',
        'main',
      );
    });
  });

  describe('Merge Operations Delegation', () => {
    it('should delegate mergeCommit to GitMergeService', async () => {
      const expectedSha = 'merge-sha';
      mergeService.mergeCommit.mockResolvedValue(expectedSha);

      const result = await service.mergeCommit(
        mockProjectId,
        'feature',
        'main',
        'Merge feature',
        mockAuthor,
      );

      expect(result).toBe(expectedSha);
      expect(mergeService.mergeCommit).toHaveBeenCalledWith(
        mockProjectId,
        'feature',
        'main',
        'Merge feature',
        mockAuthor,
      );
    });

    it('should delegate squashMerge to GitMergeService', async () => {
      const expectedSha = 'squash-sha';
      mergeService.squashMerge.mockResolvedValue(expectedSha);

      const result = await service.squashMerge(
        mockProjectId,
        'feature',
        'main',
        'Squash merge',
        mockAuthor,
      );

      expect(result).toBe(expectedSha);
      expect(mergeService.squashMerge).toHaveBeenCalledWith(
        mockProjectId,
        'feature',
        'main',
        'Squash merge',
        mockAuthor,
      );
    });

    it('should delegate rebaseMerge to GitMergeService', async () => {
      const expectedSha = 'rebase-sha';
      mergeService.rebaseMerge.mockResolvedValue(expectedSha);

      const result = await service.rebaseMerge(
        mockProjectId,
        'feature',
        'main',
        mockAuthor,
      );

      expect(result).toBe(expectedSha);
      expect(mergeService.rebaseMerge).toHaveBeenCalledWith(
        mockProjectId,
        'feature',
        'main',
        mockAuthor,
      );
    });
  });
});
