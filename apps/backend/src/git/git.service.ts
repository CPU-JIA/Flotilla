/**
 * Git Service - Facade Pattern
 *
 * ECP-A1: Facade Pattern - Provides unified interface to subsystem of Git services
 * ECP-A2: Low coupling - Delegates to specialized services
 * ECP-B1: DRY - Eliminates code duplication by delegating to specialized services
 *
 * This service acts as a facade for all Git operations, delegating to:
 * - GitRepositoryService: Repository initialization and configuration
 * - GitBranchService: Branch management
 * - GitCommitService: Commit operations and file reading
 * - GitDiffService: Diff computation
 * - GitMergeService: Merge operations
 *
 * All public methods maintain backward compatibility with the original GitService API.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GitRepositoryService } from './services/git-repository.service';
import { GitBranchService } from './services/git-branch.service';
import { GitCommitService } from './services/git-commit.service';
import { GitDiffService } from './services/git-diff.service';
import { GitMergeService } from './services/git-merge.service';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repositoryService: GitRepositoryService,
    private readonly branchService: GitBranchService,
    private readonly commitService: GitCommitService,
    private readonly diffService: GitDiffService,
    private readonly mergeService: GitMergeService,
  ) {}

  // ========== Repository Management ==========
  // Delegated to GitRepositoryService

  /**
   * Initialize a new Git repository
   *
   * ECP-A1: Facade pattern - Delegates to GitRepositoryService
   *
   * @param projectId - Project identifier
   * @param defaultBranch - Default branch name (default: 'main')
   */
  async init(projectId: string, defaultBranch = 'main'): Promise<void> {
    return this.repositoryService.initRepository(projectId, defaultBranch);
  }

  /**
   * Create an initial commit in bare repository
   *
   * ECP-A1: Facade pattern - Delegates to GitRepositoryService
   *
   * @param projectId - Project identifier
   * @param author - Author information
   * @returns Commit SHA
   */
  async createInitialCommit(
    projectId: string,
    author: { name: string; email: string },
  ): Promise<string> {
    return this.repositoryService.createInitialCommit(projectId, author);
  }

  // ========== Branch Operations ==========
  // Delegated to GitBranchService

  /**
   * Create a new branch
   *
   * ECP-A1: Facade pattern - Delegates to GitBranchService
   *
   * @param projectId - Project identifier
   * @param branchName - Name of the new branch
   * @param startPoint - Optional starting point (branch name or commit SHA)
   */
  async createBranch(
    projectId: string,
    branchName: string,
    startPoint?: string,
  ): Promise<void> {
    return this.branchService.createBranch(projectId, branchName, startPoint);
  }

  /**
   * Delete a branch
   *
   * ECP-A1: Facade pattern - Delegates to GitBranchService
   *
   * @param projectId - Project identifier
   * @param branchName - Name of the branch to delete
   */
  async deleteBranch(projectId: string, branchName: string): Promise<void> {
    return this.branchService.deleteBranch(projectId, branchName);
  }

  /**
   * List all branches in a repository
   *
   * ECP-A1: Facade pattern - Delegates to GitBranchService
   *
   * @param projectId - Project identifier
   * @returns Array of branches with commit information
   */
  async listBranches(projectId: string): Promise<
    Array<{
      name: string;
      commit: {
        oid: string;
        message: string;
        author: string;
        date: string;
      };
    }>
  > {
    return this.branchService.listBranches(projectId);
  }

  /**
   * Get current branch
   *
   * ECP-A1: Facade pattern - Delegates to GitBranchService
   *
   * @param projectId - Project identifier
   * @returns Current branch name
   */
  async currentBranch(projectId: string): Promise<string> {
    return this.branchService.getCurrentBranch(projectId);
  }

  // ========== Commit Operations ==========
  // Delegated to GitCommitService

  /**
   * Create a commit on a specific branch
   *
   * ECP-A1: Facade pattern - Delegates to GitCommitService
   *
   * @param projectId - Project identifier
   * @param branch - Branch name
   * @param files - Files to commit
   * @param message - Commit message
   * @param author - Author information
   * @returns Commit SHA
   */
  async commit(
    projectId: string,
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string,
    author: { name: string; email: string },
  ): Promise<string> {
    return this.commitService.createCommit(
      projectId,
      branch,
      files,
      message,
      author,
    );
  }

  /**
   * Get commit log
   *
   * ECP-A1: Facade pattern - Delegates to GitCommitService
   *
   * @param projectId - Project identifier
   * @param options - Log options (depth, ref)
   * @returns Array of commits
   */
  async log(
    projectId: string,
    options?: { depth?: number; ref?: string },
  ): Promise<any[]> {
    return this.commitService.getCommitLog(projectId, options);
  }

  /**
   * Read file content at specific commit
   *
   * ECP-A1: Facade pattern - Delegates to GitCommitService
   *
   * @param projectId - Project identifier
   * @param filepath - File path
   * @param ref - Git reference (default: 'HEAD')
   * @returns File content as Buffer
   */
  async readBlob(
    projectId: string,
    filepath: string,
    ref = 'HEAD',
  ): Promise<Buffer> {
    return this.commitService.readBlob(projectId, filepath, ref);
  }

  /**
   * List files in repository
   *
   * ECP-A1: Facade pattern - Delegates to GitCommitService
   *
   * @param projectId - Project identifier
   * @param ref - Git reference (default: 'HEAD')
   * @returns Array of file paths
   */
  async listFiles(projectId: string, ref = 'HEAD'): Promise<string[]> {
    return this.commitService.listFiles(projectId, ref);
  }

  // ========== Diff Operations ==========
  // Delegated to GitDiffService

  /**
   * Get diff between two branches
   *
   * ECP-A1: Facade pattern - Delegates to GitDiffService
   *
   * @param projectId - Project identifier
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @returns Diff result with files and summary
   */
  async getDiff(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
  ): Promise<{
    files: Array<{
      path: string;
      status: 'added' | 'modified' | 'deleted';
      additions: number;
      deletions: number;
      patch?: string;
    }>;
    summary: {
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
    };
  }> {
    return this.diffService.getDiff(projectId, sourceBranch, targetBranch);
  }

  // ========== Merge Operations ==========
  // Delegated to GitMergeService

  /**
   * Perform merge commit strategy
   *
   * ECP-A1: Facade pattern - Delegates to GitMergeService
   *
   * @param projectId - Project identifier
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param commitMessage - Merge commit message
   * @param author - Author information
   * @returns Merge commit SHA
   */
  async mergeCommit(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    commitMessage: string,
    author: { name: string; email: string },
  ): Promise<string> {
    return this.mergeService.mergeCommit(
      projectId,
      sourceBranch,
      targetBranch,
      commitMessage,
      author,
    );
  }

  /**
   * Perform squash merge strategy
   *
   * ECP-A1: Facade pattern - Delegates to GitMergeService
   *
   * @param projectId - Project identifier
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param commitMessage - Squash commit message
   * @param author - Author information
   * @returns Squash commit SHA
   */
  async squashMerge(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    commitMessage: string,
    author: { name: string; email: string },
  ): Promise<string> {
    return this.mergeService.squashMerge(
      projectId,
      sourceBranch,
      targetBranch,
      commitMessage,
      author,
    );
  }

  /**
   * Perform rebase merge strategy
   *
   * ECP-A1: Facade pattern - Delegates to GitMergeService
   *
   * @param projectId - Project identifier
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param author - Author information (used as committer)
   * @returns Final commit SHA after rebase
   */
  async rebaseMerge(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    author: { name: string; email: string },
  ): Promise<string> {
    return this.mergeService.rebaseMerge(
      projectId,
      sourceBranch,
      targetBranch,
      author,
    );
  }
}
