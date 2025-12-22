/**
 * Git HTTP Protocol Controller
 *
 * Implements Git HTTP Smart Protocol endpoints.
 * Supports standard git clone, fetch, and push operations.
 *
 * 🔒 SECURITY FIXES:
 * - CWE-306: Basic Auth authentication
 * - CWE-319: HTTPS enforcement for production
 * - CWE-400: Stream size limit enforcement
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBasicAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { HttpSmartService } from './protocols/http-smart.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitHttpAuthGuard } from './guards/git-http-auth.guard';
import { HttpsEnforcementGuard } from './guards/https-enforcement.guard';
import { getGitStoragePath, getRepoPath } from '../config/git.config';
import { StreamSizeLimitInterceptor } from './interceptors/stream-size-limit.interceptor';

@ApiTags('git-http')
@Controller('repo')
@UseGuards(HttpsEnforcementGuard, GitHttpAuthGuard) // 🔒 SECURITY FIX: HTTPS + Auth
@ApiBasicAuth() // Swagger 文档标注
export class GitHttpController {
  private readonly logger = new Logger(GitHttpController.name);

  /**
   * Git repository storage path
   *
   * ECP-B1: DRY - Uses centralized configuration from git.config.ts
   * ECP-D3: No magic strings - Configuration shared across services
   *
   * @see git.config.ts for path resolution logic
   */
  private readonly gitStorageBasePath = getGitStoragePath();

  // 🔒 SECURITY: Request size limits (in bytes)
  private readonly UPLOAD_PACK_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly RECEIVE_PACK_MAX_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly GIT_OPERATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly httpSmartService: HttpSmartService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':projectId/info/refs')
  @ApiExcludeEndpoint() // Exclude from Swagger (binary protocol)
  @ApiOperation({ summary: 'Git info/refs endpoint (Smart HTTP)' })
  async infoRefs(
    @Param('projectId') projectId: string,
    @Query('service') service: string,
    @Res() res: Response,
  ) {
    // Validate service
    if (service !== 'git-upload-pack' && service !== 'git-receive-pack') {
      throw new BadRequestException('Invalid service');
    }

    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify repository exists
    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not initialized');
    }

    const repoPath = getRepoPath(projectId);

    const response = await this.httpSmartService.handleInfoRefs(
      projectId,
      repoPath,
      service,
    );

    // Set response headers
    res.status(response.statusCode);
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Set cache-control
    res.setHeader('Cache-Control', 'no-cache');

    // Send body
    res.send(response.body);
  }

  @Post(':projectId/git-upload-pack')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Git upload-pack endpoint (clone/fetch)' })
  @UseInterceptors(
    new StreamSizeLimitInterceptor({
      maxSize: 10 * 1024 * 1024, // 10MB
      operationName: 'git-upload-pack',
    }),
  )
  async uploadPack(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const repoPath = getRepoPath(projectId);

      this.logger.log(
        `Starting git-upload-pack for project ${projectId} (Content-Length: ${req.headers['content-length'] || 'unknown'})`,
      );

      // 🔒 SECURITY: Set operation timeout
      const timeoutId = setTimeout(() => {
        this.logger.warn(
          `git-upload-pack timeout for project ${projectId} after ${this.GIT_OPERATION_TIMEOUT}ms`,
        );
        req.destroy(new Error('Operation timeout'));
      }, this.GIT_OPERATION_TIMEOUT);

      try {
        // 🔒 SECURITY FIX (CWE-400): Pass maxSize to enable stream counting
        await this.httpSmartService.handleUploadPackStream(
          projectId,
          repoPath,
          req,
          res,
          this.UPLOAD_PACK_MAX_SIZE,
        );

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        this.logger.log(
          `Completed git-upload-pack for project ${projectId} in ${duration}ms`,
        );
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed git-upload-pack for project ${projectId} after ${duration}ms`,
        error,
      );
      throw error;
    }
  }

  @Post(':projectId/git-receive-pack')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Git receive-pack endpoint (push)' })
  @UseInterceptors(
    new StreamSizeLimitInterceptor({
      maxSize: 500 * 1024 * 1024, // 500MB
      operationName: 'git-receive-pack',
    }),
  )
  async receivePack(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const startTime = Date.now();
    const contentLength = req.headers['content-length'];

    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const repoPath = getRepoPath(projectId);

      this.logger.log(
        `Starting git-receive-pack for project ${projectId} (Content-Length: ${contentLength || 'unknown'})`,
      );

      // 🔒 SECURITY: Log large file operations
      if (contentLength) {
        const sizeMB = parseInt(contentLength, 10) / (1024 * 1024);
        if (sizeMB > 50) {
          this.logger.warn(
            `Large push detected for project ${projectId}: ${sizeMB.toFixed(2)}MB`,
          );
        }
      }

      // 🔒 SECURITY: Set operation timeout
      const timeoutId = setTimeout(() => {
        this.logger.warn(
          `git-receive-pack timeout for project ${projectId} after ${this.GIT_OPERATION_TIMEOUT}ms`,
        );
        req.destroy(new Error('Operation timeout'));
      }, this.GIT_OPERATION_TIMEOUT);

      try {
        // 🔒 SECURITY FIX (CWE-400): Pass maxSize to enable stream counting
        await this.httpSmartService.handleReceivePackStream(
          projectId,
          repoPath,
          req,
          res,
          this.RECEIVE_PACK_MAX_SIZE,
        );

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        this.logger.log(
          `Completed git-receive-pack for project ${projectId} in ${duration}ms`,
        );
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed git-receive-pack for project ${projectId} after ${duration}ms`,
        error,
      );
      throw error;
    }
  }
}
