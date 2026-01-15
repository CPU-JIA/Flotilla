/**
 * Git Commit Service Unit Tests
 *
 * Tests for commit operations:
 * - Commit creation (new branch, existing branch)
 * - Commit log retrieval
 * - Blob reading
 * - File listing
 *
 * ECP-D1: Testability - Comprehensive unit tests with mocked dependencies
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GitCommitService } from './git-commit.service';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as gitConfig from '../../config/git.config';
import * as gitUtils from '../utils/git-utils';

// Mock external dependencies
jest.mock('isomorphic-git');
jest.mock('fs');
jest.mock('../../config/git.config');
jest.mock('../utils/git-utils');

describe('GitCommitService', () => {
  let service: GitCommitService;

  const mockProjectId = 'test-project-456';
  const mockRepoPath = '/repos/test-project-456';
  const mockAuthor = { name: 'Test User', email: 'test@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (gitConfig.getRepoPath as jest.Mock).mockReturnValue(mockRepoPath);
    (gitUtils.fixGitSubdirectoryBug as jest.Mock).mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitCommitService],
    }).compile();

    service = module.get<GitCommitService>(GitCommitService);
  });

  describe('createCommit', () => {
    const mockFiles = [
      { path: 'README.md', content: '# Test Project' },
      { path: 'src/index.ts', content: 'console.log("hello")' },
    ];
    const mockMessage = 'Initial commit';

    describe('success scenarios - existing branch', () => {
      it('should create commit on existing branch with parent', async () => {
        const parentCommit = 'parent-sha-123';
        const newTreeOid = 'tree-sha-456';
        const newCommitOid = 'commit-sha-789';

        // Mock fs.existsSync for ref file check
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(parentCommit + '\n');

        // Mock git.readCommit for parent commit
        (git.readCommit as jest.Mock).mockResolvedValue({
          commit: { tree: 'existing-tree-oid' },
        });

        // Mock git.walk for existing tree
        (git.walk as jest.Mock).mockImplementation(async ({ map }) => {
          await map('existing-file.txt', [
            {
              oid: async () => 'existing-blob-oid',
              type: async () => 'blob',
              mode: async () => 0o100644,
            },
          ]);
        });

        // Mock blob and tree creation
        (git.writeBlob as jest.Mock).mockResolvedValue('new-blob-oid');
        (git.writeTree as jest.Mock).mockResolvedValue(newTreeOid);
        (git.commit as jest.Mock).mockResolvedValue(newCommitOid);

        const result = await service.createCommit(
          mockProjectId,
          'main',
          mockFiles,
          mockMessage,
          mockAuthor,
        );

        expect(result).toBe(newCommitOid);
        expect(git.writeBlob).toHaveBeenCalledTimes(2);
        expect(git.writeTree).toHaveBeenCalled();
        expect(git.commit).toHaveBeenCalledWith(
          expect.objectContaining({
            message: mockMessage,
            parent: [parentCommit],
            ref: 'refs/heads/main',
          }),
        );
        expect(gitUtils.fixGitSubdirectoryBug).toHaveBeenCalled();
      });
    });

    describe('success scenarios - new branch', () => {
      it('should create commit on new branch without parent', async () => {
        const newTreeOid = 'tree-sha-new';
        const newCommitOid = 'commit-sha-new';

        // Branch doesn't exist
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        // Mock blob and tree creation
        (git.writeBlob as jest.Mock).mockResolvedValue('blob-oid');
        (git.writeTree as jest.Mock).mockResolvedValue(newTreeOid);
        (git.commit as jest.Mock).mockResolvedValue(newCommitOid);

        const result = await service.createCommit(
          mockProjectId,
          'new-branch',
          mockFiles,
          mockMessage,
          mockAuthor,
        );

        expect(result).toBe(newCommitOid);
        expect(git.commit).toHaveBeenCalledWith(
          expect.objectContaining({
            parent: [],
            ref: 'refs/heads/new-branch',
          }),
        );
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when writeBlob fails', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (git.writeBlob as jest.Mock).mockRejectedValue(new Error('Disk full'));

        await expect(
          service.createCommit(
            mockProjectId,
            'main',
            mockFiles,
            mockMessage,
            mockAuthor,
          ),
        ).rejects.toThrow('Disk full');
      });

      it('should throw error when commit fails', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (git.writeBlob as jest.Mock).mockResolvedValue('blob-oid');
        (git.writeTree as jest.Mock).mockResolvedValue('tree-oid');
        (git.commit as jest.Mock).mockRejectedValue(new Error('Invalid tree'));

        await expect(
          service.createCommit(
            mockProjectId,
            'main',
            mockFiles,
            mockMessage,
            mockAuthor,
          ),
        ).rejects.toThrow('Invalid tree');
      });
    });
  });

  describe('getCommitLog', () => {
    describe('success scenarios', () => {
      it('should return commit log with default options', async () => {
        const mockCommits = [
          { oid: 'sha1', commit: { message: 'First' } },
          { oid: 'sha2', commit: { message: 'Second' } },
        ];
        (git.log as jest.Mock).mockResolvedValue(mockCommits);

        const result = await service.getCommitLog(mockProjectId);

        expect(result).toEqual(mockCommits);
        expect(git.log).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          depth: undefined,
          ref: undefined,
        });
      });

      it('should return commit log with custom depth and ref', async () => {
        const mockCommits = [{ oid: 'sha1', commit: { message: 'Latest' } }];
        (git.log as jest.Mock).mockResolvedValue(mockCommits);

        const result = await service.getCommitLog(mockProjectId, {
          depth: 5,
          ref: 'develop',
        });

        expect(result).toEqual(mockCommits);
        expect(git.log).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          depth: 5,
          ref: 'develop',
        });
      });

      it('should return empty array for empty repository', async () => {
        (git.log as jest.Mock).mockResolvedValue([]);

        const result = await service.getCommitLog(mockProjectId);

        expect(result).toEqual([]);
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when log fails', async () => {
        (git.log as jest.Mock).mockRejectedValue(
          new Error('Reference not found'),
        );

        await expect(service.getCommitLog(mockProjectId)).rejects.toThrow(
          'Reference not found',
        );
      });
    });
  });

  describe('readBlob', () => {
    describe('success scenarios', () => {
      it('should read blob content with default ref', async () => {
        const mockContent = Buffer.from('file content');
        (git.readBlob as jest.Mock).mockResolvedValue({
          blob: new Uint8Array(mockContent),
        });

        const result = await service.readBlob(mockProjectId, 'README.md');

        expect(result).toEqual(mockContent);
        expect(git.readBlob).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          oid: 'HEAD',
          filepath: 'README.md',
        });
      });

      it('should read blob content with specific ref', async () => {
        const mockContent = Buffer.from('old content');
        (git.readBlob as jest.Mock).mockResolvedValue({
          blob: new Uint8Array(mockContent),
        });

        const result = await service.readBlob(
          mockProjectId,
          'src/index.ts',
          'abc123',
        );

        expect(result).toEqual(mockContent);
        expect(git.readBlob).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          oid: 'abc123',
          filepath: 'src/index.ts',
        });
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when file not found', async () => {
        (git.readBlob as jest.Mock).mockRejectedValue(
          new Error('File not found'),
        );

        await expect(
          service.readBlob(mockProjectId, 'nonexistent.txt'),
        ).rejects.toThrow('File not found');
      });

      it('should throw error for invalid ref', async () => {
        (git.readBlob as jest.Mock).mockRejectedValue(new Error('Invalid ref'));

        await expect(
          service.readBlob(mockProjectId, 'file.txt', 'invalid-ref'),
        ).rejects.toThrow('Invalid ref');
      });
    });
  });

  describe('listFiles', () => {
    describe('success scenarios', () => {
      it('should list files with default ref', async () => {
        const mockFiles = ['README.md', 'src/index.ts', 'package.json'];
        (git.listFiles as jest.Mock).mockResolvedValue(mockFiles);

        const result = await service.listFiles(mockProjectId);

        expect(result).toEqual(mockFiles);
        expect(git.listFiles).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          ref: 'HEAD',
        });
      });

      it('should list files with specific ref', async () => {
        const mockFiles = ['old-file.txt'];
        (git.listFiles as jest.Mock).mockResolvedValue(mockFiles);

        const result = await service.listFiles(mockProjectId, 'v1.0.0');

        expect(result).toEqual(mockFiles);
        expect(git.listFiles).toHaveBeenCalledWith({
          fs,
          dir: mockRepoPath,
          ref: 'v1.0.0',
        });
      });

      it('should return empty array for empty repository', async () => {
        (git.listFiles as jest.Mock).mockResolvedValue([]);

        const result = await service.listFiles(mockProjectId);

        expect(result).toEqual([]);
      });
    });

    describe('failure scenarios', () => {
      it('should throw error when listFiles fails', async () => {
        (git.listFiles as jest.Mock).mockRejectedValue(
          new Error('Repository corrupted'),
        );

        await expect(service.listFiles(mockProjectId)).rejects.toThrow(
          'Repository corrupted',
        );
      });
    });
  });
});
