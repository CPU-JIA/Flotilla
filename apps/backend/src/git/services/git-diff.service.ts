/**
 * Git Diff Service
 *
 * Responsible for diff computation:
 * - Branch comparison
 * - File diff generation
 * - Patch creation
 *
 * ECP-A2: High cohesion - Single responsibility for diff operations
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import { createTwoFilesPatch } from 'diff';
import { getRepoPath } from '../../config/git.config';
import { readRefDirect, verifyObjectExists } from '../utils/git-utils';

@Injectable()
export class GitDiffService {
  private readonly logger = new Logger(GitDiffService.name);

  /**
   * Get diff between two branches
   *
   * High-quality implementation with real tree walking and patch generation
   *
   * ECP-A1: SOLID - Single responsibility: diff computation
   * ECP-C1: Defensive programming - Validates objects before operations
   * ECP-C3: Performance awareness - Parallel patch generation
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
    try {
      const dir = getRepoPath(projectId);

      // Get commit OIDs for both branches - read ref files directly
      const sourceOid = readRefDirect(dir, sourceBranch);
      const targetOid = readRefDirect(dir, targetBranch);

      if (!sourceOid) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!targetOid) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      this.logger.debug(
        `Read branch refs directly: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

      this.logger.log(
        `Getting diff between ${targetBranch} (${targetOid}) and ${sourceBranch} (${sourceOid})`,
      );

      // Verify objects exist BEFORE calling git.readCommit (diagnostic check)
      if (!verifyObjectExists(dir, sourceOid)) {
        this.logger.error(`Source commit object missing for OID: ${sourceOid}`);
        throw new Error(
          `Source commit object ${sourceOid} does not exist on filesystem`,
        );
      }
      if (!verifyObjectExists(dir, targetOid)) {
        this.logger.error(`Target commit object missing for OID: ${targetOid}`);
        throw new Error(
          `Target commit object ${targetOid} does not exist on filesystem`,
        );
      }

      this.logger.debug(`Verified both commit objects exist on filesystem`);

      // Read commits to get tree OIDs
      const targetCommit = await git.readCommit({
        fs,
        dir,
        gitdir: dir,
        oid: targetOid,
      });
      const sourceCommit = await git.readCommit({
        fs,
        dir,
        gitdir: dir,
        oid: sourceOid,
      });
      const targetTreeOid = targetCommit.commit.tree;
      const sourceTreeOid = sourceCommit.commit.tree;

      this.logger.debug(
        `Tree OIDs: ${targetBranch} tree → ${targetTreeOid}, ${sourceBranch} tree → ${sourceTreeOid}`,
      );

      // Compare trees and get file changes
      const fileChanges = await this.compareCommitTrees(
        dir,
        targetTreeOid,
        sourceTreeOid,
      );

      // Generate patches for each changed file (parallel for performance)
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
        `Failed to get diff for project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Compare two tree OIDs and identify changed files
   *
   * Returns list of file changes with their status (added/modified/deleted)
   *
   * ECP-B2: KISS - Simple tree walking logic
   * ECP-D1: Testability - Pure comparison logic
   *
   * @param dir - Repository directory path
   * @param targetOid - Tree OID of target branch
   * @param sourceOid - Tree OID of source branch
   * @returns Array of file changes
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
      gitdir: dir,
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
        const targetBlobOid = targetEntry ? await targetEntry.oid() : undefined;
        const sourceBlobOid = sourceEntry ? await sourceEntry.oid() : undefined;

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
   *
   * Handles added, modified, and deleted files
   *
   * ECP-C1: Defensive programming - Handles binary files gracefully
   * ECP-C2: Systematic error handling - Warns but doesn't fail
   *
   * @param dir - Repository directory path
   * @param filepath - File path
   * @param targetOid - Target blob OID (undefined for added files)
   * @param sourceOid - Source blob OID (undefined for deleted files)
   * @returns Patch content with statistics
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
   *
   * ECP-C2: Systematic error handling - Warns and returns empty string on failure
   *
   * @param dir - Repository directory path
   * @param oid - Blob OID
   * @returns Blob content as string
   */
  private async readBlobContent(dir: string, oid: string): Promise<string> {
    try {
      const { blob } = await git.readBlob({
        fs,
        dir,
        gitdir: dir, // Explicitly set gitdir for bare repository support
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
   *
   * Simple heuristic: contains null bytes
   *
   * ECP-B2: KISS - Simple binary detection
   *
   * @param content - File content
   * @returns true if content appears to be binary
   */
  private isBinaryContent(content: string): boolean {
    return content.includes('\0');
  }

  /**
   * Count additions and deletions in a unified diff patch
   *
   * ECP-B2: KISS - Simple line counting
   * ECP-D1: Testability - Pure counting function
   *
   * @param patch - Unified diff patch
   * @returns Addition and deletion counts
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
}
