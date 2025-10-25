/**
 * Git Controller
 *
 * Provides HTTP API endpoints for Git operations.
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GitService } from './git.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { InitRepositoryDto } from './dto/init-repository.dto';
import { GitCreateBranchDto } from './dto/create-branch.dto';
import { GitCreateCommitDto } from './dto/create-commit.dto';

@ApiTags('git')
@Controller('git')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GitController {
  constructor(
    private readonly gitService: GitService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':projectId/init')
  @ApiOperation({ summary: 'Initialize Git repository' })
  @ApiResponse({ status: 201, description: 'Repository initialized' })
  async initRepository(
    @Param('projectId') projectId: string,
    @Body() dto: InitRepositoryDto,
    @CurrentUser() user: any,
  ) {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== user.id) {
      // TODO: Check team permissions
      throw new BadRequestException('Insufficient permissions');
    }

    // Check if repository already exists
    const existingRepo = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (existingRepo) {
      throw new BadRequestException('Repository already initialized');
    }

    // Initialize Git repository
    await this.gitService.init(projectId, dto.defaultBranch || 'main');

    // Create initial commit
    const sha = await this.gitService.createInitialCommit(projectId, {
      name: dto.authorName,
      email: dto.authorEmail,
    });

    // Save repository metadata to database
    const repository = await this.prisma.repository.create({
      data: {
        projectId,
        defaultBranch: dto.defaultBranch || 'main',
      },
    });

    return {
      success: true,
      repository,
      initialCommit: sha,
    };
  }

  @Get(':projectId/branches')
  @ApiOperation({ summary: 'List all branches' })
  @ApiResponse({ status: 200, description: 'Branches list' })
  async listBranches(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    await this.verifyProjectAccess(projectId, user.id);

    const branches = await this.gitService.listBranches(projectId);

    return { branches };
  }

  @Post(':projectId/branches')
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  async createBranch(
    @Param('projectId') projectId: string,
    @Body() dto: GitCreateBranchDto,
    @CurrentUser() user: any,
  ) {
    await this.verifyProjectAccess(projectId, user.id);

    await this.gitService.createBranch(projectId, dto.name, dto.startPoint);

    // Create branch record in database
    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (repository) {
      await this.prisma.branch.create({
        data: {
          repositoryId: repository.id,
          name: dto.name,
        },
      });
    }

    return {
      success: true,
      branch: dto.name,
    };
  }

  @Post(':projectId/commit')
  @ApiOperation({ summary: 'Create a new commit' })
  @ApiResponse({ status: 201, description: 'Commit created' })
  async createCommit(
    @Param('projectId') projectId: string,
    @Body() dto: GitCreateCommitDto,
    @CurrentUser() user: any,
  ) {
    await this.verifyProjectAccess(projectId, user.id);

    // Use DTO author info if provided, otherwise use current user
    const author = {
      name: dto.authorName || user.username,
      email: dto.authorEmail || user.email,
    };

    const commitSha = await this.gitService.commit(
      projectId,
      dto.branch,
      dto.files,
      dto.message,
      author,
    );

    return {
      success: true,
      commitSha,
      branch: dto.branch,
    };
  }

  @Delete(':projectId/branches/:branchName')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted' })
  async deleteBranch(
    @Param('projectId') projectId: string,
    @Param('branchName') branchName: string,
    @CurrentUser() user: any,
  ) {
    await this.verifyProjectAccess(projectId, user.id);

    await this.gitService.deleteBranch(projectId, branchName);

    // Delete branch record from database
    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    });

    if (repository) {
      await this.prisma.branch.deleteMany({
        where: {
          repositoryId: repository.id,
          name: branchName,
        },
      });
    }

    return {
      success: true,
      message: `Branch ${branchName} deleted`,
    };
  }

  @Get(':projectId/log')
  @ApiOperation({ summary: 'Get commit history' })
  @ApiResponse({ status: 200, description: 'Commit history' })
  async getLog(
    @Param('projectId') projectId: string,
    @Query('depth') depth?: number,
    @Query('ref') ref?: string,
  ) {
    const commits = await this.gitService.log(projectId, {
      depth: depth ? parseInt(String(depth), 10) : undefined,
      ref,
    });

    return { commits };
  }

  @Get(':projectId/files')
  @ApiOperation({ summary: 'List files in repository' })
  @ApiResponse({ status: 200, description: 'Files list' })
  async listFiles(
    @Param('projectId') projectId: string,
    @Query('ref') ref: string = 'HEAD',
  ) {
    const files = await this.gitService.listFiles(projectId, ref);

    return { files };
  }

  @Get(':projectId/blob')
  @ApiOperation({ summary: 'Read file content' })
  @ApiResponse({ status: 200, description: 'File content' })
  async readBlob(
    @Param('projectId') projectId: string,
    @Query('filepath') filepath: string,
    @Query('ref') ref: string = 'HEAD',
  ) {
    if (!filepath) {
      throw new BadRequestException('filepath query parameter is required');
    }

    const blob = await this.gitService.readBlob(projectId, filepath, ref);

    return {
      filepath,
      ref,
      content: blob.toString('utf8'),
    };
  }

  private async verifyProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      // TODO: Check team permissions
      throw new BadRequestException('Insufficient permissions');
    }
  }
}
