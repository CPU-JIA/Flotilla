/**
 * Git HTTP Smart Protocol Service
 *
 * Implements Git HTTP Smart Protocol using git http-backend.
 * Supports git clone, fetch, and push operations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

export interface GitHttpBackendOptions {
  projectId: string;
  service: 'git-upload-pack' | 'git-receive-pack';
  repoPath: string;
  pathInfo?: string;
  queryString?: string;
  contentType?: string;
  requestBody?: Buffer;
}

export interface GitHttpBackendResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
}

@Injectable()
export class HttpSmartService {
  private readonly logger = new Logger(HttpSmartService.name);

  /**
   * Execute git http-backend command
   */
  async executeGitHttpBackend(
    options: GitHttpBackendOptions,
  ): Promise<GitHttpBackendResponse> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        GIT_PROJECT_ROOT: options.repoPath,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: options.pathInfo || `/${options.projectId}`,
        QUERY_STRING: options.queryString || '',
        REQUEST_METHOD: options.requestBody ? 'POST' : 'GET',
        CONTENT_TYPE: options.contentType || 'application/x-git-upload-pack-request',
        CONTENT_LENGTH: options.requestBody ? String(options.requestBody.length) : '0',
      };

      const gitProcess = spawn('git', ['http-backend'], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      gitProcess.stdout.on('data', (chunk) => {
        stdout.push(chunk);
      });

      gitProcess.stderr.on('data', (chunk) => {
        stderr.push(chunk);
        this.logger.debug(`git http-backend stderr: ${chunk.toString()}`);
      });

      gitProcess.on('close', (code) => {
        if (code !== 0) {
          const error = Buffer.concat(stderr).toString();
          this.logger.error(
            `git http-backend exited with code ${code}: ${error}`,
          );
          reject(new Error(`git http-backend failed: ${error}`));
          return;
        }

        const output = Buffer.concat(stdout);
        const response = this.parseGitHttpResponse(output);
        resolve(response);
      });

      gitProcess.on('error', (error) => {
        this.logger.error('Failed to spawn git http-backend', error);
        reject(error);
      });

      // Write request body if present
      if (options.requestBody) {
        gitProcess.stdin.write(options.requestBody);
      }
      gitProcess.stdin.end();
    });
  }

  /**
   * Parse git http-backend response
   * Format: HTTP headers + \r\n\r\n + body
   */
  private parseGitHttpResponse(output: Buffer): GitHttpBackendResponse {
    const separator = Buffer.from('\r\n\r\n');
    const separatorIndex = output.indexOf(separator);

    if (separatorIndex === -1) {
      // No headers, return raw output
      return {
        statusCode: 200,
        headers: {},
        body: output,
      };
    }

    const headerSection = output.slice(0, separatorIndex).toString('utf8');
    const body = output.slice(separatorIndex + separator.length);

    const headers: Record<string, string> = {};
    let statusCode = 200;

    const lines = headerSection.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('Status:')) {
        const match = line.match(/Status:\s+(\d+)/);
        if (match) {
          statusCode = parseInt(match[1], 10);
        }
      } else {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
    }

    return { statusCode, headers, body };
  }

  /**
   * Handle /info/refs request
   */
  async handleInfoRefs(
    projectId: string,
    repoPath: string,
    service: 'git-upload-pack' | 'git-receive-pack',
  ): Promise<GitHttpBackendResponse> {
    this.logger.log(
      `Handling info/refs for project ${projectId}, service: ${service}`,
    );

    return this.executeGitHttpBackend({
      projectId,
      service,
      repoPath,
      pathInfo: `/info/refs`,
      queryString: `service=${service}`,
    });
  }

  /**
   * Handle git-upload-pack request (clone/fetch)
   */
  async handleUploadPack(
    projectId: string,
    repoPath: string,
    requestBody: Buffer,
  ): Promise<GitHttpBackendResponse> {
    this.logger.log(`Handling upload-pack for project ${projectId}`);

    return this.executeGitHttpBackend({
      projectId,
      service: 'git-upload-pack',
      repoPath,
      pathInfo: `/git-upload-pack`,
      contentType: 'application/x-git-upload-pack-request',
      requestBody,
    });
  }

  /**
   * Handle git-receive-pack request (push)
   */
  async handleReceivePack(
    projectId: string,
    repoPath: string,
    requestBody: Buffer,
  ): Promise<GitHttpBackendResponse> {
    this.logger.log(`Handling receive-pack for project ${projectId}`);

    return this.executeGitHttpBackend({
      projectId,
      service: 'git-receive-pack',
      repoPath,
      pathInfo: `/git-receive-pack`,
      contentType: 'application/x-git-receive-pack-request',
      requestBody,
    });
  }
}
