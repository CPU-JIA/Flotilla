/**
 * Local Filesystem Adapter
 *
 * Wraps Node.js fs/promises to implement GitStorageAdapter interface.
 * Used for development and testing.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { GitStorageAdapter, Stats } from './storage.interface';

export class LocalFsAdapter implements GitStorageAdapter {
  constructor(private readonly baseDir: string) {}

  /**
   * Safely resolve a filepath within baseDir, preventing path traversal attacks.
   * @throws Error if path attempts to escape baseDir (CWE-22 prevention)
   */
  private resolvePath(filepath: string): string {
    // Normalize and remove null bytes (CWE-158)
    const sanitized = filepath.replace(/\0/g, '');

    // Remove leading slash to make it relative
    const relativePath = sanitized.startsWith('/')
      ? sanitized.slice(1)
      : sanitized;

    // Resolve to absolute path
    const resolvedPath = path.resolve(this.baseDir, relativePath);

    // Normalize both paths for comparison (handle Windows/Unix differences)
    const normalizedBase = path.normalize(this.baseDir);
    const normalizedResolved = path.normalize(resolvedPath);

    // Security check: ensure resolved path is within baseDir
    if (
      !normalizedResolved.startsWith(normalizedBase + path.sep) &&
      normalizedResolved !== normalizedBase
    ) {
      throw new Error(
        `Path traversal detected: "${filepath}" attempts to escape base directory`,
      );
    }

    return resolvedPath;
  }

  async readFile(
    filepath: string,
    options?: { encoding?: BufferEncoding },
  ): Promise<Buffer | string> {
    const fullPath = this.resolvePath(filepath);
    if (options?.encoding) {
      return fs.readFile(fullPath, options.encoding);
    }
    return fs.readFile(fullPath);
  }

  async writeFile(
    filepath: string,
    data: Buffer | string,
    options?: { encoding?: BufferEncoding; mode?: number },
  ): Promise<void> {
    const fullPath = this.resolvePath(filepath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data, {
      encoding: options?.encoding,
      mode: options?.mode,
    });
  }

  async unlink(filepath: string): Promise<void> {
    const fullPath = this.resolvePath(filepath);
    await fs.unlink(fullPath);
  }

  async readdir(filepath: string): Promise<string[]> {
    const fullPath = this.resolvePath(filepath);
    return fs.readdir(fullPath);
  }

  async mkdir(
    filepath: string,
    options?: { recursive?: boolean },
  ): Promise<void> {
    const fullPath = this.resolvePath(filepath);
    await fs.mkdir(fullPath, { recursive: options?.recursive ?? true });
  }

  async rmdir(filepath: string): Promise<void> {
    const fullPath = this.resolvePath(filepath);
    await fs.rmdir(fullPath);
  }

  async stat(filepath: string): Promise<Stats> {
    const fullPath = this.resolvePath(filepath);
    const stats = await fs.stat(fullPath);
    return this.convertStats(stats);
  }

  async lstat(filepath: string): Promise<Stats> {
    const fullPath = this.resolvePath(filepath);
    const stats = await fs.lstat(fullPath);
    return this.convertStats(stats);
  }

  async readlink(filepath: string): Promise<string> {
    const fullPath = this.resolvePath(filepath);
    return fs.readlink(fullPath, 'utf8');
  }

  async symlink(target: string, filepath: string): Promise<void> {
    const fullPath = this.resolvePath(filepath);
    await fs.symlink(target, fullPath);
  }

  private convertStats(stats: fsSync.Stats): Stats {
    return {
      mode: stats.mode,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      isSymbolicLink: () => stats.isSymbolicLink(),
    };
  }
}
