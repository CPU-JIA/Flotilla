/**
 * Git Configuration
 *
 * Centralized Git storage path configuration to ensure consistency
 * across all services (GitService, GitHttpController, etc.)
 *
 * ECP-B1: DRY - Single source of truth for Git storage path
 * ECP-D3: No magic strings - Configuration extracted to dedicated file
 */

import * as path from 'path';

/**
 * Get Git repository storage base path
 *
 * Priority:
 * 1. GIT_STORAGE_PATH environment variable (production)
 * 2. {cwd}/repos (development default - apps/backend/repos/)
 *
 * @returns Absolute path to Git storage directory
 */
export function getGitStoragePath(): string {
  return process.env.GIT_STORAGE_PATH || path.join(process.cwd(), 'repos');
}

/**
 * Get full repository path for a specific project
 *
 * @param projectId - Project ID
 * @returns Absolute path to the project's Git repository
 */
export function getRepoPath(projectId: string): string {
  return path.join(getGitStoragePath(), projectId);
}
