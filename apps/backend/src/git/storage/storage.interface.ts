/**
 * Git Storage Interface
 *
 * Defines the filesystem interface required by isomorphic-git.
 * This abstraction allows us to use different storage backends
 * (local filesystem, MinIO object storage, etc.)
 */

export interface Stats {
  mode: number;
  size: number;
  mtimeMs: number;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

export interface GitStorageAdapter {
  /**
   * Read file content
   */
  readFile(
    filepath: string,
    options?: { encoding?: BufferEncoding },
  ): Promise<Buffer | string>;

  /**
   * Write file content
   */
  writeFile(
    filepath: string,
    data: Buffer | string,
    options?: { encoding?: BufferEncoding; mode?: number },
  ): Promise<void>;

  /**
   * Delete file
   */
  unlink(filepath: string): Promise<void>;

  /**
   * Read directory entries
   */
  readdir(filepath: string): Promise<string[]>;

  /**
   * Create directory (recursive)
   */
  mkdir(filepath: string, options?: { recursive?: boolean }): Promise<void>;

  /**
   * Remove directory
   */
  rmdir(filepath: string): Promise<void>;

  /**
   * Get file/directory stats
   */
  stat(filepath: string): Promise<Stats>;

  /**
   * Get file/directory stats (don't follow symlinks)
   */
  lstat(filepath: string): Promise<Stats>;

  /**
   * Read symbolic link target
   */
  readlink(filepath: string): Promise<string>;

  /**
   * Create symbolic link
   */
  symlink(target: string, filepath: string): Promise<void>;
}
