# Flotilla | 基于云计算的开发协作平台

> **We don't just host code. We build consensus.** | **我们不只是托管代码，我们构建共识。**

一个现代化的代码托管和协作平台，采用前后端分离架构，实现分布式共识算法（简化版Raft）。

📖 **[Read our Brand Story / 阅读品牌故事](./docs/品牌故事.md)**

## 🚀 技术栈

### 前端
- **Next.js 15.5** - React 框架（SSR/SSG）
- **React 19** - UI库
- **TypeScript 5.7** - 类型系统
- **Tailwind CSS 4** - CSS框架
- **Shadcn/ui** - 组件库
- **Zustand 5** - 状态管理
- **TanStack Query 5** - 数据获取

### 后端
- **NestJS 11** - Node.js 框架
- **Prisma 6** - ORM
- **PostgreSQL 16** - 主数据库
- **Redis 7** - 缓存/会话
- **MinIO** - 对象存储

### 分布式算法
- **Raft 共识算法**（简化版）

## 📁 项目结构

```
Cloud-Dev-Platform/
├── apps/
│   ├── backend/          # NestJS 后端服务
│   └── frontend/         # Next.js 前端应用
├── packages/             # 共享包
│   ├── shared/           # 共享类型和工具
│   └── ui/               # 共享UI组件
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

详细的 Docker 使用说明请查看 [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker & Docker Compose

### 快速开始

1. **克隆仓库**
```bash
git clone https://github.com/CPU-JIA/Cloud-Dev-Platform.git
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
docker exec -it cloud-dev-postgres psql -U devplatform -d cloud_dev_platform

# 备份数据库
docker exec cloud-dev-postgres pg_dump -U devplatform cloud_dev_platform > backup.sql

# 恢复数据库
docker exec -i cloud-dev-postgres psql -U devplatform cloud_dev_platform < backup.sql
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

- [品牌故事](./docs/品牌故事.md) - 了解我们的愿景和技术哲学
- [需求分析文档](./docs/需求分析文档.md)
- [架构设计文档](./docs/架构设计文档.md)
- [数据库设计文档](./docs/数据库设计文档.md)
- [分布式共识算法设计方案](./docs/分布式共识算法设计方案.md)
- [UI设计与实现文档](./docs/UI设计与实现文档.md)

## 🤝 贡献

欢迎贡献！请阅读 [贡献指南](CONTRIBUTING.md)（待创建）。

## 📄 许可证

MIT License

## 👤 作者

**JIA**

---

**Status**: 🚧 开发中
**Version**: v1.0.0-MVP
**Last Updated**: 2025-10-19
