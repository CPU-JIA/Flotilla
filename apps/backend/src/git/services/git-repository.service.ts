/**
 * Git Repository Service
 *
 * Responsible for repository lifecycle management:
 * - Repository initialization
 * - Initial commit creation
 * - Repository configuration
 *
 * ECP-A2: High cohesion - Single responsibility for repository management
 */

import { Injectable, Logger } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getRepoPath } from '../../config/git.config';
import { fixGitSubdirectoryBug, forceRefSync } from '../utils/git-utils';

const execFileAsync = promisify(execFile);

@Injectable()
export class GitRepositoryService {
  private readonly logger = new Logger(GitRepositoryService.name);

  /**
   * Initialize a new Git repository
   *
   * ECP-A1: SOLID - Single responsibility: repository initialization
   * ECP-C1: Defensive programming - Multiple fallback mechanisms for config
   *
   * @param projectId - Project identifier
   * @param defaultBranch - Default branch name (default: 'main')
   */
  async initRepository(
    projectId: string,
    defaultBranch = 'main',
  ): Promise<void> {
    try {
      const dir = getRepoPath(projectId);

      await git.init({
        fs,
        dir,
        defaultBranch,
        bare: true,
      });

      // Enable HTTP push (receive-pack) for Git HTTP Smart Protocol
      // Uses ensureHttpReceivePackConfig with fallback mechanism (ECP-C1, ECP-C2)
      await this.ensureHttpReceivePackConfig(dir);

      // Install pre-receive hook for branch protection validation
      // ECP-C1: Defensive programming - hook validation at Git push time
      this.installPreReceiveHook(dir, projectId);

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
   *
   * Uses low-level Git API to create objects without working directory
   *
   * ECP-A1: SOLID - Single responsibility: initial commit creation
   * ECP-C2: Systematic error handling with detailed logging
   *
   * @param projectId - Project identifier
   * @param author - Author information
   * @returns Commit SHA
   */
  async createInitialCommit(
    projectId: string,
    author: { name: string; email: string },
  ): Promise<string> {
    try {
      const dir = getRepoPath(projectId);

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
      fixGitSubdirectoryBug(dir, projectId);

      // Force filesystem sync to ensure refs are readable (Windows issue)
      const mainRefPath = path.join(dir, 'refs', 'heads', 'main');
      forceRefSync(mainRefPath, projectId);

      this.logger.log(
        `Created initial commit for bare repository: ${projectId}`,
      );
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
    } catch (_error) {
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
      this.logger.debug(
        `Attempting to set ${configKey} via isomorphic-git for ${dir}`,
      );
      await git.setConfig({
        fs,
        dir,
        path: configKey,
        value: configValue,
      });

      // Step 2: Verify config was written (primary validation)
      // Use system git for verification (isomorphic-git.getConfig fails on Windows)
      const verified = await this.verifyConfigViaSystemGit(
        dir,
        configKey,
        configValue,
      );

      if (verified) {
        this.logger.log(
          `✓ Successfully set ${configKey}=${configValue} via isomorphic-git`,
        );
        return; // Success - config verified
      }

      // Step 3: Verification failed - log warning and try fallback
      this.logger.warn(
        `isomorphic-git setConfig failed to persist ${configKey}. ` +
          `Verification via system git returned false. ` +
          `Attempting fallback to system git config...`,
      );
    } catch (primaryError) {
      this.logger.warn(
        `isomorphic-git setConfig threw error: ${primaryError.message}. ` +
          `Attempting fallback to system git config...`,
      );
    }

    // Step 4: Fallback to system git config command
    try {
      this.logger.debug(
        `Executing system git config --file "${path.join(dir, 'config')}" ${configKey} ${configValue}`,
      );

      const configFilePath = path.join(dir, 'config');
      await execFileAsync('git', [
        'config',
        '--file',
        configFilePath,
        configKey,
        configValue,
      ]);

      // Step 5: Re-verify after fallback
      const verified = await this.verifyConfigViaSystemGit(
        dir,
        configKey,
        configValue,
      );

      if (verified) {
        this.logger.log(
          `✓ Successfully set ${configKey}=${configValue} via system git (fallback)`,
        );
        return; // Success - fallback worked
      }

      // Fallback executed but verification still failed
      throw new Error(
        `System git config executed successfully but verification failed.`,
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
   * Install pre-receive hook for branch protection validation
   *
   * ECP-C1: Defensive programming - validates branch protection rules at Git push time
   * ECP-C2: Systematic error handling - logs warnings but doesn't block repo initialization
   * ECP-D1: Testability - isolated hook installation logic
   *
   * The hook script calls the branch protection API to validate:
   * - Branch deletion permissions (allowDeletions)
   * - Force push permissions (allowForcePushes)
   * - Direct push restrictions (requirePullRequest)
   *
   * @param dir - Absolute path to the bare Git repository
   * @param projectId - Project ID (passed to hook via environment variable)
   */
  private installPreReceiveHook(dir: string, projectId: string): void {
    try {
      const hooksDir = path.join(dir, 'hooks');
      // __dirname at runtime is dist/src/git/services/, need to go up to dist/ and then to git/hooks/
      const hookSource = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'git',
        'hooks',
        'pre-receive.sh',
      );
      const hookTarget = path.join(hooksDir, 'pre-receive');

      // ECP-C1: Verify hook source exists before attempting installation
      if (!fs.existsSync(hookSource)) {
        this.logger.warn(
          `Pre-receive hook source not found: ${hookSource}. ` +
            `Skipping hook installation. Branch protection will only apply at PR merge time.`,
        );
        return;
      }

      // Ensure hooks directory exists
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
        this.logger.debug(`Created hooks directory: ${hooksDir}`);
      }

      // Copy hook script
      fs.copyFileSync(hookSource, hookTarget);
      this.logger.debug(`Copied hook script: ${hookSource} → ${hookTarget}`);

      // Make executable (Unix/Linux/macOS only)
      if (process.platform !== 'win32') {
        fs.chmodSync(hookTarget, 0o755);
        this.logger.debug(`Set executable permissions on hook: ${hookTarget}`);
      } else {
        // Windows: Git Bash will handle execution automatically
        this.logger.debug(
          `Windows platform detected. Git Bash will handle hook execution automatically.`,
        );
      }

      this.logger.log(
        `✓ Successfully installed pre-receive hook for project: ${projectId}. ` +
          `Branch protection will be enforced at Git push time.`,
      );
    } catch (error) {
      // ECP-C2: Graceful degradation - log warning but don't throw
      // Hook installation failure shouldn't prevent repository initialization
      // Branch protection will still work at PR merge level
      this.logger.warn(
        `Failed to install pre-receive hook for project ${projectId}: ${error.message}. ` +
          `Branch protection will only apply at PR merge time. ` +
          `Troubleshooting: Check file permissions and ensure hooks/ directory is writable.`,
      );
      // Don't throw - allow repository to be created even if hook installation fails
    }
  }
}
