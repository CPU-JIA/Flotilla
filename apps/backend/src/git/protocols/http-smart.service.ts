/**
 * Git HTTP Smart Protocol Service
 *
 * Implements Git HTTP Smart Protocol using git http-backend.
 * Supports git clone, fetch, and push operations.
 *
 * 🔒 SECURITY FIXES:
 * - CWE-78: Environment variable injection prevention
 * - CWE-755: Enhanced error handling without information leakage
 * - CWE-400: Stream size limit enforcement for DoS prevention
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { Readable } from 'stream';
import { Request, Response } from 'express';
import {
  validatePath,
  validateHome,
  validateApiBaseUrl,
  validateProjectId,
  validateQueryString,
} from '../../common/utils/env-validator.util';
import { StreamSizeCounter } from '../utils/stream-counter.util';

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
   *
   * IMPORTANT: Git http-backend requires:
   * - GIT_PROJECT_ROOT: Parent directory containing all repositories
   * - PATH_INFO: /{projectId}{gitPath} (e.g., /cmhfopcmt000dxbu8rvmjvtse/info/refs)
   */
  async executeGitHttpBackend(
    options: GitHttpBackendOptions,
  ): Promise<GitHttpBackendResponse> {
    // 🔒 SECURITY FIX (CWE-78): Validate all inputs using whitelist validation
    if (!validateProjectId(options.projectId)) {
      throw new BadRequestException(
        'Invalid projectId format - only alphanumeric characters and hyphens allowed',
      );
    }

    // Validate pathInfo - must be a valid Git path
    const allowedPaths = [
      '/info/refs',
      '/git-upload-pack',
      '/git-receive-pack',
    ];
    if (options.pathInfo && !allowedPaths.includes(options.pathInfo)) {
      throw new BadRequestException(
        `Invalid pathInfo - must be one of: ${allowedPaths.join(', ')}`,
      );
    }

    // Validate queryString format
    if (options.queryString && !validateQueryString(options.queryString)) {
      throw new BadRequestException(
        'Invalid queryString format - only alphanumeric, =, &, and - allowed',
      );
    }

    return new Promise((resolve, reject) => {
      // Extract parent directory from repoPath
      // repoPath: E:\Flotilla\apps\backend\repos\cmhfopcmt000dxbu8rvmjvtse
      // gitProjectRoot: E:\Flotilla\apps\backend\repos
      const gitProjectRoot = path.dirname(options.repoPath);

      // 🔒 SECURITY FIX (CWE-78): Validate environment variables before passing to child process
      const env = {
        // Validate and sanitize system environment variables
        PATH: validatePath(process.env.PATH),
        HOME: validateHome(process.env.HOME),
        NODE_ENV: process.env.NODE_ENV || 'development',

        // Git-specific variables
        GIT_PROJECT_ROOT: gitProjectRoot,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: `/${options.projectId}${options.pathInfo || ''}`,
        QUERY_STRING: options.queryString || '',
        REQUEST_METHOD: options.requestBody ? 'POST' : 'GET',
        CONTENT_TYPE:
          options.contentType || 'application/x-git-upload-pack-request',
        CONTENT_LENGTH: options.requestBody
          ? String(options.requestBody.length)
          : '0',

        // Add environment variables for pre-receive hook
        PROJECT_ID: options.projectId,

        // 🔒 SECURITY FIX (CWE-918): Validate API URL to prevent SSRF
        API_BASE_URL: validateApiBaseUrl(process.env.API_BASE_URL),
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

          // 🔒 SECURITY FIX (CWE-755): Log detailed error but return generic message
          this.logger.error(
            `git http-backend exited with code ${code}: ${error}`,
          );

          // Return generic error to client (don't leak internal details)
          reject(
            new InternalServerErrorException(
              'Git operation failed. Please check your request and try again.',
            ),
          );
          return;
        }

        const output = Buffer.concat(stdout);
        const response = this.parseGitHttpResponse(output);
        resolve(response);
      });

      gitProcess.on('error', (error) => {
        // 🔒 SECURITY FIX (CWE-755): Log detailed error but return generic message
        this.logger.error('Failed to spawn git http-backend', error);

        reject(
          new InternalServerErrorException(
            'Git operation failed. Please try again later.',
          ),
        );
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

  /**
   * 🔒 SECURITY: Stream-based git http-backend execution
   * Prevents memory exhaustion by streaming request/response
   *
   * SECURITY FIXES:
   * - CWE-78: Environment variable validation
   * - CWE-400: Stream size limit enforcement
   * - CWE-755: Error handling without information leakage
   *
   * @param options Git backend options
   * @param requestStream Input stream (typically req from Express)
   * @param responseStream Output stream (Response object with streaming)
   * @param maxSize Maximum allowed stream size (for DoS protection)
   */
  private async executeGitHttpBackendStream(
    options: GitHttpBackendOptions,
    requestStream: Readable,
    responseStream: Response,
    maxSize: number,
  ): Promise<void> {
    // 🔒 SECURITY FIX (CWE-78): Validate all inputs
    if (!validateProjectId(options.projectId)) {
      throw new BadRequestException(
        'Invalid projectId format - only alphanumeric characters and hyphens allowed',
      );
    }

    if (
      options.pathInfo &&
      !['/git-upload-pack', '/git-receive-pack'].includes(options.pathInfo)
    ) {
      throw new BadRequestException(
        'Invalid pathInfo - must be /git-upload-pack or /git-receive-pack',
      );
    }

    return new Promise((resolve, reject) => {
      const gitProjectRoot = path.dirname(options.repoPath);

      // 🔒 SECURITY FIX (CWE-78): Validate environment variables
      const env = {
        PATH: validatePath(process.env.PATH),
        HOME: validateHome(process.env.HOME),
        NODE_ENV: process.env.NODE_ENV || 'development',
        GIT_PROJECT_ROOT: gitProjectRoot,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: `/${options.projectId}${options.pathInfo || ''}`,
        QUERY_STRING: options.queryString || '',
        REQUEST_METHOD: 'POST',
        CONTENT_TYPE:
          options.contentType || 'application/x-git-upload-pack-request',
        PROJECT_ID: options.projectId,
        API_BASE_URL: validateApiBaseUrl(process.env.API_BASE_URL),
      };

      const gitProcess = spawn('git', ['http-backend'], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let headersParsed = false;
      let statusCode = 200;
      const stderr: Buffer[] = [];

      // 🔒 SECURITY FIX (CWE-400): Create stream size counter to prevent DoS
      const streamCounter = new StreamSizeCounter({
        maxSize,
        operationName: `git ${options.service}`,
        onLimitExceeded: (bytesReceived) => {
          this.logger.warn(
            `Stream size limit exceeded for ${options.service}: ${bytesReceived} bytes`,
          );

          // Kill git process
          gitProcess.kill('SIGTERM');

          // Send error response if headers not sent
          if (!headersParsed && !responseStream.headersSent) {
            responseStream.status(413).json({
              statusCode: 413,
              message: 'Request body too large',
              error: 'Payload Too Large',
            });
          }
        },
      });

      // Handle size limit errors
      streamCounter.on('error', (error) => {
        this.logger.error(`Stream counter error: ${error.message}`);
        reject(new PayloadTooLargeException(error.message));
      });

      // Handle git stderr (for logging/debugging)
      gitProcess.stderr.on('data', (chunk) => {
        stderr.push(chunk);
        this.logger.debug(`git http-backend stderr: ${chunk.toString()}`);
      });

      // Parse HTTP headers from git stdout, then stream body
      const parseHeaders = (
        data: Buffer,
      ): { headers: Buffer; body: Buffer } => {
        const separator = Buffer.from('\r\n\r\n');
        const separatorIndex = data.indexOf(separator);

        if (separatorIndex === -1) {
          return { headers: data, body: Buffer.alloc(0) };
        }

        return {
          headers: data.slice(0, separatorIndex),
          body: data.slice(separatorIndex + separator.length),
        };
      };

      let headerBuffer = Buffer.alloc(0);

      gitProcess.stdout.on('data', (chunk: Buffer) => {
        if (!headersParsed) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          const { headers, body } = parseHeaders(headerBuffer);

          // Check if we have complete headers
          if (body.length > 0 || chunk.toString().includes('\r\n\r\n')) {
            // Parse headers
            const headerSection = headers.toString('utf8');
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
                  responseStream.setHeader(key, value);
                }
              }
            }

            // Set default headers
            responseStream.setHeader(
              'Content-Type',
              options.service === 'git-upload-pack'
                ? 'application/x-git-upload-pack-result'
                : 'application/x-git-receive-pack-result',
            );
            responseStream.setHeader('Cache-Control', 'no-cache');

            // Write status code
            responseStream.status(statusCode);

            headersParsed = true;

            // Write any body data we buffered
            if (body.length > 0) {
              responseStream.write(body);
            }
          }
        } else {
          // Headers already parsed, stream body directly
          responseStream.write(chunk);
        }
      });

      gitProcess.stdout.on('end', () => {
        responseStream.end();
      });

      gitProcess.on('close', (code) => {
        if (code !== 0) {
          const error = Buffer.concat(stderr).toString();

          // 🔒 SECURITY FIX (CWE-755): Log detailed error but return generic message
          this.logger.error(
            `git http-backend exited with code ${code}: ${error}`,
          );

          // Try to send error response if headers not sent yet
          if (!headersParsed && !responseStream.headersSent) {
            responseStream.status(500).json({
              statusCode: 500,
              message: 'Git operation failed',
            });
          }

          reject(
            new InternalServerErrorException(
              'Git operation failed. Please check your request and try again.',
            ),
          );
          return;
        }

        resolve();
      });

      gitProcess.on('error', (error) => {
        // 🔒 SECURITY FIX (CWE-755): Log detailed error but return generic message
        this.logger.error('Failed to spawn git http-backend', error);

        if (!headersParsed && !responseStream.headersSent) {
          responseStream.status(500).json({
            statusCode: 500,
            message: 'Failed to execute git operation',
          });
        }

        reject(
          new InternalServerErrorException(
            'Git operation failed. Please try again later.',
          ),
        );
      });

      // 🔒 SECURITY FIX (CWE-400): Stream request through size counter, then to git stdin
      requestStream
        .pipe(streamCounter)
        .pipe(gitProcess.stdin)
        .on('error', (error) => {
          this.logger.error('Git stdin pipe error', error);
          gitProcess.kill('SIGTERM');
          reject(error);
        });

      // Handle request stream errors
      requestStream.on('error', (error) => {
        this.logger.error('Request stream error', error);
        gitProcess.kill('SIGTERM');
        reject(error);
      });

      // Handle response stream errors
      responseStream.on('error', (error) => {
        this.logger.error('Response stream error', error);
        gitProcess.kill('SIGTERM');
        reject(error);
      });
    });
  }

  /**
   * Handle git-upload-pack request with streaming (clone/fetch)
   * 🔒 SECURITY: Prevents memory exhaustion for large repositories
   *
   * @param projectId Project ID
   * @param repoPath Repository path
   * @param req Express request
   * @param res Express response
   * @param maxSize Maximum allowed request size
   */
  async handleUploadPackStream(
    projectId: string,
    repoPath: string,
    req: Request,
    res: Response,
    maxSize: number = 10 * 1024 * 1024, // Default: 10MB
  ): Promise<void> {
    this.logger.log(`Handling upload-pack stream for project ${projectId}`);

    return this.executeGitHttpBackendStream(
      {
        projectId,
        service: 'git-upload-pack',
        repoPath,
        pathInfo: `/git-upload-pack`,
        contentType: 'application/x-git-upload-pack-request',
      },
      req,
      res,
      maxSize,
    );
  }

  /**
   * Handle git-receive-pack request with streaming (push)
   * 🔒 SECURITY: Prevents memory exhaustion for large pushes
   *
   * @param projectId Project ID
   * @param repoPath Repository path
   * @param req Express request
   * @param res Express response
   * @param maxSize Maximum allowed request size
   */
  async handleReceivePackStream(
    projectId: string,
    repoPath: string,
    req: Request,
    res: Response,
    maxSize: number = 500 * 1024 * 1024, // Default: 500MB
  ): Promise<void> {
    this.logger.log(`Handling receive-pack stream for project ${projectId}`);

    return this.executeGitHttpBackendStream(
      {
        projectId,
        service: 'git-receive-pack',
        repoPath,
        pathInfo: `/git-receive-pack`,
        contentType: 'application/x-git-receive-pack-request',
      },
      req,
      res,
      maxSize,
    );
  }
}
