import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { MeilisearchService } from './meilisearch.service';
import { IndexService } from './index.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * SearchService单元测试
 *
 * 测试范围：
 * - searchCode(): 权限过滤、搜索逻辑
 * - triggerReindex(): 重索引触发
 * - getIndexStatus(): 索引状态查询
 *
 * Mock策略：
 * - PrismaService: Mock所有数据库查询
 * - MeilisearchService: Mock MeiliSearch index.search()
 * - IndexService: Mock indexProject()
 * - RedisService: Mock缓存操作
 *
 * ECP-C1 (数据安全): 重点测试权限过滤逻辑
 * ECP-D1 (可测试性): 使用NestJS TestingModule for DI
 */
describe('SearchService', () => {
  let service: SearchService;
  let indexService: jest.Mocked<IndexService>;

  // Mock MeiliSearch index
  const mockIndex = {
    search: jest.fn(),
    addDocuments: jest.fn(),
  };

  // 定义在模块级别，便于测试直接访问
  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    file: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    searchMetadata: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMeilisearchService = {
    getIndex: jest.fn().mockReturnValue(mockIndex),
    getClient: jest.fn(),
  };

  const mockIndexService = {
    indexProject: jest.fn(),
    indexFile: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    delPattern: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    // 清空所有mock
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MeilisearchService,
          useValue: mockMeilisearchService,
        },
        {
          provide: IndexService,
          useValue: mockIndexService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    indexService = module.get(IndexService);
  });

  describe('searchCode', () => {
    it('should search in user projects + public projects for authenticated user', async () => {
      // Mock: 用户有2个项目
      mockPrismaService.projectMember.findMany.mockResolvedValue([
        { projectId: 'proj1' } as any,
        { projectId: 'proj2' } as any,
      ]);

      // Mock: 2个公开项目
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'public1' } as any,
        { id: 'public2' } as any,
      ]);

      // Mock: MeiliSearch搜索结果
      mockIndex.search.mockResolvedValue({
        hits: [{ id: 'file_1', fileName: 'test.ts' }],
        estimatedTotalHits: 1,
        processingTimeMs: 10,
      });

      const result = await service.searchCode(
        { query: 'UserService', limit: 20, offset: 0 },
        'user123',
      );

      // 验证MeiliSearch被调用，filter包含所有项目
      expect(mockIndex.search).toHaveBeenCalledWith(
        'UserService',
        expect.objectContaining({
          filter: expect.stringContaining('proj1'),
        }),
      );

      expect(result.hits).toHaveLength(1);
      expect(result.totalHits).toBe(1);
    });

    it('should only search in public projects for anonymous user', async () => {
      // Mock: 2个公开项目
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'public1' } as any,
        { id: 'public2' } as any,
      ]);

      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 5,
      });

      const result = await service.searchCode({
        query: 'test',
        limit: 20,
        offset: 0,
      });

      // 验证只查询了公开项目
      expect(mockPrismaService.projectMember.findMany).not.toHaveBeenCalled();
      expect(mockIndex.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          filter: expect.stringContaining('public'),
        }),
      );

      expect(result.hits).toHaveLength(0);
    });

    it('should search in specified project if user has access', async () => {
      const projectId = 'proj123';

      // Mock: 用户是项目成员
      mockPrismaService.projectMember.findFirst.mockResolvedValue({
        userId: 'user123',
        projectId,
      } as any);

      mockIndex.search.mockResolvedValue({
        hits: [{ id: 'file_1' }],
        estimatedTotalHits: 1,
        processingTimeMs: 8,
      });

      const result = await service.searchCode(
        { query: 'test', projectId, limit: 20, offset: 0 },
        'user123',
      );

      expect(mockIndex.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          filter: `projectId = "${projectId}"`,
        }),
      );

      expect(result.hits).toHaveLength(1);
    });

    it('should throw error if user has no access to specified project', async () => {
      const projectId = 'proj123';

      // Mock: 用户不是项目成员
      mockPrismaService.projectMember.findFirst.mockResolvedValue(null);

      // Mock: 项目不是公开的
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        visibility: 'PRIVATE',
      } as any);

      await expect(
        service.searchCode(
          { query: 'test', projectId, limit: 20, offset: 0 },
          'user123',
        ),
      ).rejects.toThrow('Access denied');
    });

    it('should allow search in public project without authentication', async () => {
      const projectId = 'public-proj';

      // Mock: 项目是公开的
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        visibility: 'PUBLIC',
      } as any);

      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 3,
      });

      const result = await service.searchCode({
        query: 'test',
        projectId,
        limit: 20,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(mockIndex.search).toHaveBeenCalled();
    });

    it('should apply language filter correctly', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'public1' } as any,
      ]);

      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 5,
      });

      await service.searchCode({
        query: 'test',
        language: ['typescript', 'javascript'],
        limit: 20,
        offset: 0,
      });

      expect(mockIndex.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          filter: expect.stringMatching(
            /language = "typescript" OR language = "javascript"/,
          ),
        }),
      );
    });

    it('should apply branch filter correctly', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'public1' } as any,
      ]);

      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 5,
      });

      await service.searchCode({
        query: 'test',
        branch: 'main',
        limit: 20,
        offset: 0,
      });

      expect(mockIndex.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          filter: expect.stringMatching(/branchName = "main"/),
        }),
      );
    });

    it('should apply sort rules correctly', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'public1' } as any,
      ]);

      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 5,
      });

      // Test date sorting
      await service.searchCode({
        query: 'test',
        sort: 'date',
        limit: 20,
        offset: 0,
      });

      expect(mockIndex.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          sort: ['lastModified:desc'],
        }),
      );
    });
  });

  describe('triggerReindex', () => {
    it('should trigger reindex for existing project', async () => {
      const projectId = 'proj123';

      // Mock: 项目存在
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        name: 'Test Project',
      } as any);

      // Mock: 项目有100个文件
      mockPrismaService.file.count.mockResolvedValue(100);

      // Mock: indexProject成功
      mockIndexService.indexProject.mockResolvedValue(undefined);

      const result = await service.triggerReindex(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.status).toBe('running');
      expect(result.estimatedFiles).toBe(100);
      expect(result.jobId).toContain('reindex_');

      // 验证后台任务启动（不等待）
      expect(indexService.indexProject).toHaveBeenCalledWith(projectId);
    });

    it('should throw error if project does not exist', async () => {
      const projectId = 'nonexistent';

      // Mock: 项目不存在
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.triggerReindex(projectId)).rejects.toThrow(
        'Project nonexistent not found',
      );
    });
  });

  describe('getIndexStatus', () => {
    it('should return index status for project', async () => {
      const projectId = 'proj123';

      // Mock: 项目存在
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
      } as any);

      // Mock: 总文件数
      mockPrismaService.file.count.mockResolvedValueOnce(100);

      // Mock: 已索引文件数
      mockPrismaService.searchMetadata.count
        .mockResolvedValueOnce(80) // INDEXED
        .mockResolvedValueOnce(5) // INDEXING
        .mockResolvedValueOnce(10) // FAILED
        .mockResolvedValueOnce(95); // Total metadata

      // Mock: 最后索引时间
      mockPrismaService.searchMetadata.findFirst.mockResolvedValue({
        indexedAt: new Date('2025-10-27T12:00:00Z'),
      } as any);

      const result = await service.getIndexStatus(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.totalFiles).toBe(100);
      expect(result.indexedFiles).toBe(80);
      expect(result.failedFiles).toBe(10);
      expect(result.pendingFiles).toBe(5); // 100 - 95
      expect(result.progress).toBe(80); // (80/100)*100
      expect(result.lastIndexedAt).toEqual(new Date('2025-10-27T12:00:00Z'));
    });

    it('should throw error if project does not exist', async () => {
      const projectId = 'nonexistent';

      // Mock: 项目不存在
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.getIndexStatus(projectId)).rejects.toThrow(
        'Project nonexistent not found',
      );
    });

    it('should handle project with no files', async () => {
      const projectId = 'empty-proj';

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
      } as any);

      mockPrismaService.file.count.mockResolvedValueOnce(0);
      mockPrismaService.searchMetadata.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrismaService.searchMetadata.findFirst.mockResolvedValue(null);

      const result = await service.getIndexStatus(projectId);

      expect(result.totalFiles).toBe(0);
      expect(result.progress).toBe(0);
      expect(result.lastIndexedAt).toBeUndefined();
    });
  });
});
