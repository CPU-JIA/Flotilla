import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RepositoriesService } from './repositories.service';
import { CreateBranchDto, RepositoryCreateCommitDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller({ path: 'projects/:projectId/repository', version: '1' })
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  private readonly logger = new Logger(RepositoriesController.name);

  constructor(private readonly repositoriesService: RepositoriesService) {}

  /**
   * 手动创建仓库（用于未自动创建Repository的旧项目）
   * Phase 3: 提供UI按钮让用户初始化Repository
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRepository(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(
      `🎯 Manually creating repository for project: ${projectId}`,
    );
    return this.repositoriesService.createRepository(projectId, currentUser);
  }

  /**
   * 获取仓库信息
   */
  @Get()
  async getRepository(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📂 Fetching repository for project: ${projectId}`);
    return this.repositoriesService.getRepository(projectId, currentUser);
  }

  /**
   * 创建分支
   */
  @Post('branches')
  @HttpCode(HttpStatus.CREATED)
  async createBranch(
    @Param('projectId') projectId: string,
    @Body() createBranchDto: CreateBranchDto,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`🌿 Creating branch in project: ${projectId}`);
    return this.repositoriesService.createBranch(
      projectId,
      createBranchDto,
      currentUser,
    );
  }

  /**
   * 获取分支列表
   */
  @Get('branches')
  async getBranches(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📋 Fetching branches for project: ${projectId}`);
    return this.repositoriesService.getBranches(projectId, currentUser);
  }

  /**
   * 上传文件
   */
  @Post('branches/:branchId/files')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Body('path') filePath: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(
      `📤 Uploading file to project ${projectId}, branch ${branchId}`,
    );
    return this.repositoriesService.uploadFile(
      projectId,
      branchId,
      filePath,
      file.buffer,
      currentUser,
    );
  }

  /**
   * 获取文件列表
   */
  @Get('branches/:branchId/files')
  async getFiles(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📋 Fetching files for branch ${branchId}`);
    return this.repositoriesService.getFiles(projectId, branchId, currentUser);
  }

  /**
   * 下载文件
   */
  @Get('branches/:branchId/files/download')
  async downloadFile(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Query('path') filePath: string,
    @CurrentUser() currentUser: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`📥 Downloading file: ${filePath}`);
    const buffer = await this.repositoriesService.downloadFile(
      projectId,
      branchId,
      filePath,
      currentUser,
    );

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
    });

    return new StreamableFile(buffer);
  }

  /**
   * 创建提交
   */
  @Post('commits')
  @HttpCode(HttpStatus.CREATED)
  async createCommit(
    @Param('projectId') projectId: string,
    @Body() createCommitDto: RepositoryCreateCommitDto,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📝 Creating commit in project: ${projectId}`);
    return this.repositoriesService.createCommit(
      projectId,
      createCommitDto,
      currentUser,
    );
  }

  /**
   * 获取提交历史
   */
  @Get('branches/:branchId/commits')
  async getCommits(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📋 Fetching commits for branch ${branchId}`);
    return this.repositoriesService.getCommits(
      projectId,
      branchId,
      currentUser,
      page,
      pageSize,
    );
  }

  /**
   * 获取提交详情
   */
  @Get('branches/:branchId/commits/:commitId')
  async getCommit(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Param('commitId') commitId: string,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.log(`📋 Fetching commit ${commitId} details`);
    return this.repositoriesService.getCommit(
      projectId,
      branchId,
      commitId,
      currentUser,
    );
  }

  /**
   * 获取提交间差异
   */
  @Get('branches/:branchId/commits/:commitId/diff')
  async getCommitDiff(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Param('commitId') commitId: string,
    @CurrentUser() currentUser: User,
    @Query('compareTo') compareTo?: string,
  ) {
    this.logger.log(`📊 Computing diff for commit ${commitId}`);
    return this.repositoriesService.getCommitDiff(
      projectId,
      branchId,
      commitId,
      compareTo,
      currentUser,
    );
  }

  /**
   * 获取提交的文件内容
   */
  @Get('branches/:branchId/commits/:commitId/files')
  async getCommitFiles(
    @Param('projectId') projectId: string,
    @Param('branchId') branchId: string,
    @Param('commitId') commitId: string,
    @CurrentUser() currentUser: User,
    @Query('path') filePath?: string,
  ) {
    this.logger.log(`📋 Fetching files for commit ${commitId}`);
    return this.repositoriesService.getCommitFiles(
      projectId,
      branchId,
      commitId,
      filePath,
      currentUser,
    );
  }
}
