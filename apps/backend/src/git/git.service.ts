/**
 * Git Service
 *
 * Core service for Git operations using isomorphic-git.
 * Uses native Node.js fs module for MVP simplicity.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createTwoFilesPatch } from 'diff';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  private readonly gitStorageBasePath =
    process.env.GIT_STORAGE_PATH || path.join(os.tmpdir(), 'flotilla-git');

  constructor(private readonly prisma: PrismaService) {}

  private getRepoPath(projectId: string): string {
    return path.join(this.gitStorageBasePath, projectId);
  }

  /**
   * Initialize a new Git repository
   */
  async init(
    projectId: string,
    defaultBranch = 'main',
  ): Promise<void> {
    try {
      const dir = this.getRepoPath(projectId);

      await git.init({
        fs,
        dir,
        defaultBranch,
        bare: true,
      });

      // Enable HTTP push (receive-pack) for Git HTTP Smart Protocol
      await git.setConfig({
        fs,
        dir,
        path: 'http.receivepack',
        value: 'true',
      });

      this.logger.log(`Initialized bare repository for project: ${projectId}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize repository for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create an initial commit in bare repository
   * Uses low-level Git API to create objects without working directory
   */
  async createInitialCommit(
    projectId: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);

      // Create README.md blob
      const readmeContent = `# ${projectId}\n\nInitial commit\n`;
      const blobOid = await git.writeBlob({
        fs,
        dir,
        blob: Buffer.from(readmeContent, 'utf8'),
      });

      // Create tree with README.md
      const treeOid = await git.writeTree({
        fs,
        dir,
        tree: [
          {
            mode: '100644',
            path: 'README.md',
            oid: blobOid,
            type: 'blob',
          },
        ],
      });

      // Create commit pointing to tree (bare repository requires explicit ref and parent)
      const sha = await git.commit({
        fs,
        dir,
        author: {
          name: author.name,
          email: author.email,
          timestamp: Math.floor(Date.now() / 1000),
        },
        message: 'Initial commit',
        tree: treeOid,
        parent: [],
        ref: 'refs/heads/main',
      });

      // Fix isomorphic-git bug: move objects from .git subdirectory to root
      const gitSubdir = path.join(dir, '.git');
      if (fs.existsSync(gitSubdir)) {
        this.logger.debug(`Fixing isomorphic-git .git subdirectory for ${projectId}`);

        // Copy objects and refs from .git to root
        const gitObjectsDir = path.join(gitSubdir, 'objects');
        const gitRefsDir = path.join(gitSubdir, 'refs');
        const rootObjectsDir = path.join(dir, 'objects');
        const rootRefsDir = path.join(dir, 'refs');

        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }

        if (fs.existsSync(gitRefsDir)) {
          this.copyDirRecursive(gitRefsDir, rootRefsDir);
        }

        // Remove .git subdirectory
        fs.rmSync(gitSubdir, { recursive: true, force: true });
        this.logger.debug(`Removed .git subdirectory for ${projectId}`);
      }

      this.logger.log(`Created initial commit for bare repository: ${projectId}`);
      return sha;
    } catch (error) {
      this.logger.error(
        `Failed to create initial commit for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get commit log
   */
  async log(
    projectId: string,
    options?: { depth?: number; ref?: string },
  ): Promise<any[]> {
    try {
      const dir = this.getRepoPath(projectId);

      const commits = await git.log({
        fs,
        dir,
        depth: options?.depth,
        ref: options?.ref,
      });

      return commits;
    } catch (error) {
      this.logger.error(`Failed to get log for project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Read file content at specific commit
   */
  async readBlob(
    projectId: string,
    filepath: string,
    ref = 'HEAD',
  ): Promise<Buffer> {
    try {
      const dir = this.getRepoPath(projectId);

      const { blob } = await git.readBlob({
        fs,
        dir,
        oid: ref,
        filepath,
      });

      return Buffer.from(blob);
    } catch (error) {
      this.logger.error(
        `Failed to read blob for project ${projectId}, file ${filepath}`,
        error,
      );
      throw error;
    }
  }

  /**
   * List files in repository
   */
  async listFiles(projectId: string, ref = 'HEAD'): Promise<string[]> {
    try {
      const dir = this.getRepoPath(projectId);

      const files = await git.listFiles({
        fs,
        dir,
        ref,
      });

      return files;
    } catch (error) {
      this.logger.error(
        `Failed to list files for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get current branch
   */
  async currentBranch(projectId: string): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);

      const branch = await git.currentBranch({
        fs,
        dir,
        fullname: false,
      });

      return branch || 'main';
    } catch (error) {
      this.logger.error(
        `Failed to get current branch for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    projectId: string,
    branchName: string,
    startPoint?: string,
  ): Promise<void> {
    try {
      const dir = this.getRepoPath(projectId);

      await git.branch({
        fs,
        dir,
        ref: branchName,
        checkout: false,
        ...(startPoint && { object: startPoint }),
      });

      this.logger.log(
        `Created branch ${branchName} for project: ${projectId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create branch for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(projectId: string, branchName: string): Promise<void> {
    try {
      const dir = this.getRepoPath(projectId);

      await git.deleteBranch({
        fs,
        dir,
        ref: branchName,
      });

      this.logger.log(
        `Deleted branch ${branchName} for project: ${projectId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete branch for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  private copyDirRecursive(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
      return;
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * List all branches in a repository
   * Returns branch names with optional HEAD commit information
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
    try {
      const dir = this.getRepoPath(projectId);

      // Get all branch names
      const branches = await git.listBranches({
        fs,
        dir,
      });

      this.logger.log(`Found ${branches.length} branches in project ${projectId}`);

      // Get HEAD commit info for each branch
      const branchesWithInfo = await Promise.all(
        branches.map(async (branchName) => {
          try {
            const commitOid = await git.resolveRef({
              fs,
              dir,
              ref: branchName,
            });

            const [commit] = await git.log({
              fs,
              dir,
              ref: branchName,
              depth: 1,
            });

            return {
              name: branchName,
              commit: {
                oid: commitOid,
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: new Date(
                  commit.commit.author.timestamp * 1000,
                ).toISOString(),
              },
            };
          } catch (error) {
            this.logger.warn(
              `Failed to get commit info for branch ${branchName}:`,
              error,
            );
            // Return branch with minimal info if commit lookup fails
            return {
              name: branchName,
              commit: {
                oid: '',
                message: '',
                author: '',
                date: '',
              },
            };
          }
        }),
      );

      return branchesWithInfo;
    } catch (error) {
      this.logger.error(
        `Failed to list branches for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get diff between two branches
   * High-quality implementation with real tree walking and patch generation
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
    try {
      const dir = this.getRepoPath(projectId);

      // Get commit OIDs for both branches
      const sourceOid = await git.resolveRef({
        fs,
        dir,
        ref: sourceBranch,
      });

      const targetOid = await git.resolveRef({
        fs,
        dir,
        ref: targetBranch,
      });

      this.logger.log(
        `Getting diff between ${targetBranch} (${targetOid}) and ${sourceBranch} (${sourceOid})`,
      );

      // Compare trees and get file changes
      const fileChanges = await this.compareCommitTrees(
        dir,
        targetOid,
        sourceOid,
      );

      // Generate patches for each changed file
      const files = await Promise.all(
        fileChanges.map(async (change) => {
          const patch = await this.generateFilePatch(
            dir,
            change.path,
            change.targetOid,
            change.sourceOid,
          );

          return {
            path: change.path,
            status: change.status,
            additions: patch.additions,
            deletions: patch.deletions,
            patch: patch.content,
          };
        }),
      );

      // Calculate summary statistics
      const summary = {
        totalFiles: files.length,
        totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
        totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      };

      this.logger.log(
        `Diff generated: ${summary.totalFiles} files, +${summary.totalAdditions} -${summary.totalDeletions}`,
      );

      return { files, summary };
    } catch (error) {
      this.logger.error(
        `Failed to get diff for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Compare two commit trees and identify changed files
   * Returns list of file changes with their status (added/modified/deleted)
   */
  private async compareCommitTrees(
    dir: string,
    targetOid: string,
    sourceOid: string,
  ): Promise<
    Array<{
      path: string;
      status: 'added' | 'modified' | 'deleted';
      targetOid?: string;
      sourceOid?: string;
    }>
  > {
    const changes = new Map<
      string,
      {
        path: string;
        status: 'added' | 'modified' | 'deleted';
        targetOid?: string;
        sourceOid?: string;
      }
    >();

    // Walk through both trees simultaneously using git.walk()
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: targetOid }), git.TREE({ ref: sourceOid })],
      map: async (filepath, [targetEntry, sourceEntry]) => {
        // Skip root directory
        if (filepath === '.') {
          return;
        }

        // Skip if both are directories or both don't exist
        if (!targetEntry && !sourceEntry) {
          return;
        }

        // Get OIDs for comparison
        const targetBlobOid = targetEntry
          ? await targetEntry.oid()
          : undefined;
        const sourceBlobOid = sourceEntry
          ? await sourceEntry.oid()
          : undefined;

        // Determine file status
        if (!targetBlobOid && sourceBlobOid) {
          // File added in source branch
          changes.set(filepath, {
            path: filepath,
            status: 'added',
            sourceOid: sourceBlobOid,
          });
        } else if (targetBlobOid && !sourceBlobOid) {
          // File deleted in source branch
          changes.set(filepath, {
            path: filepath,
            status: 'deleted',
            targetOid: targetBlobOid,
          });
        } else if (targetBlobOid !== sourceBlobOid) {
          // File modified (different OIDs)
          changes.set(filepath, {
            path: filepath,
            status: 'modified',
            targetOid: targetBlobOid,
            sourceOid: sourceBlobOid,
          });
        }
        // If OIDs are equal, file is unchanged - skip it
      },
    });

    return Array.from(changes.values());
  }

  /**
   * Generate unified diff patch for a single file
   * Handles added, modified, and deleted files
   */
  private async generateFilePatch(
    dir: string,
    filepath: string,
    targetOid?: string,
    sourceOid?: string,
  ): Promise<{
    content: string;
    additions: number;
    deletions: number;
  }> {
    try {
      // Read file contents
      const targetContent = targetOid
        ? await this.readBlobContent(dir, targetOid)
        : '';
      const sourceContent = sourceOid
        ? await this.readBlobContent(dir, sourceOid)
        : '';

      // Check if files are binary
      const isBinary =
        this.isBinaryContent(targetContent) ||
        this.isBinaryContent(sourceContent);

      if (isBinary) {
        // Don't generate patch for binary files
        return {
          content: 'Binary file',
          additions: 0,
          deletions: 0,
        };
      }

      // Generate unified diff using diff library
      const patch = createTwoFilesPatch(
        `a/${filepath}`,
        `b/${filepath}`,
        targetContent,
        sourceContent,
        undefined,
        undefined,
        { context: 3 }, // Show 3 lines of context
      );

      // Calculate additions and deletions
      const { additions, deletions } = this.countPatchChanges(patch);

      return {
        content: patch,
        additions,
        deletions,
      };
    } catch (error) {
      this.logger.warn(`Failed to generate patch for ${filepath}:`, error);
      return {
        content: 'Error generating patch',
        additions: 0,
        deletions: 0,
      };
    }
  }

  /**
   * Read blob content from Git object database
   */
  private async readBlobContent(dir: string, oid: string): Promise<string> {
    try {
      const { blob } = await git.readBlob({
        fs,
        dir,
        oid,
      });

      // Convert Uint8Array to string
      return new TextDecoder('utf-8').decode(blob);
    } catch (error) {
      this.logger.warn(`Failed to read blob ${oid}:`, error);
      return '';
    }
  }

  /**
   * Check if content appears to be binary
   * Simple heuristic: contains null bytes
   */
  private isBinaryContent(content: string): boolean {
    return content.includes('\0');
  }

  /**
   * Count additions and deletions in a unified diff patch
   */
  private countPatchChanges(patch: string): {
    additions: number;
    deletions: number;
  } {
    let additions = 0;
    let deletions = 0;

    const lines = patch.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return { additions, deletions };
  }

  /**
   * Perform merge commit strategy
   * Creates a merge commit that preserves full history
   */
  async mergeCommit(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    commitMessage: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);

      this.logger.log(
        `Performing merge commit: ${sourceBranch} → ${targetBranch}`,
      );

      // Use isomorphic-git's merge function
      const result = await git.merge({
        fs,
        dir,
        ours: targetBranch,
        theirs: sourceBranch,
        author,
        message: commitMessage,
        fastForward: false, // Always create a merge commit
      });

      if (result.alreadyMerged) {
        this.logger.warn('Branches are already merged');
        // Return current target branch HEAD
        return await git.resolveRef({ fs, dir, ref: targetBranch });
      }

      this.logger.log(`Merge commit created: ${result.oid || 'unknown'}`);
      return result.oid || await git.resolveRef({ fs, dir, ref: targetBranch });
    } catch (error) {
      this.logger.error(`Merge commit failed:`, error);
      throw new Error(`Merge failed: ${error.message}`);
    }
  }

  /**
   * Perform squash merge strategy
   * Combines all commits from source branch into a single commit
   */
  async squashMerge(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    commitMessage: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);

      this.logger.log(
        `Performing squash merge: ${sourceBranch} → ${targetBranch}`,
      );

      // Get the tree of the source branch (final state)
      const sourceOid = await git.resolveRef({ fs, dir, ref: sourceBranch });
      const sourceCommit = await git.readCommit({ fs, dir, oid: sourceOid });
      const tree = sourceCommit.commit.tree;

      // Get the current target branch commit
      const targetOid = await git.resolveRef({ fs, dir, ref: targetBranch });

      // Create a single commit on target branch with source's tree
      const squashOid = await git.commit({
        fs,
        dir,
        message: commitMessage,
        tree: tree, // Use source branch's tree directly
        parent: [targetOid], // Single parent (target branch HEAD)
        author,
        committer: author,
      });

      // Update target branch ref to point to new commit
      await git.writeRef({
        fs,
        dir,
        ref: `refs/heads/${targetBranch}`,
        value: squashOid,
        force: true,
      });

      this.logger.log(`Squash merge completed: ${squashOid}`);
      return squashOid;
    } catch (error) {
      this.logger.error(`Squash merge failed:`, error);
      throw new Error(`Squash merge failed: ${error.message}`);
    }
  }

  /**
   * Perform rebase merge strategy
   * Replays commits from source branch onto target branch
   */
  async rebaseMerge(
    projectId: string,
    sourceBranch: string,
    targetBranch: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);

      this.logger.log(
        `Performing rebase merge: ${sourceBranch} → ${targetBranch}`,
      );

      // Find the merge base (common ancestor)
      const sourceOid = await git.resolveRef({ fs, dir, ref: sourceBranch });
      const targetOid = await git.resolveRef({ fs, dir, ref: targetBranch });

      const mergeBase = await this.findMergeBase(dir, sourceOid, targetOid);

      if (!mergeBase) {
        throw new Error('No common ancestor found');
      }

      // Get all commits from merge base to source branch HEAD
      const commitsToReplay = await this.getCommitRange(
        dir,
        mergeBase,
        sourceOid,
      );

      this.logger.log(`Replaying ${commitsToReplay.length} commits`);

      // Replay each commit onto target branch
      let currentOid = targetOid;
      for (const commit of commitsToReplay) {
        const { tree, message, author: commitAuthor } = commit.commit;

        // Create new commit with same changes
        currentOid = await git.commit({
          fs,
          dir,
          message,
          tree,
          parent: [currentOid],
          author: commitAuthor,
          committer: author, // Use merger as committer
        });
      }

      // Update target branch ref
      await git.writeRef({
        fs,
        dir,
        ref: `refs/heads/${targetBranch}`,
        value: currentOid,
        force: true,
      });

      this.logger.log(`Rebase merge completed: ${currentOid}`);
      return currentOid;
    } catch (error) {
      this.logger.error(`Rebase merge failed:`, error);
      throw new Error(`Rebase merge failed: ${error.message}`);
    }
  }

  /**
   * Find the merge base (common ancestor) of two commits
   */
  private async findMergeBase(
    dir: string,
    oid1: string,
    oid2: string,
  ): Promise<string | null> {
    try {
      // Simple implementation: walk back from both commits
      // and find first common commit
      const commits1 = new Set<string>();

      // Collect all ancestors of oid1
      let current = oid1;
      while (current) {
        commits1.add(current);
        const commit = await git.readCommit({ fs, dir, oid: current });
        current = commit.commit.parent[0]; // Follow first parent only
      }

      // Walk back from oid2 until we find a commit in commits1
      current = oid2;
      while (current) {
        if (commits1.has(current)) {
          return current; // Found merge base
        }
        const commit = await git.readCommit({ fs, dir, oid: current });
        current = commit.commit.parent[0];
      }

      return null; // No common ancestor
    } catch (error) {
      this.logger.warn('Failed to find merge base:', error);
      return null;
    }
  }

  /**
   * Get list of commits between base and head (exclusive base, inclusive head)
   */
  private async getCommitRange(
    dir: string,
    baseOid: string,
    headOid: string,
  ): Promise<Array<{
    commit: {
      tree: string;
      message: string;
      author: { name: string; email: string; timestamp: number; timezoneOffset: number };
    };
  }>> {
    const commits: Array<{
      commit: {
        tree: string;
        message: string;
        author: { name: string; email: string; timestamp: number; timezoneOffset: number };
      };
    }> = [];
    let current = headOid;

    while (current && current !== baseOid) {
      const commitObj = await git.readCommit({ fs, dir, oid: current });
      commits.unshift(commitObj); // Add to beginning to maintain order
      current = commitObj.commit.parent[0];
    }

    return commits;
  }
}
