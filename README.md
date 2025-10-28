# Flotilla | 基于云计算的开发协作平台

> **We don't just host code. We build consensus.** | **我们不只是托管代码，我们构建共识。**

一个现代化的代码托管和协作平台，采用前后端分离架构，实现分布式共识算法（简化版Raft）。

## ✨ 项目亮点

![Phase 1](https://img.shields.io/badge/Phase%201-100%25%20Complete-success)
![API Endpoints](https://img.shields.io/badge/API%20Endpoints-166-blue)
![Frontend Pages](https://img.shields.io/badge/Frontend%20Pages-36-blue)
![Test Lines](https://img.shields.io/badge/Test%20Lines-12,534-green)
![Tech Stack](https://img.shields.io/badge/Tech%20Stack-Next.js%2015%20%7C%20NestJS%2011%20%7C%20Raft-orange)

📖 **[阅读品牌故事 (中文)](./docs/品牌故事_ZH.md)** | **[Read Brand Story (EN)](./docs/BRAND_STORY_EN.md)**

## 🚀 技术栈

### 前端
- **Next.js 15.5** - React 框架（SSR/SSG）
- **React 19** - UI库
- **TypeScript 5.7** - 类型系统
- **Tailwind CSS 4** - CSS框架
- **Shadcn/ui** - 组件库（Radix UI 基础，80% 使用率）
- **Mantine 7.15** - 企业级组件（20% 使用率）
- **Monaco Editor** - 代码编辑器
- **TanStack Query 5** - 服务端状态管理（Raft 监控）
- **React Flow** - 交互式节点图（Raft 集群拓扑可视化）
- **Recharts** - 数据可视化（性能指标图表）
- **Zustand 5** - 客户端状态管理（已安装但暂未使用）

### 后端
- **NestJS 11** - Node.js 框架
- **Prisma 6** - ORM
- **PostgreSQL 16** - 主数据库
- **Redis 7** - 缓存/会话
- **MinIO** - 对象存储（S3 兼容）
- **MeiliSearch 1.10** - 全文搜索引擎（代码搜索）

### 分布式算法
- **Raft 共识算法**（简化版）

## 🎯 核心功能

### ✅ 已实现功能（Phase 1 Complete）

- **Issue 追踪系统** - 完整的 Issue CRUD、Labels、Milestones、Comments、Events 时间线
- **Pull Request 系统** - PR 创建、代码审查（APPROVED/CHANGES_REQUESTED）、行级评论、合并策略（MERGE/SQUASH/REBASE）
- **Git HTTP Smart Protocol** - 完整的 Git 协议支持（info/refs, upload-pack, receive-pack），11 个 API 端点
- **代码搜索引擎** - 基于 MeiliSearch 的全文搜索，支持多语言符号提取（TypeScript/JavaScript/Python/Java）
- **通知系统** - WebSocket 实时通知 + 邮件通知，支持自定义通知偏好
- **分支保护** - 保护规则配置，PR 审批要求，合并状态验证
- **组织与团队权限** - 分层权限体系（Organization → Team → Project），精细化权限控制
- **Raft 共识算法** - 分布式共识实现，包含实时监控 UI（集群拓扑可视化）
- **文件管理** - MinIO 对象存储集成，文件上传/下载
- **用户认证** - JWT 认证，Refresh Token，Bootstrap Admin 机制

### 🚀 特色亮点

- **166 个 API 端点** - 完整的 RESTful API，Swagger 文档自动生成
- **36 个前端页面** - 响应式设计，暗黑模式支持
- **12,534 行测试代码** - 高测试覆盖率（单元测试 + E2E 测试）
- **生产就绪** - Docker 一键部署，数据库迁移脚本，健康检查

## 📁 项目结构

```
Cloud-Dev-Platform/
├── apps/
│   ├── backend/          # NestJS 后端服务
│   └── frontend/         # Next.js 前端应用
├── website/              # Next.js 官网（独立项目）
├── packages/             # 共享包（保留用于未来扩展）
├── docs/                 # 文档
├── scripts/              # 脚本
├── docker-compose.yml    # Docker 编排
├── pnpm-workspace.yaml   # pnpm workspace 配置
└── package.json          # 根 package.json
```

## 🐳 Docker 一键启动（推荐）

**最快的启动方式！** 使用 Docker Compose 一键启动所有服务：

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 一键启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

**访问地址：**
- 前端应用：http://localhost:3000
- 官方网站：http://localhost:3003
- 后端 API：http://localhost:4000/api
- Swagger 文档：http://localhost:4000/api/docs
- MinIO 控制台：http://localhost:9001 (minioadmin / minioadmin123)
- MeiliSearch：http://localhost:7700 (代码搜索引擎)

详细的 Docker 使用说明请查看 [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker & Docker Compose

### 快速开始

1. **克隆仓库**
```bash
git clone https://github.com/CPU-JIA/Flotilla.git
cd Cloud-Dev-Platform
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，修改必要的配置
```

4. **启动基础设施**
```bash
# 启动 PostgreSQL + Redis + MinIO
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

5. **运行数据库迁移**
```bash
cd apps/backend
pnpm prisma migrate dev
```

6. **启动开发服务器**
```bash
# 在根目录同时启动前端和后端
pnpm dev

# 或者分别启动
pnpm --filter backend dev
pnpm --filter frontend dev
```

### 访问地址

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:4000
- **API 文档**: http://localhost:4000/api/docs
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **MeiliSearch**: http://localhost:7700 (代码搜索引擎)

## 📝 可用脚本

```bash
# 开发模式（前后端同时启动）
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

## 🔧 Docker Compose 命令

```bash
# 启动所有服务
docker-compose up -d

# 启动包含从库的所有服务
docker-compose --profile replica up -d

# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 查看日志
docker-compose logs -f [service-name]

# 重启某个服务
docker-compose restart [service-name]
```

## 📊 数据库管理

```bash
# 进入 PostgreSQL
docker exec -it flotilla-postgres psql -U devplatform -d cloud_dev_platform

# 备份数据库
docker exec flotilla-postgres pg_dump -U devplatform cloud_dev_platform > backup.sql

# 恢复数据库
docker exec -i flotilla-postgres psql -U devplatform cloud_dev_platform < backup.sql
```

## 🧪 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:cov
```

## 📖 文档

详细文档请参考 `/docs` 目录：

- [品牌故事 (中文)](./docs/品牌故事_ZH.md) / [Brand Story (EN)](./docs/BRAND_STORY_EN.md) - 了解我们的愿景和技术哲学
- [需求分析文档](./docs/需求分析文档.md)
- [架构设计文档](./docs/架构设计文档.md)
- [数据库设计文档](./docs/数据库设计文档.md)
- [分布式共识算法设计方案](./docs/分布式共识算法设计方案.md)
- [UI设计与实现文档](./docs/UI设计与实现文档.md)

## 🗺️ 开发路线图

查看完整的开发计划和里程碑：

- **[2025 战略路线图](./docs/ROADMAP_2025.md)** - 24个月开发计划（Phase 1-6）
  - ✅ **Phase 1 (100% Complete)** - 基础功能（Issue、PR、Git HTTP、Code Search、Notification）
  - 🚧 **Phase 2 (规划中)** - Raft-Native Git Storage（Git 对象通过 Raft 共识复制）
  - 📅 **Phase 3-6** - 多区域部署、高可用性、企业级功能

## 🤝 贡献

欢迎贡献！请阅读 [贡献指南](CONTRIBUTING.md)（待创建）。

## 📄 许可证

MIT License

## 👤 作者

**JIA**

---

**Status**: ✅ Phase 1 - Foundation (100% Complete)
**Version**: v1.0.0-MVP
**Statistics**: 166 API Endpoints | 36 Frontend Pages | 12,534 Lines Test Code
**Last Updated**: 2025-10-28
