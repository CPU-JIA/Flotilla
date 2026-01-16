# Flotilla

> **"We don't just host code. We build consensus."**

基于云计算的代码托管与协作平台，实现分布式共识算法（Raft）。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-1207%20passed-brightgreen.svg)](#测试覆盖)

---

## 项目简介

Flotilla 是一个企业级代码托管平台，类似 GitHub/GitLab，但具有独特的分布式共识特性。通过 Raft 算法实现集群节点间的状态一致性，确保高可用和数据安全。

### 核心亮点

- **Git HTTP Smart Protocol** - 完整支持 clone/push/fetch
- **Raft 共识算法** - Leader 选举、日志复制、故障恢复
- **多租户架构** - 组织 → 团队 → 项目三层权限体系
- **实时协作** - WebSocket + CRDT 多人编辑
- **企业级安全** - 2FA、OAuth、审计日志、GDPR 合规

---

## 快速开始

### 环境要求

- Node.js ≥ 20.0.0
- pnpm ≥ 10.0.0
- Docker & Docker Compose

### 一键启动

```bash
# 克隆项目
git clone https://github.com/CPU-JIA/Flotilla.git
cd Flotilla

# 配置环境变量
cp apps/backend/.env.example apps/backend/.env

# 启动所有服务
docker-compose up -d

# 安装依赖并启动开发服务器
pnpm install
pnpm dev
```

### 访问地址

| 服务         | 地址                           |
| ------------ | ------------------------------ |
| 前端应用     | http://localhost:3000          |
| 后端 API     | http://localhost:4000          |
| API 文档     | http://localhost:4000/api/docs |
| MinIO 控制台 | http://localhost:9001          |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│              Next.js 15.5 + React 19 + Tailwind             │
├─────────────────────────────────────────────────────────────┤
│                        Backend                               │
│                    NestJS 11 (Modular)                      │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ PostgreSQL│  Redis   │  MinIO   │MeiliSearch│  Raft Cluster │
│    16    │    7     │  S3 API  │  Search   │   Consensus   │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

### 技术栈

| 层级       | 技术                                                            |
| ---------- | --------------------------------------------------------------- |
| **前端**   | Next.js 15.5, React 19, Shadcn/ui, TanStack Query, Tailwind CSS |
| **后端**   | NestJS 11, Prisma 6, Passport.js, Socket.IO                     |
| **数据库** | PostgreSQL 16, Redis 7                                          |
| **存储**   | MinIO (S3 兼容)                                                 |
| **搜索**   | MeiliSearch                                                     |
| **容器**   | Docker, Docker Compose                                          |

---

## 功能模块

### 认证与安全

- JWT 无状态认证
- 双因素认证 (TOTP + 恢复码)
- OAuth 2.0 (GitHub/Google)
- API Token 管理
- 会话设备跟踪

### 代码管理

- Git HTTP Smart Protocol
- 多分支管理
- 代码全文搜索
- 文件版本历史

### 协作工具

- Issue 追踪 (标签/里程碑/分配人)
- Pull Request (代码审查/合并策略)
- 分支保护规则
- Wiki 文档系统
- 实时协作编辑

### CI/CD

- Pipeline 流水线
- Webhook 推送
- 通知系统 (站内/邮件)

### 分布式特性

- Raft 共识算法
- 集群状态可视化
- Leader 选举监控

---

## 项目结构

```
Flotilla/
├── apps/
│   ├── backend/           # NestJS API (Port 4000)
│   │   ├── src/
│   │   │   ├── auth/      # 认证 (JWT/OAuth/2FA)
│   │   │   ├── git/       # Git HTTP Protocol
│   │   │   ├── raft/      # Raft 共识算法
│   │   │   ├── issues/    # Issue 系统
│   │   │   └── ...        # 其他 22 个模块
│   │   ├── prisma/        # 数据库 Schema
│   │   └── test/          # 测试文件
│   ├── frontend/          # Next.js App (Port 3000)
│   │   ├── src/app/       # App Router
│   │   ├── src/components/# React 组件
│   │   └── tests/         # E2E 测试
│   └── website/           # 官网 (Port 3003)
└── docs/                  # 项目文档
```

---

## 开发命令

```bash
# 开发
pnpm dev              # 启动所有应用
pnpm build            # 构建所有应用

# 测试
pnpm test             # 运行所有测试
cd apps/backend && pnpm test          # 后端单元测试
cd apps/frontend && pnpm test         # 前端 E2E 测试

# 代码质量
pnpm lint             # ESLint 检查
pnpm format           # Prettier 格式化

# 数据库
cd apps/backend && pnpm prisma migrate dev    # 运行迁移
cd apps/backend && pnpm prisma studio         # 数据库 GUI
```

---

## 测试覆盖

| 指标                  | 数值               |
| --------------------- | ------------------ |
| 后端测试套件          | 63                 |
| 后端测试用例          | 1207               |
| Git Auth Guard 覆盖率 | 95.05%             |
| 并发测试              | 10/50/100 并发通过 |
| 安全审计测试          | 4 场景通过         |

---

## 性能指标

| 指标                | 目标    |
| ------------------- | ------- |
| API 响应时间 (P95)  | < 100ms |
| 前端首屏加载 (LCP)  | < 1.5s  |
| 数据库查询 (平均)   | < 50ms  |
| 100 并发 Issue 创建 | < 10s   |

---

## 文档

| 文档                                       | 说明               |
| ------------------------------------------ | ------------------ |
| [开发指南](./DEVELOPMENT_GUIDE.md)         | 开发流程和最佳实践 |
| [Docker 部署](./DOCKER_QUICKSTART.md)      | Docker 快速启动    |
| [Git HTTP 使用](./GIT_HTTP_GUIDE.md)       | Git 协议配置       |
| [API 文档](http://localhost:4000/api/docs) | Swagger 在线文档   |
| [贡献指南](./CONTRIBUTING.md)              | 如何参与贡献       |

---

## 贡献

欢迎贡献代码！请遵循以下规范：

1. Fork 项目并创建功能分支
2. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
3. 确保测试通过且覆盖率 ≥ 70%
4. 提交 Pull Request

---

## License

[MIT License](./LICENSE)

---

<p align="center">
  <b>Flotilla</b> - 构建共识，托管未来
</p>
