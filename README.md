<p align="center">
  <img src="https://img.shields.io/badge/Flotilla-代码托管平台-blue?style=for-the-badge&logo=git&logoColor=white" alt="Flotilla" />
</p>

<h1 align="center">Flotilla</h1>

<p align="center">
  <strong>We don't just host code. We build consensus.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status"></a>
  <a href="#测试覆盖"><img src="https://img.shields.io/badge/tests-1207%20passed-brightgreen.svg" alt="Tests"></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-85%25-green.svg" alt="Coverage"></a>
  <br/>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-11-E0234E.svg?logo=nestjs&logoColor=white" alt="NestJS"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15.5-000000.svg?logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white" alt="PostgreSQL"></a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="http://localhost:4000/api/docs">API 文档</a> •
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

---

## 为什么选择 Flotilla？

Flotilla 是一个**企业级自托管代码协作平台**，类似 GitHub/GitLab，但具有独特的**分布式共识**能力。

<table>
<tr>
<td>

### 🎯 核心优势

| 特性              | 说明                                         |
| ----------------- | -------------------------------------------- |
| **分布式一致性**  | 基于 Raft 共识算法，集群节点间状态强一致     |
| **完整 Git 支持** | Git HTTP Smart Protocol，兼容所有 Git 客户端 |
| **企业级权限**    | 组织 → 团队 → 项目三层 RBAC 权限体系         |
| **实时协作**      | WebSocket + CRDT 多人实时编辑                |
| **合规就绪**      | 审计日志、GDPR 数据导出、2FA 认证            |

</td>
<td>

### 📊 与同类对比

| 对比项     | GitHub | Gitea | **Flotilla** |
| ---------- | ------ | ----- | ------------ |
| 自托管     | ❌     | ✅    | ✅           |
| 分布式共识 | ❌     | ❌    | ✅           |
| 多租户权限 | ✅     | 部分  | ✅           |
| 实时协作   | ❌     | ❌    | ✅           |
| 轻量级     | ❌     | ✅    | ✅           |

</td>
</tr>
</table>

---

## 功能特性

<table>
<tr>
<td width="50%">

### 🔐 认证与安全

- JWT 无状态认证
- 双因素认证 (TOTP + 恢复码)
- OAuth 2.0 (GitHub/Google)
- API Token 管理 (作用域控制)
- 会话设备追踪与异地登录检测
- 密码历史检查 (防止重复使用)

### 📁 代码管理

- Git HTTP Smart Protocol (clone/push/fetch)
- 多分支/Tag 管理
- 代码全文搜索 (MeiliSearch)
- 文件版本历史与 Diff 对比
- 在线代码编辑器 (Monaco)
- 语法高亮 (50+ 语言)

### 🔄 协作工具

- Issue 追踪 (标签/里程碑/分配人)
- Pull Request 代码审查
- 行级评论与讨论
- 三种合并策略 (Merge/Squash/Rebase)
- 分支保护规则
- Wiki 文档系统
- 实时协作编辑 (CRDT)

</td>
<td width="50%">

### 🚀 DevOps 集成

- CI/CD Pipeline (YAML 配置)
- Webhook 推送 (HMAC 签名验证)
- 通知系统 (站内 + 邮件)
- 构建状态检查

### 🏢 组织管理

- 多租户架构
- 组织 → 团队 → 项目层级
- RBAC 角色 (Owner/Admin/Member/Viewer)
- 资源配额管理
- 成员邀请与审批

### 🛡️ 合规与审计

- 完整审计日志 (IP/User-Agent)
- GDPR 数据导出
- CSRF 防护
- 分层限流 (全局/严格/上传)

### 🌐 分布式特性

- Raft 共识算法
- Leader 选举与故障转移
- 日志复制与强一致性
- 集群状态实时可视化

</td>
</tr>
</table>

---

## 快速开始

### 环境要求

| 依赖           | 版本     |
| -------------- | -------- |
| Node.js        | ≥ 20.0.0 |
| pnpm           | ≥ 10.0.0 |
| Docker         | ≥ 20.0.0 |
| Docker Compose | ≥ 2.0.0  |

### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/CPU-JIA/Flotilla.git
cd Flotilla

# 2. 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env 文件，配置数据库密钥等

# 3. 一键启动所有服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost:3000
# API:  http://localhost:4000
```

### 方式二：本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施
docker-compose up -d postgres redis minio meilisearch

# 3. 数据库迁移
cd apps/backend && pnpm prisma migrate dev

# 4. 启动开发服务器
cd .. && pnpm dev
```

### 服务端口

| 服务        | 端口      | 说明             |
| ----------- | --------- | ---------------- |
| Frontend    | 3000      | Next.js Web 应用 |
| Backend     | 4000      | NestJS REST API  |
| Website     | 3003      | 官方网站         |
| PostgreSQL  | 5434      | 主数据库         |
| Redis       | 6380      | 缓存/会话/队列   |
| MinIO       | 9000/9001 | 对象存储         |
| MeiliSearch | 7700      | 全文搜索         |

---

## 技术架构

```
┌────────────────────────────────────────────────────────────────────┐
│                            Frontend                                 │
│                  Next.js 15.5 + React 19 + Tailwind                │
├────────────────────────────────────────────────────────────────────┤
│                             Backend                                 │
│                       NestJS 11 (Modular)                          │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────────┐ │
│  │  Auth   │   Git   │ Issues  │   PR    │  Raft   │ Notification│ │
│  │ Module  │ Module  │ Module  │ Module  │ Cluster │   Module    │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────────┘ │
├───────────┬───────────┬───────────┬───────────┬────────────────────┤
│ PostgreSQL│   Redis   │   MinIO   │MeiliSearch│     WebSocket      │
│     16    │     7     │  S3 API   │  Search   │     Real-time      │
└───────────┴───────────┴───────────┴───────────┴────────────────────┘
```

### Raft 共识集群

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node 1    │◄───►│   Node 2    │◄───►│   Node 3    │
│  (Leader)   │     │ (Follower)  │     │ (Follower)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                    Raft Consensus
              (日志复制 + Leader 选举)
```

<details>
<summary><b>📦 完整技术栈</b></summary>

| 分类         | 技术                                      |
| ------------ | ----------------------------------------- |
| **前端框架** | Next.js 15.5 (App Router), React 19       |
| **UI 组件**  | Shadcn/ui (80%), Mantine (20%)            |
| **样式**     | Tailwind CSS, CSS Modules                 |
| **状态管理** | TanStack Query, React Context             |
| **表单**     | React Hook Form, Zod                      |
| **后端框架** | NestJS 11 (Modular Architecture)          |
| **ORM**      | Prisma 6                                  |
| **认证**     | Passport.js (JWT/OAuth), Speakeasy (TOTP) |
| **数据库**   | PostgreSQL 16                             |
| **缓存**     | Redis 7 (IORedis)                         |
| **队列**     | Bull (Redis-based)                        |
| **对象存储** | MinIO (S3 兼容)                           |
| **搜索引擎** | MeiliSearch                               |
| **邮件**     | Nodemailer + Handlebars                   |
| **实时通信** | Socket.IO                                 |
| **测试**     | Jest, Supertest, Playwright               |
| **容器**     | Docker, Docker Compose                    |

</details>

---

## 项目结构

```
Flotilla/
├── apps/
│   ├── backend/                 # NestJS API 服务 (Port 4000)
│   │   ├── src/
│   │   │   ├── auth/            # 认证模块 (JWT/OAuth/2FA)
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
│   │   │   ├── collaboration/   # 实时协作 (CRDT)
│   │   │   ├── notifications/   # 通知系统
│   │   │   ├── search/          # 代码搜索
│   │   │   ├── raft/            # Raft 核心算法
│   │   │   ├── raft-cluster/    # Raft 集群管理
│   │   │   ├── audit/           # 审计日志
│   │   │   ├── gdpr/            # GDPR 合规
│   │   │   └── ...              # 其他模块
│   │   ├── prisma/              # 数据库 Schema
│   │   └── test/                # 测试文件
│   │       ├── concurrency/     # 并发测试
│   │       ├── performance/     # 性能测试
│   │       └── security/        # 安全审计测试
│   ├── frontend/                # Next.js 应用 (Port 3000)
│   │   ├── src/
│   │   │   ├── app/             # App Router 页面 (70+)
│   │   │   ├── components/      # React 组件 (80+)
│   │   │   ├── hooks/           # 自定义 Hooks
│   │   │   ├── contexts/        # React Context
│   │   │   └── lib/             # 工具函数
│   │   └── tests/               # E2E 测试 (30+)
│   └── website/                 # 官网 (Port 3003)
├── docs/                        # 项目文档
│   ├── 架构设计文档.md
│   ├── 接口设计文档.md
│   ├── 数据库设计文档.md
│   ├── Raft算法技术实现文档.md
│   └── ...
└── docker-compose.yml           # Docker 编排
```

---

## 开发指南

### 常用命令

```bash
# 开发
pnpm dev                    # 启动所有应用 (前端 + 后端)
pnpm build                  # 构建所有应用

# 测试
pnpm test                   # 运行所有测试
cd apps/backend && pnpm test              # 后端单元测试
cd apps/backend && pnpm test:cov          # 覆盖率报告
cd apps/frontend && pnpm test             # 前端 E2E 测试

# 代码质量
pnpm lint                   # ESLint 检查
pnpm format                 # Prettier 格式化

# 数据库
cd apps/backend
pnpm prisma migrate dev     # 运行迁移
pnpm prisma studio          # 数据库 GUI
pnpm prisma generate        # 重新生成 Client
```

### Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature

# 2. 开发并测试
pnpm test

# 3. 提交 (遵循 Conventional Commits)
git commit -m "feat: add amazing feature"
git commit -m "fix: resolve login issue"
git commit -m "docs: update README"

# 4. 推送并创建 PR
git push origin feature/your-feature
```

---

## 测试覆盖

| 指标           | 数值           | 状态        |
| -------------- | -------------- | ----------- |
| 后端测试套件   | 63             | ✅ 全部通过 |
| 后端测试用例   | 1,207          | ✅ 全部通过 |
| 代码覆盖率     | 85%+           | ✅          |
| Git Auth Guard | 95.05%         | ✅          |
| 并发测试       | 10/50/100 并发 | ✅ 通过     |
| 安全审计测试   | 4 场景         | ✅ 通过     |

### 性能指标

| 指标                | 目标    | 实测 |
| ------------------- | ------- | ---- |
| API 响应时间 (P95)  | < 100ms | ✅   |
| 前端首屏加载 (LCP)  | < 1.5s  | ✅   |
| 数据库查询 (平均)   | < 50ms  | ✅   |
| 100 并发 Issue 创建 | < 10s   | ✅   |
| WebSocket 延迟      | < 50ms  | ✅   |

---

## 文档资源

| 文档                                        | 说明             |
| ------------------------------------------- | ---------------- |
| [开发指南](./DEVELOPMENT_GUIDE.md)          | 本地开发环境配置 |
| [Docker 部署](./DOCKER_QUICKSTART.md)       | 生产环境部署指南 |
| [Git HTTP 指南](./GIT_HTTP_GUIDE.md)        | Git 协议使用说明 |
| [API 文档](http://localhost:4000/api/docs)  | Swagger 在线文档 |
| [架构设计](./docs/架构设计文档.md)          | 系统架构详解     |
| [数据库设计](./docs/数据库设计文档.md)      | 数据模型说明     |
| [Raft 实现](./docs/Raft算法技术实现文档.md) | 共识算法实现细节 |
| [测试报告](./docs/软件测试报告.md)          | 完整测试报告     |

---

## 参与贡献

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. **创建**功能分支 (`git checkout -b feature/AmazingFeature`)
3. **提交**更改 (`git commit -m 'feat: Add AmazingFeature'`)
4. **推送**到分支 (`git push origin feature/AmazingFeature`)
5. **创建** Pull Request

### 开发规范

- ✅ TypeScript 严格模式
- ✅ 代码覆盖率 ≥ 70%
- ✅ 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- ✅ 所有 API 必须有 Swagger 文档
- ✅ PR 必须通过 CI 检查
- ✅ 新功能必须包含测试用例

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 社区与支持

- 📖 [GitHub Discussions](https://github.com/CPU-JIA/Flotilla/discussions) - 问题讨论
- 🐛 [GitHub Issues](https://github.com/CPU-JIA/Flotilla/issues) - Bug 报告与功能请求
- 📧 Email: support@flotilla.dev

---

## 许可证

本项目采用 [MIT License](./LICENSE) 开源协议。

---

<p align="center">
  <b>Flotilla</b> - 构建共识，托管未来
  <br/>
  <sub>Built with ❤️ by the Flotilla Team</sub>
</p>
