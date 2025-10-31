# Code Search 索引结构与架构设计

**创建时间**: 2025-10-27
**Phase**: 2.5 - Code Search MVP
**技术方案**: MeiliSearch + NestJS + MinIO

---

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户请求                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Search Input │  │ Results List │  │ Code Preview │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │             SearchModule                             │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │       │
│  │  │SearchController│ │ SearchService│  │IndexService│ │       │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                      │
│                            │ Query/Index                          │
│                            ▼                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │             MeiliSearch Client                        │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│    MeiliSearch          │  │    PostgreSQL           │
│  ┌──────────────────┐   │  │  ┌──────────────────┐  │
│  │  code_index      │   │  │  │ search_metadata  │  │
│  │  - files         │   │  │  │ - indexStatus    │  │
│  │  - symbols       │   │  │  │ - lastIndexed    │  │
│  └──────────────────┘   │  │  └──────────────────┘  │
└─────────────────────────┘  └─────────────────────────┘
                │
                │ File Content
                ▼
┌─────────────────────────┐
│       MinIO             │
│  ┌──────────────────┐   │
│  │  repositories/   │   │
│  │  - project1/     │   │
│  │  - project2/     │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

---

## 2. 数据库Schema设计

### 2.1 新增Prisma模型: SearchMetadata

在 `apps/backend/prisma/schema.prisma` 中新增:

```prisma
// ============================================
// Code Search 模块
// ============================================

enum IndexStatus {
  PENDING     // 等待索引
  INDEXING    // 索引中
  INDEXED     // 已索引
  FAILED      // 索引失败
  OUTDATED    // 已过期（文件有新提交）
}

model SearchMetadata {
  id           String      @id @default(cuid())
  fileId       String      @unique  // 关联到File表
  projectId    String
  repositoryId String

  // 索引状态
  status       IndexStatus @default(PENDING)
  indexedAt    DateTime?   // 上次索引时间
  failureReason String?    @db.Text  // 失败原因
  retryCount   Int         @default(0)  // 重试次数

  // 文件快照（用于检测变化）
  lastCommitId String?     @db.VarChar(64)
  contentHash  String?     @db.VarChar(64)  // SHA256 hash

  // 索引统计
  symbolCount  Int         @default(0)  // 代码符号数量
  lineCount    Int         @default(0)  // 总行数

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // 关系
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

**设计原则:**
- `fileId` 唯一索引确保每个文件只有一条元数据记录
- `status` 索引用于快速查询待索引/失败的文件
- `indexedAt` 索引用于排序和增量索引
- `contentHash` 用于检测文件内容变化（避免重复索引）

---

## 3. MeiliSearch索引配置

### 3.1 Index Settings

```json
{
  "indexUid": "code",
  "primaryKey": "id",
  "searchableAttributes": [
    "content",       // 权重最高
    "fileName",      // 文件名
    "filePath",      // 文件路径
    "symbols",       // 代码符号（类名、函数名）
    "commitMessage"  // 提交信息
  ],
  "filterableAttributes": [
    "projectId",
    "repositoryId",
    "language",
    "branchName",
    "extension",
    "authorId"
  ],
  "sortableAttributes": [
    "lastModified",
    "size",
    "lineCount"
  ],
  "rankingRules": [
    "words",       // 匹配词数量
    "typo",        // 拼写容错
    "proximity",   // 词语接近度
    "attribute",   // 属性权重
    "sort",        // 自定义排序
    "exactness"    // 精确匹配
  ],
  "stopWords": ["the", "a", "an", "and", "or", "but"],
  "synonyms": {
    "fn": ["function"],
    "func": ["function"],
    "var": ["variable"],
    "const": ["constant"]
  },
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": {
      "oneTypo": 4,
      "twoTypos": 8
    }
  },
  "pagination": {
    "maxTotalHits": 1000
  },
  "faceting": {
    "maxValuesPerFacet": 100
  }
}
```

---

## 4. Document Schema定义

### 4.1 TypeScript接口

在 `apps/backend/src/search/interfaces/code-document.interface.ts`:

```typescript
/**
 * MeiliSearch索引文档结构
 */
export interface CodeDocument {
  // ============ 唯一标识 ============
  id: string;  // 格式: file_<fileId>_<commitId>

  // ============ 核心搜索内容 ============
  content: string;          // 文件完整内容（最大1MB）
  fileName: string;         // 文件名 (e.g., "user.service.ts")
  filePath: string;         // 完整路径 (e.g., "src/users/user.service.ts")
  symbols: string[];        // 代码符号数组 ["UserService", "createUser", "findById"]

  // ============ 关联信息 ============
  projectId: string;
  projectName: string;      // 用于显示
  repositoryId: string;
  branchName: string;       // 默认分支名

  // ============ 文件元数据 ============
  language: string;         // 编程语言 (typescript, javascript, python...)
  extension: string;        // 文件扩展名 (.ts, .js, .py)
  size: number;             // 文件大小（字节）
  lineCount: number;        // 总行数
  mimeType: string;         // MIME类型

  // ============ Git信息 ============
  commitId: string;
  commitMessage: string;
  commitHash: string;       // Git commit hash
  authorId: string;
  authorName: string;       // 作者名称（用于显示）
  lastModified: number;     // Unix timestamp (用于排序)

  // ============ 搜索优化 ============
  contentPreview: string;   // 前500字符预览
  highlights?: HighlightSegment[];  // 预计算的高亮片段（可选）
}

/**
 * 高亮片段接口
 */
export interface HighlightSegment {
  lineNumber: number;
  lineContent: string;
  startColumn: number;
  endColumn: number;
}

/**
 * 搜索请求DTO
 */
export interface SearchQueryDto {
  query: string;            // 搜索关键词
  projectId?: string;       // 过滤项目
  language?: string[];      // 过滤编程语言 ["typescript", "javascript"]
  branch?: string;          // 过滤分支
  extension?: string[];     // 过滤扩展名 [".ts", ".tsx"]

  // 分页
  offset?: number;          // 默认 0
  limit?: number;           // 默认 20，最大 100

  // 排序
  sort?: 'relevance' | 'date' | 'size';  // 默认 relevance
}

/**
 * 搜索结果DTO
 */
export interface SearchResultDto {
  hits: CodeDocument[];
  totalHits: number;
  offset: number;
  limit: number;
  processingTimeMs: number;
  query: string;
}
```

---

## 5. 索引Pipeline架构

### 5.1 索引触发机制

```typescript
/**
 * ��引触发场景:
 * 1. 新文件创建 (POST /api/repositories/:id/files)
 * 2. 文件更新 (PATCH /api/repositories/:id/files/:fileId)
 * 3. 新提交推送 (POST /api/repositories/:id/commits)
 * 4. 手动触发重索引 (POST /api/search/reindex/:projectId)
 * 5. 定时任务扫描 (CRON: 每小时检查PENDING状态)
 */
```

### 5.2 索引流程设计

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 文件变更检测                                            │
│  - Commit Hook触发                                               │
│  - 检查文件是否为可索引类型（.ts, .js, .py...）                  │
│  - 计算contentHash，与SearchMetadata对比                         │
│  - 如果hash相同 → 跳过索引                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 文件内容提取                                            │
│  - 从MinIO下载文件内容                                           │
│  - 检查文件大小（限制1MB）                                       │
│  - 解码为UTF-8文本                                               │
│  - 二进制文件 → 跳过索引                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 代码符号提取                                            │
│  - TypeScript/JavaScript: @typescript-eslint/parser             │
│  - Python: ast模块                                               │
│  - Java: javaparser                                              │
│  - 提取: 类名、函数名、变量名、接口名                            │
└──��────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: 构建Document对象                                        │
│  - 填充CodeDocument接口所有字段                                  │
│  - 生成id: `file_${fileId}_${commitId}`                         │
│  - 生成contentPreview (前500字符)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: 推送到MeiliSearch                                       │
│  - 调用 index.addDocuments([document])                          │
│  - 获取taskUid                                                   │
│  - 更新SearchMetadata.status = INDEXING                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: 异步任务监听                                            │
│  - 轮询 index.getTask(taskUid)                                  │
│  - 成功: SearchMetadata.status = INDEXED                        │
│  - 失败: SearchMetadata.status = FAILED, 记录failureReason      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 批量索引策略

```typescript
/**
 * 批量索引优化（首次索引或重索引）
 *
 * 场景: 项目首次启用Code Search，需索引所有历史文件
 *
 * 策略:
 * 1. 按Repository分批处理（避免单次处理过多文件）
 * 2. 每批次1000个文件
 * 3. 并发限制: 10个文件同时处理（控制MinIO/MeiliSearch压力）
 * 4. 失败重试: 最多3次，指数退避（1s, 2s, 4s）
 * 5. 进度通知: WebSocket推送索引进度给前端
 */

interface IndexJobProgress {
  jobId: string;
  projectId: string;
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  estimatedCompletionAt?: Date;
}
```

---

## 6. 搜索API设计

### 6.1 REST端点定义

在 `apps/backend/src/search/search.controller.ts`:

```typescript
@Controller('search')
@ApiTags('Code Search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 全局代码搜索
   * GET /api/search?q=UserService&projectId=xxx&language=typescript
   */
  @Get()
  @Public()
  @ApiOperation({ summary: '全局代码搜索' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'language', required: false, type: [String] })
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.searchService.searchCode(query);
  }

  /**
   * 项目内搜索
   * GET /api/search/projects/:projectId?q=createUser
   */
  @Get('projects/:projectId')
  @UseGuards(JwtAuthGuard)
  async searchInProject(
    @Param('projectId') projectId: string,
    @Query() query: Omit<SearchQueryDto, 'projectId'>,
  ): Promise<SearchResultDto> {
    return this.searchService.searchCode({ ...query, projectId });
  }

  /**
   * 触发项目重索引
   * POST /api/search/reindex/:projectId
   */
  @Post('reindex/:projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'OWNER', 'MAINTAINER')
  async reindexProject(@Param('projectId') projectId: string) {
    return this.searchService.triggerReindex(projectId);
  }

  /**
   * 获取索引状态
   * GET /api/search/status/:projectId
   */
  @Get('status/:projectId')
  @UseGuards(JwtAuthGuard)
  async getIndexStatus(@Param('projectId') projectId: string) {
    return this.searchService.getIndexStatus(projectId);
  }

  /**
   * 删除索引
   * DELETE /api/search/indexes/:projectId
   */
  @Delete('indexes/:projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'OWNER')
  async deleteIndex(@Param('projectId') projectId: string) {
    return this.searchService.deleteProjectIndex(projectId);
  }
}
```

---

## 7. 性能优化策略

### 7.1 索引性能优化

| 优化项 | 实现方案 | 预期提升 |
|--------|----------|----------|
| 文件过滤 | 只索引纯文本代码文件（排除.jpg, .pdf, .zip） | 减少50%无效索引 |
| 大小限制 | 单文件限制1MB，超过则只索引前100KB | 避免OOM |
| 增量索引 | contentHash检测，相同hash跳过 | 减少80%重复索引 |
| 批量提交 | 1000个文档/批次提交MeiliSearch | 提升5x吞吐量 |
| 并发控制 | 限制10并发MinIO下载 | 避免MinIO限流 |

### 7.2 搜索性能优化

| 优化项 | 实现方案 | 预期效果 |
|--------|----------|----------|
| 结果缓存 | Redis缓存热门搜索（TTL 5min） | <10ms响应 |
| 分页限制 | 最大limit=100 | 防止DOS攻击 |
| 属性裁剪 | 只返回必要字段（不返回完整content） | 减少50%传输量 |
| CDN加速 | 代码预览通过MinIO CDN直出 | 减少后端压力 |

### 7.3 存储优化

```typescript
/**
 * MeiliSearch磁盘占用估算:
 *
 * 假设:
 * - 平均文件大小: 5KB
 * - 平均符号数: 20个
 * - 项目文件数: 1000个
 *
 * 单项目索引大小 ≈ 1000 * (5KB content + 1KB metadata) ≈ 6MB
 * 100个项目 ≈ 600MB
 * 1000个项目 ≈ 6GB
 *
 * 推荐配置: 20GB磁盘空间（支持3000+项目）
 */
```

---

## 8. 安全与权限控制

### 8.1 搜索权限策略

```typescript
/**
 * 权限过滤逻辑:
 *
 * 1. Public项目: 所有用户可搜索
 * 2. Private项目: 只有项目成员可搜索
 * 3. 实现方式:
 *    - SearchService注入CurrentUser
 *    - 查询时添加filter:
 *      `visibility=PUBLIC OR (visibility=PRIVATE AND memberIds=${userId})`
 */

// 示例实现
async searchCode(query: SearchQueryDto, userId?: string) {
  const filters: string[] = [];

  // 权限过滤
  if (userId) {
    const userProjects = await this.getUserProjects(userId);
    const projectIds = userProjects.map(p => p.id);
    filters.push(`projectId IN [${projectIds.join(',')}]`);
  } else {
    filters.push('visibility = PUBLIC');
  }

  // 其他过滤条件
  if (query.language) {
    filters.push(`language IN [${query.language.join(',')}]`);
  }

  return this.meilisearch.index('code').search(query.query, {
    filter: filters.join(' AND '),
    limit: query.limit || 20,
  });
}
```

### 8.2 数据隐私保护

```typescript
/**
 * 敏感数据处理:
 *
 * 1. 环境变量文件(.env): 不索引
 * 2. 密钥文件(.key, .pem): 不索引
 * 3. 配置文件: 过滤敏感字段（password, apiKey, secret）
 * 4. 实现: 在索引前扫描内容，检测敏感模式
 */

const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*['"]?[\w\d]+/i,
  /api[_-]?key\s*[:=]\s*['"]?[\w\d]+/i,
  /secret\s*[:=]\s*['"]?[\w\d]+/i,
];

function sanitizeContent(content: string): string {
  let sanitized = content;
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  return sanitized;
}
```

---

## 9. 监控与维护

### 9.1 关键指标监控

```typescript
/**
 * 需要监控的指标:
 *
 * 1. 索引健康度
 *    - 总文件数 vs 已索引文件数
 *    - FAILED状态文件数量
 *    - 平均索引延迟（文件创建 → 索引完成）
 *
 * 2. 搜索性能
 *    - 平均搜索响应时间
 *    - P95/P99响应时间
 *    - QPS (Queries Per Second)
 *
 * 3. 资源使用
 *    - MeiliSearch内存占用
 *    - MeiliSearch磁盘占用
 *    - MinIO下载带宽
 */

interface SearchMetrics {
  // 索引指标
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  failedFiles: number;
  indexRate: number;  // files/hour

  // 搜索指标
  totalSearches: number;
  avgResponseTime: number;  // ms
  p95ResponseTime: number;
  p99ResponseTime: number;
  qps: number;

  // 资源指标
  meilisearchMemoryMB: number;
  meilisearchDiskGB: number;
  minioDownloadMBps: number;
}
```

### 9.2 定时任务设计

```typescript
/**
 * CRON任务清单:
 *
 * 1. 增量索引扫描 (每10分钟)
 *    - 检查PENDING状态文件
 *    - 批量触发索引
 *
 * 2. 失败重试 (每小时)
 *    - 检查FAILED且retryCount<3的文件
 *    - 重新索引
 *
 * 3. 过期清理 (每天凌晨2点)
 *    - 删除已删除文件的索引
 *    - 清理孤儿文档（File表中不存在但MeiliSearch有）
 *
 * 4. 指标统计 (每5分钟)
 *    - 计算SearchMetrics
 *    - 写入监控数据库/Prometheus
 */

@Injectable()
export class SearchSchedulerService {
  @Cron('*/10 * * * *')  // 每10分钟
  async indexPendingFiles() {
    // ...
  }

  @Cron('0 * * * *')  // 每小时
  async retryFailedIndexes() {
    // ...
  }

  @Cron('0 2 * * *')  // 每天凌晨2点
  async cleanupOrphanDocuments() {
    // ...
  }

  @Cron('*/5 * * * *')  // 每5分钟
  async collectMetrics() {
    // ...
  }
}
```

---

## 10. 分阶段实施计划

### Phase 1: MVP功能 (Week 1-2, 40h)

**目标**: 实现基础代码搜索功能

#### Week 1: 后端基础设施 (24h)
- [x] **Day 1-2**: 环境搭建 (6h)
  - Docker部署MeiliSearch
  - 创建SearchModule骨架
  - Prisma Schema新增SearchMetadata表

- [ ] **Day 3-4**: 索引服务开发 (10h)
  - IndexService实现（文件提取、符号解析、文档构建）
  - 支持TypeScript/JavaScript符号提取（@typescript-eslint/parser）
  - MinIO文件下载集成

- [ ] **Day 5**: 搜索服务开发 (8h)
  - SearchService实现（查询、过滤、权限控制）
  - SearchController API端点
  - Swagger文档

#### Week 2: 前端UI + 测试 (16h)
- [ ] **Day 1-2**: 搜索界面开发 (8h)
  - `/search` 全局搜索页面
  - `/projects/:id/search` 项目内搜索
  - 实时搜索建议（debounce 300ms）
  - 代码高亮显示（Monaco Editor）

- [ ] **Day 3**: E2E测试 (4h)
  - Playwright测试: 搜索功能、过滤、分页
  - 权限测试: Public/Private项目搜索

- [ ] **Day 4**: 文档与部署 (4h)
  - 更新CLAUDE.md
  - 生成Task Completion Report
  - Production部署验证

### Phase 2: 性能优化 (Week 3, 16h)
- [ ] 增量索引优化（contentHash检测）
- [ ] Redis缓存集成
- [ ] 批量索引性能优化（1000 files/batch）
- [ ] 搜索结果分页优化

### Phase 3: 高级功能 (Week 4, 24h)
- [ ] 多语言支持（Python, Java, Go）
- [ ] 正则表达式搜索
- [ ] 搜索历史记录
- [ ] 搜索分析Dashboard

---

## 11. 技术风险与缓解措施

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|----------|
| MeiliSearch单点故障 | 中 | 高 | (1) 定期备份索引<br>(2) Redis缓存搜索结果<br>(3) Fallback到PostgreSQL FTS |
| 索引延迟过高 | 中 | 中 | (1) 限制单文件大小1MB<br>(2) 异步批量索引<br>(3) 监控indexRate |
| 符号提取失败 | 高 | 低 | (1) 静默失败，仍索引纯文本<br>(2) 记录failureReason<br>(3) 定时重试 |
| 敏感数据泄露 | 低 | 高 | (1) .env/.key文件黑名单<br>(2) 敏感字段过滤<br>(3) 审计日志 |
| 搜索权限绕过 | 低 | 高 | (1) 双重验证（API + MeiliSearch filter）<br>(2) 单元测试覆盖权限逻辑 |

---

## 12. 附录

### 12.1 可索引文件类型清单

```typescript
const INDEXABLE_EXTENSIONS = [
  // 编程语言
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',  // JavaScript/TypeScript
  '.py', '.pyi',                                  // Python
  '.java', '.kt', '.kts',                         // Java/Kotlin
  '.go',                                          // Go
  '.rs',                                          // Rust
  '.cpp', '.cc', '.cxx', '.hpp', '.h',           // C++
  '.c', '.h',                                     // C
  '.cs',                                          // C#
  '.rb',                                          // Ruby
  '.php',                                         // PHP
  '.swift',                                       // Swift

  // 配置文件
  '.json', '.yaml', '.yml', '.toml', '.ini',
  '.xml', '.properties',

  // 标记语言
  '.md', '.markdown', '.html', '.htm',

  // 脚本
  '.sh', '.bash', '.zsh', '.fish',

  // SQL
  '.sql',
];

const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,
  /\.env$/,
  /\.key$/,
  /\.pem$/,
];
```

### 12.2 MeiliSearch vs Elasticsearch决策矩阵

| 维度 | MeiliSearch | Elasticsearch | 推荐场景 |
|------|-------------|---------------|----------|
| 索引速度 | 7x更快 (基准测试) | 中等 | 频繁代码更新 → MeiliSearch |
| 查询延迟 | 10-30ms | 10-30ms | 性能相当 |
| 内存占用 | 290MB (1万文档) | 1.3GB (1万文档) | 资源有限 → MeiliSearch |
| 分布式能力 | ❌ 单节点 | ✅ 集群 | 大规模 → Elasticsearch |
| 运维复杂度 | 低 (Docker单容器) | 高 (JVM调优、集群管理) | 小团队 → MeiliSearch |
| 生态成熟度 | 中 (2018年项目) | 高 (2010年项目) | 企业级 → Elasticsearch |
| 成本 | $10-20/月 | $100-500/月 | 预算有限 → MeiliSearch |

**决策建议**:
- **MVP阶段**: MeiliSearch（快速迭代、低成本）
- **企业版本**: Elasticsearch（>1000���库、需分布式）

---

**文档状态**: ✅ **已完成**
**下一步**: 开始Week 1 Day 1-2实施（环境搭建）
