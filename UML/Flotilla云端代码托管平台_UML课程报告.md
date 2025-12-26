# Flotilla云端代码托管与协作平台

## 《UML软件建模技术实训》课程报告

---

**学    院：** 计算机与人工智能学院

**专    业：** 软件工程

**完成人员：** _____________________

**题    目：** Flotilla云端代码托管与协作平台

**指导教师：** 张倩敏

**完成时间：** 2024年12月

---

# 摘    要

随着软件开发团队规模的不断扩大和分布式协作需求的日益增长，传统的代码托管平台面临着数据一致性、高可用性和实时协作等方面的挑战。本课程报告选题"Flotilla云端代码托管与协作平台"正是针对这些痛点，旨在构建一个基于分布式共识算法的新一代代码托管解决方案，为软件开发团队提供安全、可靠、高效的协作环境。该项目的实施对于深入理解分布式系统原理、提升软件工程实践能力具有重要的学术价值和实践意义。

本项目采用现代化的全栈技术架构，前端基于Next.js 15.5框架实现响应式用户界面，后端采用NestJS 11构建模块化API服务，数据层使用PostgreSQL 16配合Prisma ORM实现高效的数据持久化。系统包含32个功能模块、48个数据模型，核心创新在于实现了简化版Raft分布式共识算法，确保多节点环境下的数据强一致性。主要功能包括：用户认证与权限管理（JWT+OAuth+2FA）、组织与团队协作（三层权限架构）、Git版本控制（HTTP Smart Protocol）、Issue追踪系统、Pull Request代码审查（三种合并策略）、全文代码搜索（MeiliSearch）、实时通知（WebSocket）、CI/CD流水线、Wiki文档系统、Webhook事件集成、安全审计日志等企业级功能。

通过本次课程设计，系统性地掌握了UML统一建模语言在软件工程中的应用方法，包括用例图、类图、时序图、活动图、状态图和组件图等多种建模技术。同时，深入理解了分布式系统的设计原理，特别是Raft共识算法的Leader选举、日志复制和安全性保证机制。项目开发过程中还积累了TypeScript全栈开发、数据库设计优化、RESTful API设计以及Docker容器化部署等实践经验，为未来从事企业级软件开发奠定了坚实基础。

**关键词：** UML建模；分布式共识；Raft算法；代码托管；NestJS；Next.js

---

# 目    录

- [第1章 绪论](#第1章-绪论)
  - [1.1 项目背景和意义](#11-项目背景和意义)
  - [1.2 国内外研究现状](#12-国内外研究现状)
  - [1.3 项目简介](#13-项目简介)
- [第2章 系统分析与设计](#第2章-系统分析与设计)
  - [2.1 系统需求分析](#21-系统需求分析)
  - [2.2 功能设计](#22-功能设计)
  - [2.3 系统流程图](#23-系统流程图)
  - [2.4 UML统一建模](#24-uml统一建模)
- [第3章 总结](#第3章-总结)
  - [3.1 完成情况总结](#31-完成情况总结)
  - [3.2 团队合作](#32-团队合作)
  - [3.3 不足与下一步改进](#33-不足与下一步改进)
- [参考文献](#参考文献)

---

# 第1章 绪    论

## 1.1 项目背景和意义

### 项目背景

随着软件开发团队的分布式化和云计算技术的成熟，开发者需要一个高效、可靠的协作平台来管理代码、跟踪项目进度并实现团队协作。本项目旨在构建一个基于云计算架构的开发协作平台，提供类似GitHub/GitLab的核心功能，并通过分布式共识算法保证数据一致性和系统可用性。

当前代码托管领域面临以下挑战：

1. **数据一致性挑战**：传统架构在面对网络分区和节点故障时，难以保证数据的强一致性，可能导致代码版本冲突或数据丢失。

2. **高可用性需求**：单点故障问题在关键业务场景下可能造成严重损失，需要更健壮的分布式架构来保障服务连续性。

3. **实时协作能力**：随着远程办公的普及，开发者对实时代码协作、即时通知等功能的需求日益强烈。

4. **私有化部署需求**：出于数据安全和合规考虑，许多企业需要将代码托管平台部署在内部基础设施上。

Raft共识算法作为Paxos的简化替代方案，由Stanford大学的Diego Ongaro和John Ousterhout于2014年提出[1]，其设计目标是在保证分布式系统一致性的同时，提供更好的可理解性和工程实现性。将Raft算法应用于代码托管平台，可以有效解决上述挑战。

### 项目意义

**业务目标：**
- 为开发团队提供一个集中的代码托管和协作平台
- 支持多人协作开发，提供版本控制和权限管理
- 基于云计算实现高可用性和可扩展性
- 降低团队协作成本，提升开发效率

**技术目标：**
- 构建可扩展的前后端分离架构
- 实现简化版Raft分布式共识算法
- 达到企业级代码质量标准（测试覆盖率80%+）
- 支持容器化部署和云原生架构

**社会责任：**
在系统设计过程中，充分考虑了对公众安全、健康和福祉以及环境保护的社会责任，包括：
- GDPR合规的数据导出功能
- 完整的安全审计日志（SOC2/ISO27001合规）
- 前端遵循WCAG可访问性标准

## 1.2 国内外研究现状

### 分布式版本控制系统研究

Git由Linus Torvalds于2005年创建，其分布式架构革新了版本控制领域[2]。Chacon和Straub在《Pro Git》中系统阐述了Git的内部原理，包括对象模型、引用机制和传输协议[3]。国内学者王达在《Git版本控制管理》中结合国内开发实践，详细介绍了Git在团队协作中的应用[4]。

### 分布式共识算法研究

分布式共识问题最早由Lamport提出的Paxos算法解决[5]，但其复杂性限制了工程应用。Raft算法的提出显著降低了实现难度[1]。etcd、Consul等开源项目已成功将Raft应用于分布式键值存储[6]。国内阿里巴巴、腾讯等企业也在分布式数据库领域进行了大量Raft应用研究[7]。

### 代码托管平台研究

GitHub作为全球最大的代码托管平台，其架构演进经历了从单体到微服务的转变[8]。GitLab则以开源、可私有化部署著称，其CI/CD功能尤为突出[9]。国内的Gitee（码云）针对国内开发者需求进行了本地化优化[10]。学术界对代码托管平台的研究主要集中在代码审查效率、缺陷预测和安全漏洞检测等方向[11]。

### UML建模技术研究

UML（Unified Modeling Language）作为面向对象软件工程的标准建模语言，由Booch、Rumbaugh和Jacobson三位方法论创始人共同开发[12]。Fowler的《UML精粹》提供了实用的建模指南[13]。国内学者在UML与敏捷开发的结合方面进行了深入探索[14]。

### 前沿技术发展

近年来，云原生技术的发展为代码托管平台带来新的架构范式。Kubernetes容器编排、Service Mesh服务网格等技术使得平台具备更好的弹性伸缩能力[15]。WebSocket和CRDT（Conflict-free Replicated Data Types）技术的成熟也推动了实时协作功能的发展[16]。

## 1.3 项目简介

### 主要工作

Flotilla云端代码托管与协作平台旨在构建一个功能完善、架构先进的代码管理解决方案。

### 功能实现状态

> **说明**: ✅ 已实现 | ⚠️ 部分实现 | ❌ 未实现

**核心功能（Phase 1-2 完成）：**
- ✅ 用户认证和授权系统（JWT + 邮箱验证 + 密码重置）
- ✅ 项目/仓库管理（CRUD + 文件管理）
- ✅ Git HTTP Smart Protocol（clone/push/fetch）
- ✅ 组织与团队权限系统（三层权限架构）
- ✅ 分布式数据同步（简化版Raft）
- ✅ Issue追踪系统（完整：issues, comments, labels, milestones）
- ✅ Pull Request代码审查（创建/审查/合并 + 多种合并策略）
- ✅ 代码搜索（MeiliSearch全文搜索）
- ✅ 分支保护规则
- ✅ 通知系统（WebSocket + 邮件）
- ✅ 审计日志系统
- ✅ 文件管理（MinIO对象存储）

**安全功能（Phase 3-4 完成）：**
- ✅ HTTPS强制重定向
- ✅ Security Headers中间件
- ✅ CSRF保护
- ✅ Rate Limiting（分层策略）
- ✅ 密码历史记录（防重用）
- ✅ 会话管理（设备管理、异地登录检测）
- ✅ Token版本控制（CWE-613防护）

**高级功能（Phase 5 完成）：**
- ✅ CI/CD流水线配置（Pipeline模块完整实现）
- ✅ Wiki文档系统（层级文档、版本历史）
- ✅ Webhook事件推送（支持重试机制）
- ✅ API令牌（Personal Access Token，支持权限范围）
- ✅ OAuth第三方登录（GitHub/Google/GitLab）
- ✅ 两步验证（2FA TOTP）
- ✅ GDPR数据导出（用户数据打包下载）
- ✅ 实时协作编辑（WebSocket + OT算法）

### 开发平台

**技术栈概览：**

| 层次 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|----------|
| 前端框架 | Next.js (App Router) | 15.5.x | SSR/SSG支持，App Router，性能优异 |
| React | React | 19.x | Server Components，生态成熟 |
| UI组件库 | Shadcn/ui + Mantine | 7.15 | 基于Radix UI，高质量组件 |
| 状态管理 | TanStack Query + Zustand | 5.x | 服务器状态管理，缓存优化 |
| 后端框架 | NestJS | 11.x | 企业级架构，模块化，依赖注入 |
| ORM | Prisma | 6.x | 类型安全，自动迁移，性能好 |
| 数据库 | PostgreSQL | 16.x | 功能强大，JSON支持，开源 |
| 缓存 | Redis | 7.x | 高性能内存数据库 |
| 对象存储 | MinIO | Latest | S3兼容，开源，易部署 |
| 搜索引擎 | MeiliSearch | 1.10 | 全文代码搜索 |
| 容器化 | Docker + Docker Compose | - | 容器化部署 |
| 包管理 | pnpm (Monorepo) | 10.x | 比npm/yarn更快 |

---

# 第2章 系统分析与设计

## 2.1 系统需求分析

### 用户角色定义

#### 平台层角色

| 角色 | 描述 | 权限 |
|------|------|------|
| **超级管理员（SUPER_ADMIN）** | 平台运维者，最高权限 | 用户管理、系统监控、配置管理、审计日志查看 |
| **普通用户（USER）** | 平台注册用户 | 创建组织、创建项目、参与协作 |

#### 组织层角色

| 角色 | 描述 | 权限 |
|------|------|------|
| **组织所有者（OWNER）** | 组织创建者 | 删除组织、转让所有权、所有管理操作 |
| **组织管理员（ADMIN）** | 被授权管理组织的成员 | 管理成员、管理团队、管理设置 |
| **组织成员（MEMBER）** | 组织的普通成员 | 创建项目、查看组织信息 |

#### 团队层角色

| 角色 | 描述 | 权限 |
|------|------|------|
| **团队维护者（MAINTAINER）** | 团队管理者 | 管理团队成员、分配项目权限 |
| **团队成员（MEMBER）** | 团队普通成员 | 继承团队被赋予的项目权限 |

#### 项目层角色

| 角色 | 描述 | 权限 |
|------|------|------|
| **项目所有者（OWNER）** | 项目创建者 | 完全控制权，包括删除项目、管理成员 |
| **项目维护者（MAINTAINER）** | 项目核心维护者 | 审核PR、管理Issue、分支保护设置 |
| **项目成员（MEMBER）** | 项目开发成员 | 读写代码、创建Issue和PR |
| **项目查看者（VIEWER）** | 只读访问权限 | 查看代码和项目信息 |

### 功能性需求（用户故事摘录）

#### US-001: 用户注册
**作为** 新用户
**我想要** 通过邮箱和密码注册账号
**以便** 开始使用平台功能

**验收标准：**
- 必填字段：用户名、邮箱、密码
- 用户名唯一，3-20个字符，仅支持字母数字下划线
- 邮箱格式验证且唯一
- 密码至少8位，包含大小写字母和数字
- 密码使用bcrypt加密存储
- 注册成功后自动登录

#### US-018: 创建Pull Request
**作为** 项目成员
**我想要** 创建Pull Request提交代码变更
**以便** 进行代码审查和合并

**验收标准：**
- 选择源分支和目标分支
- 填写标题和描述（支持Markdown）
- 显示变更文件和差异
- 自动检测合并冲突

#### US-020: 合并Pull Request
**作为** 项目维护者
**我想要** 合并审核通过的Pull Request
**以便** 将代码变更合入主分支

**验收标准：**
- 支持多种合并策略（merge, squash, rebase）
- 检查分支保护规则
- 检查必需审批数量
- 合并后可选删除源分支

### 非功能性需求

#### 性能需求
- **响应时间：** API请求平均响应时间 < 200ms
- **页面加载：** 首屏加载时间 < 2s
- **并发能力：** 支持1000+并发用户

#### 安全性需求
- 密码强度要求（最少8位，复杂度）
- JWT token加密传输
- 防暴力破解（登录失败5次锁定10分钟）
- RBAC权限控制
- 防CSRF、XSS攻击

#### 可用性需求
- **系统可用性：** 99.9%（年均停机时间 < 8.76小时）
- **数据可靠性：** 99.999%（数据丢失概率 < 0.001%）

## 2.2 功能设计

### 设计思路

本项目采用**前后端分离**的**微服务架构**，遵循**云原生**设计原则。

**架构特点：**
- **前后端分离：** 前端Next.js独立部署，通过API与后端通信
- **服务模块化：** 后端按业务领域划分为32个NestJS模块
- **分布式一致性：** 核心数据通过Raft算法保证强一致性
- **高可用性：** 多节点部署，故障自动切换
- **可扩展性：** 水平扩展各个服务层
- **安全性：** 多层安全防护（网关、JWT、RBAC）

### 后端模块设计（32个模块）

```
backend/src/
├── auth/                 # 认证模块 ✅
│   ├── api-tokens/       # API令牌
│   ├── oauth/            # OAuth登录
│   └── two-factor/       # 两步验证
├── users/                # 用户模块 ✅
├── organizations/        # 组织模块 ✅
├── teams/                # 团队模块 ✅
├── projects/             # 项目模块 ✅
├── repositories/         # 仓库模块 ✅
├── git/                  # Git HTTP协议 ✅
├── issues/               # Issue追踪模块 ✅
├── pull-requests/        # PR模块 ✅
├── branch-protection/    # 分支保护 ✅
├── search/               # 代码搜索模块 ✅
├── notifications/        # 通知模块 ✅
├── files/                # 文件管理模块 ✅
├── raft/                 # Raft核心模块 ✅
├── raft-cluster/         # Raft集群管理 ✅
├── admin/                # 管理员模块 ✅
├── audit/                # 审计日志模块 ✅
├── monitoring/           # 监控模块 ✅
├── email/                # 邮件服务 ✅
├── redis/                # Redis服务 ✅
├── pipelines/            # CI/CD流水线 ✅
├── wiki/                 # Wiki文档 ✅
├── webhooks/             # Webhook ✅
├── collaboration/        # 实时协作 ✅
├── gdpr/                 # GDPR数据导出 ✅
└── newsletter/           # Newsletter订阅 ✅
```

### 数据库模型设计（48个模型）

#### 核心实体分类

| 模块 | 模型数量 | 主要模型 |
|------|----------|----------|
| 用户与认证 | 6 | User, PasswordHistory, UserSession, ApiToken, OAuthAccount, TwoFactorAuth |
| 组织与团队 | 5 | Organization, OrganizationMember, Team, TeamMember, TeamProjectPermission |
| 项目与仓库 | 7 | Project, ProjectMember, Repository, Branch, Commit, File, ProjectFile |
| Issue追踪 | 6 | Issue, Label, Milestone, IssueComment, IssueAssignee, IssueEvent |
| Pull Request | 5 | PullRequest, PRReview, PRComment, PRAssignee, PREvent |
| 代码搜索 | 1 | SearchMetadata |
| 通知系统 | 2 | Notification, NotificationPreference |
| 分支保护 | 1 | BranchProtectionRule |
| Raft共识 | 2 | RaftLog, RaftState |
| 审计日志 | 1 | AuditLog |
| CI/CD流水线 | 2 | Pipeline, PipelineRun |
| Wiki文档 | 2 | WikiPage, WikiPageHistory |
| Webhook | 2 | Webhook, WebhookDelivery |
| 实时协作 | 2 | CollaborationSession, CollaborationParticipant |
| GDPR合规 | 1 | DataExportRequest |

#### 枚举类型（18个）

| 枚举类型 | 值 | 用途 |
|---------|-----|------|
| UserRole | USER, SUPER_ADMIN | 平台角色 |
| OrgRole | OWNER, ADMIN, MEMBER | 组织角色 |
| TeamRole | MAINTAINER, MEMBER | 团队角色 |
| MemberRole | OWNER, MAINTAINER, MEMBER, VIEWER | 项目角色 |
| ProjectVisibility | PUBLIC, PRIVATE | 项目可见性 |
| IssueState | OPEN, CLOSED | Issue状态 |
| PRState | OPEN, MERGED, CLOSED | PR状态 |
| ReviewState | APPROVED, CHANGES_REQUESTED, COMMENTED | 审查状态 |
| MergeStrategy | MERGE, SQUASH, REBASE | 合并策略 |
| RaftNodeState | FOLLOWER, CANDIDATE, LEADER | Raft节点状态 |
| NotificationType | PR_CREATED, PR_MERGED, ISSUE_MENTIONED... | 通知类型 |
| AuditAction | CREATE, UPDATE, DELETE, LOGIN... | 审计操作 |
| PipelineStatus | PENDING, RUNNING, SUCCESS, FAILED, CANCELLED | CI/CD状态 |
| DataExportFormat | JSON, CSV, ZIP | GDPR导出格式 |
| DataExportStatus | PENDING, PROCESSING, COMPLETED, FAILED | 导出状态 |

## 2.3 系统流程图

### 系统整体架构图

```mermaid
graph TB
    subgraph "客户端层"
        Browser[Web浏览器]
        GitClient[Git客户端]
    end

    subgraph "前端服务层"
        FrontEnd[Next.js 16 应用<br/>SSR + Static]
    end

    subgraph "后端服务层"
        AuthService[认证服务]
        ProjectService[项目服务]
        RepoService[仓库服务]
        GitService[Git HTTP服务]
        IssueService[Issue服务]
        PRService[PR服务]
        SearchService[搜索服务]
        NotifyService[通知服务]
        ConsensusService[Raft共识服务]
    end

    subgraph "数据持久层"
        PostgreSQL[(PostgreSQL 16)]
        Redis[(Redis 7)]
        MinIO[(MinIO)]
        MeiliSearch[(MeiliSearch)]
    end

    Browser --> FrontEnd
    GitClient --> GitService
    FrontEnd --> AuthService
    FrontEnd --> ProjectService
    FrontEnd --> RepoService
    FrontEnd --> IssueService
    FrontEnd --> PRService
    FrontEnd --> SearchService

    AuthService --> PostgreSQL
    AuthService --> Redis
    ProjectService --> PostgreSQL
    RepoService --> PostgreSQL
    RepoService --> MinIO
    SearchService --> MeiliSearch

    ConsensusService --> PostgreSQL
    ConsensusService -.-> AuthService
    ConsensusService -.-> ProjectService
```

### 用户认证时序图

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant AuthService
    participant Database
    participant Redis

    User->>Frontend: 输入用户名和密码
    Frontend->>Frontend: 前端验证
    Frontend->>AuthService: POST /api/v1/auth/login

    AuthService->>Database: 查询用户
    Database-->>AuthService: 返回用户信息

    AuthService->>AuthService: 验证密码（Bcrypt compare）

    alt 密码正确
        AuthService->>AuthService: 生成JWT Token
        AuthService->>Redis: 存储Session
        Redis-->>AuthService: OK
        AuthService-->>Frontend: 200 {token, user}
        Frontend->>Frontend: 存储Token到localStorage
        Frontend-->>User: 跳转到Dashboard
    else 密码错误
        AuthService-->>Frontend: 401 Invalid credentials
        Frontend-->>User: 显示错误信息
    end
```

### Git Push流程图

```mermaid
sequenceDiagram
    participant GitClient as Git Client
    participant GitHTTP as Git HTTP Service
    participant RaftService as Raft Consensus
    participant Storage as MinIO Storage
    participant Database as PostgreSQL

    GitClient->>GitHTTP: GET /info/refs?service=git-receive-pack
    GitHTTP->>Database: 验证权限
    GitHTTP-->>GitClient: 返回引用列表

    GitClient->>GitHTTP: POST /git-receive-pack (pack data)
    GitHTTP->>GitHTTP: 解析pack文件

    GitHTTP->>RaftService: 提交元数据变更
    RaftService->>RaftService: Leader复制到Followers
    RaftService-->>GitHTTP: 提交成功

    GitHTTP->>Storage: 存储Git对象
    Storage-->>GitHTTP: OK

    GitHTTP->>Database: 更新引用
    GitHTTP-->>GitClient: 推送成功
```

## 2.4 UML统一建模

### 2.4.1 UML建模语言概述

UML（Unified Modeling Language，统一建模语言）是一种用于软件系统分析和设计的标准化建模语言。它提供了一套丰富的图形化符号，用于可视化、描述、构建和记录软件系统的各个方面[12]。

#### 用例图（Use Case Diagram）

**基本概念**：用例图描述系统的功能需求，展示参与者（Actor）与用例（Use Case）之间的关系。

**组成元素**：
- **参与者（Actor）**：与系统交互的外部实体，用小人图标表示
- **用例（Use Case）**：系统提供的功能，用椭圆表示
- **关联（Association）**：参与者与用例的交互关系
- **包含（Include）**：一个用例包含另一个用例
- **扩展（Extend）**：一个用例在特定条件下扩展另一个用例

#### 类图（Class Diagram）

**基本概念**：类图是面向对象系统建模中最重要的图，描述系统的静态结构。

**组成元素**：
- **类（Class）**：用矩形表示，分为三栏（类名、属性、方法）
- **关联（Association）**：类之间的结构关系
- **聚合（Aggregation）**：整体与部分的关系，部分可独立存在
- **组合（Composition）**：强聚合，部分不能独立存在
- **继承（Generalization）**：子类继承父类
- **依赖（Dependency）**：一个类使用另一个类
- **实现（Realization）**：类实现接口

#### 时序图（Sequence Diagram）

**基本概念**：时序图描述对象之间按时间顺序的消息交互。

**组成元素**：
- **生命线（Lifeline）**：对象存在的时间线
- **激活框（Activation）**：对象执行操作的时间段
- **消息（Message）**：同步消息、异步消息、返回消息
- **组合片段（Combined Fragment）**：循环、条件、并行等控制结构

#### 状态图（State Diagram）

**基本概念**：状态图描述对象在其生命周期内的状态变化。

**组成元素**：
- **状态（State）**：对象的条件或情况
- **转换（Transition）**：状态之间的变迁
- **事件（Event）**：触发转换的条件
- **守卫条件（Guard）**：转换的前提条件
- **动作（Action）**：转换时执行的操作

#### 组件图（Component Diagram）

**基本概念**：组件图描述系统的物理结构，展示软件组件及其依赖关系。

### 2.4.2 系统用例图

#### 2.4.2.1 整体用例图

```mermaid
graph TB
    Developer((开发者))
    Member((项目成员))
    Viewer((访客))
    Admin((管理员))
    Maintainer((维护者))
    OrgOwner((组织所有者))

    UC1[注册登录]
    UC2[创建项目]
    UC3[管理项目]
    UC4[Git操作<br/>push/pull/clone]
    UC5[浏览代码]
    UC6[管理成员]
    UC7[创建分支]
    UC8[查看历史]
    UC9[系统管理]
    UC10[创建Issue]
    UC11[创建PR]
    UC12[代码审查]
    UC13[合并PR]
    UC14[代码搜索]
    UC15[创建组织]
    UC16[管理团队]
    UC17[配置CI/CD]
    UC18[编辑Wiki]
    UC19[配置Webhook]
    UC20[设置2FA]

    Developer --> UC1
    Developer --> UC2
    Developer --> UC3
    Developer --> UC4
    Developer --> UC5
    Developer --> UC6
    Developer --> UC7
    Developer --> UC8
    Developer --> UC10
    Developer --> UC11
    Developer --> UC14
    Developer --> UC15
    Developer --> UC20

    Member --> UC1
    Member --> UC4
    Member --> UC5
    Member --> UC8
    Member --> UC10
    Member --> UC11
    Member --> UC18

    Viewer --> UC1
    Viewer --> UC5
    Viewer --> UC14

    Maintainer --> UC12
    Maintainer --> UC13
    Maintainer --> UC17
    Maintainer --> UC19

    OrgOwner --> UC16
    OrgOwner --> UC6

    Admin --> UC9
```

#### 2.4.2.2 认证模块用例图（详细）

```mermaid
graph TB
    User((用户))
    System((系统))

    subgraph "认证用例"
        UC_Register[用户注册]
        UC_Login[用户登录]
        UC_Logout[用户登出]
        UC_ResetPwd[密码重置]
        UC_VerifyEmail[邮箱验证]
        UC_OAuth[OAuth登录]
        UC_2FA[两步验证]
        UC_APIToken[管理API令牌]
        UC_Session[会话管理]
    end

    subgraph "包含关系 <<include>>"
        UC_SendEmail[发送邮件]
        UC_ValidatePwd[密码强度验证]
        UC_GenToken[生成JWT Token]
        UC_CheckHistory[检查密码历史]
    end

    User --> UC_Register
    User --> UC_Login
    User --> UC_Logout
    User --> UC_ResetPwd
    User --> UC_OAuth
    User --> UC_2FA
    User --> UC_APIToken
    User --> UC_Session

    UC_Register -.->|include| UC_SendEmail
    UC_Register -.->|include| UC_ValidatePwd
    UC_Register -.->|include| UC_GenToken

    UC_Login -.->|include| UC_GenToken
    UC_Login -.->|extend| UC_2FA

    UC_ResetPwd -.->|include| UC_SendEmail
    UC_ResetPwd -.->|include| UC_ValidatePwd
    UC_ResetPwd -.->|include| UC_CheckHistory

    System --> UC_VerifyEmail
    UC_VerifyEmail -.->|include| UC_SendEmail
```

#### 2.4.2.3 代码协作用例图（详细）

```mermaid
graph TB
    Developer((开发者))
    Reviewer((审查者))
    CI((CI系统))

    subgraph "Issue管理"
        UC_CreateIssue[创建Issue]
        UC_EditIssue[编辑Issue]
        UC_CloseIssue[关闭Issue]
        UC_AssignIssue[分配Issue]
        UC_LabelIssue[添加标签]
        UC_CommentIssue[评论Issue]
        UC_LinkPR[关联PR]
    end

    subgraph "Pull Request"
        UC_CreatePR[创建PR]
        UC_ReviewPR[审查PR]
        UC_ApprovePR[批准PR]
        UC_RequestChanges[请求修改]
        UC_MergePR[合并PR]
        UC_ClosePR[关闭PR]
        UC_CommentPR[评论PR]
    end

    subgraph "分支管理"
        UC_CreateBranch[创建分支]
        UC_ProtectBranch[保护分支]
        UC_DeleteBranch[删除分支]
    end

    Developer --> UC_CreateIssue
    Developer --> UC_EditIssue
    Developer --> UC_CommentIssue
    Developer --> UC_CreatePR
    Developer --> UC_CreateBranch

    Reviewer --> UC_ReviewPR
    Reviewer --> UC_ApprovePR
    Reviewer --> UC_RequestChanges
    Reviewer --> UC_MergePR
    Reviewer --> UC_CommentPR
    Reviewer --> UC_AssignIssue
    Reviewer --> UC_LabelIssue
    Reviewer --> UC_ProtectBranch

    UC_CreatePR -.->|extend| UC_LinkPR
    UC_MergePR -.->|include| UC_CloseIssue

    CI --> UC_ReviewPR
```

### 2.4.3 核心实体类图

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String email
        +String passwordHash
        +String avatar
        +UserRole role
        +Boolean emailVerified
        +Int tokenVersion
        +DateTime createdAt
        +register()
        +login()
        +updateProfile()
    }

    class Organization {
        +String id
        +String name
        +String slug
        +Int maxProjects
        +Int maxMembers
        +BigInt storageQuota
        +addMember()
        +createTeam()
    }

    class Project {
        +String id
        +String name
        +String description
        +Visibility visibility
        +String ownerId
        +Boolean isArchived
        +DateTime createdAt
        +create()
        +update()
        +delete()
        +addMember()
    }

    class Repository {
        +String id
        +String projectId
        +String defaultBranch
        +BigInt storageUsed
        +init()
        +createBranch()
        +commit()
    }

    class Issue {
        +String id
        +Int number
        +String title
        +String body
        +IssueState state
        +String authorId
        +create()
        +close()
        +addComment()
        +addLabel()
    }

    class PullRequest {
        +String id
        +Int number
        +String title
        +String sourceBranch
        +String targetBranch
        +PRState state
        +MergeStrategy mergeStrategy
        +create()
        +review()
        +merge()
        +close()
    }

    User "1" --> "*" Organization : creates
    User "1" --> "*" Project : owns
    Organization "1" --> "*" Project : contains
    Project "1" --> "1" Repository : has
    Project "1" --> "*" Issue : has
    Project "1" --> "*" PullRequest : has
    User "1" --> "*" Issue : authors
    User "1" --> "*" PullRequest : authors
```

### 2.4.4 数据库ER图

```mermaid
erDiagram
    User ||--o{ Organization : "创建"
    User ||--o{ OrganizationMember : "加入组织"
    User ||--o{ TeamMember : "加入团队"
    User ||--o{ Project : "拥有"
    User ||--o{ ProjectMember : "参与项目"
    User ||--o{ Commit : "提交代码"
    User ||--o{ Issue : "创建Issue"
    User ||--o{ PullRequest : "创建PR"

    Organization ||--o{ OrganizationMember : "有成员"
    Organization ||--o{ Team : "包含团队"
    Organization ||--o{ Project : "拥有项目"
    Team ||--o{ TeamMember : "有成员"
    Team ||--o{ TeamProjectPermission : "项目权限"

    Project ||--|| Repository : "有仓库"
    Project ||--o{ ProjectMember : "有成员"
    Project ||--o{ Issue : "有Issue"
    Project ||--o{ PullRequest : "有PR"
    Project ||--o{ Label : "有标签"
    Project ||--o{ BranchProtectionRule : "分支保护"

    Repository ||--o{ Branch : "有分支"
    Repository ||--o{ Commit : "有提交"
    Repository ||--o{ File : "有文件"

    Issue ||--o{ IssueComment : "有评论"
    Issue ||--o{ IssueAssignee : "有分配人"
    Issue }o--o| Milestone : "属于里程碑"

    PullRequest ||--o{ PRReview : "有审查"
    PullRequest ||--o{ PRComment : "有评论"

    User {
        string id PK
        string username UK
        string email UK
        string passwordHash
        enum role
        boolean emailVerified
        int tokenVersion
    }

    Project {
        string id PK
        string name
        enum visibility
        string ownerId FK
        string organizationId FK
        boolean isArchived
    }

    Issue {
        string id PK
        int number
        string title
        enum state
        string authorId FK
    }

    PullRequest {
        string id PK
        int number
        string title
        string sourceBranch
        string targetBranch
        enum state
    }
```

### 2.4.5 Raft共识类图

```mermaid
classDiagram
    class RaftNode {
        -String nodeId
        -Int currentTerm
        -String votedFor
        -LogEntry[] log
        -Int commitIndex
        -Int lastApplied
        -NodeState state
        -Map~String,Int~ nextIndex
        -Map~String,Int~ matchIndex
        +start() void
        +stop() void
        +handleClientWrite(Command) ClientResponse
        +handleRequestVote(Request) Response
        +handleAppendEntries(Request) Response
        -becomeFollower() void
        -becomeCandidate() void
        -becomeLeader() void
        -startElection() void
        -broadcastAppendEntries() void
        +exportState() NodeStateSnapshot
    }

    class RaftTransport {
        <<interface>>
        +sendRequestVote(nodeId, request) Response
        +sendAppendEntries(nodeId, request) Response
        +startServer(nodeId, handler) void
        +stopServer() void
    }

    class StateMachine {
        <<interface>>
        +apply(command) any
        +getState() any
    }

    class PersistentStorage {
        <<interface>>
        +saveTerm(term) void
        +saveVotedFor(nodeId) void
        +saveLogEntry(entry) void
        +loadState() RaftState
    }

    class LogEntry {
        +Int index
        +Int term
        +Command command
        +Long timestamp
    }

    class ClusterConfig {
        +String nodeId
        +String[] nodes
        +Int heartbeatInterval
        +Int electionTimeoutMin
        +Int electionTimeoutMax
    }

    RaftNode --> RaftTransport : uses
    RaftNode --> StateMachine : uses
    RaftNode --> PersistentStorage : uses
    RaftNode --> LogEntry : contains
    RaftNode --> ClusterConfig : configured by
```

### 2.4.6 Raft节点状态图

```mermaid
stateDiagram-v2
    [*] --> Follower : 节点启动

    Follower --> Candidate : 选举超时
    Candidate --> Leader : 获得多数票
    Candidate --> Follower : 发现更高任期Leader
    Candidate --> Candidate : 选举超时，重新选举
    Leader --> Follower : 发现更高任期

    Follower --> Follower : 收到有效心跳
    Leader --> Leader : 定期发送心跳

    state Follower {
        [*] --> 等待心跳
        等待心跳 --> 重置选举计时器 : 收到心跳
        重置选举计时器 --> 等待心跳
    }

    state Candidate {
        [*] --> 递增任期
        递增任期 --> 投票给自己
        投票给自己 --> 发送RequestVote
        发送RequestVote --> 统计选票
    }

    state Leader {
        [*] --> 初始化nextIndex
        初始化nextIndex --> 发送心跳
        发送心跳 --> 处理客户端请求
        处理客户端请求 --> 复制日志
        复制日志 --> 提交日志
    }
```

### 2.4.7 Raft Leader选举时序图

```mermaid
sequenceDiagram
    participant NodeA as Node A (Follower)
    participant NodeB as Node B (Follower)
    participant NodeC as Node C (Follower)

    Note over NodeA: 选举超时
    NodeA->>NodeA: 转为Candidate<br/>term=1, votedFor=A

    par 并行发送RequestVote
        NodeA->>NodeB: RequestVote(term=1, candidateId=A)
        NodeA->>NodeC: RequestVote(term=1, candidateId=A)
    end

    NodeB->>NodeB: 检查日志<br/>投票给A
    NodeC->>NodeC: 检查日志<br/>投票给A

    NodeB-->>NodeA: voteGranted=true
    NodeC-->>NodeA: voteGranted=true

    Note over NodeA: 获得3/3票<br/>成为Leader

    NodeA->>NodeA: 转为Leader<br/>初始化nextIndex[]

    par 发送心跳
        NodeA->>NodeB: AppendEntries(heartbeat)
        NodeA->>NodeC: AppendEntries(heartbeat)
    end

    NodeB-->>NodeA: success=true
    NodeC-->>NodeA: success=true

    Note over NodeA,NodeC: Leader选举完成<br/>开始接收客户端请求
```

### 2.4.8 Pull Request工作流活动图

```mermaid
flowchart TD
    A[开始] --> B[开发者创建分支]
    B --> C[提交代码变更]
    C --> D[创建Pull Request]
    D --> E{自动检查}

    E -->|CI失败| F[修复代码]
    F --> C

    E -->|CI通过| G[等待代码审查]
    G --> H{审查结果}

    H -->|请求修改| I[修改代码]
    I --> C

    H -->|批准| J{检查分支保护规则}

    J -->|不满足| K[等待更多审批]
    K --> H

    J -->|满足| L{选择合并策略}

    L -->|Merge| M[创建合并提交]
    L -->|Squash| N[压缩为单个提交]
    L -->|Rebase| O[变基合并]

    M --> P[更新目标分支]
    N --> P
    O --> P

    P --> Q{删除源分支?}
    Q -->|是| R[删除源分支]
    Q -->|否| S[保留源分支]

    R --> T[PR合并完成]
    S --> T
    T --> U[结束]
```

### 2.4.9 系统组件部署图

```mermaid
graph TB
    subgraph "用户设备"
        Browser[Web浏览器]
        GitCLI[Git CLI]
    end

    subgraph "CDN/边缘层"
        CDN[CDN<br/>静态资源缓存]
    end

    subgraph "前端层"
        NextJS[Next.js 16<br/>Port 3000]
    end

    subgraph "API网关层"
        Gateway[NestJS API Gateway<br/>Port 4000]
        ThrottlerGuard[限流守卫]
        AuthGuard[认证守卫]
    end

    subgraph "后端服务层 (32个模块)"
        AuthModule[Auth Module]
        GitModule[Git HTTP Module]
        ProjectModule[Project Module]
        IssueModule[Issue Module]
        PRModule[PR Module]
        RaftModule[Raft Module]
        SearchModule[Search Module]
        NotifyModule[Notification Module]
    end

    subgraph "数据层"
        PostgreSQL[(PostgreSQL 16<br/>Port 5434)]
        Redis[(Redis 7<br/>Port 6380)]
        MinIO[(MinIO<br/>Port 9000)]
        MeiliSearch[(MeiliSearch<br/>Port 7700)]
    end

    Browser --> CDN
    CDN --> NextJS
    GitCLI --> GitModule
    NextJS --> Gateway

    Gateway --> ThrottlerGuard
    ThrottlerGuard --> AuthGuard
    AuthGuard --> AuthModule
    AuthGuard --> ProjectModule
    AuthGuard --> IssueModule
    AuthGuard --> PRModule
    AuthGuard --> SearchModule

    GitModule --> RaftModule
    AuthModule --> PostgreSQL
    AuthModule --> Redis
    ProjectModule --> PostgreSQL
    IssueModule --> PostgreSQL
    PRModule --> PostgreSQL
    RaftModule --> PostgreSQL
    SearchModule --> MeiliSearch
    GitModule --> MinIO
    NotifyModule --> Redis
```

### 2.4.10 Issue生命周期状态图

```mermaid
stateDiagram-v2
    [*] --> Open : 创建Issue

    state Open {
        [*] --> 待处理
        待处理 --> 讨论中 : 添加评论
        讨论中 --> 待处理 : 等待回复
        讨论中 --> 讨论中 : 继续讨论
    }

    Open --> InProgress : 分配开发者
    Open --> Closed : 关闭（无效/重复）

    state InProgress {
        [*] --> 开发中
        开发中 --> 测试中 : 提交修复
        测试中 --> 开发中 : 测试失败
        测试中 --> 待合并 : 测试通过
    }

    InProgress --> Open : 取消分配
    InProgress --> Closed : 关闭（已解决）

    state Closed {
        [*] --> 已完成
        已完成 --> 已归档 : 归档
    }

    Closed --> Open : 重新打开

    note right of Open : 状态: OPEN
    note right of InProgress : 状态: OPEN\n(有分配人)
    note right of Closed : 状态: CLOSED
```

### 2.4.11 用户注册时序图

```mermaid
sequenceDiagram
    actor User as 用户
    participant Frontend as Next.js前端
    participant Backend as NestJS后端
    participant Validator as 验证服务
    participant Database as PostgreSQL
    participant Email as 邮件服务
    participant Redis as Redis缓存

    User->>Frontend: 填写注册表单
    Frontend->>Frontend: Zod前端验证

    alt 前端验证失败
        Frontend-->>User: 显示验证错误
    else 前端验证通过
        Frontend->>Backend: POST /api/v1/auth/register
        Backend->>Validator: 验证请求数据

        alt 后端验证失败
            Validator-->>Backend: 验证错误
            Backend-->>Frontend: 400 Bad Request
            Frontend-->>User: 显示错误信息
        else 验证通过
            Backend->>Database: 检查用户名/邮箱唯一性

            alt 用户名/邮箱已存在
                Database-->>Backend: 用户已存在
                Backend-->>Frontend: 409 Conflict
                Frontend-->>User: 显示"用户名/邮箱已被注册"
            else 用户不存在
                Backend->>Backend: Bcrypt加密密码(rounds=12)
                Backend->>Database: 创建用户记录
                Database-->>Backend: 返回用户ID

                Backend->>Backend: 生成邮箱验证Token
                Backend->>Database: 存储验证Token
                Backend->>Email: 发送验证邮件
                Email-->>User: 验证邮件

                Backend->>Backend: 生成JWT Token
                Backend->>Redis: 存储会话信息

                Backend-->>Frontend: 201 Created {user, token}
                Frontend->>Frontend: 存储Token到localStorage
                Frontend-->>User: 跳转到Dashboard\n提示验证邮箱
            end
        end
    end
```

### 2.4.12 OAuth第三方登录时序图

```mermaid
sequenceDiagram
    actor User as 用户
    participant Frontend as Next.js前端
    participant Backend as NestJS后端
    participant OAuth as OAuth提供商<br/>(GitHub/Google)
    participant Database as PostgreSQL
    participant Redis as Redis缓存

    User->>Frontend: 点击"GitHub登录"
    Frontend->>Backend: GET /api/v1/auth/oauth/github
    Backend->>Backend: 生成state参数(防CSRF)
    Backend->>Redis: 存储state
    Backend-->>Frontend: 302 Redirect to GitHub

    Frontend->>OAuth: 重定向到GitHub授权页
    User->>OAuth: 确认授权
    OAuth-->>Frontend: 302 Redirect /callback?code=xxx&state=yyy

    Frontend->>Backend: GET /api/v1/auth/oauth/github/callback
    Backend->>Redis: 验证state参数

    alt State验证失败
        Backend-->>Frontend: 401 Invalid state
        Frontend-->>User: 显示登录失败
    else State验证通过
        Backend->>OAuth: POST /access_token (code)
        OAuth-->>Backend: {access_token}

        Backend->>OAuth: GET /user (access_token)
        OAuth-->>Backend: {id, email, name, avatar}

        Backend->>Database: 查询OAuthAccount

        alt 账号已关联
            Database-->>Backend: 返回关联用户
        else 账号未关联
            Backend->>Database: 检查邮箱是否已注册

            alt 邮箱已存在
                Backend->>Database: 创建OAuthAccount关联
            else 邮箱不存在
                Backend->>Database: 创建新用户
                Backend->>Database: 创建OAuthAccount关联
            end
        end

        Backend->>Backend: 生成JWT Token
        Backend->>Redis: 存储会话信息
        Backend-->>Frontend: 200 OK {user, token}
        Frontend->>Frontend: 存储Token
        Frontend-->>User: 跳转到Dashboard
    end
```

### 2.4.13 Git Clone操作时序图

```mermaid
sequenceDiagram
    participant GitClient as Git客户端
    participant GitHTTP as Git HTTP服务
    participant AuthGuard as 认证守卫
    participant RepoService as 仓库服务
    participant MinIO as MinIO对象存储
    participant Database as PostgreSQL

    GitClient->>GitHTTP: GET /{org}/{repo}.git/info/refs?service=git-upload-pack
    GitHTTP->>AuthGuard: 验证Basic Auth

    alt 私有仓库 & 未授权
        AuthGuard-->>GitHTTP: 401 Unauthorized
        GitHTTP-->>GitClient: WWW-Authenticate: Basic
        GitClient->>GitClient: 提示输入凭据
        GitClient->>GitHTTP: 带Basic Auth重试
        GitHTTP->>AuthGuard: 验证凭据
        AuthGuard->>Database: 查询用户权限
    end

    AuthGuard-->>GitHTTP: 授权通过
    GitHTTP->>RepoService: 获取仓库引用
    RepoService->>Database: 查询分支/标签
    Database-->>RepoService: 返回引用列表
    RepoService-->>GitHTTP: 引用列表
    GitHTTP-->>GitClient: 001e# service=git-upload-pack\n引用列表

    GitClient->>GitClient: 计算需要的对象
    GitClient->>GitHTTP: POST /{org}/{repo}.git/git-upload-pack

    Note over GitClient,GitHTTP: POST Body包含want/have协商

    GitHTTP->>RepoService: 处理upload-pack请求
    RepoService->>MinIO: 获取Git对象
    MinIO-->>RepoService: 返回pack数据
    RepoService->>RepoService: 生成packfile
    RepoService-->>GitHTTP: packfile数据流
    GitHTTP-->>GitClient: Transfer-Encoding: chunked\npackfile数据

    GitClient->>GitClient: 解压并验证对象
    GitClient->>GitClient: 更新工作目录

    Note over GitClient: Clone完成
```

### 2.4.14 通知系统活动图

```mermaid
flowchart TD
    A[事件触发] --> B{事件类型}

    B -->|Issue相关| C[Issue事件处理]
    B -->|PR相关| D[PR事件处理]
    B -->|提交相关| E[Commit事件处理]
    B -->|系统相关| F[系统事件处理]

    C --> C1{具体操作}
    C1 -->|创建| C2[通知项目成员]
    C1 -->|评论| C3[通知Issue作者和参与者]
    C1 -->|分配| C4[通知被分配人]
    C1 -->|@提及| C5[通知被提及用户]

    D --> D1{具体操作}
    D1 -->|创建| D2[通知项目维护者]
    D1 -->|审查| D3[通知PR作者]
    D1 -->|合并| D4[通知PR参与者]
    D1 -->|评论| D5[通知PR作者和审查者]

    C2 & C3 & C4 & C5 --> G[收集接收者]
    D2 & D3 & D4 & D5 --> G

    G --> H[查询通知偏好]
    H --> I{偏好设置}

    I -->|启用站内通知| J[创建Notification记录]
    I -->|启用邮件通知| K[加入邮件队列]
    I -->|启用WebSocket| L[实时推送]
    I -->|禁用| M[跳过]

    J --> N[存储到PostgreSQL]
    K --> O[发送邮件]
    L --> P[WebSocket广播]

    N & O & P --> Q[记录发送状态]
    Q --> R[结束]
```

### 2.4.15 服务层类图（详细）

```mermaid
classDiagram
    class AuthService {
        -PrismaService prisma
        -JwtService jwtService
        -PasswordService passwordService
        -EmailService emailService
        +register(dto: RegisterDto) Promise~User~
        +login(dto: LoginDto) Promise~AuthResponse~
        +logout(userId: string) Promise~void~
        +refreshToken(token: string) Promise~AuthResponse~
        +verifyEmail(token: string) Promise~void~
        +forgotPassword(email: string) Promise~void~
        +resetPassword(token: string, password: string) Promise~void~
        +validateUser(username: string, password: string) Promise~User~
    }

    class UsersService {
        -PrismaService prisma
        -FilesService filesService
        +findById(id: string) Promise~User~
        +findByEmail(email: string) Promise~User~
        +findByUsername(username: string) Promise~User~
        +updateProfile(id: string, dto: UpdateUserDto) Promise~User~
        +updateAvatar(id: string, file: File) Promise~string~
        +deactivate(id: string) Promise~void~
    }

    class ProjectsService {
        -PrismaService prisma
        -RepositoriesService repoService
        -RaftService raftService
        +create(userId: string, dto: CreateProjectDto) Promise~Project~
        +findAll(userId: string, query: QueryDto) Promise~Project[]~
        +findById(id: string) Promise~Project~
        +update(id: string, dto: UpdateProjectDto) Promise~Project~
        +delete(id: string) Promise~void~
        +archive(id: string) Promise~void~
        +transfer(id: string, newOwnerId: string) Promise~void~
    }

    class RepositoriesService {
        -PrismaService prisma
        -MinioService minioService
        -GitService gitService
        +init(projectId: string) Promise~Repository~
        +getFiles(repoId: string, ref: string, path: string) Promise~File[]~
        +getFileContent(repoId: string, ref: string, path: string) Promise~string~
        +createBranch(repoId: string, name: string, ref: string) Promise~Branch~
        +deleteBranch(repoId: string, name: string) Promise~void~
        +getCommits(repoId: string, ref: string) Promise~Commit[]~
    }

    class IssuesService {
        -PrismaService prisma
        -NotificationsService notifyService
        +create(projectId: string, userId: string, dto: CreateIssueDto) Promise~Issue~
        +findAll(projectId: string, query: IssueQueryDto) Promise~Issue[]~
        +findByNumber(projectId: string, number: int) Promise~Issue~
        +update(id: string, dto: UpdateIssueDto) Promise~Issue~
        +close(id: string, userId: string) Promise~Issue~
        +reopen(id: string, userId: string) Promise~Issue~
        +assign(id: string, assigneeIds: string[]) Promise~Issue~
        +addLabel(id: string, labelId: string) Promise~Issue~
    }

    class PullRequestsService {
        -PrismaService prisma
        -GitService gitService
        -BranchProtectionService branchProtection
        -NotificationsService notifyService
        +create(projectId: string, userId: string, dto: CreatePRDto) Promise~PullRequest~
        +findAll(projectId: string, query: PRQueryDto) Promise~PullRequest[]~
        +findByNumber(projectId: string, number: int) Promise~PullRequest~
        +review(prId: string, userId: string, dto: ReviewDto) Promise~PRReview~
        +merge(prId: string, userId: string, strategy: MergeStrategy) Promise~PullRequest~
        +close(prId: string, userId: string) Promise~PullRequest~
        +checkMergeability(prId: string) Promise~MergeCheck~
    }

    class RaftService {
        -RaftNode node
        -PrismaService prisma
        -ConfigService config
        +start() Promise~void~
        +stop() Promise~void~
        +executeCommand(command: Command) Promise~CommandResult~
        +getState() RaftState
        +getLeader() string
        +isLeader() boolean
    }

    class NotificationsService {
        -PrismaService prisma
        -WebSocketGateway wsGateway
        -EmailService emailService
        +create(userId: string, type: NotificationType, data: any) Promise~Notification~
        +markAsRead(id: string) Promise~void~
        +markAllAsRead(userId: string) Promise~void~
        +getUnreadCount(userId: string) Promise~int~
        +broadcast(userIds: string[], notification: Notification) Promise~void~
    }

    AuthService --> UsersService : uses
    AuthService --> PasswordService : uses
    ProjectsService --> RepositoriesService : uses
    ProjectsService --> RaftService : uses
    IssuesService --> NotificationsService : uses
    PullRequestsService --> NotificationsService : uses
    PullRequestsService --> BranchProtectionService : uses
```

### 2.4.16 数据访问层类图

```mermaid
classDiagram
    class PrismaService {
        +user: Prisma.UserDelegate
        +project: Prisma.ProjectDelegate
        +repository: Prisma.RepositoryDelegate
        +issue: Prisma.IssueDelegate
        +pullRequest: Prisma.PullRequestDelegate
        +notification: Prisma.NotificationDelegate
        +auditLog: Prisma.AuditLogDelegate
        +$connect() Promise~void~
        +$disconnect() Promise~void~
        +$transaction(fn) Promise~T~
        +onModuleInit() void
        +onModuleDestroy() void
    }

    class RedisService {
        -Redis client
        +get(key: string) Promise~string~
        +set(key: string, value: string, ttl?: number) Promise~void~
        +del(key: string) Promise~void~
        +hget(key: string, field: string) Promise~string~
        +hset(key: string, field: string, value: string) Promise~void~
        +publish(channel: string, message: string) Promise~void~
        +subscribe(channel: string, callback: Function) void
    }

    class MinioService {
        -Client minioClient
        +uploadFile(bucket: string, name: string, file: Buffer) Promise~string~
        +downloadFile(bucket: string, name: string) Promise~Buffer~
        +deleteFile(bucket: string, name: string) Promise~void~
        +getPresignedUrl(bucket: string, name: string) Promise~string~
        +listObjects(bucket: string, prefix: string) Promise~Object[]~
    }

    class MeiliSearchService {
        -MeiliSearch client
        +indexDocument(index: string, doc: Document) Promise~void~
        +search(index: string, query: string, options?: SearchOptions) Promise~SearchResult~
        +deleteDocument(index: string, id: string) Promise~void~
        +updateSettings(index: string, settings: Settings) Promise~void~
    }

    class AuditService {
        -PrismaService prisma
        +log(action: AuditAction, entity: AuditEntity, userId: string, metadata?: any) Promise~void~
        +query(filters: AuditFilter) Promise~AuditLog[]~
        +export(filters: AuditFilter, format: ExportFormat) Promise~Buffer~
    }

    PrismaService <-- AuthService : uses
    PrismaService <-- UsersService : uses
    PrismaService <-- ProjectsService : uses
    RedisService <-- AuthService : uses
    RedisService <-- NotificationsService : uses
    MinioService <-- RepositoriesService : uses
    MinioService <-- FilesService : uses
    MeiliSearchService <-- SearchService : uses
    AuditService <-- AuthService : uses
    AuditService <-- ProjectsService : uses
```

### 2.4.17 后端模块依赖图

```mermaid
graph TB
    subgraph "核心模块"
        AppModule[App Module]
        ConfigModule[Config Module]
        DatabaseModule[Database Module]
    end

    subgraph "认证模块组"
        AuthModule[Auth Module]
        ApiTokensModule[API Tokens]
        OAuthModule[OAuth Module]
        TwoFactorModule[2FA Module]
    end

    subgraph "组织模块组"
        UsersModule[Users Module]
        OrganizationsModule[Organizations Module]
        TeamsModule[Teams Module]
    end

    subgraph "项目模块组"
        ProjectsModule[Projects Module]
        RepositoriesModule[Repositories Module]
        GitModule[Git HTTP Module]
        BranchProtectionModule[Branch Protection]
    end

    subgraph "协作模块组"
        IssuesModule[Issues Module]
        PullRequestsModule[Pull Requests Module]
        WikiModule[Wiki Module]
        CollaborationModule[Real-time Collaboration]
    end

    subgraph "基础设施模块组"
        RedisModule[Redis Module]
        FilesModule[Files/MinIO Module]
        EmailModule[Email Module]
        SearchModule[Search/MeiliSearch Module]
    end

    subgraph "高级功能模块组"
        NotificationsModule[Notifications Module]
        WebhooksModule[Webhooks Module]
        PipelinesModule[CI/CD Pipelines]
        AuditModule[Audit Module]
        GdprModule[GDPR Module]
    end

    subgraph "分布式模块组"
        RaftModule[Raft Core Module]
        RaftClusterModule[Raft Cluster Module]
    end

    AppModule --> ConfigModule
    AppModule --> DatabaseModule
    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> OrganizationsModule
    AppModule --> TeamsModule
    AppModule --> ProjectsModule
    AppModule --> RepositoriesModule
    AppModule --> GitModule
    AppModule --> IssuesModule
    AppModule --> PullRequestsModule
    AppModule --> SearchModule
    AppModule --> NotificationsModule
    AppModule --> RaftModule
    AppModule --> AuditModule
    AppModule --> PipelinesModule
    AppModule --> WikiModule
    AppModule --> WebhooksModule
    AppModule --> CollaborationModule
    AppModule --> GdprModule

    AuthModule --> UsersModule
    AuthModule --> RedisModule
    AuthModule --> EmailModule
    AuthModule --> ApiTokensModule
    AuthModule --> OAuthModule
    AuthModule --> TwoFactorModule

    OrganizationsModule --> UsersModule
    OrganizationsModule --> TeamsModule

    TeamsModule --> UsersModule

    ProjectsModule --> UsersModule
    ProjectsModule --> OrganizationsModule
    ProjectsModule --> RepositoriesModule
    ProjectsModule --> RaftModule

    RepositoriesModule --> FilesModule
    RepositoriesModule --> GitModule

    GitModule --> RaftModule

    IssuesModule --> ProjectsModule
    IssuesModule --> NotificationsModule

    PullRequestsModule --> ProjectsModule
    PullRequestsModule --> RepositoriesModule
    PullRequestsModule --> BranchProtectionModule
    PullRequestsModule --> NotificationsModule

    WikiModule --> ProjectsModule

    CollaborationModule --> ProjectsModule
    CollaborationModule --> RedisModule

    WebhooksModule --> ProjectsModule

    PipelinesModule --> ProjectsModule
    PipelinesModule --> RepositoriesModule

    SearchModule --> RepositoriesModule

    NotificationsModule --> RedisModule
    NotificationsModule --> EmailModule

    RaftClusterModule --> RaftModule

    GdprModule --> UsersModule
```

### 2.4.18 安全认证流程活动图

```mermaid
flowchart TD
    A[收到API请求] --> B{检查路由}

    B -->|公开路由| C[直接处理请求]
    B -->|受保护路由| D{检查Authorization Header}

    D -->|无Header| E[返回401 Unauthorized]
    D -->|有Header| F{Token类型}

    F -->|Bearer Token| G[JWT验证流程]
    F -->|Basic Auth| H[基础认证流程]
    F -->|API Token| I[API Token验证流程]

    G --> G1[解析JWT]
    G1 --> G2{签名验证}
    G2 -->|失败| E
    G2 -->|成功| G3{Token过期检查}
    G3 -->|已过期| E
    G3 -->|未过期| G4{Token版本检查}
    G4 -->|版本不匹配| E
    G4 -->|版本匹配| J[提取用户信息]

    H --> H1[解码Base64]
    H1 --> H2[查询用户]
    H2 --> H3{密码验证}
    H3 -->|失败| E
    H3 -->|成功| J

    I --> I1[查询API Token]
    I1 --> I2{Token存在且有效}
    I2 -->|否| E
    I2 -->|是| I3{检查权限范围}
    I3 -->|权限不足| K[返回403 Forbidden]
    I3 -->|权限足够| J

    J --> L{检查用户状态}
    L -->|已禁用| E
    L -->|正常| M{检查2FA}

    M -->|需要2FA且未验证| N[返回需要2FA验证]
    M -->|不需要或已验证| O{RBAC权限检查}

    O -->|无权限| K
    O -->|有权限| P[执行业务逻辑]

    P --> Q[记录审计日志]
    Q --> R[返回响应]

    C --> R
```

### 2.4.19 CI/CD流水线状态图

```mermaid
stateDiagram-v2
    [*] --> Pending : 创建Pipeline

    Pending --> Queued : 加入执行队列
    Pending --> Cancelled : 手动取消

    Queued --> Running : 开始执行
    Queued --> Cancelled : 手动取消

    state Running {
        [*] --> Stage1
        Stage1 : 阶段1 (构建)
        Stage1 --> Stage2 : 成功
        Stage1 --> StageFailed : 失败

        Stage2 : 阶段2 (测试)
        Stage2 --> Stage3 : 成功
        Stage2 --> StageFailed : 失败

        Stage3 : 阶段3 (部署)
        Stage3 --> StageSuccess : 成功
        Stage3 --> StageFailed : 失败

        StageFailed : 阶段失败
        StageSuccess : 所有阶段成功
    }

    Running --> Success : 所有阶段通过
    Running --> Failed : 任一阶段失败
    Running --> Cancelled : 手动取消

    Success --> [*]
    Failed --> [*]
    Cancelled --> [*]

    note right of Pending : 状态: PENDING
    note right of Running : 状态: RUNNING
    note right of Success : 状态: SUCCESS
    note right of Failed : 状态: FAILED
```

### 2.4.20 WebSocket实时通知时序图

```mermaid
sequenceDiagram
    participant Client as 前端客户端
    participant WSGateway as WebSocket网关
    participant AuthGuard as 认证守卫
    participant NotifyService as 通知服务
    participant Redis as Redis PubSub
    participant Database as PostgreSQL

    Client->>WSGateway: WebSocket连接请求
    WSGateway->>AuthGuard: 验证JWT Token

    alt Token无效
        AuthGuard-->>WSGateway: 认证失败
        WSGateway-->>Client: 关闭连接(4001)
    else Token有效
        AuthGuard-->>WSGateway: 认证成功(userId)
        WSGateway->>WSGateway: 注册用户连接
        WSGateway->>Redis: SUBSCRIBE user:{userId}:notifications
        WSGateway-->>Client: 连接成功

        loop 保持连接
            Client->>WSGateway: ping
            WSGateway-->>Client: pong
        end

        Note over NotifyService: 某处触发通知
        NotifyService->>Database: 创建通知记录
        NotifyService->>Redis: PUBLISH user:{userId}:notifications

        Redis-->>WSGateway: 收到消息
        WSGateway->>WSGateway: 查找用户连接
        WSGateway-->>Client: 推送通知消息

        Client->>WSGateway: 标记已读(notificationId)
        WSGateway->>NotifyService: markAsRead(id)
        NotifyService->>Database: 更新通知状态

        Client->>WSGateway: 断开连接
        WSGateway->>Redis: UNSUBSCRIBE
        WSGateway->>WSGateway: 移除用户连接
    end
```

### 2.4.21 Kubernetes部署架构图

```mermaid
graph TB
    subgraph "Internet"
        Users[用户请求]
    end

    subgraph "云服务商 Infrastructure"
        subgraph "Ingress Layer"
            Ingress[Nginx Ingress Controller<br/>SSL Termination<br/>Rate Limiting]
        end

        subgraph "Kubernetes Cluster"
            subgraph "Frontend Namespace"
                FrontDeploy[Deployment: frontend<br/>replicas: 3]
                FrontSvc[Service: frontend-svc<br/>ClusterIP]
                FrontHPA[HPA: 3-10 pods<br/>CPU > 70%]

                FrontPod1[Pod: next-1]
                FrontPod2[Pod: next-2]
                FrontPod3[Pod: next-3]
            end

            subgraph "Backend Namespace"
                BackDeploy[Deployment: backend<br/>replicas: 3]
                BackSvc[Service: backend-svc<br/>ClusterIP]
                BackHPA[HPA: 3-15 pods<br/>CPU > 70%]

                BackPod1[Pod: nest-1<br/>Raft Leader]
                BackPod2[Pod: nest-2<br/>Raft Follower]
                BackPod3[Pod: nest-3<br/>Raft Follower]
            end

            subgraph "Data Namespace"
                PGStateful[StatefulSet: postgresql<br/>replicas: 3]
                PGSvc[Service: postgres-svc<br/>Headless]

                PGMaster[Pod: pg-0<br/>Master]
                PGReplica1[Pod: pg-1<br/>Replica]
                PGReplica2[Pod: pg-2<br/>Replica]

                RedisStateful[StatefulSet: redis<br/>replicas: 3]
                RedisSvc[Service: redis-svc]

                MinIOStateful[StatefulSet: minio<br/>replicas: 4]
                MinIOSvc[Service: minio-svc]
            end

            subgraph "Monitoring Namespace"
                Prometheus[Prometheus]
                Grafana[Grafana]
                AlertManager[AlertManager]
            end
        end

        subgraph "Persistent Storage"
            PV1[PersistentVolume<br/>PostgreSQL Data]
            PV2[PersistentVolume<br/>MinIO Objects]
            PV3[PersistentVolume<br/>Redis AOF]
        end
    end

    Users --> Ingress
    Ingress --> FrontSvc
    Ingress --> BackSvc

    FrontSvc --> FrontPod1 & FrontPod2 & FrontPod3
    FrontDeploy --> FrontPod1 & FrontPod2 & FrontPod3
    FrontHPA -.-> FrontDeploy

    BackSvc --> BackPod1 & BackPod2 & BackPod3
    BackDeploy --> BackPod1 & BackPod2 & BackPod3
    BackHPA -.-> BackDeploy

    BackPod1 --> PGSvc
    BackPod1 --> RedisSvc
    BackPod1 --> MinIOSvc

    PGStateful --> PGMaster & PGReplica1 & PGReplica2
    PGMaster --> PV1

    MinIOStateful --> PV2
    RedisStateful --> PV3

    BackPod1 -.metrics.-> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager
```

### 2.4.22 前端React组件层级图

```mermaid
graph TB
    subgraph "App Layer"
        RootLayout[RootLayout<br/>providers, theme]
    end

    subgraph "Route Groups"
        AuthGroup["(auth) Group<br/>登录/注册布局"]
        DashGroup["(dashboard) Group<br/>主应用布局"]
        PublicGroup["(public) Group<br/>公开页面"]
    end

    subgraph "Auth Pages"
        LoginPage[LoginPage]
        RegisterPage[RegisterPage]
        ForgotPage[ForgotPasswordPage]
        OAuthCallback[OAuthCallbackPage]
    end

    subgraph "Dashboard Pages"
        HomePage[HomePage<br/>仪表盘]
        ProjectsPage[ProjectsPage<br/>项目列表]
        ProjectDetail[ProjectDetailPage]
        RepoPage[RepositoryPage<br/>代码浏览]
        IssuePage[IssuePage<br/>Issue详情]
        PRPage[PullRequestPage<br/>PR详情]
        SettingsPage[SettingsPage]
    end

    subgraph "Shared Components"
        subgraph "Layout Components"
            Navbar[Navbar]
            Sidebar[Sidebar]
            Footer[Footer]
            Breadcrumb[Breadcrumb]
        end

        subgraph "UI Components (Shadcn)"
            Button[Button]
            Dialog[Dialog]
            Form[Form]
            Table[Table]
            Card[Card]
            Toast[Toast]
            Dropdown[DropdownMenu]
        end

        subgraph "Feature Components"
            CodeViewer[CodeViewer<br/>Monaco Editor]
            DiffViewer[DiffViewer<br/>代码对比]
            FileTree[FileTree<br/>文件树]
            MarkdownRenderer[MarkdownRenderer]
            CommentThread[CommentThread]
            UserAvatar[UserAvatar]
            RepoCard[RepositoryCard]
            IssueList[IssueList]
            PRList[PullRequestList]
        end

        subgraph "Form Components"
            LoginForm[LoginForm]
            RegisterForm[RegisterForm]
            ProjectForm[ProjectForm]
            IssueForm[IssueForm]
            PRForm[PullRequestForm]
        end
    end

    subgraph "State Management"
        AuthContext[AuthContext<br/>用户认证状态]
        ThemeContext[ThemeContext<br/>主题状态]
        QueryClient[TanStack QueryClient<br/>服务器状态]
    end

    RootLayout --> AuthGroup & DashGroup & PublicGroup

    AuthGroup --> LoginPage & RegisterPage & ForgotPage & OAuthCallback
    DashGroup --> HomePage & ProjectsPage & ProjectDetail & RepoPage & IssuePage & PRPage & SettingsPage

    LoginPage --> LoginForm
    RegisterPage --> RegisterForm
    ProjectDetail --> FileTree & CodeViewer
    RepoPage --> FileTree & CodeViewer & DiffViewer
    IssuePage --> CommentThread & MarkdownRenderer
    PRPage --> DiffViewer & CommentThread

    DashGroup --> Navbar & Sidebar

    LoginForm & RegisterForm & ProjectForm --> Button & Form
    ProjectsPage --> RepoCard & Table
    IssuePage --> IssueList & Card

    AuthContext -.-> LoginPage & Navbar
    QueryClient -.-> ProjectsPage & RepoPage & IssuePage
```

### 2.4.23 RBAC三层权限模型图

```mermaid
graph TB
    subgraph "平台层 Platform Level"
        SuperAdmin[SUPER_ADMIN<br/>超级管理员]
        User[USER<br/>普通用户]
    end

    subgraph "组织层 Organization Level"
        OrgOwner[OWNER<br/>组织所有者]
        OrgAdmin[ADMIN<br/>组织管理员]
        OrgMember[MEMBER<br/>组织成员]
    end

    subgraph "团队层 Team Level"
        TeamMaintainer[MAINTAINER<br/>团队维护者]
        TeamMember[MEMBER<br/>团队成员]
    end

    subgraph "项目层 Project Level"
        ProjOwner[OWNER<br/>项目所有者]
        ProjMaintainer[MAINTAINER<br/>项目维护者]
        ProjMember[MEMBER<br/>项目成员]
        ProjViewer[VIEWER<br/>项目访客]
    end

    subgraph "权限继承 Permission Inheritance"
        direction LR
        P1[平台权限]
        P2[组织权限]
        P3[团队权限]
        P4[项目权限]

        P1 --> P2 --> P3 --> P4
    end

    subgraph "权限矩阵 Permission Matrix"
        subgraph "项目操作"
            CreateProj[创建项目]
            DeleteProj[删除项目]
            ManageMembers[管理成员]
            PushCode[推送代码]
            CreatePR[创建PR]
            MergePR[合并PR]
            ViewCode[查看代码]
        end
    end

    SuperAdmin -->|全局管理| OrgOwner
    User -->|创建/加入| OrgMember

    OrgOwner -->|创建团队| TeamMaintainer
    OrgAdmin -->|管理成员| TeamMember
    OrgMember -->|加入团队| TeamMember

    TeamMaintainer -->|分配项目| ProjMaintainer
    TeamMember -->|继承权限| ProjMember

    OrgOwner --> CreateProj
    ProjOwner --> DeleteProj & ManageMembers
    ProjMaintainer --> MergePR
    ProjMember --> PushCode & CreatePR
    ProjViewer --> ViewCode

    style SuperAdmin fill:#ff6b6b
    style OrgOwner fill:#feca57
    style TeamMaintainer fill:#48dbfb
    style ProjOwner fill:#1dd1a1
```

### 2.4.24 数据库读写分离架构图

```mermaid
graph TB
    subgraph "Application Layer"
        App1[NestJS Pod 1]
        App2[NestJS Pod 2]
        App3[NestJS Pod 3]
    end

    subgraph "Prisma Layer"
        PrismaWrite[Prisma Client<br/>Write Operations]
        PrismaRead[Prisma Client<br/>Read Operations]
    end

    subgraph "Connection Pool"
        WritePool[Write Pool<br/>max: 10 connections]
        ReadPool[Read Pool<br/>max: 30 connections]
    end

    subgraph "PostgreSQL Cluster"
        subgraph "Primary Node"
            PGMaster[(PostgreSQL Primary<br/>Port 5432)]
            WAL[WAL Sender]
        end

        subgraph "Replica Nodes"
            PGReplica1[(PostgreSQL Replica 1<br/>Port 5433)]
            PGReplica2[(PostgreSQL Replica 2<br/>Port 5434)]
        end

        subgraph "Replication"
            StreamRep[Streaming Replication<br/>同步复制]
        end
    end

    subgraph "PgBouncer Load Balancer"
        PgBouncerWrite[PgBouncer Write<br/>Transaction Mode]
        PgBouncerRead[PgBouncer Read<br/>Session Mode]
    end

    subgraph "Monitoring"
        PGMonitor[pg_stat_replication<br/>复制监控]
        Lag[Replication Lag<br/>延迟监控]
    end

    App1 & App2 & App3 --> PrismaWrite & PrismaRead

    PrismaWrite --> WritePool
    PrismaRead --> ReadPool

    WritePool --> PgBouncerWrite
    ReadPool --> PgBouncerRead

    PgBouncerWrite --> PGMaster
    PgBouncerRead --> PGReplica1 & PGReplica2

    PGMaster --> WAL
    WAL --> StreamRep
    StreamRep --> PGReplica1 & PGReplica2

    PGMaster -.-> PGMonitor
    StreamRep -.-> Lag
```

### 2.4.25 Git Flow分支管理策略图

```mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Setup project"

    branch feature/auth
    checkout feature/auth
    commit id: "Add login"
    commit id: "Add register"
    checkout develop
    merge feature/auth id: "Merge auth" tag: "v0.1.0-dev"

    branch feature/projects
    checkout feature/projects
    commit id: "Add CRUD"
    commit id: "Add members"

    checkout develop
    branch feature/git-protocol
    commit id: "Add clone"
    commit id: "Add push"

    checkout develop
    merge feature/projects id: "Merge projects"
    merge feature/git-protocol id: "Merge git"

    checkout main
    merge develop id: "Release v1.0" tag: "v1.0.0"

    branch hotfix/security
    checkout hotfix/security
    commit id: "Fix XSS"
    checkout main
    merge hotfix/security id: "Hotfix" tag: "v1.0.1"
    checkout develop
    merge hotfix/security id: "Sync hotfix"

    checkout develop
    branch feature/issues
    commit id: "Add issues"
    commit id: "Add labels"
    checkout develop
    merge feature/issues

    checkout main
    merge develop id: "Release v1.1" tag: "v1.1.0"
```

### 2.4.26 微服务通信架构图

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application]
        GitClient[Git Client]
        APIClient[API Client]
    end

    subgraph "Gateway Layer"
        APIGateway[API Gateway<br/>NestJS]
        GitGateway[Git HTTP Gateway]
    end

    subgraph "Service Layer"
        subgraph "Core Services"
            AuthSvc[Auth Service<br/>认证授权]
            UserSvc[User Service<br/>用户管理]
            OrgSvc[Organization Service<br/>组织管理]
        end

        subgraph "Repository Services"
            ProjectSvc[Project Service<br/>项目管理]
            RepoSvc[Repository Service<br/>仓库管理]
            GitSvc[Git Service<br/>Git协议]
        end

        subgraph "Collaboration Services"
            IssueSvc[Issue Service<br/>Issue追踪]
            PRSvc[PR Service<br/>代码审查]
            WikiSvc[Wiki Service<br/>文档管理]
        end

        subgraph "Infrastructure Services"
            NotifySvc[Notification Service<br/>通知推送]
            SearchSvc[Search Service<br/>代码搜索]
            AuditSvc[Audit Service<br/>审计日志]
        end

        subgraph "Consensus Layer"
            RaftSvc[Raft Service<br/>分布式共识]
        end
    end

    subgraph "Message Bus"
        EventBus[Event Bus<br/>Redis Pub/Sub]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
        MinIO[(MinIO)]
        MeiliSearch[(MeiliSearch)]
    end

    WebApp --> APIGateway
    GitClient --> GitGateway
    APIClient --> APIGateway

    APIGateway --> AuthSvc & UserSvc & ProjectSvc & IssueSvc & PRSvc
    GitGateway --> GitSvc

    AuthSvc --> UserSvc
    ProjectSvc --> OrgSvc
    RepoSvc --> GitSvc
    IssueSvc --> ProjectSvc
    PRSvc --> RepoSvc

    GitSvc --> RaftSvc
    ProjectSvc --> RaftSvc

    AuthSvc & UserSvc --> PostgreSQL & Redis
    ProjectSvc & RepoSvc --> PostgreSQL & MinIO
    IssueSvc & PRSvc --> PostgreSQL
    SearchSvc --> MeiliSearch
    NotifySvc --> Redis

    IssueSvc & PRSvc -.-> EventBus
    EventBus -.-> NotifySvc
    EventBus -.-> SearchSvc
    EventBus -.-> AuditSvc
```

### 2.4.27 用户会话管理状态图

```mermaid
stateDiagram-v2
    [*] --> Anonymous : 访问网站

    state Anonymous {
        [*] --> Browsing
        Browsing --> LoginPage : 点击登录
        Browsing --> RegisterPage : 点击注册
    }

    Anonymous --> Authenticating : 提交凭据

    state Authenticating {
        [*] --> ValidatingCredentials
        ValidatingCredentials --> CheckingMFA : 凭据正确
        ValidatingCredentials --> AuthFailed : 凭据错误

        CheckingMFA --> MFARequired : 启用了2FA
        CheckingMFA --> AuthSuccess : 未启用2FA

        MFARequired --> ValidatingTOTP
        ValidatingTOTP --> AuthSuccess : TOTP正确
        ValidatingTOTP --> AuthFailed : TOTP错误
    }

    AuthFailed --> Anonymous : 返回登录

    AuthSuccess --> Authenticated : 创建Session

    state Authenticated {
        [*] --> Active

        Active --> Active : API请求<br/>刷新lastActivity
        Active --> TokenRefresh : Access Token过期
        Active --> Idle : 15分钟无活动

        TokenRefresh --> Active : 刷新成功
        TokenRefresh --> SessionExpired : Refresh Token过期

        Idle --> Active : 恢复活动
        Idle --> SessionExpired : 30分钟无活动

        Active --> DeviceLogout : 从其他设备登出
        Active --> PasswordChanged : 密码被修改
        Active --> ManualLogout : 主动登出
    }

    SessionExpired --> Anonymous : 重定向登录
    DeviceLogout --> Anonymous : Token版本失效
    PasswordChanged --> Anonymous : Token版本递增
    ManualLogout --> Anonymous : 清除Session

    state SessionStorage {
        Redis : Redis存储
        --
        SessionID : 会话ID
        UserID : 用户ID
        TokenVersion : Token版本
        DeviceInfo : 设备信息
        IPAddress : IP地址
        ExpiresAt : 过期时间
    }

    Authenticated --> SessionStorage : 存储会话
```

### 2.4.28 文件上传处理活动图

```mermaid
flowchart TD
    A[开始上传] --> B{文件验证}

    B -->|大小超限| C[返回错误: 文件过大]
    B -->|类型不允许| D[返回错误: 不支持的文件类型]
    B -->|验证通过| E[计算文件Hash]

    E --> F{检查重复}
    F -->|已存在相同文件| G[返回已有文件引用]
    F -->|新文件| H{文件大小判断}

    H -->|小于5MB| I[单次上传]
    H -->|大于5MB| J[分片上传]

    I --> K[上传到MinIO]

    J --> J1[分割文件为chunks]
    J1 --> J2[并行上传chunks]
    J2 --> J3{所有chunks上传成功?}
    J3 -->|否| J4[重试失败的chunks]
    J4 --> J3
    J3 -->|是| J5[合并chunks]
    J5 --> K

    K --> L{上传成功?}
    L -->|否| M[返回错误: 上传失败]
    L -->|是| N[创建File记录]

    N --> O[更新Repository存储统计]
    O --> P[触发搜索索引]
    P --> Q[发送Webhook事件]
    Q --> R[返回文件信息]

    C --> Z[结束]
    D --> Z
    G --> Z
    M --> Z
    R --> Z

    subgraph "MinIO存储策略"
        K --> K1[Bucket: repositories]
        K1 --> K2[路径: /{repoId}/{commitId}/{path}]
        K2 --> K3[设置Content-Type]
        K3 --> K4[设置Cache-Control]
    end

    subgraph "安全检查"
        B --> B1[文件大小 ≤ 100MB]
        B1 --> B2[MIME类型白名单]
        B2 --> B3[文件名sanitize]
        B3 --> B4[病毒扫描-可选]
    end
```

### 2.4.29 API请求生命周期时序图

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Middleware as 中间件层
    participant Guard as 守卫层
    participant Interceptor as 拦截器
    participant Pipe as 管道层
    participant Controller as 控制器
    participant Service as 服务层
    participant DB as 数据库

    Client->>Middleware: HTTP请求

    Note over Middleware: 1. 中间件处理
    Middleware->>Middleware: HelmetMiddleware (安全Headers)
    Middleware->>Middleware: CorsMiddleware (跨域)
    Middleware->>Middleware: CompressionMiddleware (压缩)
    Middleware->>Middleware: LoggerMiddleware (日志)

    Middleware->>Guard: 传递请求

    Note over Guard: 2. 守卫验证
    Guard->>Guard: ThrottlerGuard (限流检查)

    alt 限流触发
        Guard-->>Client: 429 Too Many Requests
    end

    Guard->>Guard: JwtAuthGuard (JWT验证)

    alt Token无效
        Guard-->>Client: 401 Unauthorized
    end

    Guard->>Guard: RolesGuard (角色检查)

    alt 权限不足
        Guard-->>Client: 403 Forbidden
    end

    Guard->>Interceptor: 传递请求

    Note over Interceptor: 3. 拦截器 (前置)
    Interceptor->>Interceptor: LoggingInterceptor (记录请求)
    Interceptor->>Interceptor: TimeoutInterceptor (超时控制)

    Interceptor->>Pipe: 传递请求

    Note over Pipe: 4. 管道验证
    Pipe->>Pipe: ValidationPipe (DTO验证)

    alt 验证失败
        Pipe-->>Client: 400 Bad Request
    end

    Pipe->>Pipe: ParseIntPipe (参数转换)

    Pipe->>Controller: 传递验证后的请求

    Note over Controller: 5. 控制器处理
    Controller->>Service: 调用业务逻辑

    Note over Service: 6. 服务层处理
    Service->>DB: 数据库操作
    DB-->>Service: 返回数据
    Service-->>Controller: 返回结果

    Controller-->>Interceptor: 返回响应

    Note over Interceptor: 7. 拦截器 (后置)
    Interceptor->>Interceptor: TransformInterceptor (响应转换)
    Interceptor->>Interceptor: LoggingInterceptor (记录响应)

    Interceptor-->>Client: HTTP响应
```

### 2.4.30 Raft日志复制详细时序图

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Leader as Leader节点
    participant F1 as Follower-1
    participant F2 as Follower-2
    participant Log as 日志存储
    participant SM as 状态机

    Client->>Leader: 写请求 (CreateProject)

    Note over Leader: 1. Leader接收请求
    Leader->>Leader: 验证是否为Leader

    Leader->>Log: 追加日志条目<br/>term=3, index=5
    Log-->>Leader: 写入成功

    Note over Leader: 2. 并行复制到Followers

    par 复制到Follower-1
        Leader->>F1: AppendEntries RPC<br/>prevLogIndex=4<br/>prevLogTerm=3<br/>entries=[{term:3,cmd:CreateProject}]

        F1->>F1: 检查prevLogIndex/Term

        alt 日志一致
            F1->>Log: 追加日志条目
            Log-->>F1: 写入成功
            F1-->>Leader: success=true, matchIndex=5
        else 日志不一致
            F1-->>Leader: success=false
            Note over Leader: 回退nextIndex重试
        end
    and 复制到Follower-2
        Leader->>F2: AppendEntries RPC
        F2->>F2: 检查日志一致性
        F2->>Log: 追加日志条目
        F2-->>Leader: success=true, matchIndex=5
    end

    Note over Leader: 3. 计算提交索引
    Leader->>Leader: matchIndex排序<br/>[5, 5, 5]<br/>majority = 5

    Leader->>Leader: 更新commitIndex = 5

    Note over Leader: 4. 应用到状态机
    Leader->>SM: 应用 index 5 的命令
    SM->>SM: 执行 CreateProject
    SM-->>Leader: 返回结果

    Leader-->>Client: 200 OK {project}

    Note over Leader: 5. 心跳通知Followers提交

    par 心跳到Follower-1
        Leader->>F1: AppendEntries (heartbeat)<br/>leaderCommit=5
        F1->>F1: 更新commitIndex = min(5, lastLogIndex)
        F1->>SM: 应用已提交日志
        F1-->>Leader: success=true
    and 心跳到Follower-2
        Leader->>F2: AppendEntries (heartbeat)<br/>leaderCommit=5
        F2->>SM: 应用已提交日志
        F2-->>Leader: success=true
    end
```

---

# 第3章 总    结

## 3.1 完成情况总结

### 任务完成度

本课程设计项目已完成以下主要工作：

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 用户认证系统 | 100% | JWT认证、OAuth、2FA、密码重置、邮箱验证 |
| 组织/团队管理 | 100% | 完整的三层权限架构 |
| 项目管理 | 100% | CRUD、权限、归档、设置 |
| Git版本控制 | 100% | HTTP Smart Protocol完整实现 |
| Issue追踪 | 100% | 完整的Issue生命周期管理 |
| Pull Request | 100% | 三种合并策略、代码审查 |
| 代码搜索 | 100% | 基于MeiliSearch的全文搜索 |
| 通知系统 | 100% | WebSocket实时通知 + 邮件 |
| Raft共识 | 100% | Leader选举、日志复制、安全性保证 |
| CI/CD流水线 | 100% | 配置和执行功能 |
| Wiki文档 | 100% | 层级文档、版本历史 |
| Webhook | 100% | 事件推送、重试机制 |
| 安全审计 | 100% | 完整审计日志、SOC2合规 |

**总体完成度：100%**

### 遇到的问题及解决方法

#### 问题1：Raft算法的日志一致性保证

**问题描述**：在实现Raft日志复制时，发现在网络分区恢复后可能出现日志不一致的情况。

**解决方案**：
1. 严格按照Raft论文实现日志一致性检查
2. 在AppendEntries RPC中增加prevLogIndex和prevLogTerm校验
3. 实现日志回退机制，逐步同步不一致的日志
4. 添加详细的日志追踪，便于调试

#### 问题2：Git HTTP协议的认证集成

**问题描述**：Git客户端与Web应用使用不同的认证方式，需要统一处理。

**解决方案**：
1. 实现HTTP Basic Authentication解析
2. 将Git请求与JWT Token验证系统集成
3. 支持API Token作为Git密码使用
4. 添加权限检查中间件

#### 问题3：大文件上传和存储优化

**问题描述**：代码仓库可能包含大量文件，需要优化存储和传输性能。

**解决方案**：
1. 使用MinIO对象存储，支持分片上传
2. 实现内容寻址存储，去除重复文件
3. 添加文件压缩和缓存机制
4. 实现流式传输，减少内存占用

### 主要收获

1. **系统性掌握UML建模技术**：通过实际项目应用，深入理解了用例图、类图、时序图、活动图、状态图和组件图的使用场景和绘制方法。

2. **分布式系统实战经验**：实现Raft共识算法让我对分布式系统的一致性、可用性和分区容错性有了切身体会。

3. **全栈开发能力提升**：TypeScript全栈开发、数据库设计、API设计、前端状态管理等能力得到全面锻炼。

4. **工程化实践**：Monorepo管理、Docker容器化、CI/CD流程等现代软件工程实践经验的积累，为未来参与企业级项目开发奠定了坚实基础。

5. **安全意识提升**：通过实现JWT认证、OAuth集成、2FA双因素认证、CSRF防护、Rate Limiting等安全机制，深刻理解了Web应用安全的重要性和实现方法。

6. **实时系统设计**：WebSocket实时通知、协作编辑（OT算法）等功能的实现，让我掌握了实时系统的设计思路和技术实现。

## 3.2 团队合作

### 3.2.1 团队分工

本项目采用敏捷开发模式，团队成员根据各自专长进行分工：

| 成员角色 | 主要职责 | 负责模块 |
|---------|---------|---------|
| 项目负责人 | 架构设计、技术选型、进度把控 | Raft共识、系统架构 |
| 后端开发 | API设计、业务逻辑实现 | 认证、项目管理、Git协议 |
| 前端开发 | 界面设计、交互实现 | 用户界面、状态管理 |
| 测试工程师 | 测试用例设计、质量保证 | 单元测试、E2E测试 |
| 文档工程师 | 需求分析、文档编写 | 需求文档、设计文档 |

### 3.2.2 协作工具和流程

**开发协作工具：**
- **代码管理**：Git + GitHub，采用Git Flow分支管理策略
- **项目管理**：GitHub Projects看板，跟踪任务进度
- **文档协作**：Markdown文档，版本化管理
- **即时通讯**：微信群组，快速沟通问题

**开发流程：**
1. **需求评审**：每周一进行需求评审，明确当周开发任务
2. **技术方案**：复杂功能先输出技术设计文档
3. **代码审查**：所有代码通过Pull Request合并，至少一人审核
4. **持续集成**：提交代码自动触发CI流水线，确保代码质量
5. **迭代回顾**：每周五进行迭代回顾，总结经验教训

### 3.2.3 团队协作经验总结

1. **沟通的重要性**：定期的技术讨论和代码审查有效减少了返工，提高了开发效率。

2. **文档先行**：在编码前先完成设计文档，有助于理清思路，也便于团队成员理解设计意图。

3. **模块化分工**：清晰的模块边界和接口定义，使得并行开发成为可能，大大缩短了开发周期。

4. **持续集成的价值**：自动化测试和代码检查帮助我们在早期发现问题，避免了后期大规模重构。

## 3.3 不足与下一步改进

### 3.3.1 当前不足

#### 技术层面

1. **Raft算法简化**
   - 未实现日志压缩（Snapshot）功能，长期运行后日志会无限增长
   - 未实现动态成员变更，集群规模固定
   - 性能优化空间较大，未实现批量日志复制

2. **前端性能优化**
   - 大型仓库文件列表渲染性能有待优化
   - 代码差异对比（Diff）在大文件时加载较慢
   - 缺少Service Worker离线缓存支持

3. **测试覆盖不完整**
   - 单元测试覆盖率约70%，未达到80%目标
   - E2E测试用例覆盖主要流程，但边界情况不足
   - 缺少性能测试和压力测试

4. **安全审计**
   - 未进行专业的安全渗透测试
   - 部分API缺少细粒度的权限控制
   - 日志脱敏策略需要进一步完善

#### 功能层面

1. **代码审查功能**
   - 缺少内联代码建议功能
   - 不支持代码审查模板
   - 缺少自动分配审查者功能

2. **协作功能**
   - 实时协作编辑仅支持文本文件
   - 缺少视频会议集成
   - 缺少项目看板（Kanban）功能

3. **运维功能**
   - 缺少完善的监控告警系统
   - 缺少自动化运维脚本
   - 备份恢复功能需要增强

### 3.3.2 改进计划

#### 短期改进（1-2个月）

| 优先级 | 改进项 | 预期效果 |
|--------|--------|---------|
| P0 | 实现Raft日志压缩 | 解决日志无限增长问题 |
| P0 | 提升测试覆盖率至80% | 保证代码质量 |
| P1 | 优化大文件Diff性能 | 提升用户体验 |
| P1 | 添加监控告警系统 | 及时发现和处理问题 |

#### 中期改进（3-6个月）

| 优先级 | 改进项 | 预期效果 |
|--------|--------|---------|
| P1 | 实现Raft动态成员变更 | 支持集群弹性伸缩 |
| P1 | 添加代码审查模板 | 规范审查流程 |
| P2 | 实现项目看板功能 | 增强项目管理能力 |
| P2 | 添加PWA离线支持 | 改善弱网体验 |

#### 长期规划（6-12个月）

1. **架构演进**
   - 向微服务架构演进，提升系统可扩展性
   - 引入消息队列（Kafka/RabbitMQ），解耦服务
   - 实现多区域部署，提升可用性

2. **功能扩展**
   - 集成AI代码审查助手
   - 支持更多编程语言的语法高亮和智能提示
   - 开发移动端应用

3. **生态建设**
   - 开放API，支持第三方插件
   - 建设开发者社区
   - 提供企业版和私有化部署方案

### 3.3.3 技术债务管理

在项目开发过程中，为了快速迭代，不可避免地积累了一些技术债务。我们制定了以下技术债务管理策略：

1. **债务记录**：在代码中使用`// TODO:`和`// FIXME:`标记待改进点
2. **定期清理**：每个迭代预留20%时间处理技术债务
3. **重构计划**：对于较大的技术债务，制定专门的重构计划
4. **代码质量门禁**：新代码必须通过lint检查和测试，避免增加新债务

---

# 参考文献

[1] Ongaro D, Ousterhout J. In search of an understandable consensus algorithm[C]//2014 USENIX Annual Technical Conference (USENIX ATC 14). 2014: 305-319.

[2] Torvalds L, Hamano J. Git: Fast version control system[J]. URL http://git-scm.com, 2010.

[3] Chacon S, Straub B. Pro git[M]. Apress, 2014.

[4] 王达. Git版本控制管理[M]. 人民邮电出版社, 2015.

[5] Lamport L. Paxos made simple[J]. ACM Sigact News, 2001, 32(4): 18-25.

[6] Howard H, Malkhi D, Spiegelman A. Flexible paxos: Quorum intersection revisited[C]//20th International Conference on Principles of Distributed Systems (OPODIS 2016). Schloss Dagstuhl-Leibniz-Zentrum fuer Informatik, 2017.

[7] 黄东旭, 刘奇. TiDB: A Raft-based HTAP Database[J]. Proceedings of the VLDB Endowment, 2020, 13(12): 3072-3084.

[8] Kleppmann M. Designing data-intensive applications: The big ideas behind reliable, scalable, and maintainable systems[M]. O'Reilly Media, Inc., 2017.

[9] Newman S. Building microservices: designing fine-grained systems[M]. O'Reilly Media, Inc., 2021.

[10] Gitee. Gitee企业级DevOps平台技术白皮书[R]. 深圳市奥思网络科技有限公司, 2023.

[11] Rahman M M, Roy C K. An empirical study of developer discussions on GitHub pull requests[J]. Empirical Software Engineering, 2021, 26(3): 1-35.

[12] Booch G, Rumbaugh J, Jacobson I. The unified modeling language user guide[M]. Addison-Wesley Professional, 2005.

[13] Fowler M. UML distilled: a brief guide to the standard object modeling language[M]. Addison-Wesley Professional, 2004.

[14] 邵维忠, 杨芙清. 面向对象的系统分析[M]. 清华大学出版社, 2006.

[15] Burns B, Grant B, Oppenheimer D, et al. Borg, omega, and kubernetes[J]. Communications of the ACM, 2016, 59(5): 50-57.

[16] Shapiro M, Preguiça N, Baquero C, et al. Conflict-free replicated data types[C]//Symposium on Self-Stabilizing Systems. Springer, Berlin, Heidelberg, 2011: 386-400.

---

**文档结束**