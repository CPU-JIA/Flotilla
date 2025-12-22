/**
 * Git Utility Functions
 *
 * ECP-B1: DRY - Shared utilities to avoid code duplication across Git services
 * ECP-D1: Testability - Pure functions for easy testing
 */

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('GitUtils');

/**
 * Recursively copy directory contents
 *
 * ECP-B2: KISS - Simple recursive implementation
 * ECP-C1: Defensive programming - Checks existence before operations
 *
 * @param src - Source directory path
 * @param dest - Destination directory path
 */
export function copyDirRecursive(src: string, dest: string): void {
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
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Fix isomorphic-git bug: move objects from .git subdirectory to root
 *
 * isomorphic-git sometimes creates .git subdirectory in bare repositories,
 * which breaks Git HTTP Smart Protocol. This function fixes the issue by:
 * 1. Copying refs and objects from .git to root
 * 2. Removing the .git subdirectory
 *
 * ECP-C1: Defensive programming - Handles isomorphic-git quirks
 * ECP-D2: Comments explaining WHY (complex library bug workaround)
 *
 * @param dir - Bare Git repository directory path
 * @param projectId - Project ID for logging
 */
export function fixGitSubdirectoryBug(dir: string, projectId: string): void {
  const gitSubdir = path.join(dir, '.git');

  if (!fs.existsSync(gitSubdir)) {
    return;
  }

  logger.debug(`Fixing isomorphic-git .git subdirectory for ${projectId}`);

  // Copy refs from .git to root
  const gitRefsDir = path.join(gitSubdir, 'refs');
  const rootRefsDir = path.join(dir, 'refs');

  if (fs.existsSync(gitRefsDir)) {
    copyDirRecursive(gitRefsDir, rootRefsDir);
  }

  // Copy objects from .git to root
  const gitObjectsDir = path.join(gitSubdir, 'objects');
  const rootObjectsDir = path.join(dir, 'objects');

  if (fs.existsSync(gitObjectsDir)) {
    copyDirRecursive(gitObjectsDir, rootObjectsDir);
  }

  // Remove .git subdirectory
  fs.rmSync(gitSubdir, { recursive: true, force: true });
  logger.debug(`Removed .git subdirectory for ${projectId}`);
}

/**
 * Force filesystem sync for a ref file (Windows workaround)
 *
 * Windows has issues with ref file visibility after write.
 * Re-read and re-write to force flush.
 *
 * ECP-C1: Defensive programming - Platform-specific workaround
 * ECP-D2: Comments explaining WHY (Windows file system issue)
 *
 * @param refPath - Absolute path to ref file
 * @param projectId - Project ID for logging
 */
export function forceRefSync(refPath: string, projectId: string): void {
  if (!fs.existsSync(refPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(refPath, 'utf8');
    fs.writeFileSync(refPath, content, { flag: 'w' });
    logger.debug(`Forced sync of ref file for ${projectId}`);
  } catch (error) {
    logger.warn(`Failed to force sync ref file: ${error.message}`);
  }
}

/**
 * Read ref file directly to get commit SHA
 *
 * Why not git.resolveRef?
 * - isomorphic-git.resolveRef has bugs with bare repositories
 * - Direct file read is 100% reliable
 *
 * ECP-C1: Defensive programming - Use most reliable method
 * ECP-D2: Comments explaining WHY (library limitation)
 *
 * @param dir - Repository directory path
 * @param branchName - Branch name (without refs/heads/ prefix)
 * @returns Commit SHA or null if branch doesn't exist
 */
export function readRefDirect(dir: string, branchName: string): string | null {
  const refPath = path.join(dir, 'refs', 'heads', branchName);

  if (!fs.existsSync(refPath)) {
    return null;
  }

  try {
    return fs.readFileSync(refPath, 'utf8').trim();
  } catch (error) {
    logger.warn(`Failed to read ref file ${refPath}: ${error.message}`);
    return null;
  }
}

/**
 * Verify Git object exists on filesystem
 *
 * ECP-C1: Defensive programming - Validate object existence
 *
 * @param dir - Repository directory path
 * @param oid - Object ID (SHA-1 hash)
 * @returns true if object exists, false otherwise
 */
export function verifyObjectExists(dir: string, oid: string): boolean {
  const objectPath = path.join(
    dir,
    'objects',
    oid.substring(0, 2),
    oid.substring(2),
  );
  return fs.existsSync(objectPath);
}
