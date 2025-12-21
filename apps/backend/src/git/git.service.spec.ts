/**
 * Git Service Unit Tests
 * ECP-D1: Testability - Test core config verification logic
 *
 * Focus: verifyConfigViaSystemGit() method
 * Why: This method is critical for the http.receivepack fix and uses system git
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GitService } from './git.service';
import { PrismaService } from '../prisma/prisma.service';
import { execFile } from 'child_process';

// Mock child_process at module level
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

// Mock isomorphic-git to avoid actual git operations
jest.mock('isomorphic-git', () => ({
  init: jest.fn(),
  setConfig: jest.fn(),
  getConfig: jest.fn(),
}));

describe('GitService', () => {
  let service: GitService;
  let mockExecFile: jest.Mock;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    repository: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    mockExecFile = execFile as unknown as jest.Mock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GitService>(GitService);
  });

  describe('verifyConfigViaSystemGit', () => {
    it('should return true when config value matches expected value', async () => {
      // Arrange: Mock execFile to return 'true\n'
      mockExecFile.mockResolvedValue({
        stdout: 'true\n',
        stderr: '',
      });

      // Act: Call the private method via reflection
      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      // Assert
      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('git', [
        'config',
        '--file',
        expect.stringContaining('config'),
        '--get',
        'http.receivepack',
      ]);
    });

    it('should return false when config value does not match', async () => {
      // Arrange: Mock execFile to return 'false\n'
      mockExecFile.mockResolvedValue({
        stdout: 'false\n',
        stderr: '',
      });

      // Act
      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when config key not found (execFile throws)', async () => {
      // Arrange: Mock execFile to throw error (git config returns exit code 1)
      mockExecFile.mockRejectedValue(new Error('Config key not found'));

      // Act
      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should trim stdout before comparing', async () => {
      // Arrange: Mock with extra whitespace
      mockExecFile.mockResolvedValue({
        stdout: '  true  \n\n',
        stderr: '',
      });

      // Act
      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should construct correct config file path', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({
        stdout: 'true\n',
        stderr: '',
      });

      const repoPath =
        'E:\\Cloud-Dev-Platform\\apps\\backend\\repos\\test-project-id';

      // Act
      await (service as any).verifyConfigViaSystemGit(
        repoPath,
        'http.receivepack',
        'true',
      );

      // Assert
      expect(mockExecFile).toHaveBeenCalledWith('git', [
        'config',
        '--file',
        expect.stringContaining('repos\\test-project-id\\config'),
        '--get',
        'http.receivepack',
      ]);
    });
  });

  describe('verifyConfigViaSystemGit - Edge Cases', () => {
    it('should handle empty stdout', async () => {
      mockExecFile.mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      expect(result).toBe(false);
    });

    it('should handle case-sensitive comparison', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'True\n', // Different case
        stderr: '',
      });

      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      expect(result).toBe(false); // Should be false due to case mismatch
    });

    it('should handle git command execution errors gracefully', async () => {
      mockExecFile.mockRejectedValue(new Error('git: command not found'));

      const result = await (service as any).verifyConfigViaSystemGit(
        '/test/repo/path',
        'http.receivepack',
        'true',
      );

      expect(result).toBe(false);
    });
  });

  describe('Integration Context', () => {
    it('should be used by ensureHttpReceivePackConfig for verification', () => {
      // This is a documentation test to explain the relationship
      // verifyConfigViaSystemGit() is called by ensureHttpReceivePackConfig()
      // after both isomorphic-git setConfig and system git config commands

      // The method exists and is callable
      expect(typeof (service as any).verifyConfigViaSystemGit).toBe('function');
    });
  });
});
