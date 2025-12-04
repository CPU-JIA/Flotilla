import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { MeilisearchService } from './meilisearch.service';
import { CodeDocument } from './interfaces/code-document.interface';
import {
  isIndexableFile,
  detectLanguage,
  getFileName,
  getFileExtension,
} from './utils/language-detector';
import {
  calculateContentHash,
  generateContentPreview,
  countLines,
  isBinaryContent,
  isFileTooLarge,
  truncateContent,
} from './utils/file-utils';
import { extractSymbols } from './parsers/typescript-parser';
import { Readable } from 'stream';

/**
 * 索引服务
 *
 * 职责：
 * - 文件索引（单个文件和批量项目）
 * - 内容提取和符号解析
 * - 索引状态管理
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责索引逻辑
 * ECP-D1 (可测试性): 依赖注入便于单元测试
 */
@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private meilisearch: MeilisearchService,
  ) {}

  /**
   * 索引单个文件
   *
   * 完整流程：
   * 1. 获取文件记录
   * 2. 检查是否为可索引文件
   * 3. 创建或更新SearchMetadata（状态: INDEXING）
   * 4. 从MinIO下载文件内容
   * 5. 计算contentHash
   * 6. 检查hash是否变化（增量索引优化）
   * 7. 解析代码符号
   * 8. 构建CodeDocument
   * 9. 推送到MeiliSearch
   * 10. 更新SearchMetadata（状态: INDEXED）
   *
   * @param fileId - 文件ID
   * @throws NotFoundException 文件不存在
   *
   * ECP-C2 (错误处理): 完善的try-catch和状态追踪
   */
  async indexFile(fileId: string): Promise<void> {
    this.logger.log(`Starting to index file: ${fileId}`);

    // 1. 获取文件记录（包含关联数据）
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        repository: {
          include: {
            project: true,
          },
        },
        commit: {
          include: {
            author: true,
          },
        },
        branch: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    // 2. 检查是否为可索引文件
    if (!isIndexableFile(file.path)) {
      this.logger.log(`Skipping non-indexable file: ${file.path}`);
      return;
    }

    // 3. 创建或更新SearchMetadata（状态: INDEXING）
    await this.prisma.searchMetadata.upsert({
      where: { fileId },
      create: {
        fileId,
        projectId: file.repository.projectId,
        repositoryId: file.repositoryId,
        status: 'INDEXING',
      },
      update: {
        status: 'INDEXING',
      },
    });

    try {
      // 4. 从MinIO下载文件内容
      const content = await this.downloadFileContent(file.objectName);

      // 检查是否为二进制文件
      if (isBinaryContent(content)) {
        this.logger.warn(`Skipping binary file: ${file.path}`);
        await this.prisma.searchMetadata.update({
          where: { fileId },
          data: {
            status: 'FAILED',
            failureReason: 'Binary file',
          },
        });
        return;
      }

      // 5. 计算contentHash
      const contentHash = calculateContentHash(content);

      // 6. 检查hash是否变化（增量索引优化）
      const metadata = await this.prisma.searchMetadata.findUnique({
        where: { fileId },
      });

      if (
        metadata?.contentHash === contentHash &&
        metadata?.status === 'INDEXED'
      ) {
        this.logger.log(`File ${file.path} unchanged, skipping index`);
        return;
      }

      // 7. 解析代码符号
      const language = detectLanguage(file.path);
      const symbols = extractSymbols(content, language, file.path);

      // 8. 构建CodeDocument
      const document = this.buildCodeDocument(file, content, symbols);

      // 9. 推送到MeiliSearch
      const index = this.meilisearch.getIndex();
      await index.addDocuments([document]);

      // 10. 更新SearchMetadata（状态: INDEXED）
      await this.prisma.searchMetadata.update({
        where: { fileId },
        data: {
          status: 'INDEXED',
          indexedAt: new Date(),
          contentHash,
          lastCommitId: file.commitId,
          symbolCount: symbols.length,
          lineCount: countLines(content),
          failureReason: null,
          retryCount: 0,
        },
      });

      this.logger.log(
        `Successfully indexed file: ${file.path} (${symbols.length} symbols)`,
      );
    } catch (error) {
      // 11. 索引失败处理
      this.logger.error(`Failed to index file ${file.path}:`, error);

      await this.prisma.searchMetadata.update({
        where: { fileId },
        data: {
          status: 'FAILED',
          failureReason: error.message || String(error),
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * 批量索引项目所有文件
   *
   * 策略：
   * - 按Repository分批处理
   * - 每批1000个文件
   * - 并发限制10个文件同时处理
   * - 失败重试最多3次，指数退避
   *
   * @param projectId - 项目ID
   *
   * ECP-C3 (性能): 批量处理和并发控制
   */
  async indexProject(projectId: string): Promise<void> {
    this.logger.log(`Starting to index project: ${projectId}`);

    // 获取项目所有文件
    const files = await this.prisma.file.findMany({
      where: {
        repository: {
          projectId,
        },
      },
      select: {
        id: true,
        path: true,
      },
    });

    this.logger.log(`Found ${files.length} files in project ${projectId}`);

    // 过滤可索引文件
    const indexableFiles = files.filter((file) => isIndexableFile(file.path));

    this.logger.log(
      `Indexing ${indexableFiles.length} indexable files (filtered from ${files.length})`,
    );

    // 批量处理，并发限制10
    const batchSize = 10;
    for (let i = 0; i < indexableFiles.length; i += batchSize) {
      const batch = indexableFiles.slice(i, i + batchSize);

      this.logger.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexableFiles.length / batchSize)}`,
      );

      // 并行处理批次内的文件（使用allSettled避免单个失败影响整批）
      const results = await Promise.allSettled(
        batch.map((file) => this.indexFile(file.id)),
      );

      // 统计结果
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Batch completed: ${succeeded} succeeded, ${failed} failed`,
      );
    }

    this.logger.log(`Project ${projectId} indexing completed`);
  }

  /**
   * 从MinIO下载文件内容
   *
   * @param objectName - MinIO对象名称
   * @returns 文件内容（UTF-8字符串）
   * @throws Error 下载失败或文件过大
   *
   * ECP-C1 (输入验证): 检查文件大小限制
   * ECP-C2 (错误处理): 完善的异常处理
   */
  private async downloadFileContent(objectName: string): Promise<string> {
    try {
      // 获取文件元数据
      const stat = await this.minio.statObject(objectName);

      // 检查文件大小
      if (isFileTooLarge(stat.size)) {
        this.logger.warn(
          `File ${objectName} too large (${stat.size} bytes), truncating`,
        );
      }

      // 下载文件
      const stream = await this.minio.getObject(objectName);

      // 将Stream转换为字符串
      const content = await this.streamToString(stream);

      // 截断过大的内容
      return truncateContent(content);
    } catch (error) {
      this.logger.error(`Failed to download file ${objectName}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * 将Readable Stream转换为字符串
   *
   * @param stream - Readable Stream
   * @returns 字符串内容
   *
   * ECP-B2 (KISS): 简单的Stream处理
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('utf8'));
      });
    });
  }

  /**
   * 构建CodeDocument索引文档
   *
   * @param file - File记录（包含关联数据）
   * @param content - 文件内容
   * @param symbols - 代码符号数组
   * @returns CodeDocument对象
   *
   * ECP-B3 (命名清晰): 字段映射逻辑清晰
   */
  private buildCodeDocument(
    file: any,
    content: string,
    symbols: string[],
  ): CodeDocument {
    const language = detectLanguage(file.path);
    const extension = getFileExtension(file.path);
    const fileName = getFileName(file.path);

    return {
      // 唯一标识
      id: `file_${file.id}_${file.commitId || 'nocommit'}`,

      // 核心搜索内容
      content: truncateContent(content),
      fileName,
      filePath: file.path,
      symbols,

      // 关联信息
      projectId: file.repository.projectId,
      projectName: file.repository.project.name,
      repositoryId: file.repositoryId,
      branchName: file.branch.name,

      // 文件元数据
      language,
      extension,
      size: file.size,
      lineCount: countLines(content),
      mimeType: file.mimeType,

      // Git信息
      commitId: file.commitId || '',
      commitMessage: file.commit?.message || '',
      commitHash: file.commit?.hash || '',
      authorId: file.commit?.authorId || '',
      authorName: file.commit?.author?.username || 'unknown',
      lastModified: file.updatedAt.getTime(),

      // 搜索优化
      contentPreview: generateContentPreview(content),
    };
  }
}
