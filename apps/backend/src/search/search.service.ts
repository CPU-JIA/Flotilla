import { Injectable, Logger } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { IndexService } from './index.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchResultDto,
  IndexStatusDto,
  ReindexResponseDto,
} from './dto/search-result.dto';

/**
 * 搜索服务
 *
 * 职责：
 * - 代码搜索查询
 * - 权限过滤
 * - 项目重索引触发
 * - 索引状态查询
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责搜索逻辑
 * ECP-C3 (性能): 搜索结果分页限制
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private meilisearch: MeilisearchService,
    private indexService: IndexService,
    private prisma: PrismaService,
  ) {}

  /**
   * 代码搜索
   *
   * 权限逻辑：
   * - 已登录用户：可搜索其有权限的项目 + 公开项目
   * - 匿名用户：只能搜索公开项目
   *
   * @param query - 搜索查询DTO
   * @param userId - 当前用户ID（可选）
   * @returns 搜索结果
   *
   * ECP-C1 (输入验证): 验证权限和参数
   * ECP-C2 (错误处理): 完善的try-catch
   * ECP-C3 (性能): 限制搜索结果数量
   */
  async searchCode(
    query: SearchQueryDto,
    userId?: string,
  ): Promise<SearchResultDto> {
    this.logger.log(
      `Searching code: "${query.query}" (user: ${userId || 'anonymous'})`,
    );

    try {
      // 1. 构建权限过滤
      const projectFilter = await this.buildProjectFilter(
        query.projectId,
        userId,
      );

      // 2. 构建完整过滤器
      const filters: string[] = [projectFilter];

      // 语言过滤
      if (query.language && query.language.length > 0) {
        const languageFilter = query.language
          .map((lang) => `language = "${lang}"`)
          .join(' OR ');
        filters.push(`(${languageFilter})`);
      }

      // 分支过滤
      if (query.branch) {
        filters.push(`branchName = "${query.branch}"`);
      }

      // 扩展名过滤
      if (query.extension && query.extension.length > 0) {
        const extFilter = query.extension
          .map((ext) => `extension = "${ext}"`)
          .join(' OR ');
        filters.push(`(${extFilter})`);
      }

      const filter = filters.join(' AND ');

      // 3. 构建排序规则
      const sort = this.buildSortRules(query.sort);

      // 4. 执行MeiliSearch搜索
      const index = this.meilisearch.getIndex();
      const searchResult = await index.search(query.query, {
        filter,
        sort,
        offset: query.offset || 0,
        limit: query.limit || 20,
        attributesToHighlight: ['content', 'symbols', 'fileName'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      });

      // 5. 构建响应
      return {
        hits: searchResult.hits as any[],
        totalHits: searchResult.estimatedTotalHits || 0,
        offset: query.offset || 0,
        limit: query.limit || 20,
        processingTimeMs: searchResult.processingTimeMs,
        query: query.query,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw new Error(`Code search failed: ${error.message}`);
    }
  }

  /**
   * 触发项目重索引
   *
   * 逻辑：
   * 1. 验证项目是否存在
   * 2. 统计待索引文件数
   * 3. 异步调用IndexService.indexProject()
   * 4. 返回任务信息
   *
   * @param projectId - 项目ID
   * @returns 索引任务信息
   *
   * ECP-C1 (输入验证): 验证项目存在性
   * ECP-C2 (错误处理): 完善的异常处理
   */
  async triggerReindex(projectId: string): Promise<ReindexResponseDto> {
    this.logger.log(`Triggering reindex for project: ${projectId}`);

    try {
      // 1. 验证项目存在
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // 2. 统计待索引文件数
      const totalFiles = await this.prisma.file.count({
        where: {
          repository: {
            projectId,
          },
        },
      });

      // 3. 异步触发索引（不等待完成）
      this.indexService.indexProject(projectId).catch((error) => {
        this.logger.error(
          `Background indexing failed for project ${projectId}:`,
          error,
        );
      });

      // 4. 返回任务信息
      const jobId = `reindex_${projectId}_${Date.now()}`;

      return {
        jobId,
        projectId,
        status: 'running',
        message: `重索引任务已启动，预计处理 ${totalFiles} 个文件`,
        estimatedFiles: totalFiles,
      };
    } catch (error) {
      this.logger.error(
        `Reindex trigger failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to trigger reindex: ${error.message}`);
    }
  }

  /**
   * 获取项目索引状态
   *
   * 统计逻辑：
   * 1. 查询SearchMetadata表统计各状态文件数
   * 2. 计算索引进度百分比
   * 3. 获取最后索引时间
   *
   * @param projectId - 项目ID
   * @returns 索引状态统计
   *
   * ECP-C1 (输入验证): 验证项目存在性
   * ECP-C3 (性能): 使用聚合查询优化性能
   */
  async getIndexStatus(projectId: string): Promise<IndexStatusDto> {
    this.logger.log(`Getting index status for project: ${projectId}`);

    try {
      // 1. 验证项目存在
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // 2. 统计总文件数
      const totalFiles = await this.prisma.file.count({
        where: {
          repository: {
            projectId,
          },
        },
      });

      // 3. 统计各状态文件数
      const indexedCount = await this.prisma.searchMetadata.count({
        where: {
          projectId,
          status: 'INDEXED',
        },
      });

      const _indexingCount = await this.prisma.searchMetadata.count({
        where: {
          projectId,
          status: 'INDEXING',
        },
      });

      const failedCount = await this.prisma.searchMetadata.count({
        where: {
          projectId,
          status: 'FAILED',
        },
      });

      // 4. 计算待索引文件数（总数 - 已有metadata的）
      const metadataCount = await this.prisma.searchMetadata.count({
        where: { projectId },
      });
      const pendingFiles = totalFiles - metadataCount;

      // 5. 计算进度百分比
      const progress = totalFiles > 0 ? (indexedCount / totalFiles) * 100 : 0;

      // 6. 获取最后索引时间
      const lastIndexed = await this.prisma.searchMetadata.findFirst({
        where: {
          projectId,
          status: 'INDEXED',
        },
        orderBy: {
          indexedAt: 'desc',
        },
        select: {
          indexedAt: true,
        },
      });

      return {
        projectId,
        totalFiles,
        indexedFiles: indexedCount,
        pendingFiles,
        failedFiles: failedCount,
        progress: Math.round(progress * 10) / 10, // 保留1位小数
        lastIndexedAt: lastIndexed?.indexedAt || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Get index status failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get index status: ${error.message}`);
    }
  }

  /**
   * 获取用户有权限的项目ID列表
   *
   * @param userId - 用户ID
   * @returns 项目ID数组
   */
  private async getUserProjectIds(userId: string): Promise<string[]> {
    const projects = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return projects.map((p) => p.projectId);
  }

  /**
   * 获取所有公开项目ID列表
   *
   * @returns 项目ID数组
   */
  private async getPublicProjectIds(): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      where: { visibility: 'PUBLIC' },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  /**
   * 构建项目权限过滤器
   *
   * 权限策略：
   * - 如果指定projectId，检查用户是否有权限访问
   * - 如果userId存在，返回用户项目 + 公开项目
   * - 如果userId为空，只返回公开项目
   *
   * @param projectId - 指定的项目ID（可选）
   * @param userId - 用户ID（可选）
   * @returns MeiliSearch过滤表达式
   *
   * ECP-C1 (数据安全): 严格的权限控制
   */
  private async buildProjectFilter(
    projectId?: string,
    userId?: string,
  ): Promise<string> {
    // 情况1：指定了projectId
    if (projectId) {
      // 检查用户是否有权限访问该项目
      const hasAccess = userId
        ? await this.prisma.projectMember.findFirst({
            where: {
              projectId,
              userId,
            },
          })
        : null;

      // 检查项目是否公开
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { visibility: true },
      });

      const isPublic = project?.visibility === 'PUBLIC';

      if (!hasAccess && !isPublic) {
        throw new Error(
          `Access denied: User does not have permission to search in project ${projectId}`,
        );
      }

      return `projectId = "${projectId}"`;
    }

    // 情况2：未指定projectId，根据用户权限过滤
    const projectIds: string[] = [];

    if (userId) {
      // 已登录用户：获取其有权限的项目
      const userProjects = await this.getUserProjectIds(userId);
      projectIds.push(...userProjects);
    }

    // 添加公开项目（无论是否登录）
    const publicProjects = await this.getPublicProjectIds();
    projectIds.push(...publicProjects);

    // 去重
    const uniqueProjectIds = [...new Set(projectIds)];

    if (uniqueProjectIds.length === 0) {
      // 无可访问项目，返回永远为false的过滤器
      return 'projectId = "NEVER_MATCH"';
    }

    // 构建 IN 过滤器
    const filterParts = uniqueProjectIds.map((id) => `projectId = "${id}"`);
    return `(${filterParts.join(' OR ')})`;
  }

  /**
   * 构建排序规则
   *
   * @param sortType - 排序类型
   * @returns MeiliSearch排序规则数组
   *
   * ECP-B2 (KISS): 简单的排序规则映射
   */
  private buildSortRules(
    sortType: 'relevance' | 'date' | 'size' = 'relevance',
  ): string[] | undefined {
    switch (sortType) {
      case 'date':
        return ['lastModified:desc'];
      case 'size':
        return ['size:desc'];
      case 'relevance':
      default:
        // relevance使用默认排序（rankingRules）
        return undefined;
    }
  }
}
