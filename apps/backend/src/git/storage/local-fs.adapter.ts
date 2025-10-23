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

  private resolvePath(filepath: string): string {
    // Remove leading slash to make it relative
    const relativePath = filepath.startsWith('/')
      ? filepath.slice(1)
      : filepath;
    return path.join(this.baseDir, relativePath);
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
