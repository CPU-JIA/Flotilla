/**
 * Git Commit Service
 *
 * Responsible for commit operations:
 * - Creating commits
 * - Reading commit history
 * - Reading file contents
 * - Listing repository files
 *
 * ECP-A2: High cohesion - Single responsibility for commit management
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoPath } from '../../config/git.config';
import { fixGitSubdirectoryBug } from '../utils/git-utils';

interface GitTreeEntry {
  mode: string;
  path: string;
  oid: string;
  type: 'commit' | 'blob' | 'tree' | 'special';
}

@Injectable()
export class GitCommitService {
  private readonly logger = new Logger(GitCommitService.name);

  /**
   * Create a commit on a specific branch
   *
   * Supports adding/modifying files. If branch doesn't exist, it will be created
   * from current HEAD or as orphan.
   *
   * ECP-A1: SOLID - Single responsibility: commit creation
   * ECP-C1: Defensive programming - Handles both new and existing branches
   * ECP-C2: Systematic error handling
   *
   * @param projectId - Project identifier
   * @param branch - Branch name
   * @param files - Files to commit
   * @param message - Commit message
   * @param author - Author information
   * @returns Commit SHA
   */
  async createCommit(
    projectId: string,
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = getRepoPath(projectId);
      const branchRef = `refs/heads/${branch}`;

      // Try to resolve current branch HEAD to get parent commit
      let parentCommit: string | null = null;
      const existingTree: GitTreeEntry[] = [];

      try {
        // Read ref file directly (git.resolveRef has bugs with bare repos)
        const refPath = path.join(dir, branchRef);
        if (fs.existsSync(refPath)) {
          parentCommit = fs.readFileSync(refPath, 'utf8').trim();
          this.logger.debug(
            `Read parent commit from ${branchRef}: ${parentCommit}`,
          );
        } else {
          // Branch doesn't exist, will create new branch
          this.logger.debug(`Branch ${branchRef} does not exist at ${refPath}`);
          throw new Error('Branch does not exist');
        }

        // Read existing tree from parent commit
        const commit = await git.readCommit({
          fs,
          dir,
          gitdir: dir,
          oid: parentCommit,
        });
        const treeOid = commit.commit.tree;

        // Walk the tree to get all existing files
        await git.walk({
          fs,
          dir,
          trees: [git.TREE({ ref: treeOid })],
          map: async (filepath, [entry]) => {
            if (!entry || filepath === '.') return;
            const oid = await entry.oid();
            const type = await entry.type();
            const mode = await entry.mode();

            existingTree.push({
              mode: mode.toString(8).padStart(6, '0'),
              path: filepath,
              oid,
              type,
            });
          },
        });
      } catch (_error) {
        // Branch doesn't exist or no parent commit - will create new branch
        this.logger.debug(
          `Branch ${branch} doesn't exist, creating new branch`,
        );
      }

      // Create tree entries map for merging
      const treeEntriesMap = new Map<string, GitTreeEntry>();
      existingTree.forEach((entry) => {
        treeEntriesMap.set(entry.path, entry);
      });

      // Write blobs for new/modified files and update tree entries
      for (const file of files) {
        const blobOid = await git.writeBlob({
          fs,
          dir,
          blob: Buffer.from(file.content, 'utf8'),
        });

        treeEntriesMap.set(file.path, {
          mode: '100644',
          path: file.path,
          oid: blobOid,
          type: 'blob',
        });
      }

      // Convert map to array and filter out unsupported types for writeTree
      const treeEntries = Array.from(treeEntriesMap.values()).filter(
        (entry) => entry.type !== 'special',
      ) as Array<{
        mode: string;
        path: string;
        oid: string;
        type: 'blob' | 'commit' | 'tree';
      }>;

      // Create new tree
      const treeOid = await git.writeTree({
        fs,
        dir,
        gitdir: dir, // Required for bare repository
        tree: treeEntries,
      });

      // Create commit
      const commitOid = await git.commit({
        fs,
        dir,
        gitdir: dir, // Required for bare repository
        author: {
          name: author.name,
          email: author.email,
          timestamp: Math.floor(Date.now() / 1000),
        },
        message,
        tree: treeOid,
        parent: parentCommit ? [parentCommit] : [],
        ref: branchRef,
      });

      this.logger.log(
        `Created commit ${commitOid} on branch ${branch} for project ${projectId}`,
      );

      // Fix isomorphic-git bug: cleanup .git subdirectory
      fixGitSubdirectoryBug(dir, projectId);

      return commitOid;
    } catch (error) {
      this.logger.error(
        `Failed to create commit on branch ${branch} for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get commit log
   *
   * ECP-A1: SOLID - Single responsibility: commit history retrieval
   *
   * @param projectId - Project identifier
   * @param options - Log options (depth, ref)
   * @returns Array of commits
   */
  async getCommitLog(
    projectId: string,
    options?: { depth?: number; ref?: string },
  ): Promise<any[]> {
    try {
      const dir = getRepoPath(projectId);

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
   *
   * ECP-A1: SOLID - Single responsibility: file content retrieval
   * ECP-C2: Systematic error handling
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
    try {
      const dir = getRepoPath(projectId);

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
   *
   * ECP-A1: SOLID - Single responsibility: repository file listing
   * ECP-C2: Systematic error handling
   *
   * @param projectId - Project identifier
   * @param ref - Git reference (default: 'HEAD')
   * @returns Array of file paths
   */
  async listFiles(projectId: string, ref = 'HEAD'): Promise<string[]> {
    try {
      const dir = getRepoPath(projectId);

      const files = await git.listFiles({
        fs,
        dir,
        ref,
      });

      return files;
    } catch (error) {
      this.logger.error(`Failed to list files for project ${projectId}`, error);
      throw error;
    }
  }
}
