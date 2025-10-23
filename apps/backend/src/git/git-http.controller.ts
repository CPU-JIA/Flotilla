/**
 * Git HTTP Protocol Controller
 *
 * Implements Git HTTP Smart Protocol endpoints.
 * Supports standard git clone, fetch, and push operations.
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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { HttpSmartService } from './protocols/http-smart.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as os from 'os';

@ApiTags('git-http')
@Controller('repo')
@Public()
export class GitHttpController {
  private readonly gitStorageBasePath =
    process.env.GIT_STORAGE_PATH || path.join(os.tmpdir(), 'flotilla-git');

  constructor(
    private readonly httpSmartService: HttpSmartService,
    private readonly prisma: PrismaService,
  ) {}

  private getRepoPath(projectId: string): string {
    return path.join(this.gitStorageBasePath, projectId);
  }

  @Get(':projectId/info/refs')
  @ApiExcludeEndpoint() // Exclude from Swagger (binary protocol)
  @ApiOperation({ summary: 'Git info/refs endpoint (Smart HTTP)' })
  async infoRefs(
    @Param('projectId') projectId: string,
    @Query('service') service: string,
    @Res() res: Response,
  ) {
    // Validate service
    if (
      service !== 'git-upload-pack' &&
      service !== 'git-receive-pack'
    ) {
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

    const repoPath = this.getRepoPath(projectId);

    const response = await this.httpSmartService.handleInfoRefs(
      projectId,
      repoPath,
      service as 'git-upload-pack' | 'git-receive-pack',
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
  async uploadPack(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const repoPath = this.getRepoPath(projectId);

    // Get raw body (bodyParser.raw sets it to req.body as Buffer)
    const requestBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);

    const response = await this.httpSmartService.handleUploadPack(
      projectId,
      repoPath,
      requestBody,
    );

    // Set response headers
    res.status(response.statusCode);
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Set content-type for packfile
    res.setHeader('Content-Type', 'application/x-git-upload-pack-result');
    res.setHeader('Cache-Control', 'no-cache');

    // Send body
    res.send(response.body);
  }

  @Post(':projectId/git-receive-pack')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Git receive-pack endpoint (push)' })
  async receivePack(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const repoPath = this.getRepoPath(projectId);

    // Get raw body (bodyParser.raw sets it to req.body as Buffer)
    const requestBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);

    const response = await this.httpSmartService.handleReceivePack(
      projectId,
      repoPath,
      requestBody,
    );

    // Set response headers
    res.status(response.statusCode);
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Set content-type for packfile
    res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
    res.setHeader('Cache-Control', 'no-cache');

    // Send body
    res.send(response.body);
  }
}
