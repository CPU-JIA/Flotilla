/**
 * Git Branch Service
 *
 * Responsible for branch operations:
 * - Branch creation and deletion
 * - Branch listing and querying
 * - Default branch management
 *
 * ECP-A2: High cohesion - Single responsibility for branch management
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoPath } from '../../config/git.config';
import { fixGitSubdirectoryBug, readRefDirect } from '../utils/git-utils';

@Injectable()
export class GitBranchService {
  private readonly logger = new Logger(GitBranchService.name);

  /**
   * Create a new branch
   *
   * ECP-A1: SOLID - Single responsibility: branch creation
   * ECP-C1: Defensive programming - Multiple resolution strategies for startPoint
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
    try {
      const dir = getRepoPath(projectId);

      // DEBUG: Log startPoint parameter
      this.logger.debug(
        `createBranch called with: projectId=${projectId}, branchName=${branchName}, startPoint=${startPoint} (type: ${typeof startPoint})`,
      );

      // If startPoint is provided, resolve it to a commit SHA
      let commitSha: string | undefined;
      if (startPoint) {
        // Try to read ref file directly (isomorphic-git resolveRef has issues with bare repos)
        commitSha = readRefDirect(dir, startPoint) ?? undefined;

        if (commitSha) {
          this.logger.debug(
            `Read ref file directly: ${startPoint} → ${commitSha}`,
          );
        } else {
          // If direct read failed, try git.resolveRef as fallback
          try {
            commitSha = await git.resolveRef({
              fs,
              dir,
              gitdir: dir, // Required for bare repository
              ref: `refs/heads/${startPoint}`,
            });
            this.logger.debug(
              `Resolved startPoint '${startPoint}' via git.resolveRef to ${commitSha}`,
            );
          } catch (error) {
            this.logger.warn(
              `git.resolveRef failed for refs/heads/${startPoint}: ${error.message}`,
            );
            // Last resort: use startPoint as-is (might be a commit SHA)
            commitSha = startPoint;
            this.logger.warn(
              `Using startPoint '${startPoint}' as-is without resolution`,
            );
          }
        }
      }

      await git.branch({
        fs,
        dir,
        gitdir: dir, // Required for bare repository
        ref: branchName,
        checkout: false,
        ...(commitSha && { object: commitSha }),
      });

      // Fix isomorphic-git bug: cleanup .git subdirectory
      fixGitSubdirectoryBug(dir, projectId);

      this.logger.log(`Created branch ${branchName} for project: ${projectId}`);
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
   *
   * ECP-A1: SOLID - Single responsibility: branch deletion
   * ECP-C2: Systematic error handling
   *
   * @param projectId - Project identifier
   * @param branchName - Name of the branch to delete
   */
  async deleteBranch(projectId: string, branchName: string): Promise<void> {
    try {
      const dir = getRepoPath(projectId);

      await git.deleteBranch({
        fs,
        dir,
        ref: branchName,
      });

      this.logger.log(`Deleted branch ${branchName} for project: ${projectId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete branch for project ${projectId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * List all branches in a repository
   *
   * Returns branch names with optional HEAD commit information
   *
   * ECP-A1: SOLID - Single responsibility: branch listing
   * ECP-C1: Defensive programming - Direct filesystem read to avoid library bugs
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
    try {
      const dir = getRepoPath(projectId);

      // Debug: Check refs directory first
      const refsDir = path.join(dir, 'refs', 'heads');
      if (fs.existsSync(refsDir)) {
        const files = fs.readdirSync(refsDir);
        this.logger.debug(
          `Files in refs/heads: ${files.join(', ')} for ${projectId}`,
        );
      } else {
        this.logger.debug(
          `refs/heads directory does not exist for ${projectId}`,
        );
      }

      // Get all branch names - bypass isomorphic-git.listBranches (has bugs with bare repos)
      // Read refs/heads directory directly
      let branches: string[] = [];
      if (fs.existsSync(refsDir)) {
        const files = fs.readdirSync(refsDir);
        branches = files.filter((name) => {
          const filePath = path.join(refsDir, name);
          return fs.statSync(filePath).isFile();
        });
        this.logger.debug(
          `Read branches directly from filesystem: ${JSON.stringify(branches)}`,
        );
      }

      this.logger.log(
        `Found ${branches.length} branches in project ${projectId}`,
      );

      // Get HEAD commit info for each branch
      const branchesWithInfo = await Promise.all(
        branches.map(async (branchName) => {
          try {
            // Read commit OID directly from ref file (bypass git.resolveRef)
            const commitOid = readRefDirect(dir, branchName);
            if (!commitOid) {
              throw new Error(`Failed to read ref for branch ${branchName}`);
            }

            const fullRef = `refs/heads/${branchName}`;

            const [commit] = await git.log({
              fs,
              dir,
              ref: fullRef,
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
   * Get current branch
   *
   * ECP-A1: SOLID - Single responsibility: current branch query
   * ECP-C1: Defensive programming - Provides fallback default
   *
   * @param projectId - Project identifier
   * @returns Current branch name
   */
  async getCurrentBranch(projectId: string): Promise<string> {
    try {
      const dir = getRepoPath(projectId);

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
}
