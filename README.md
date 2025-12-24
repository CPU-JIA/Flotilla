# Flotilla

基于云计算的代码托管与协作平台，实现分布式共识算法（Raft）。

## 技术栈

### 前端
- **框架**: Next.js 15.5 (App Router) + React 19
- **UI 组件**: Shadcn/ui + Mantine
- **状态管理**: TanStack Query + React Context
- **表单验证**: React Hook Form + Zod
- **样式**: Tailwind CSS + CSS Modules
- **实时通信**: Socket.IO Client
- **测试**: Playwright E2E

### 后端
- **框架**: NestJS 11 (Modular Architecture)
- **数据库**: Prisma 6 ORM + PostgreSQL 16
- **认证**: Passport.js (JWT/OAuth) + Speakeasy (TOTP)
- **缓存**: Redis 7 (IORedis)
- **对象存储**: MinIO (S3-compatible)
- **全文搜索**: MeiliSearch
- **邮件**: Nodemailer + Handlebars Templates
- **队列**: Bull (Redis-based, 用于异步任务)
- **测试**: Jest + Supertest

### 基础设施
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **对象存储**: MinIO
- **搜索引擎**: MeiliSearch 1.7+
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (生产环境)

### 安全特性
- **密码哈希**: Argon2
- **Token 加密**: AES-256-GCM
- **HMAC 签名**: SHA-256
- **CSRF 防护**: Double Submit Cookie
- **Rate Limiting**: @nestjs/throttler

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

### 🔐 认证与安全
- ✅ **JWT 认证** - 基于 Token 的无状态认证
- ✅ **双因素认证（2FA）** - TOTP 时间码 + 恢复码
- ✅ **OAuth 单点登录** - GitHub/Google OAuth 2.0
- ✅ **API 令牌** - Personal Access Token（作用域控制）
- ✅ **密码安全** - Argon2 哈希 + 历史密码检查
- ✅ **会话管理** - 设备跟踪、异地登录检测

### 📁 代码管理
- ✅ **Git HTTP Protocol** - 支持 clone/push/fetch
- ✅ **仓库管理** - 多分支、Tag、Commit 浏览
- ✅ **代码搜索** - MeiliSearch 全文检索
- ✅ **文件存储** - MinIO 对象存储（S3 兼容）

### 🔄 协作工具
- ✅ **Issue 追踪** - 标签、里程碑、分配人
- ✅ **Pull Request** - 代码审查、评论、合并策略
- ✅ **分支保护** - PR 审核要求、状态检查
- ✅ **实时协作** - WebSocket 多人编辑（CRDT）
- ✅ **Wiki 文档** - Markdown 文档系统

### 🚀 CI/CD 与集成
- ✅ **Pipeline 流水线** - YAML 配置、多阶段构建
- ✅ **Webhook 推送** - HMAC 签名验证
- ✅ **通知系统** - 站内通知 + 邮件提醒

### 🏢 组织管理
- ✅ **多租户架构** - 组织 → 团队 → 项目
- ✅ **权限体系** - RBAC 角色控制（Owner/Admin/Member/Viewer）
- ✅ **资源配额** - 存储、成员数量限制

### 🛡️ 合规与审计
- ✅ **GDPR 数据导出** - 用户数据可导出
- ✅ **审计日志** - 所有敏感操作记录（IP/User-Agent）
- ✅ **CSRF 保护** - Double Submit Cookie
- ✅ **Rate Limiting** - 分层限流（全局/严格/上传）

### 🌐 分布式特性
- ✅ **Raft 共识算法** - 分布式状态复制
- ✅ **集群管理** - Leader 选举、日志复制
- ✅ **性能监控** - Prometheus 指标、实时仪表盘

## 项目结构

```
Flotilla/
├── apps/
│   ├── backend/          # NestJS API Server (Port 4000)
│   │   ├── src/
│   │   │   ├── auth/            # 认证模块（JWT/OAuth/2FA）
│   │   │   ├── users/           # 用户管理
│   │   │   ├── organizations/   # 组织管理
│   │   │   ├── teams/           # 团队管理
│   │   │   ├── projects/        # 项目管理
│   │   │   ├── repositories/    # 仓库管理
│   │   │   ├── git/             # Git HTTP Protocol
│   │   │   ├── issues/          # Issue 追踪
│   │   │   ├── pull-requests/   # PR 系统
│   │   │   ├── pipelines/       # CI/CD 流水线
│   │   │   ├── webhooks/        # Webhook 推送
│   │   │   ├── wiki/            # Wiki 文档
│   │   │   ├── collaboration/   # 实时协作
│   │   │   ├── notifications/   # 通知系统
│   │   │   ├── search/          # 代码搜索
│   │   │   ├── raft-cluster/    # Raft 共识
│   │   │   ├── gdpr/            # GDPR 合规
│   │   │   ├── audit/           # 审计日志
│   │   │   └── newsletter/      # Newsletter 订阅
│   │   └── prisma/schema.prisma # 数据库模型
│   ├── frontend/         # Next.js Web App (Port 3000)
│   │   ├── app/                 # App Router 路由
│   │   ├── components/          # React 组件
│   │   ├── hooks/               # 自定义 Hooks
│   │   └── contexts/            # React Context
│   └── website/          # 官方网站 (Port 3003)
└── docs/                 # 项目文档
```

## 后端模块清单

| 模块 | 功能描述 | 状态 |
|------|----------|------|
| **auth** | JWT 认证、OAuth、2FA | ✅ 完成 |
| **users** | 用户管理、会话跟踪 | ✅ 完成 |
| **organizations** | 组织管理、成员权限 | ✅ 完成 |
| **teams** | 团队管理、项目授权 | ✅ 完成 |
| **projects** | 项目 CRUD、权限控制 | ✅ 完成 |
| **repositories** | 仓库管理、分支操作 | ✅ 完成 |
| **git** | Git HTTP Smart Protocol | ✅ 完成 |
| **issues** | Issue 追踪、标签系统 | ✅ 完成 |
| **pull-requests** | PR 审查、合并策略 | ✅ 完成 |
| **pipelines** | CI/CD 流水线执行 | ✅ 完成 |
| **webhooks** | Webhook 推送、签名验证 | ✅ 完成 |
| **wiki** | Wiki 文档系统 | ✅ 完成 |
| **collaboration** | 实时协作编辑（CRDT） | ✅ 完成 |
| **notifications** | 通知推送（WebSocket/邮件） | ✅ 完成 |
| **search** | MeiliSearch 全文检索 | ✅ 完成 |
| **raft-cluster** | Raft 共识算法 | ✅ 完成 |
| **gdpr** | GDPR 数据导出 | ✅ 完成 |
| **audit** | 审计日志（SOC2/ISO27001） | ✅ 完成 |
| **newsletter** | Newsletter 订阅（双重确认） | ✅ 完成 |
| **files** | 文件上传（MinIO） | ✅ 完成 |
| **email** | 邮件服务（Nodemailer） | ✅ 完成 |
| **redis** | Redis 缓存 | ✅ 完成 |
| **monitoring** | 性能监控 | ✅ 完成 |
| **admin** | 管理员功能 | ✅ 完成 |

## 前端页面清单

### 认证与账户
- ✅ `/auth/login` - 登录（支持 OAuth）
- ✅ `/auth/register` - 注册
- ✅ `/auth/2fa-verify` - 2FA 验证
- ✅ `/settings/profile` - 个人资料
- ✅ `/settings/2fa` - 2FA 设置
- ✅ `/settings/accounts` - OAuth 账户管理
- ✅ `/settings/tokens` - API Token 管理
- ✅ `/settings/privacy` - GDPR 数据导出

### 项目管理
- ✅ `/projects` - 项目列表
- ✅ `/projects/[id]` - 项目详情
- ✅ `/projects/[id]/issues` - Issue 列表
- ✅ `/projects/[id]/issues/[number]` - Issue 详情
- ✅ `/projects/[id]/pull-requests` - PR 列表
- ✅ `/projects/[id]/pull-requests/[number]` - PR 详情
- ✅ `/projects/[id]/wiki` - Wiki 文档
- ✅ `/projects/[id]/pipelines` - CI/CD 流水线
- ✅ `/projects/[id]/settings/webhooks` - Webhook 配置

### 组织与团队
- ✅ `/organizations` - 组织列表
- ✅ `/organizations/[id]` - 组织详情
- ✅ `/organizations/[id]/teams` - 团队管理

## 环境配置

### 必需环境变量

```bash
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5434/flotilla"

# JWT 密钥（使用 openssl rand -base64 32 生成）
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# 双因素认证加密密钥（使用 openssl rand -base64 32 生成）
TWO_FACTOR_ENCRYPTION_KEY="your-2fa-encryption-key"

# Webhook 签名密钥（使用 openssl rand -hex 32 生成）
WEBHOOK_SECRET="your-webhook-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:4000/auth/github/callback"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Redis 配置
REDIS_HOST="localhost"
REDIS_PORT="6380"

# MinIO 配置
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"

# MeiliSearch 配置
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="masterKey"

# 邮件配置（用于 Newsletter）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@flotilla.dev"
```

详见 `apps/backend/.env.example` 查看完整配置。

## 文档

- 📖 [开发指南](./DEVELOPMENT_GUIDE.md) - 详细的开发流程和最佳实践
- 🐳 [Docker 部署](./DOCKER_QUICKSTART.md) - Docker 快速启动指南
- 🔧 [Git HTTP 使用](./GIT_HTTP_GUIDE.md) - Git 协议配置和使用
- 📚 [API 文档](http://localhost:4000/api/docs) - Swagger API 在线文档
- 🔐 [安全最佳实践](./docs/SECURITY.md) - 安全配置指南（TODO）
- 📊 [架构设计](./docs/ARCHITECTURE.md) - 系统架构详解（TODO）

## 开发工作流

### 1️⃣ 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

### 2️⃣ 开发和测试
```bash
# 后端单元测试
cd apps/backend && pnpm test

# 前端 E2E 测试
cd apps/frontend && pnpm test

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

### 3️⃣ 提交代码（遵循 Conventional Commits）
```bash
git commit -m "feat: add OAuth login support"
git commit -m "fix: resolve JWT token expiration issue"
git commit -m "docs: update API documentation"
```

### 4️⃣ 推送并创建 PR
```bash
git push origin feature/your-feature-name
# 在 GitHub/Flotilla 平台创建 Pull Request
```

## 性能指标

- **API 响应时间**: < 100ms (P95)
- **前端首屏加载**: < 1.5s (LCP)
- **数据库查询**: < 50ms (平均)
- **WebSocket 延迟**: < 50ms
- **代码搜索**: < 500ms

## 贡献指南

我们欢迎所有形式的贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 开发准则
- ✅ 遵循 TypeScript 严格模式
- ✅ 代码覆盖率 ≥ 70%
- ✅ 所有 API 必须有 Swagger 文档
- ✅ 遵循 Conventional Commits 规范
- ✅ PR 必须通过所有 CI 检查
- ✅ 新功能必须包含测试用例

## 品牌使命

**"We don't just host code. We build consensus."**

Flotilla 不仅是一个代码托管平台，更是一个通过分布式共识算法（Raft）实现高可用、强一致性的协作系统。

## License

MIT License - 查看 [LICENSE](./LICENSE) 了解详情。

## 致谢

感谢所有为 Flotilla 做出贡献的开发者！

---

**💬 需要帮助？** 加入我们的 [Discord 社区](https://discord.gg/flotilla) 或提交 [Issue](https://github.com/your-org/flotilla/issues)。
