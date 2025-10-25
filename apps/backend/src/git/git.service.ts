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
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createTwoFilesPatch } from 'diff';
import { PrismaService } from '../prisma/prisma.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);
  /**
   * Git repository storage path
   *
   * Priority:
   * 1. GIT_STORAGE_PATH environment variable (production)
   * 2. {cwd}/repos (development default - apps/backend/repos/)
   *
   * ECP-C3: Data persistence - avoid temporary directories that may be cleared
   *
   * Note: Changed from os.tmpdir() to ensure repository data persistence
   * Temporary directories risk data loss on system cleanup/restart
   */
  private readonly gitStorageBasePath =
    process.env.GIT_STORAGE_PATH || path.join(process.cwd(), 'repos');

  constructor(private readonly prisma: PrismaService) {}

  private getRepoPath(projectId: string): string {
    return path.join(this.gitStorageBasePath, projectId);
  }

  /**
   * Verify git config using system git command
   *
   * Why not isomorphic-git.getConfig?
   * - Discovered bug: isomorphic-git.getConfig() returns undefined on Windows
   *   even when config exists in file
   * - System git is 100% reliable across all platforms
   *
   * ECP-C1: Defensive programming - use most reliable verification method
   *
   * @param dir - Repository directory path
   * @param configKey - Config key (e.g., 'http.receivepack')
   * @param expectedValue - Expected value (e.g., 'true')
   * @returns true if config matches expected value, false otherwise
   */
  private async verifyConfigViaSystemGit(
    dir: string,
    configKey: string,
    expectedValue: string,
  ): Promise<boolean> {
    try {
      const configFilePath = path.join(dir, 'config');
      const { stdout } = await execFileAsync('git', [
        'config',
        '--file',
        configFilePath,
        '--get',
        configKey,
      ]);
      return stdout.trim() === expectedValue;
    } catch (error) {
      // Config key not found or error reading
      return false;
    }
  }

  /**
   * Ensure http.receivepack is set to true for Git HTTP Smart Protocol
   *
   * ECP-C1: Defensive programming with fallback mechanism
   * ECP-C2: Systematic error handling with detailed logging
   * ECP-D1: Testability through clear success/failure states
   *
   * Strategy:
   * 1. Try isomorphic-git setConfig (primary method)
   * 2. Verify config was written successfully
   * 3. If verification fails, fallback to system git config command
   * 4. Re-verify after fallback
   * 5. Throw detailed error if both methods fail
   *
   * @param dir - Absolute path to the bare Git repository
   * @throws Error if config cannot be set via either method
   */
  private async ensureHttpReceivePackConfig(dir: string): Promise<void> {
    const configKey = 'http.receivepack';
    const configValue = 'true';

    try {
      // Step 1: Try isomorphic-git setConfig
      this.logger.debug(`Attempting to set ${configKey} via isomorphic-git for ${dir}`);
      await git.setConfig({
        fs,
        dir,
        path: configKey,
        value: configValue,
      });

      // Step 2: Verify config was written (primary validation)
      // Use system git for verification (isomorphic-git.getConfig fails on Windows)
      const verified = await this.verifyConfigViaSystemGit(dir, configKey, configValue);

      if (verified) {
        this.logger.log(`✓ Successfully set ${configKey}=${configValue} via isomorphic-git`);
        return; // Success - config verified
      }

      // Step 3: Verification failed - log warning and try fallback
      this.logger.warn(
        `isomorphic-git setConfig failed to persist ${configKey}. ` +
        `Verification via system git returned false. ` +
        `Attempting fallback to system git config...`
      );

    } catch (primaryError) {
      this.logger.warn(
        `isomorphic-git setConfig threw error: ${primaryError.message}. ` +
        `Attempting fallback to system git config...`
      );
    }

    // Step 4: Fallback to system git config command
    try {
      this.logger.debug(`Executing system git config --file "${path.join(dir, 'config')}" ${configKey} ${configValue}`);

      const configFilePath = path.join(dir, 'config');
      await execFileAsync('git', [
        'config',
        '--file', configFilePath,
        configKey,
        configValue
      ]);

      // Step 5: Re-verify after fallback
      const verified = await this.verifyConfigViaSystemGit(dir, configKey, configValue);

      if (verified) {
        this.logger.log(`✓ Successfully set ${configKey}=${configValue} via system git (fallback)`);
        return; // Success - fallback worked
      }

      // Fallback executed but verification still failed
      throw new Error(
        `System git config executed successfully but verification failed.`
      );

    } catch (fallbackError) {
      // Step 6: Both methods failed - throw comprehensive error
      const errorMessage =
        `Failed to set Git config ${configKey}=${configValue} for repository at ${dir}\n` +
        `Both isomorphic-git and system git config methods failed.\n\n` +
        `Fallback error: ${fallbackError.message}\n\n` +
        `Troubleshooting:\n` +
        `1. Verify 'git' command is installed and in PATH\n` +
        `2. Check repository permissions at: ${dir}\n` +
        `3. Manually run: git config --file "${path.join(dir, 'config')}" ${configKey} ${configValue}\n` +
        `4. Verify config file is writable: ${path.join(dir, 'config')}`;

      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
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
      // Uses ensureHttpReceivePackConfig with fallback mechanism (ECP-C1, ECP-C2)
      await this.ensureHttpReceivePackConfig(dir);

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
        gitdir: dir, // Required for bare repository
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
        gitdir: dir, // Required for bare repository
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

      // Force filesystem sync to ensure refs are readable (Windows issue)
      const mainRefPath = path.join(dir, 'refs', 'heads', 'main');
      if (fs.existsSync(mainRefPath)) {
        // Re-read and re-write to force flush
        const content = fs.readFileSync(mainRefPath, 'utf8');
        fs.writeFileSync(mainRefPath, content, { flag: 'w' });
        this.logger.debug(`Forced sync of main ref for ${projectId}`);
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
   * Create a commit on a specific branch
   * Supports adding/modifying files. If branch doesn't exist, it will be created from current HEAD or as orphan.
   */
  async commit(
    projectId: string,
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = this.getRepoPath(projectId);
      const branchRef = `refs/heads/${branch}`;

      // Try to resolve current branch HEAD to get parent commit
      let parentCommit: string | null = null;
      let existingTree: any[] = [];

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
              mode,
              path: filepath,
              oid,
              type,
            });
          },
        });
      } catch (error) {
        // Branch doesn't exist or no parent commit - will create new branch
        this.logger.debug(`Branch ${branch} doesn't exist, creating new branch`);
      }

      // Create tree entries map for merging
      const treeEntriesMap = new Map<string, any>();
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

      // Convert map to array for writeTree
      const treeEntries = Array.from(treeEntriesMap.values());

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

      // Fix isomorphic-git bug: move objects from .git subdirectory to root (same as createInitialCommit)
      const gitSubdir = path.join(dir, '.git');
      if (fs.existsSync(gitSubdir)) {
        this.logger.debug(
          `Fixing isomorphic-git .git subdirectory after commit for ${projectId}`,
        );

        // Copy refs and objects from .git to root
        const gitRefsDir = path.join(gitSubdir, 'refs');
        const rootRefsDir = path.join(dir, 'refs');

        if (fs.existsSync(gitRefsDir)) {
          this.copyDirRecursive(gitRefsDir, rootRefsDir);
        }

        const gitObjectsDir = path.join(gitSubdir, 'objects');
        const rootObjectsDir = path.join(dir, 'objects');

        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }

        // Remove .git subdirectory
        fs.rmSync(gitSubdir, { recursive: true, force: true });
        this.logger.debug(
          `Removed .git subdirectory after commit for ${projectId}`,
        );
      }

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

      // DEBUG: Log startPoint parameter
      this.logger.debug(
        `createBranch called with: projectId=${projectId}, branchName=${branchName}, startPoint=${startPoint} (type: ${typeof startPoint})`,
      );

      // If startPoint is provided, resolve it to a commit SHA
      let commitSha: string | undefined;
      if (startPoint) {
        // Try to read ref file directly (isomorphic-git resolveRef has issues with bare repos)
        const refPath = path.join(dir, 'refs', 'heads', startPoint);
        if (fs.existsSync(refPath)) {
          try {
            commitSha = fs.readFileSync(refPath, 'utf8').trim();
            this.logger.debug(
              `Read ref file directly: ${startPoint} → ${commitSha}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to read ref file ${refPath}: ${error.message}`);
          }
        }

        // If direct read failed, try git.resolveRef as fallback
        if (!commitSha) {
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

      // Debug: Check after git.branch
      const gitSubdir = path.join(dir, '.git');
      this.logger.debug(
        `After git.branch - .git exists: ${fs.existsSync(gitSubdir)} for ${projectId}`,
      );
      if (fs.existsSync(gitSubdir)) {
        this.logger.debug(
          `Fixing isomorphic-git .git subdirectory after createBranch for ${projectId}`,
        );

        // Copy refs and objects from .git to root
        const gitRefsDir = path.join(gitSubdir, 'refs');
        const rootRefsDir = path.join(dir, 'refs');

        if (fs.existsSync(gitRefsDir)) {
          this.copyDirRecursive(gitRefsDir, rootRefsDir);
        }

        const gitObjectsDir = path.join(gitSubdir, 'objects');
        const rootObjectsDir = path.join(dir, 'objects');

        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }

        // Remove .git subdirectory
        fs.rmSync(gitSubdir, { recursive: true, force: true });
        this.logger.debug(
          `Removed .git subdirectory after createBranch for ${projectId}`,
        );
      }

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

      // Debug: Check refs directory first
      const refsDir = path.join(dir, 'refs', 'heads');
      if (fs.existsSync(refsDir)) {
        const files = fs.readdirSync(refsDir);
        this.logger.debug(`Files in refs/heads: ${files.join(', ')} for ${projectId}`);
      } else {
        this.logger.debug(`refs/heads directory does not exist for ${projectId}`);
      }

      // Get all branch names - bypass isomorphic-git.listBranches (has bugs with bare repos)
      // Read refs/heads directory directly
      let branches: string[] = [];
      if (fs.existsSync(refsDir)) {
        const files = fs.readdirSync(refsDir);
        branches = files.filter(name => {
          const filePath = path.join(refsDir, name);
          return fs.statSync(filePath).isFile();
        });
        this.logger.debug(`Read branches directly from filesystem: ${JSON.stringify(branches)}`);
      }

      this.logger.log(`Found ${branches.length} branches in project ${projectId}`);

      // Get HEAD commit info for each branch
      const branchesWithInfo = await Promise.all(
        branches.map(async (branchName) => {
          try {
            // Read commit OID directly from ref file (bypass git.resolveRef)
            const refPath = path.join(refsDir, branchName);
            const commitOid = fs.readFileSync(refPath, 'utf8').trim();
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

      // Get commit OIDs for both branches - read ref files directly (git.resolveRef has bugs with bare repos)
      const sourceRefPath = path.join(dir, 'refs', 'heads', sourceBranch);
      const targetRefPath = path.join(dir, 'refs', 'heads', targetBranch);

      if (!fs.existsSync(sourceRefPath)) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!fs.existsSync(targetRefPath)) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      const sourceOid = fs.readFileSync(sourceRefPath, 'utf8').trim();
      const targetOid = fs.readFileSync(targetRefPath, 'utf8').trim();

      this.logger.debug(
        `Read branch refs directly: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

      this.logger.log(
        `Getting diff between ${targetBranch} (${targetOid}) and ${sourceBranch} (${sourceOid})`,
      );

      // Verify objects exist BEFORE calling git.readCommit (diagnostic check)
      const sourceObjectPath = path.join(dir, 'objects', sourceOid.substring(0, 2), sourceOid.substring(2));
      const targetObjectPath = path.join(dir, 'objects', targetOid.substring(0, 2), targetOid.substring(2));

      if (!fs.existsSync(sourceObjectPath)) {
        this.logger.error(`Source commit object missing: ${sourceObjectPath}`);
        throw new Error(`Source commit object ${sourceOid} does not exist on filesystem`);
      }
      if (!fs.existsSync(targetObjectPath)) {
        this.logger.error(`Target commit object missing: ${targetObjectPath}`);
        throw new Error(`Target commit object ${targetOid} does not exist on filesystem`);
      }

      this.logger.debug(`Verified both commit objects exist on filesystem`);

      // Fix isomorphic-git bug BEFORE readCommit: ensure objects are in correct location
      const gitSubdirBeforeRead = path.join(dir, '.git');
      if (fs.existsSync(gitSubdirBeforeRead)) {
        this.logger.debug(
          `Fixing .git subdirectory before readCommit for ${projectId}`,
        );
        const gitObjectsDir = path.join(gitSubdirBeforeRead, 'objects');
        const rootObjectsDir = path.join(dir, 'objects');
        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }
        fs.rmSync(gitSubdirBeforeRead, { recursive: true, force: true });
        this.logger.debug(`Removed .git subdirectory before readCommit`);
      }

      // Read commits to get tree OIDs (git.walk needs tree OIDs, not commit OIDs)
      // For bare repositories, explicitly set gitdir=dir to avoid .git subdirectory lookups
      const targetCommit = await git.readCommit({ fs, dir, gitdir: dir, oid: targetOid });
      const sourceCommit = await git.readCommit({ fs, dir, gitdir: dir, oid: sourceOid });
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
        `Failed to get diff for project ${projectId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Compare two tree OIDs and identify changed files
   * Returns list of file changes with their status (added/modified/deleted)
   * @param targetOid - Tree OID of target branch
   * @param sourceOid - Tree OID of source branch
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

    // Fix isomorphic-git bug BEFORE git.walk: ensure trees are accessible
    const gitSubdirBeforeWalk = path.join(dir, '.git');
    if (fs.existsSync(gitSubdirBeforeWalk)) {
      this.logger.debug(
        `Fixing .git subdirectory before git.walk for ${this.getRepoPath}`,
      );
      const gitObjectsDir = path.join(gitSubdirBeforeWalk, 'objects');
      const rootObjectsDir = path.join(dir, 'objects');
      if (fs.existsSync(gitObjectsDir)) {
        this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
      }
      fs.rmSync(gitSubdirBeforeWalk, { recursive: true, force: true });
      this.logger.debug(`Removed .git subdirectory before git.walk`);
    }

    // Walk through both trees simultaneously using git.walk()
    // For bare repositories, use gitdir parameter
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

      // Read refs directly to get commit SHAs (git.merge internally calls git.resolveRef which has bugs)
      const sourceRefPath = path.join(dir, 'refs', 'heads', sourceBranch);
      const targetRefPath = path.join(dir, 'refs', 'heads', targetBranch);

      if (!fs.existsSync(sourceRefPath)) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!fs.existsSync(targetRefPath)) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      const sourceOid = fs.readFileSync(sourceRefPath, 'utf8').trim();
      const targetOid = fs.readFileSync(targetRefPath, 'utf8').trim();

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
        oid: sourceOid
      });
      const sourceTree = sourceCommit.commit.tree;

      this.logger.debug(`Source commit tree: ${sourceTree}`);

      // Create merge commit manually with both parents
      const mergeCommitOid = await git.commit({
        fs,
        dir,
        gitdir: dir,
        message: commitMessage,
        tree: sourceTree,  // Use source tree as merge result (no conflicts for now)
        parent: [targetOid, sourceOid],  // Two parents make it a merge commit
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

      // Get the tree of the source branch (final state) - read ref files directly
      const sourceRefPath = path.join(dir, 'refs', 'heads', sourceBranch);
      const targetRefPath = path.join(dir, 'refs', 'heads', targetBranch);

      if (!fs.existsSync(sourceRefPath)) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!fs.existsSync(targetRefPath)) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      const sourceOid = fs.readFileSync(sourceRefPath, 'utf8').trim();
      const targetOid = fs.readFileSync(targetRefPath, 'utf8').trim();

      this.logger.debug(
        `Read branch refs for squash: ${sourceBranch} → ${sourceOid}, ${targetBranch} → ${targetOid}`,
      );

      const sourceCommit = await git.readCommit({ fs, dir, gitdir: dir, oid: sourceOid });
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
      const gitSubdir = path.join(dir, '.git');
      if (fs.existsSync(gitSubdir)) {
        this.logger.debug(
          `Fixing isomorphic-git .git subdirectory after squash for ${projectId}`,
        );
        const gitRefsDir = path.join(gitSubdir, 'refs');
        const rootRefsDir = path.join(dir, 'refs');
        if (fs.existsSync(gitRefsDir)) {
          this.copyDirRecursive(gitRefsDir, rootRefsDir);
        }
        const gitObjectsDir = path.join(gitSubdir, 'objects');
        const rootObjectsDir = path.join(dir, 'objects');
        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }
        fs.rmSync(gitSubdir, { recursive: true, force: true });
        this.logger.debug(
          `Removed .git subdirectory after squash for ${projectId}`,
        );
      }

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

      // Find the merge base (common ancestor) - read ref files directly
      const sourceRefPath = path.join(dir, 'refs', 'heads', sourceBranch);
      const targetRefPath = path.join(dir, 'refs', 'heads', targetBranch);

      if (!fs.existsSync(sourceRefPath)) {
        throw new Error(`Source branch '${sourceBranch}' does not exist`);
      }
      if (!fs.existsSync(targetRefPath)) {
        throw new Error(`Target branch '${targetBranch}' does not exist`);
      }

      const sourceOid = fs.readFileSync(sourceRefPath, 'utf8').trim();
      const targetOid = fs.readFileSync(targetRefPath, 'utf8').trim();

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
      const gitSubdir = path.join(dir, '.git');
      if (fs.existsSync(gitSubdir)) {
        this.logger.debug(
          `Fixing isomorphic-git .git subdirectory after rebase for ${projectId}`,
        );
        const gitRefsDir = path.join(gitSubdir, 'refs');
        const rootRefsDir = path.join(dir, 'refs');
        if (fs.existsSync(gitRefsDir)) {
          this.copyDirRecursive(gitRefsDir, rootRefsDir);
        }
        const gitObjectsDir = path.join(gitSubdir, 'objects');
        const rootObjectsDir = path.join(dir, 'objects');
        if (fs.existsSync(gitObjectsDir)) {
          this.copyDirRecursive(gitObjectsDir, rootObjectsDir);
        }
        fs.rmSync(gitSubdir, { recursive: true, force: true });
        this.logger.debug(
          `Removed .git subdirectory after rebase for ${projectId}`,
        );
      }

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
      this.logger.debug(`findMergeBase: Collecting ancestors of oid1=${oid1}`);
      while (current) {
        commits1.add(current);
        this.logger.debug(`  Added commit: ${current}`);
        const commit = await git.readCommit({ fs, dir, gitdir: dir, oid: current });
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
        const commit = await git.readCommit({ fs, dir, gitdir: dir, oid: current });
        current = commit.commit.parent[0];
        if (current) {
          this.logger.debug(`  Parent: ${current}`);
        } else {
          this.logger.debug(`  No parent (reached initial commit without finding common ancestor)`);
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
      const commitObj = await git.readCommit({ fs, dir, gitdir: dir, oid: current });
      commits.unshift(commitObj); // Add to beginning to maintain order
      current = commitObj.commit.parent[0];
    }

    return commits;
  }
}
