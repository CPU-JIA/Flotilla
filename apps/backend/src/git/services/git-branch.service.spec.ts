/**
 * Git Branch Service Unit Tests
 *
 * Tests for branch operations:
 * - Branch creation (success/failure scenarios)
 * - Branch deletion (success/edge cases)
 * - Branch listing
 * - Current branch retrieval
 *
 * ECP-D1: Testability - Comprehensive unit tests with mocked dependencies
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GitBranchService } from './git-branch.service';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as gitConfig from '../../config/git.config';
import * as gitUtils from '../utils/git-utils';

// Mock external dependencies
jest.mock('isomorphic-git');
jest.mock('fs');
jest.mock('../../config/git.config');
jest.mock('../utils/git-utils');

describe('GitBranchService', () => {
  let service: GitBranchService;

  const mockProjectId = 'test-project-123';
  const mockRepoPath = '/repos/test-project-123';

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (gitConfig.getRepoPath as jest.Mock).mockReturnValue(mockRepoPath);
    (gitUtils.fixGitSubdirectoryBug as jest.Mock).mockImplementation(() => {});
    (gitUtils.readRefDirect as jest.Mock).mockReturnValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitBranchService],
    }).compile();

    service = module.get<GitBranchService>(GitBranchService);
  });

  describe('createBranch', () => {
    describe('success scenarios', () => {
      it('should create a branch without startPoint', async () => {
        (git.branch as jest.Mock).mockResolvedValue(undefined);

        await service.createBranch(mockProjectId, 'feature-branch');

        expect(gitConfig.getRepoPath).toHaveBeenCalledWith(mockProjectId);
        expect(git.branch).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          gitdir: mockRepoPath,
          ref: 'feature-branch',
          checkout: false,
        });
        expect(gitUtils.fixGitSubdirectoryBug).toHaveBeenCalledWith(
          mockRepoPath,
          mockProjectId,
        );
      });

      it('should create a branch from startPoint using direct ref read', async () => {
        const mockCommitSha = 'abc123def456';
        (gitUtils.readRefDirect as jest.Mock).mockReturnValue(mockCommitSha);
        (git.branch as jest.Mock).mockResolvedValue(undefined);

        await service.createBranch(mockProjectId, 'feature-branch', 'main');

        expect(gitUtils.readRefDirect).toHaveBeenCalledWith(
          mockRepoPath,
          'main',
        );
        expect(git.branch).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          gitdir: mockRepoPath,
          ref: 'feature-branch',
          checkout: false,
          object: mockCommitSha,
        });
      });

      it('should fallback to git.resolveRef when direct read fails', async () => {
        const mockCommitSha = 'resolved-sha-789';
        (gitUtils.readRefDirect as jest.Mock).mockReturnValue(null);
        (git.resolveRef as jest.Mock).mockResolvedValue(mockCommitSha);
        (git.branch as jest.Mock).mockResolvedValue(undefined);

        await service.createBranch(mockProjectId, 'feature-branch', 'develop');

        expect(git.resolveRef).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          gitdir: mockRepoPath,
          ref: 'refs/heads/develop',
        });
        expect(git.branch).toHaveBeenCalledWith(
          expect.objectContaining({
            object: mockCommitSha,
          }),
        );
      });

      it('should use startPoint as-is when all resolution methods fail', async () => {
        const rawCommitSha = 'raw-commit-sha-direct';
        (gitUtils.readRefDirect as jest.Mock).mockReturnValue(null);
        (git.resolveRef as jest.Mock).mockRejectedValue(
          new Error('Ref not found'),
        );
        (git.branch as jest.Mock).mockResolvedValue(undefined);

        await service.createBranch(
          mockProjectId,
          'feature-branch',
          rawCommitSha,
        );

        expect(git.branch).toHaveBeenCalledWith(
          expect.objectContaining({
            object: rawCommitSha,
          }),
        );
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when git.branch fails', async () => {
        const error = new Error('Branch already exists');
        (git.branch as jest.Mock).mockRejectedValue(error);

        await expect(
          service.createBranch(mockProjectId, 'existing-branch'),
        ).rejects.toThrow('Branch already exists');
      });

      it('should throw error for invalid branch name', async () => {
        const error = new Error('Invalid branch name');
        (git.branch as jest.Mock).mockRejectedValue(error);

        await expect(
          service.createBranch(mockProjectId, 'invalid..branch'),
        ).rejects.toThrow('Invalid branch name');
      });
    });
  });

  describe('deleteBranch', () => {
    describe('success scenarios', () => {
      it('should delete an existing branch', async () => {
        (git.deleteBranch as jest.Mock).mockResolvedValue(undefined);

        await service.deleteBranch(mockProjectId, 'feature-branch');

        expect(gitConfig.getRepoPath).toHaveBeenCalledWith(mockProjectId);
        expect(git.deleteBranch).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          ref: 'feature-branch',
        });
      });
    });

    describe('edge cases', () => {
      it('should throw error when deleting non-existent branch', async () => {
        const error = new Error('Branch not found');
        (git.deleteBranch as jest.Mock).mockRejectedValue(error);

        await expect(
          service.deleteBranch(mockProjectId, 'non-existent'),
        ).rejects.toThrow('Branch not found');
      });

      it('should throw error when deleting current branch', async () => {
        const error = new Error('Cannot delete current branch');
        (git.deleteBranch as jest.Mock).mockRejectedValue(error);

        await expect(
          service.deleteBranch(mockProjectId, 'main'),
        ).rejects.toThrow('Cannot delete current branch');
      });

      it('should throw error when deleting protected branch', async () => {
        const error = new Error('Cannot delete protected branch');
        (git.deleteBranch as jest.Mock).mockRejectedValue(error);

        await expect(
          service.deleteBranch(mockProjectId, 'protected-branch'),
        ).rejects.toThrow('Cannot delete protected branch');
      });
    });
  });

  describe('listBranches', () => {
    const mockRefsDir = `${mockRepoPath}/refs/heads`;

    describe('success scenarios', () => {
      it('should list all branches with commit info', async () => {
        const mockBranches = ['main', 'develop'];
        const mockCommitOid = 'commit-sha-123';
        const mockCommit = {
          commit: {
            message: 'Initial commit',
            author: {
              name: 'Test User',
              timestamp: 1700000000,
            },
          },
        };

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue(mockBranches);
        (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
        (gitUtils.readRefDirect as jest.Mock).mockReturnValue(mockCommitOid);
        (git.log as jest.Mock).mockResolvedValue([mockCommit]);

        const result = await service.listBranches(mockProjectId);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          name: 'main',
          commit: {
            oid: mockCommitOid,
            message: 'Initial commit',
            author: 'Test User',
            date: expect.any(String),
          },
        });
      });

      it('should return empty array when no branches exist', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = await service.listBranches(mockProjectId);

        expect(result).toEqual([]);
      });

      it('should handle branch with failed commit lookup gracefully', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue(['broken-branch']);
        (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
        (gitUtils.readRefDirect as jest.Mock).mockReturnValue(null);

        const result = await service.listBranches(mockProjectId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          name: 'broken-branch',
          commit: {
            oid: '',
            message: '',
            author: '',
            date: '',
          },
        });
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when filesystem read fails', async () => {
        const error = new Error('Permission denied');
        (fs.existsSync as jest.Mock).mockImplementation(() => {
          throw error;
        });

        await expect(service.listBranches(mockProjectId)).rejects.toThrow(
          'Permission denied',
        );
      });
    });
  });

  describe('getCurrentBranch', () => {
    describe('success scenarios', () => {
      it('should return current branch name', async () => {
        (git.currentBranch as jest.Mock).mockResolvedValue('develop');

        const result = await service.getCurrentBranch(mockProjectId);

        expect(result).toBe('develop');
        expect(git.currentBranch).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          fullname: false,
        });
      });

      it('should return "main" as default when no branch is set', async () => {
        (git.currentBranch as jest.Mock).mockResolvedValue(null);

        const result = await service.getCurrentBranch(mockProjectId);

        expect(result).toBe('main');
      });

      it('should return "main" when currentBranch returns undefined', async () => {
        (git.currentBranch as jest.Mock).mockResolvedValue(undefined);

        const result = await service.getCurrentBranch(mockProjectId);

        expect(result).toBe('main');
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when git.currentBranch fails', async () => {
        const error = new Error('Repository not found');
        (git.currentBranch as jest.Mock).mockRejectedValue(error);

        await expect(service.getCurrentBranch(mockProjectId)).rejects.toThrow(
          'Repository not found',
        );
      });
    });
  });
});
