#!/usr/bin/env ts-node
/**
 * Migration Script: Fix Git HTTP Smart Protocol Configuration
 *
 * Purpose: Add missing http.receivepack=true configuration to existing repositories
 *
 * Background:
 * - Bug discovered: isomorphic-git's setConfig() fails to persist http.receivepack in bare repos
 * - Impact: All repositories created before this fix cannot accept git push operations
 * - Solution: Use system git config command to add missing configuration
 *
 * ECP Compliance:
 * - ECP-C1: Defensive programming with dry-run mode and validation
 * - ECP-C2: Comprehensive error handling with detailed reporting
 * - ECP-B2: KISS - Simple, clear, single-purpose script
 *
 * Usage:
 *   # Preview changes without modifying
 *   pnpm ts-node fix-git-http-config.ts --dry-run
 *
 *   # Apply fixes to default location (/tmp/flotilla-git)
 *   pnpm ts-node fix-git-http-config.ts
 *
 *   # Apply fixes to custom location
 *   pnpm ts-node fix-git-http-config.ts --path /custom/path/to/repos
 *
 * @author JIA (via Claude Code)
 * @date 2025-10-25
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as git from 'isomorphic-git';

const execFileAsync = promisify(execFile);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface MigrationStats {
  total: number;
  fixed: number;
  skipped: number;
  failed: number;
  errors: Array<{ repo: string; error: string }>;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; repoPath: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pathIndex = args.indexOf('--path');
  const repoPath =
    pathIndex !== -1 && args[pathIndex + 1]
      ? args[pathIndex + 1]
      : process.env.GIT_STORAGE_PATH || path.join(os.tmpdir(), 'flotilla-git');

  return { dryRun, repoPath };
}

/**
 * Check if directory is a valid git repository
 */
function isGitRepository(dirPath: string): boolean {
  const configPath = path.join(dirPath, 'config');
  return fs.existsSync(configPath);
}

/**
 * Check if repository already has http.receivepack configured
 *
 * Uses system git config command instead of isomorphic-git.getConfig
 * Reason: isomorphic-git.getConfig() returns undefined on Windows even when config exists
 */
async function hasHttpReceivePack(dirPath: string): Promise<boolean> {
  try {
    const configFilePath = path.join(dirPath, 'config');
    const { stdout } = await execFileAsync('git', [
      'config',
      '--file',
      configFilePath,
      '--get',
      'http.receivepack',
    ]);
    return stdout.trim() === 'true';
  } catch (error) {
    // Config key not found or error reading
    return false;
  }
}

/**
 * Add http.receivepack=true configuration using system git
 */
async function addHttpReceivePack(dirPath: string): Promise<void> {
  const configFilePath = path.join(dirPath, 'config');
  await execFileAsync('git', [
    'config',
    '--file',
    configFilePath,
    'http.receivepack',
    'true',
  ]);
}

/**
 * Verify configuration was successfully added
 */
async function verifyConfiguration(dirPath: string): Promise<boolean> {
  return await hasHttpReceivePack(dirPath);
}

/**
 * Process a single repository
 */
async function processRepository(
  repoName: string,
  repoPath: string,
  dryRun: boolean,
): Promise<'fixed' | 'skipped' | 'failed'> {
  // Check if it's a valid git repository
  if (!isGitRepository(repoPath)) {
    console.log(
      `  ${colors.yellow}⊘ ${repoName}${colors.reset} - Not a git repository, skipping`,
    );
    return 'skipped';
  }

  // Check if already configured
  const hasConfig = await hasHttpReceivePack(repoPath);
  if (hasConfig) {
    console.log(
      `  ${colors.cyan}✓ ${repoName}${colors.reset} - Already configured, skipping`,
    );
    return 'skipped';
  }

  // Fix needed
  if (dryRun) {
    console.log(
      `  ${colors.blue}⚡ ${repoName}${colors.reset} - Would add http.receivepack=true (dry-run)`,
    );
    return 'fixed';
  }

  // Apply fix
  try {
    await addHttpReceivePack(repoPath);

    // Verify fix
    const verified = await verifyConfiguration(repoPath);
    if (!verified) {
      throw new Error('Configuration added but verification failed');
    }

    console.log(
      `  ${colors.green}✓ ${repoName}${colors.reset} - Successfully added http.receivepack=true`,
    );
    return 'fixed';
  } catch (error) {
    console.log(
      `  ${colors.red}✗ ${repoName}${colors.reset} - Failed: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const { dryRun, repoPath } = parseArgs();

  console.log(
    `\n${colors.bold}${colors.cyan}Git HTTP Configuration Migration Tool${colors.reset}\n`,
  );
  console.log(
    `Mode: ${dryRun ? `${colors.blue}DRY RUN${colors.reset} (preview only)` : `${colors.green}LIVE${colors.reset} (will modify files)`}`,
  );
  console.log(`Repository path: ${colors.yellow}${repoPath}${colors.reset}\n`);

  // Check if repository path exists
  if (!fs.existsSync(repoPath)) {
    console.log(
      `${colors.red}Error: Repository path does not exist: ${repoPath}${colors.reset}`,
    );
    console.log(
      `${colors.yellow}Hint: Set GIT_STORAGE_PATH environment variable or use --path flag${colors.reset}\n`,
    );
    process.exit(1);
  }

  // Scan repositories
  const entries = fs.readdirSync(repoPath, { withFileTypes: true });
  const repoDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (repoDirs.length === 0) {
    console.log(
      `${colors.yellow}No repositories found in ${repoPath}${colors.reset}\n`,
    );
    process.exit(0);
  }

  console.log(
    `Found ${colors.bold}${repoDirs.length}${colors.reset} directories to process\n`,
  );

  // Process each repository
  const stats: MigrationStats = {
    total: repoDirs.length,
    fixed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const repoName of repoDirs) {
    const fullPath = path.join(repoPath, repoName);
    try {
      const result = await processRepository(repoName, fullPath, dryRun);
      if (result === 'fixed') {
        stats.fixed++;
      } else if (result === 'skipped') {
        stats.skipped++;
      }
    } catch (error) {
      stats.failed++;
      stats.errors.push({ repo: repoName, error: error.message });
    }
  }

  // Print summary
  console.log(`\n${colors.bold}${colors.cyan}Migration Summary${colors.reset}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total repositories:     ${stats.total}`);
  console.log(
    `${colors.green}Fixed:${colors.reset}                  ${stats.fixed}`,
  );
  console.log(
    `${colors.cyan}Skipped (already OK):${colors.reset}   ${stats.skipped}`,
  );
  console.log(
    `${colors.red}Failed:${colors.reset}                 ${stats.failed}`,
  );

  if (stats.errors.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Errors:${colors.reset}`);
    stats.errors.forEach(({ repo, error }) => {
      console.log(`  ${colors.red}✗${colors.reset} ${repo}: ${error}`);
    });
    console.log(
      `\n${colors.yellow}Troubleshooting failed repositories:${colors.reset}`,
    );
    console.log(`  1. Check file permissions on config files`);
    console.log(`  2. Verify 'git' command is installed and in PATH`);
    console.log(
      `  3. Manually run: git config --file <repo>/config http.receivepack true`,
    );
  }

  if (dryRun) {
    console.log(
      `\n${colors.blue}${colors.bold}This was a dry run. No files were modified.${colors.reset}`,
    );
    console.log(`Run without --dry-run to apply changes.\n`);
  } else {
    console.log(
      `\n${colors.green}${colors.bold}Migration complete!${colors.reset}\n`,
    );
  }

  // Exit with error code if there were failures
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run migration
migrate().catch((error) => {
  console.error(
    `\n${colors.red}${colors.bold}Fatal error:${colors.reset}`,
    error,
  );
  process.exit(1);
});
