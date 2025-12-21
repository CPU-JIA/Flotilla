import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';

/**
 * MeiliSearch客户端服务
 *
 * 职责：
 * - 初始化MeiliSearch连接
 * - 创建和配置code索引
 * - 提供索引访问接口
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责MeiliSearch客户端管理
 * ECP-B2 (KISS): 简单直接的客户端封装
 */
@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private codeIndex: Index;

  constructor(private configService: ConfigService) {}

  /**
   * 模块初始化时自动执行
   * 连接MeiliSearch并初始化索引
   */
  async onModuleInit() {
    const host = this.configService.get<string>('MEILI_HOST');
    const apiKey = this.configService.get<string>('MEILI_MASTER_KEY');

    if (!host || !apiKey) {
      this.logger.error(
        'MeiliSearch configuration missing. Please set MEILI_HOST and MEILI_MASTER_KEY in .env',
      );
      throw new Error('MeiliSearch configuration missing');
    }

    this.logger.log(`Connecting to MeiliSearch at ${host}`);
    this.client = new MeiliSearch({ host, apiKey });

    // 初始化code索引
    await this.initializeIndex();
  }

  /**
   * 初始化或获取code索引
   *
   * ECP-C2 (错误处理): 完善的错误处理和日志记录
   */
  private async initializeIndex() {
    const indexName = 'code';

    try {
      // 尝试获取现有索引
      this.codeIndex = await this.client.getIndex(indexName);
      this.logger.log(`Code index already exists: ${indexName}`);
    } catch (_error) {
      // 创建索引（异步操作）
      this.logger.log(`Creating new code index: ${indexName}`);
      await this.client.createIndex(indexName, {
        primaryKey: 'id',
      });

      // 短暂延迟后获取索引
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.codeIndex = await this.client.getIndex(indexName);

      // 配置索引设置
      await this.configureIndex();
    }
  }

  /**
   * 配置索引设置
   *
   * 配置内容：
   * - searchableAttributes: 可搜索的字段（按权重排序）
   * - filterableAttributes: 可过滤的字段
   * - sortableAttributes: 可排序的字段
   * - rankingRules: 排序规则
   * - typoTolerance: 拼写容错配置
   * - pagination: 分页限制
   *
   * ECP-B3 (命名清晰): 配置项命名语义明确
   */
  private async configureIndex() {
    this.logger.log('Configuring code index settings...');

    await this.codeIndex.updateSettings({
      // 可搜索字段（权重从高到低）
      searchableAttributes: [
        'content', // 文件内容（最高权重）
        'fileName', // 文件名
        'filePath', // 文件路径
        'symbols', // 代码符号（类名、函数名）
        'commitMessage', // 提交信息
      ],

      // 可过滤字段
      filterableAttributes: [
        'projectId',
        'repositoryId',
        'language',
        'branchName',
        'extension',
        'authorId',
      ],

      // 可排序字段
      sortableAttributes: ['lastModified', 'size', 'lineCount'],

      // 排序规则（按优先级）
      rankingRules: [
        'words', // 匹配词数量
        'typo', // 拼写容错
        'proximity', // 词语接近度
        'attribute', // 属性权重
        'sort', // 自定义排序
        'exactness', // 精确匹配
      ],

      // 拼写容错配置
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4, // 4字符以上允许1个拼写错误
          twoTypos: 8, // 8字符以上允许2个拼写错误
        },
      },

      // 分页限制
      pagination: {
        maxTotalHits: 1000, // 最多返回1000个结果
      },
    });

    this.logger.log('Code index configured successfully');
  }

  /**
   * 获取code索引实例
   *
   * @returns MeiliSearch Index对象
   */
  getIndex(): Index {
    if (!this.codeIndex) {
      throw new Error('Code index not initialized');
    }
    return this.codeIndex;
  }

  /**
   * 获取MeiliSearch客户端实例
   *
   * @returns MeiliSearch客户端
   */
  getClient(): MeiliSearch {
    if (!this.client) {
      throw new Error('MeiliSearch client not initialized');
    }
    return this.client;
  }

  /**
   * 健康检查
   * 测试MeiliSearch连接是否正常
   *
   * @returns 是否健康
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.health();
      return true;
    } catch (error) {
      this.logger.error('MeiliSearch health check failed', error);
      return false;
    }
  }
}
