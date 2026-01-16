import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../minio/minio.service';
import { GitService } from '../../git/git.service';
import { RepositoryHelpers } from './repository.helpers';
import type { User, File } from '@prisma/client';

/**
 * Repository文件操作服务
 * ECP-A1: 单一职责 - 专注于文件管理
 */
@Injectable()
export class RepositoryFilesService {
  private readonly logger = new Logger(RepositoryFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly gitService: GitService,
    private readonly helpers: RepositoryHelpers,
  ) {}

  /**
   * 上传文件
   * ECP-C3: 性能意识 - 使用MinIO存储
   * Phase 3.2: Auto-commit files to Git after upload
   */
  async uploadFile(
    projectId: string,
    branchId: string,
    filePath: string,
    fileBuffer: Buffer,
    currentUser: User,
  ): Promise<File> {
    await this.helpers.checkProjectPermission(projectId, currentUser, true);

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { repository: true },
    });

    if (!branch || branch.repository.projectId !== projectId) {
      throw new NotFoundException('分支不存在');
    }

    // 生成MinIO对象名称
    const objectName = `projects/${projectId}/branches/${branchId}/${filePath}`;

    // 上传到MinIO
    await this.minioService.uploadFile(
      objectName,
      fileBuffer,
      fileBuffer.length,
      {
        'Content-Type': this.helpers.getContentType(filePath),
        'Upload-User': currentUser.username,
        'Upload-Time': new Date().toISOString(),
      },
    );

    // 创建或更新文件记录
    const file = await this.prisma.file.upsert({
      where: {
        repositoryId_branchId_path: {
          repositoryId: branch.repositoryId,
          branchId: branchId,
          path: filePath,
        },
      },
      create: {
        repositoryId: branch.repositoryId,
        branchId: branchId,
        path: filePath,
        objectName: objectName,
        size: fileBuffer.length,
        mimeType: this.helpers.getContentType(filePath),
      },
      update: {
        objectName: objectName,
        size: fileBuffer.length,
        updatedAt: new Date(),
      },
    });

    // Phase 3.2: Commit file to Git repository
    try {
      const commitMessage = `Upload ${filePath}`;
      await this.gitService.commit(
        projectId,
        branch.name,
        [{ path: filePath, content: fileBuffer.toString('utf-8') }],
        commitMessage,
        {
          name: currentUser.username,
          email: currentUser.email,
        },
      );
      this.logger.log(
        `✅ File uploaded and committed to Git: ${filePath} to branch ${branch.name}`,
      );
    } catch (gitError) {
      // ECP-C2: Log Git commit error but don't fail the upload
      // File is already in MinIO and database, commit failure shouldn't block user
      this.logger.error(
        `❌ Git commit failed for ${filePath} (file still uploaded to MinIO): ${gitError.message}`,
      );
      // Continue execution - file upload succeeded even if Git commit failed
    }

    return file;
  }

  /**
   * 下载文件
   */
  async downloadFile(
    projectId: string,
    branchId: string,
    filePath: string,
    currentUser: User,
  ): Promise<Buffer> {
    await this.helpers.checkProjectPermission(projectId, currentUser);

    const file = await this.prisma.file.findFirst({
      where: {
        branchId: branchId,
        path: filePath,
        repository: {
          projectId: projectId,
        },
      },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    return this.minioService.downloadFile(file.objectName);
  }

  /**
   * 获取文件列表
   */
  async getFiles(
    projectId: string,
    branchId: string,
    currentUser: User,
  ): Promise<File[]> {
    await this.helpers.checkProjectPermission(projectId, currentUser);

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { repository: true },
    });

    if (!branch || branch.repository.projectId !== projectId) {
      throw new NotFoundException('分支不存在');
    }

    return this.prisma.file.findMany({
      where: { branchId },
      orderBy: { path: 'asc' },
    });
  }
}
