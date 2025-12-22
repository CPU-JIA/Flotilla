/**
 * Git Merge Service
 *
 * Responsible for merge operations:
 * - Merge commit strategy (preserves full history)
 * - Squash merge strategy (combines commits)
 * - Rebase merge strategy (replays commits)
 *
 * ECP-A2: High cohesion - Single responsibility for merge operations
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import { getRepoPath } from '../../config/git.config';
import { fixGitSubdirectoryBug, readRefDirect } from '../utils/git-utils';

@Injectable()
export class GitMergeService {
  private readonly logger = new Logger(GitMergeService.name);

  /**
   * Perform merge commit strategy
   *
   * Creates a merge commit that preserves full history with two parents
   *
   * ECP-A1: SOLID - Single responsibility: merge commit
   * ECP-C1: Defensive programming - Validates branches before merge
   * ECP-C2: Systematic error handling
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
    try {
      const dir = getRepoPath(projectId);

      this.logger.log(
        `Performing merge commit: ${sourceBranch} → ${targetBranch}`,
      );

      // Read refs directly to get commit SHAs
      const sourceOid = readRefDirect(dir, sourceBranch);
      const targetOid = readRefDirect(dir, targetBranch);

      if (!sourceOid) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!targetOid) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      this.logger.debug(
        `Read branch refs for merge: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

      // ECP-C3: Manual merge commit creation to bypass isomorphic-git limitations
      // isomorphic-git's merge() doesn't work well with bare repositories
      // Instead, manually create merge commit with two parents

      // Read source commit to get its tree
      const sourceCommit = await git.readCommit({
        fs,
        dir,
        gitdir: dir,
        oid: sourceOid,
      });
      const sourceTree = sourceCommit.commit.tree;

      this.logger.debug(`Source commit tree: ${sourceTree}`);

      // Create merge commit manually with both parents
      const mergeCommitOid = await git.commit({
        fs,
        dir,
        gitdir: dir,
        message: commitMessage,
        tree: sourceTree, // Use source tree as merge result (no conflicts for now)
        parent: [targetOid, sourceOid], // Two parents make it a merge commit
        author,
        committer: author,
      });

      this.logger.log(`Merge commit created manually: ${mergeCommitOid}`);

      // Update target branch ref to point to merge commit
      await git.writeRef({
        fs,
        dir,
        gitdir: dir,
        ref: `refs/heads/${targetBranch}`,
        value: mergeCommitOid,
        force: true,
      });

      return mergeCommitOid;
    } catch (error) {
      this.logger.error(`Merge commit failed:`, error);
      throw new Error(`Merge failed: ${error.message}`);
    }
  }

  /**
   * Perform squash merge strategy
   *
   * Combines all commits from source branch into a single commit
   *
   * ECP-A1: SOLID - Single responsibility: squash merge
   * ECP-C1: Defensive programming - Validates branches before merge
   * ECP-C2: Systematic error handling
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
    try {
      const dir = getRepoPath(projectId);

      this.logger.log(
        `Performing squash merge: ${sourceBranch} → ${targetBranch}`,
      );

      // Get the tree of the source branch (final state) - read ref files directly
      const sourceOid = readRefDirect(dir, sourceBranch);
      const targetOid = readRefDirect(dir, targetBranch);

      if (!sourceOid) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!targetOid) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      this.logger.debug(
        `Read branch refs for squash: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

      const sourceCommit = await git.readCommit({
        fs,
        dir,
        gitdir: dir,
        oid: sourceOid,
      });
      const tree = sourceCommit.commit.tree;

      // Create a single commit on target branch with source's tree
      const squashOid = await git.commit({
        fs,
        dir,
        gitdir: dir, // Required for bare repository
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
        gitdir: dir, // Required for bare repository
        ref: `refs/heads/${targetBranch}`,
        value: squashOid,
        force: true,
      });

      this.logger.log(`Squash merge completed: ${squashOid}`);

      // Fix isomorphic-git bug: cleanup .git subdirectory
      fixGitSubdirectoryBug(dir, projectId);

      return squashOid;
    } catch (error) {
      this.logger.error(`Squash merge failed:`, error);
      throw new Error(`Squash merge failed: ${error.message}`);
    }
  }

  /**
   * Perform rebase merge strategy
   *
   * Replays commits from source branch onto target branch
   *
   * ECP-A1: SOLID - Single responsibility: rebase merge
   * ECP-C1: Defensive programming - Validates branches and merge base
   * ECP-C2: Systematic error handling
   * ECP-C3: Performance awareness - Sequential commit replay
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
    try {
      const dir = getRepoPath(projectId);

      this.logger.log(
        `Performing rebase merge: ${sourceBranch} → ${targetBranch}`,
      );

      // Find the merge base (common ancestor) - read ref files directly
      const sourceOid = readRefDirect(dir, sourceBranch);
      const targetOid = readRefDirect(dir, targetBranch);

      if (!sourceOid) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!targetOid) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      this.logger.debug(
        `Read branch refs for rebase: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

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
          gitdir: dir, // Required for bare repository
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
        gitdir: dir, // Required for bare repository
        ref: `refs/heads/${targetBranch}`,
        value: currentOid,
        force: true,
      });

      this.logger.log(`Rebase merge completed: ${currentOid}`);

      // Fix isomorphic-git bug: cleanup .git subdirectory
      fixGitSubdirectoryBug(dir, projectId);

      return currentOid;
    } catch (error) {
      this.logger.error(`Rebase merge failed:`, error);
      throw new Error(`Rebase merge failed: ${error.message}`);
    }
  }

  /**
   * Find the merge base (common ancestor) of two commits
   *
   * Simple implementation: walk back from both commits and find first common commit
   *
   * ECP-B2: KISS - Simple ancestor finding algorithm
   * ECP-D1: Testability - Isolated merge base logic
   *
   * @param dir - Repository directory path
   * @param oid1 - First commit OID
   * @param oid2 - Second commit OID
   * @returns Merge base OID or null if no common ancestor
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
      this.logger.debug(`findMergeBase: Collecting ancestors of oid1=${oid1}`);
      while (current) {
        commits1.add(current);
        this.logger.debug(`  Added commit: ${current}`);
        const commit = await git.readCommit({
          fs,
          dir,
          gitdir: dir,
          oid: current,
        });
        current = commit.commit.parent[0]; // Follow first parent only
        if (current) {
          this.logger.debug(`  Parent: ${current}`);
        } else {
          this.logger.debug(`  No parent (reached initial commit)`);
        }
      }
      this.logger.debug(`Collected ${commits1.size} commits from oid1`);

      // Walk back from oid2 until we find a commit in commits1
      current = oid2;
      this.logger.debug(`findMergeBase: Walking back from oid2=${oid2}`);
      while (current) {
        this.logger.debug(`  Checking commit: ${current}`);
        if (commits1.has(current)) {
          this.logger.debug(`  ✅ Found common ancestor: ${current}`);
          return current; // Found merge base
        }
        const commit = await git.readCommit({
          fs,
          dir,
          gitdir: dir,
          oid: current,
        });
        current = commit.commit.parent[0];
        if (current) {
          this.logger.debug(`  Parent: ${current}`);
        } else {
          this.logger.debug(
            `  No parent (reached initial commit without finding common ancestor)`,
          );
        }
      }

      this.logger.warn(`No common ancestor found between ${oid1} and ${oid2}`);
      return null; // No common ancestor
    } catch (error) {
      this.logger.warn('Failed to find merge base:', error);
      return null;
    }
  }

  /**
   * Get list of commits between base and head (exclusive base, inclusive head)
   *
   * ECP-B2: KISS - Simple commit range collection
   * ECP-D1: Testability - Pure commit range logic
   *
   * @param dir - Repository directory path
   * @param baseOid - Base commit OID (excluded from result)
   * @param headOid - Head commit OID (included in result)
   * @returns Array of commits in order (oldest to newest)
   */
  private async getCommitRange(
    dir: string,
    baseOid: string,
    headOid: string,
  ): Promise<
    Array<{
      commit: {
        tree: string;
        message: string;
        author: {
          name: string;
          email: string;
          timestamp: number;
          timezoneOffset: number;
        };
      };
    }>
  > {
    const commits: Array<{
      commit: {
        tree: string;
        message: string;
        author: {
          name: string;
          email: string;
          timestamp: number;
          timezoneOffset: number;
        };
      };
    }> = [];
    let current = headOid;

    while (current && current !== baseOid) {
      const commitObj = await git.readCommit({
        fs,
        dir,
        gitdir: dir,
        oid: current,
      });
      commits.unshift(commitObj); // Add to beginning to maintain order
      current = commitObj.commit.parent[0];
    }

    return commits;
  }
}
