# Phase 2.5 Code Search MVP 开发计划

**项目阶段**: Phase 2.5 - Code Search
**技术方案**: MeiliSearch + NestJS + Next.js
**总工时**: 40小时（1-2周冲刺）
**目标**: 实现基础代码搜索功能，支持TypeScript/JavaScript项目

---

## 开发任务总览

### Week 1: 后端基础设施 (24小时)

#### Task 1.1: 环境搭建 (2小时)

**文件清单**:
- `docker-compose.yml` (修改)
- `.env.example` (修改)
- `.env` (修改)

**执行步骤**:

1. **添加MeiliSearch服务到docker-compose.yml**
```yaml
services:
  # ... 现有服务 ...

  meilisearch:
    image: getmeili/meilisearch:v1.10
    container_name: flotilla-meilisearch
    ports:
      - "7700:7700"
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - MEILI_ENV=development
      - MEILI_HTTP_ADDR=0.0.0.0:7700
    volumes:
      - meilisearch_data:/meili_data
    networks:
      - app-network
    restart: unless-stopped

volumes:
  # ... 现有volumes ...
  meilisearch_data:
    driver: local
```

2. **添加环境变量到.env.example**
```bash
# MeiliSearch Configuration
MEILI_MASTER_KEY=your-master-key-min-16-chars
MEILI_HOST=http://localhost:7700
MEILI_INDEX_PREFIX=flotilla_
```

3. **验证部署**
```bash
docker-compose up -d meilisearch
curl http://localhost:7700/health  # 预期返回: {"status":"available"}
```

**验收标准**:
- [ ] MeiliSearch容器成功启动
- [ ] 端口7700可访问
- [ ] Health check返回200状态码

---

#### Task 1.2: Prisma Schema扩展 (1小时)

**文件清单**:
- `apps/backend/prisma/schema.prisma` (修改)

**执行步骤**:

1. **添加IndexStatus枚举**（第80行后）
```prisma
enum IndexStatus {
  PENDING     // 等待索引
  INDEXING    // 索引中
  INDEXED     // 已索引
  FAILED      // 索引失败
  OUTDATED    // 已过期（文件有新提交）
}
```

2. **添加SearchMetadata模型**（File模型后）
```prisma
model SearchMetadata {
  id           String      @id @default(cuid())
  fileId       String      @unique
  projectId    String
  repositoryId String

  status       IndexStatus @default(PENDING)
  indexedAt    DateTime?
  failureReason String?    @db.Text
  retryCount   Int         @default(0)

  lastCommitId String?     @db.VarChar(64)
  contentHash  String?     @db.VarChar(64)

  symbolCount  Int         @default(0)
  lineCount    Int         @default(0)

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  file       File       @relation(fields: [fileId], references: [id], onDelete: Cascade)
  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  repository Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([repositoryId])
  @@index([status])
  @@index([indexedAt])
  @@map("search_metadata")
}
```

3. **更新File/Project/Repository模型关系**
```prisma
model File {
  // ... 现有字段 ...
  searchMetadata SearchMetadata?
}

model Project {
  // ... 现有字段 ...
  searchMetadata SearchMetadata[]
}

model Repository {
  // ... 现有字段 ...
  searchMetadata SearchMetadata[]
}
```

4. **生成并应用迁移**
```bash
cd apps/backend
pnpm prisma migrate dev --name add_search_metadata
pnpm prisma generate
```

**验收标准**:
- [ ] 迁移成功执行
- [ ] search_metadata表已创建
- [ ] Prisma Client已重新生成
- [ ] 无编译错误

---

#### Task 1.3: 安装NPM依赖 (0.5小时)

**执行步骤**:

```bash
cd apps/backend

# 安装MeiliSearch客户端
pnpm add meilisearch

# 安装TypeScript符号解析器
pnpm add @typescript-eslint/parser @typescript-eslint/typescript-estree

# 安装文件类型检测
pnpm add file-type mime-types

# 安装类型定义
pnpm add -D @types/mime-types
```

**验收标准**:
- [ ] 所有依赖成功安装
- [ ] package.json已更新
- [ ] pnpm-lock.yaml已更新

---

#### Task 1.4: 创建SearchModule基础结构 (1.5小时)

**文件清单**:
- `apps/backend/src/search/search.module.ts` (新建)
- `apps/backend/src/search/search.controller.ts` (新建)
- `apps/backend/src/search/search.service.ts` (新建)
- `apps/backend/src/search/index.service.ts` (新建)
- `apps/backend/src/search/meilisearch.service.ts` (新建)
- `apps/backend/src/search/dto/` (新建目录)
- `apps/backend/src/search/interfaces/` (新建目录)

**代码实现**:

1. **search.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { IndexService } from './index.service';
import { MeilisearchService } from './meilisearch.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [SearchController],
  providers: [SearchService, IndexService, MeilisearchService],
  exports: [SearchService, IndexService],
})
export class SearchModule {}
```

2. **meilisearch.service.ts** (MeiliSearch客户端封装)
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, Index } from 'meilisearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;
  private codeIndex: Index;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('MEILI_HOST');
    const apiKey = this.configService.get('MEILI_MASTER_KEY');

    this.client = new MeiliSearch({ host, apiKey });

    // 初始化索引
    await this.initializeIndex();
  }

  private async initializeIndex() {
    const indexName = 'code';

    try {
      // 检查索引是否存在
      this.codeIndex = await this.client.getIndex(indexName);
      this.logger.log(`Code index already exists: ${indexName}`);
    } catch (error) {
      // 索引不存在，创建新索引
      this.logger.log(`Creating new code index: ${indexName}`);
      const { taskUid } = await this.client.createIndex(indexName, {
        primaryKey: 'id',
      });

      // 等待任务完成
      await this.client.waitForTask(taskUid);
      this.codeIndex = await this.client.getIndex(indexName);

      // 配置索引设置
      await this.configureIndex();
    }
  }

  private async configureIndex() {
    await this.codeIndex.updateSettings({
      searchableAttributes: [
        'content',
        'fileName',
        'filePath',
        'symbols',
        'commitMessage',
      ],
      filterableAttributes: [
        'projectId',
        'repositoryId',
        'language',
        'branchName',
        'extension',
        'authorId',
      ],
      sortableAttributes: ['lastModified', 'size', 'lineCount'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      },
      pagination: {
        maxTotalHits: 1000,
      },
    });

    this.logger.log('Code index configured successfully');
  }

  getIndex(): Index {
    return this.codeIndex;
  }

  getClient(): MeiliSearch {
    return this.client;
  }
}
```

3. **search.controller.ts** (骨架)
```typescript
import { Controller, Get, Post, Delete, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
@ApiTags('Code Search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '全局代码搜索' })
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.searchCode(query);
  }

  @Get('projects/:projectId')
  @UseGuards(JwtAuthGuard)
  async searchInProject(
    @Param('projectId') projectId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.searchCode({ ...query, projectId });
  }

  @Post('reindex/:projectId')
  @UseGuards(JwtAuthGuard)
  async reindexProject(@Param('projectId') projectId: string) {
    return this.searchService.triggerReindex(projectId);
  }

  @Get('status/:projectId')
  @UseGuards(JwtAuthGuard)
  async getIndexStatus(@Param('projectId') projectId: string) {
    return this.searchService.getIndexStatus(projectId);
  }
}
```

4. **search.service.ts** (骨架)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { IndexService } from './index.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private meilisearch: MeilisearchService,
    private indexService: IndexService,
    private prisma: PrismaService,
  ) {}

  async searchCode(query: SearchQueryDto) {
    // TODO: Implement in Task 1.7
    throw new Error('Not implemented yet');
  }

  async triggerReindex(projectId: string) {
    // TODO: Implement in Task 1.6
    throw new Error('Not implemented yet');
  }

  async getIndexStatus(projectId: string) {
    // TODO: Implement in Task 1.6
    throw new Error('Not implemented yet');
  }
}
```

5. **index.service.ts** (骨架)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { MeilisearchService } from './meilisearch.service';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private meilisearch: MeilisearchService,
  ) {}

  async indexFile(fileId: string) {
    // TODO: Implement in Task 1.5
    throw new Error('Not implemented yet');
  }

  async indexProject(projectId: string) {
    // TODO: Implement in Task 1.6
    throw new Error('Not implemented yet');
  }
}
```

**验收标准**:
- [ ] 所有文件成功创建
- [ ] 编译通过（`pnpm build`）
- [ ] 模块成功注入到AppModule

---

#### Task 1.5: 创建DTO和Interface (1小时)

**文件清单**:
- `apps/backend/src/search/dto/search-query.dto.ts` (新建)
- `apps/backend/src/search/dto/search-result.dto.ts` (新建)
- `apps/backend/src/search/interfaces/code-document.interface.ts` (新建)

**代码实现**:

1. **search-query.dto.ts**
```typescript
import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词', example: 'UserService' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: '项目ID', example: 'cm123456' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '编程语言', example: ['typescript', 'javascript'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @ApiPropertyOptional({ description: '分支名称', example: 'main' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ description: '文件扩展名', example: ['.ts', '.tsx'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extension?: string[];

  @ApiPropertyOptional({ description: '偏移量', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: '限制数量', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '排序方式', enum: ['relevance', 'date', 'size'] })
  @IsOptional()
  @IsEnum(['relevance', 'date', 'size'])
  sort?: 'relevance' | 'date' | 'size' = 'relevance';
}
```

2. **search-result.dto.ts**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { CodeDocument } from '../interfaces/code-document.interface';

export class SearchResultDto {
  @ApiProperty({ description: '搜索结果', type: [Object] })
  hits: CodeDocument[];

  @ApiProperty({ description: '总命中数', example: 156 })
  totalHits: number;

  @ApiProperty({ description: '偏移量', example: 0 })
  offset: number;

  @ApiProperty({ description: '限制数量', example: 20 })
  limit: number;

  @ApiProperty({ description: '处理时间(ms)', example: 23 })
  processingTimeMs: number;

  @ApiProperty({ description: '搜索关键词', example: 'UserService' })
  query: string;
}
```

3. **code-document.interface.ts**
```typescript
export interface CodeDocument {
  // 唯一标识
  id: string;  // file_<fileId>_<commitId>

  // 核心搜索内容
  content: string;
  fileName: string;
  filePath: string;
  symbols: string[];

  // 关联信息
  projectId: string;
  projectName: string;
  repositoryId: string;
  branchName: string;

  // 文件元数据
  language: string;
  extension: string;
  size: number;
  lineCount: number;
  mimeType: string;

  // Git信息
  commitId: string;
  commitMessage: string;
  commitHash: string;
  authorId: string;
  authorName: string;
  lastModified: number;

  // 搜索优化
  contentPreview: string;
}

export interface HighlightSegment {
  lineNumber: number;
  lineContent: string;
  startColumn: number;
  endColumn: number;
}
```

**验收标准**:
- [ ] DTO包含所有必要字段
- [ ] Swagger装饰器完整
- [ ] 验证规则正确
- [ ] 类型定义完整

---

#### Task 1.6: 实现文件索引逻辑 (10小时)

**核心功能**: 从MinIO提取文件内容，解析符号，构建CodeDocument，推送到MeiliSearch

**文件清单**:
- `apps/backend/src/search/index.service.ts` (完善)
- `apps/backend/src/search/parsers/typescript-parser.ts` (新建)
- `apps/backend/src/search/utils/file-utils.ts` (新建)
- `apps/backend/src/search/utils/language-detector.ts` (新建)

**代码实现** (核心伪代码):

```typescript
// index.service.ts 核心方法

async indexFile(fileId: string): Promise<void> {
  // 1. 获取文件记录
  const file = await this.prisma.file.findUnique({
    where: { id: fileId },
    include: {
      repository: { include: { project: true } },
      commit: { include: { author: true } },
      branch: true,
    },
  });

  if (!file) {
    throw new NotFoundException(`File ${fileId} not found`);
  }

  // 2. 检查是否为可索引文件
  if (!this.isIndexableFile(file.path)) {
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
    update: { status: 'INDEXING' },
  });

  try {
    // 4. 从MinIO下载文件内容
    const content = await this.downloadFileContent(file.objectName);

    // 5. 计算contentHash
    const contentHash = this.calculateHash(content);

    // 6. 检查hash是否变化
    const metadata = await this.prisma.searchMetadata.findUnique({
      where: { fileId },
    });
    if (metadata?.contentHash === contentHash) {
      this.logger.log(`File ${file.path} unchanged, skipping index`);
      return;
    }

    // 7. 解析代码符号
    const symbols = await this.extractSymbols(file.path, content);

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
        symbolCount: symbols.length,
        lineCount: content.split('\n').length,
        failureReason: null,
        retryCount: 0,
      },
    });

    this.logger.log(`Successfully indexed file: ${file.path}`);
  } catch (error) {
    // 11. 索引失败处理
    await this.prisma.searchMetadata.update({
      where: { fileId },
      data: {
        status: 'FAILED',
        failureReason: error.message,
        retryCount: { increment: 1 },
      },
    });
    this.logger.error(`Failed to index file ${file.path}:`, error);
    throw error;
  }
}

// 批量索引项目
async indexProject(projectId: string): Promise<void> {
  const files = await this.prisma.file.findMany({
    where: { repository: { projectId } },
  });

  this.logger.log(`Indexing ${files.length} files for project ${projectId}`);

  // 批量处理，并发限制10
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(file => this.indexFile(file.id)),
    );
  }

  this.logger.log(`Project ${projectId} indexing completed`);
}
```

**验收标准**:
- [ ] 单文件索引功能正常
- [ ] 批量索引功能正常
- [ ] 错误处理完善
- [ ] SearchMetadata状态正确更新
- [ ] 单元测试覆盖核心逻辑（>=70%）

---

#### Task 1.7: 实现搜索逻辑 (6小时)

**核心功能**: 调用MeiliSearch查询接口，权限过滤，结果格式化

**代码实现**:

```typescript
// search.service.ts 核心方法

async searchCode(
  query: SearchQueryDto,
  userId?: string,
): Promise<SearchResultDto> {
  const { query: searchQuery, projectId, language, extension, branch, offset, limit, sort } = query;

  // 1. 构建过滤条件
  const filters: string[] = [];

  // 权限过滤（如果提供userId）
  if (userId) {
    const userProjects = await this.getUserProjectIds(userId);
    filters.push(`projectId IN [${userProjects.join(',')}]`);
  } else {
    // 未登录用户只能搜索公开项目
    const publicProjects = await this.getPublicProjectIds();
    filters.push(`projectId IN [${publicProjects.join(',')}]`);
  }

  // 项目过滤
  if (projectId) {
    filters.push(`projectId = "${projectId}"`);
  }

  // 语言过滤
  if (language && language.length > 0) {
    filters.push(`language IN [${language.map(l => `"${l}"`).join(',')}]`);
  }

  // 扩展名过滤
  if (extension && extension.length > 0) {
    filters.push(`extension IN [${extension.map(e => `"${e}"`).join(',')}]`);
  }

  // 分支过滤
  if (branch) {
    filters.push(`branchName = "${branch}"`);
  }

  // 2. 构建排序规则
  let sortRules: string[] = [];
  if (sort === 'date') {
    sortRules = ['lastModified:desc'];
  } else if (sort === 'size') {
    sortRules = ['size:desc'];
  }

  // 3. 调用MeiliSearch
  const index = this.meilisearch.getIndex();
  const results = await index.search(searchQuery, {
    filter: filters.join(' AND '),
    sort: sortRules,
    offset,
    limit,
    attributesToHighlight: ['content', 'fileName'],
    attributesToCrop: ['content'],
    cropLength: 100,
  });

  // 4. 格式化返回结果
  return {
    hits: results.hits as CodeDocument[],
    totalHits: results.estimatedTotalHits,
    offset,
    limit,
    processingTimeMs: results.processingTimeMs,
    query: searchQuery,
  };
}

private async getUserProjectIds(userId: string): Promise<string[]> {
  const projects = await this.prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return projects.map(p => p.projectId);
}

private async getPublicProjectIds(): Promise<string[]> {
  const projects = await this.prisma.project.findMany({
    where: { visibility: 'PUBLIC' },
    select: { id: true },
  });
  return projects.map(p => p.id);
}
```

**验收标准**:
- [ ] 搜索功能返回正确结果
- [ ] 权限过滤正确
- [ ] 过滤条件生效
- [ ] 排序功能正常
- [ ] 分页功能正常
- [ ] 单元测试覆盖核心逻辑（>=70%）

---

#### Task 1.8: 注册模块到AppModule (0.5小时)

**文件清单**:
- `apps/backend/src/app.module.ts` (修改)

**代码实现**:

```typescript
// app.module.ts
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    // ... 现有imports ...
    SearchModule,  // 添加这一行
  ],
  // ...
})
export class AppModule implements NestModule {
  // ...
}
```

**验收标准**:
- [ ] 编译通过
- [ ] `/api/search` 端点可访问
- [ ] Swagger文档显示Search相关端点

---

#### Task 1.9: 编写单元测试 (3小时)

**文件清单**:
- `apps/backend/src/search/search.service.spec.ts` (新建)
- `apps/backend/src/search/index.service.spec.ts` (新建)
- `apps/backend/src/search/meilisearch.service.spec.ts` (新建)

**测试用例清单**:

**search.service.spec.ts**:
- [ ] searchCode - 应该返回匹配结果
- [ ] searchCode - 应该正确过滤项目
- [ ] searchCode - 应该正确过滤语言
- [ ] searchCode - 应该正确应用权限
- [ ] searchCode - 未登录用户只能搜索公开项目

**index.service.spec.ts**:
- [ ] indexFile - 应该成功索引文件
- [ ] indexFile - 应该跳过非可索引文件
- [ ] indexFile - 应该检测contentHash变化
- [ ] indexFile - 失败时应该更新状态为FAILED
- [ ] indexProject - 应该批量索引所有文件

**验收标准**:
- [ ] 测试覆盖率 >= 70%
- [ ] 所有测试通过
- [ ] Mock策略正确（隔离外部依赖）

---

### Week 2: 前端UI + E2E测试 (16小时)

#### Task 2.1: 创建搜索页面路由 (1小时)

**文件清单**:
- `apps/frontend/src/app/search/page.tsx` (新建)
- `apps/frontend/src/app/search/layout.tsx` (新建)
- `apps/frontend/src/app/projects/[id]/search/page.tsx` (新建)

**代码骨架**:

```typescript
// app/search/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">全局代码搜索</h1>
      {/* TODO: 添加搜索组件 */}
    </div>
  );
}
```

**验收标准**:
- [ ] 路由可访问
- [ ] 页面正常渲染
- [ ] URL参数正确解析

---

#### Task 2.2: 创建搜索组件 (4小时)

**文件清单**:
- `apps/frontend/src/components/search/search-input.tsx` (新建)
- `apps/frontend/src/components/search/search-filters.tsx` (新建)
- `apps/frontend/src/components/search/search-results.tsx` (新建)
- `apps/frontend/src/components/search/code-preview.tsx` (新建)

**核心功能**:
1. **SearchInput**: 实时搜索建议（debounce 300ms）
2. **SearchFilters**: 语言、扩展名、分支过滤器
3. **SearchResults**: 结果列表展示（分页）
4. **CodePreview**: 代码高亮预览（Monaco Editor只读模式）

**验收标准**:
- [ ] 搜索建议功能正常
- [ ] 过滤器生效
- [ ] 代码高亮显示正常
- [ ] 分页功能正常

---

#### Task 2.3: API集成 (2小时)

**文件清单**:
- `apps/frontend/src/lib/api.ts` (修改)

**代码实现**:

```typescript
// lib/api.ts 新增方法

export async function searchCode(params: {
  query: string;
  projectId?: string;
  language?: string[];
  extension?: string[];
  branch?: string;
  offset?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'size';
}) {
  const searchParams = new URLSearchParams();
  searchParams.append('q', params.query);

  if (params.projectId) searchParams.append('projectId', params.projectId);
  if (params.language) params.language.forEach(l => searchParams.append('language', l));
  if (params.extension) params.extension.forEach(e => searchParams.append('extension', e));
  if (params.branch) searchParams.append('branch', params.branch);
  if (params.offset !== undefined) searchParams.append('offset', String(params.offset));
  if (params.limit) searchParams.append('limit', String(params.limit));
  if (params.sort) searchParams.append('sort', params.sort);

  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

export async function triggerReindex(projectId: string) {
  const response = await fetch(`/api/search/reindex/${projectId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    throw new Error('Reindex failed');
  }

  return response.json();
}

export async function getIndexStatus(projectId: string) {
  const response = await fetch(`/api/search/status/${projectId}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get index status');
  }

  return response.json();
}
```

**验收标准**:
- [ ] API调用成功
- [ ] 错误处理完善
- [ ] Token正确传递

---

#### Task 2.4: i18n国际化支持 (1小时)

**文件清单**:
- `apps/frontend/src/locales/zh.ts` (修改)
- `apps/frontend/src/locales/en.ts` (修改)

**代码实现**:

```typescript
// locales/zh.ts 新增
export const zh = {
  // ... 现有翻译 ...
  search: {
    globalTitle: '全局代码搜索',
    projectTitle: '项目内搜索',
    inputPlaceholder: '搜索代码、函数名、类名...',
    filters: {
      language: '编程语言',
      extension: '文件扩展名',
      branch: '分支',
      sort: '排序方式',
    },
    sortOptions: {
      relevance: '相关性',
      date: '修改时间',
      size: '文件大小',
    },
    results: {
      total: '找到 {count} 个结果',
      noResults: '未找到匹配结果',
      loading: '搜索中...',
    },
    reindex: {
      button: '重新索引',
      success: '索引任务已启动',
      failed: '索引失败',
    },
  },
};

// locales/en.ts 新增
export const en = {
  // ... existing translations ...
  search: {
    globalTitle: 'Global Code Search',
    projectTitle: 'Search in Project',
    inputPlaceholder: 'Search code, functions, classes...',
    filters: {
      language: 'Language',
      extension: 'Extension',
      branch: 'Branch',
      sort: 'Sort By',
    },
    sortOptions: {
      relevance: 'Relevance',
      date: 'Last Modified',
      size: 'File Size',
    },
    results: {
      total: 'Found {count} results',
      noResults: 'No results found',
      loading: 'Searching...',
    },
    reindex: {
      button: 'Reindex',
      success: 'Indexing job started',
      failed: 'Indexing failed',
    },
  },
};
```

**验收标准**:
- [ ] 所有文本已翻译
- [ ] 中英文切换正常
- [ ] 动态模板字符串正常工作

---

#### Task 2.5: E2E测试 (4小时)

**文件清单**:
- `apps/frontend/tests/search/global-search.spec.ts` (新建)
- `apps/frontend/tests/search/project-search.spec.ts` (新建)
- `apps/frontend/tests/search/search-filters.spec.ts` (新建)

**测试用例清单**:

**global-search.spec.ts**:
- [ ] 应该成功执行全局搜索
- [ ] 应该显示搜索结果
- [ ] 应该支持分页
- [ ] 未登录用户只能搜索公开项目

**project-search.spec.ts**:
- [ ] 应该在项目内搜索
- [ ] 应该触发重索引
- [ ] 应该显示索引状态

**search-filters.spec.ts**:
- [ ] 应该按语言过滤
- [ ] 应该按扩展名过滤
- [ ] 应该按分支过滤
- [ ] 应该支持排序

**验收标准**:
- [ ] 所有测试通过
- [ ] 覆盖核心用户流程
- [ ] 测试报告无错误

---

#### Task 2.6: 文档更新 (2小时)

**文件清单**:
- `apps/frontend/CLAUDE.md` (修改)
- `apps/backend/CLAUDE.md` (修改)
- `CHANGELOG.md` (修改)

**更新内容**:
1. **CLAUDE.md**: 添加Code Search模块说明
2. **CHANGELOG.md**: 记录Phase 2.5完成

**验收标准**:
- [ ] 文档完整更新
- [ ] 架构图更新
- [ ] API文档更新

---

#### Task 2.7: 生成Task Completion Report (2小时)

**报告模板**:

```markdown
### ✅ Task Completion Report
**Task:** Phase 2.5 Code Search MVP

**Change Summary:**
- 新增MeiliSearch Docker服务
- 新增SearchModule（后端）
- 新增搜索页面（前端）
- 新增E2E测试（12个测试用例）
- 新增Prisma模型：SearchMetadata

**ECP Compliance Self-Check:**
- **Architecture & Design (A):**
  - SOLID: SearchService单一职责，IndexService单一职责
  - 高内聚低耦合: SearchModule独立模块
  - YAGNI: 只实现MVP功能，未实现高级功能（正则搜索、历史记录）

- **Implementation (B):**
  - DRY: 代码复用（MeilisearchService封装客户端）
  - KISS: 简单直接的索引流程
  - 命名清晰: SearchQueryDto, CodeDocument, indexFile

- **Robustness & Security (C):**
  - 输入验证: class-validator装饰器
  - 错误处理: try-catch + SearchMetadata状态追踪
  - 权限控制: 双重验证（API Guard + MeiliSearch filter）

- **Maintainability (D):**
  - 可测试性: 依赖注入 + Mock
  - 注释规范: 只注释业务逻辑Why
  - 无魔法值: INDEXABLE_EXTENSIONS常量

**Self-Correction Process:**
- Issue 1: MeiliSearch索引配置错误 → 修复typoTolerance参数
- Issue 2: 权限过滤遗漏Public项目 → 添加getPublicProjectIds方法
- Issue 3: E2E测试超时 → 增加timeout到60s

**Risk Assessment & Future Outlook:**
- **Confidence Score:** ⭐⭐⭐⭐ (4/5)
- **Potential Risks:**
  - MeiliSearch单点故障 → 建议添加Redis缓存
  - 大文件索引OOM → 已限制1MB，但需监控
- **Recommended Next Steps:**
  - Phase 2.6: 添加Python/Java符号解析
  - Phase 2.7: 添加正则表达式搜索
  - Phase 3.1: AI代码补全集成
```

**验收标准**:
- [ ] 报告完整
- [ ] 风险评估合理
- [ ] 后续步骤清晰

---

## 总结

### 交付物清单

**后端（Backend）**:
- [ ] `docker-compose.yml` (MeiliSearch服务)
- [ ] `apps/backend/src/search/` (完整SearchModule)
- [ ] `apps/backend/prisma/schema.prisma` (SearchMetadata模型)
- [ ] 单元测试（coverage >= 70%）

**前端（Frontend）**:
- [ ] `apps/frontend/src/app/search/` (全局搜索页面)
- [ ] `apps/frontend/src/app/projects/[id]/search/` (项目搜索页面)
- [ ] `apps/frontend/src/components/search/` (搜索组件)
- [ ] E2E测试（12个测试用例）

**文档（Documentation）**:
- [ ] `docs/Code_Search_架构设计.md`
- [ ] `CHANGELOG.md` (更新)
- [ ] Task Completion Report

### 性能指标

- **索引速度**: 1000 files/min (MVP目标)
- **搜索响应**: <200ms (MVP目标)
- **内存占用**: <512MB (MeiliSearch)
- **测试覆盖率**: >=70% (单元测试)
- **E2E通过率**: 100%

### 里程碑

- **Week 1 End**: 后端API完成，可通过Swagger测试搜索功能
- **Week 2 End**: 前端UI完成，E2E测试100%通过
- **Final Delivery**: Task Completion Report生成，代码提交到main分支

---

**文档状态**: ✅ **已完成**
**创建时间**: 2025-10-27
**最后更新**: 2025-10-27
