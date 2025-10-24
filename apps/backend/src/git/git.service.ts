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
   * List all branches
   */
  async listBranches(projectId: string): Promise<string[]> {
    try {
      const dir = this.getRepoPath(projectId);

      const branches = await git.listBranches({
        fs,
        dir,
      });

      return branches;
    } catch (error) {
      this.logger.error(
        `Failed to list branches for project ${projectId}`,
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
   * Get diff between two branches
   * Returns a simple diff representation for PR visualization
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
      const sourceCommit = await git.resolveRef({
        fs,
        dir,
        ref: sourceBranch,
      });

      const targetCommit = await git.resolveRef({
        fs,
        dir,
        ref: targetBranch,
      });

      // For MVP, return a simplified diff structure
      // In production, you would use isomorphic-git's walk() to compare trees
      this.logger.log(
        `Getting diff between ${targetBranch} (${targetCommit}) and ${sourceBranch} (${sourceCommit})`,
      );

      // Simplified implementation: return basic structure
      // TODO: Implement actual tree walking and diff generation
      return {
        files: [
          {
            path: 'README.md',
            status: 'modified',
            additions: 5,
            deletions: 2,
            patch: `@@ -1,3 +1,6 @@\n # Project\n-Old content\n+New content\n+Added line 1\n+Added line 2`,
          },
        ],
        summary: {
          totalFiles: 1,
          totalAdditions: 5,
          totalDeletions: 2,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get diff for project ${projectId}`,
        error,
      );
      throw error;
    }
  }
}
