# Flotilla

基于云计算的代码托管与协作平台，实现分布式共识算法（Raft）。

## 技术栈

| 前端 | 后端 | 基础设施 |
|------|------|----------|
| Next.js 15 | NestJS 11 | PostgreSQL 16 |
| React 19 | Prisma 6 | Redis 7 |
| TypeScript | JWT Auth | MinIO |
| Tailwind CSS | Raft 共识 | MeiliSearch |

## 快速开始

### Docker 启动（推荐）

```bash
# 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env 配置数据库密钥等

# 启动所有服务
docker-compose up -d
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动基础设施
docker-compose up -d postgres redis minio meilisearch

# 数据库迁移
cd apps/backend && pnpm prisma migrate dev

# 启动开发服务器
pnpm dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:4000 |
| API 文档 | http://localhost:4000/api/docs |
| MinIO | http://localhost:9001 |

## 核心功能

- **Git HTTP Protocol** - 支持 clone/push/fetch
- **Issue & PR** - 完整的代码审查流程
- **代码搜索** - MeiliSearch 全文检索
- **Raft 共识** - 分布式状态复制
- **组织权限** - 多层级权限体系

## 项目结构

```
Flotilla/
├── apps/backend/     # NestJS API
├── apps/frontend/    # Next.js Web
├── website/          # 官网
└── docs/             # 文档
```

## 文档

- [开发指南](./DEVELOPMENT_GUIDE.md)
- [Git HTTP 使用](./GIT_HTTP_GUIDE.md)
- [Docker 部署](./DOCKER_QUICKSTART.md)
- [API 文档](http://localhost:4000/api/docs)

## License

MIT
