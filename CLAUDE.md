# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📑 Table of Contents

- [Quick Reference](#-quick-reference)
- [Project Overview](#-project-overview)
- [Prerequisites](#prerequisites)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Common Commands](#-common-commands)
- [Architecture Overview](#-architecture-overview)
- [Key Features](#-key-features)
- [Development Workflow](#-development-workflow)
- [Documentation Index](#-documentation-index)
- [Troubleshooting](#-troubleshooting)
- [Important Notes](#-important-notes)

---

## 🚀 Quick Reference

### 📊 Project Status
- **Version**: v1.0.0-MVP
- **Phase 1**: ✅ 100% Complete
- **Last Updated**: 2025-10-31
- **Statistics**: 166 API Endpoints | 36 Frontend Pages | 12,534 Lines Test Code

### 🔌 Service Ports
| Service | Port(s) | Access |
|---------|---------|--------|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 4000 | http://localhost:4000/api |
| Swagger Docs | 4000 | http://localhost:4000/api/docs |
| Website (Marketing) | 3003 | http://localhost:3003 |
| PostgreSQL | 5434 → 5432 | localhost:5434 |
| Redis | 6380 → 6379 | localhost:6380 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| MeiliSearch | 7700 | http://localhost:7700 |

### ⚡ Essential Commands
```bash
# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d

# Start dev environment
pnpm dev

# Run tests
cd apps/frontend && pnpm test        # Playwright E2E
cd apps/backend && pnpm test         # Jest unit tests

# Database operations
cd apps/backend && pnpm prisma migrate dev
cd apps/backend && pnpm prisma studio
```

### 🏗️ Architecture Quick View
```
Monorepo (pnpm workspace)
├── apps/backend    (NestJS 11 + Prisma 6 + PostgreSQL 16)
├── apps/frontend   (Next.js 15.5 + React 19 + Tailwind CSS 4)
└── website/        (Next.js - Marketing site, separate workspace)
```

---

## 📖 Project Overview

**Flotilla** - A cloud-based code hosting and collaboration platform with distributed consensus algorithm (simplified Raft).

**Brand Mission**: *"We don't just host code. We build consensus."*

**Status**: ✅ Phase 1 - Foundation (100% Complete)
- **Sprint 1** ✅: Issue Tracking System
- **Sprint 2** ✅: Code Search with MeiliSearch
- **Sprint 3** ✅: Git HTTP Smart Protocol & Pull Request System

**Roadmap**: See [ROADMAP_2025.md](./docs/ROADMAP_2025.md) for 24-month strategic plan

---

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Docker** & Docker Compose

---

## 💻 Tech Stack

### Monorepo Structure
| App | Tech Stack | Description |
|-----|------------|-------------|
| `apps/backend` | NestJS 11 + Prisma 6 | Main API server (port 4000) |
| `apps/frontend` | Next.js 15.5 + React 19 | Web application (port 3000) |
| `website/` | Next.js | Marketing/landing page (port 3003, separate workspace) |
| `packages/` | - | Reserved for future shared packages (currently empty) |

### Frontend Stack
| Category | Technology | Usage |
|----------|-----------|-------|
| Framework | Next.js 15.5 + Turbopack | SSR/SSG with App Router |
| UI Library | React 19 | Latest React features |
| Styling | Tailwind CSS 4 | Utility-first CSS with `@theme` directive |
| Components | Shadcn/ui (80%) + Mantine 7.15 (20%) | Radix UI based + enterprise features |
| Code Editor | Monaco Editor | Syntax highlighting & IntelliSense |
| State Management | TanStack Query 5 + React Context | Server state + UI state |
| Visualization | React Flow + Recharts | Node graphs + charts |
| i18n | Custom React Context | zh/en support with localStorage |
| Testing | Playwright | E2E testing framework |

**Note**: Zustand is installed but currently unused.

### Backend Stack
| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | NestJS 11 | Progressive Node.js framework |
| Database | PostgreSQL 16 (port 5434) | Primary database |
| ORM | Prisma 6 | Type-safe database client |
| Auth | Passport + JWT | Authentication strategy |
| Cache | Redis 7 (port 6380) | Session storage & caching |
| Storage | MinIO (ports 9000/9001) | S3-compatible object storage |
| Search | MeiliSearch 1.10 (port 7700) | Full-text code search engine |
| API Docs | Swagger | Auto-generated OpenAPI docs |

### Docker Infrastructure
**Container Naming**: All containers use `flotilla-*` prefix
- Infrastructure: `flotilla-postgres`, `flotilla-redis`, `flotilla-minio`
- Applications: `flotilla-backend`, `flotilla-frontend`, `flotilla-website`

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies
```bash
pnpm install
```

### 2️⃣ Start Infrastructure
```bash
# Start PostgreSQL + Redis + MinIO + MeiliSearch
docker-compose up -d

# With read-write separation (optional)
docker-compose --profile replica up -d
```

### 3️⃣ Initialize Database
```bash
cd apps/backend
pnpm prisma migrate dev
cd ../..
```

### 4️⃣ Start Development Servers
```bash
# Start both frontend and backend in parallel
pnpm dev

# Or start individually
pnpm --filter backend dev    # Backend on http://localhost:4000
pnpm --filter frontend dev   # Frontend on http://localhost:3000

# Marketing website (separate workspace)
cd website && pnpm dev       # Website on http://localhost:3003
```

---

## 🔧 Common Commands

### Backend Commands (`apps/backend`)
```bash
cd apps/backend

# Development
pnpm start:dev              # Watch mode
pnpm start:debug            # Debug mode with --inspect

# Database
pnpm prisma migrate dev     # Create and apply migration
pnpm prisma studio          # Open Prisma Studio GUI
pnpm prisma generate        # Regenerate Prisma Client
pnpm migrate:to-organizations  # Migration script for org structure

# Testing
pnpm test                   # Run unit tests (Jest)
pnpm test:watch             # Watch mode
pnpm test:cov               # With coverage
pnpm test:e2e               # E2E tests

# Build
pnpm build                  # Compile TypeScript
pnpm start:prod             # Run production build

# Raft Consensus Algorithm
pnpm raft:demo              # Run Raft demo with 3-node cluster
pnpm raft:test              # Run Raft cluster tests
pnpm raft:performance       # Run Raft performance benchmarks
```

**Available Raft test files**:
- `raft-demo.ts` - Full demo with 3-node cluster
- `raft-simple-test.ts` - Basic functionality test
- `raft-core-verify.ts` - Core algorithm verification
- `raft-git-test.ts` - Git integration test

### Frontend Commands (`apps/frontend`)
```bash
cd apps/frontend

# Development
pnpm dev                    # Next.js with Turbopack

# Testing
pnpm test                   # Run all Playwright tests
pnpm test:ui                # Interactive UI mode
pnpm test:debug             # Debug mode
pnpm test:report            # View test report

# Run specific test file
pnpm exec playwright test tests/auth/login.spec.ts
pnpm exec playwright test tests/settings/settings.spec.ts --retries=2

# Build
pnpm build                  # Production build
pnpm start                  # Serve production build
```

**Available test suites**:
- `tests/auth/` - login, register
- `tests/organizations/` - organization CRUD, members, teams
- `tests/teams/` - team CRUD, members, permissions
- `tests/admin/` - admin panel
- `tests/projects/` - project operations
- `tests/search/` - code search features
- `tests/pull-requests/` - PR workflow, review, merge

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Database backup/restore
docker exec flotilla-postgres pg_dump -U devplatform cloud_dev_platform > backup.sql
docker exec -i flotilla-postgres psql -U devplatform cloud_dev_platform < backup.sql
```

---

## 🏗️ Architecture Overview

### Backend Module Structure
```
apps/backend/src/
├── auth/              # JWT authentication, Passport strategies
│   ├── decorators/    # @Public, @CurrentUser
│   ├── guards/        # JwtAuthGuard, RolesGuard
│   └── strategies/    # JWT, Local strategies
├── users/             # User management
├── organizations/     # Organization CRUD & member management
│   ├── decorators/    # @RequireOrgRole
│   ├── guards/        # OrganizationRoleGuard
│   └── dto/           # Organization DTOs
├── teams/             # Team CRUD, members, permissions
│   ├── decorators/    # @RequireTeamRole
│   ├── guards/        # TeamRoleGuard
│   └── dto/           # Team DTOs
├── projects/          # Project CRUD operations
├── repositories/      # Git repository management
├── files/             # File upload/download (MinIO)
├── admin/             # Admin panel endpoints
├── issues/            # Issue tracking (Labels, Milestones, Comments)
├── pull-requests/     # PR workflow, reviews, merge
├── git/               # Git HTTP Smart Protocol (11 endpoints)
├── search/            # Code search with MeiliSearch
│   ├── parsers/       # TypeScript/Python/Java symbol extractors
│   └── utils/         # Language detection, file filtering
├── notifications/     # Notification system with WebSocket
├── branch-protection/ # Branch protection rules
├── raft/              # Core Raft consensus algorithm
├── raft-cluster/      # Raft cluster management & WebSocket gateway
├── monitoring/        # System monitoring & performance metrics
├── minio/             # MinIO client service
├── prisma/            # Prisma service wrapper
└── common/            # Shared utilities, filters, interceptors
```

**Key Backend Patterns**:
- **Module-based architecture**: Controller/Service/Module per feature
- **JWT authentication**: `@UseGuards(JwtAuthGuard)` for protected routes, `@Public()` for public
- **DTO validation**: `class-validator` + `class-transformer`
- **Swagger documentation**: `@ApiTags()`, `@ApiOperation()` decorators

### Frontend Structure
```
apps/frontend/src/
├── app/               # Next.js App Router pages
│   ├── (auth)/        # Login, register pages
│   ├── search/        # Global code search
│   ├── projects/[id]/ # Project pages
│   │   ├── search/    # Project-scoped search
│   │   ├── issues/    # Issue tracking
│   │   ├── pulls/     # Pull requests
│   │   └── files/     # File browser
│   ├── organizations/[slug]/ # Organization management
│   │   └── teams/[teamSlug]/ # Team detail pages
│   └── layout.tsx     # Root layout
├── components/        # Reusable React components
│   ├── search/        # SearchBar, SearchResultItem, SearchFilters
│   ├── pull-requests/ # DiffFileView, ReviewSummaryCard
│   ├── editor/        # Monaco Editor wrapper
│   ├── organizations/ # MembersTab, TeamsTab, SettingsTab
│   ├── teams/         # MembersTab, PermissionsTab, CreateTeamDialog
│   └── ui/            # Shadcn/ui components
├── contexts/          # React Context providers (auth, language, theme)
├── lib/               # Utilities and API client
│   └── api.ts         # Centralized fetch wrapper
├── locales/           # i18n translation files (zh.ts, en.ts)
└── types/             # TypeScript type definitions
```

**Key Frontend Patterns**:
- **App Router**: Next.js 15 with Server Components
- **API client**: Centralized `api.ts` with error handling
- **Form validation**: `react-hook-form` + `zod`
- **State management**:
  - Server state: TanStack Query (Raft monitoring)
  - UI state: React Context (auth, language, theme)
- **i18n**: Nested keys like `t.section.subsection.field`, dynamic content via `.replace()`
- **Theme**: Dark/Light mode with `next-themes`, Monaco Editor sync

### Database Schema (Prisma)

**Location**: `apps/backend/prisma/schema.prisma`

**Core Models**:
- **User**: Authentication and profile
- **Organization**: Organization metadata (with `isPersonal` flag)
- **OrganizationMember**: Join table with roles (OWNER/ADMIN/MEMBER)
- **Team**: Team metadata (belongs to organization)
- **TeamMember**: Join table with roles (MAINTAINER/MEMBER)
- **Project**: Project metadata
- **Repository**: Git repository information
- **File**: File metadata with MinIO storage paths
- **Issue**: Issue tracking with labels, milestones
- **PullRequest**: PR workflow with reviews, comments
- **SearchMetadata**: Code search indexing status

**Schema Change Workflow**:
1. Edit `schema.prisma`
2. Run `pnpm prisma migrate dev --name <description>`
3. Prisma Client auto-regenerates

**Index Optimization**: See [数据库设计文档.md](./docs/数据库设计文档.md) for PostgreSQL B-tree index best practices (last optimized: 2025-10-23, removed 11 redundant indexes).

---

## 🎯 Key Features

### Issue Tracking System
**Status**: ✅ IMPLEMENTED (Sprint 1)

**Workflow**: `Create Issue → Assign Labels/Milestone → Add Comments → Track Events → Close/Reopen`

**Core Features**:
- Auto-increment issue number per project
- Issue state: OPEN/CLOSED
- Multiple assignees support (`assigneeIds: String[]`)
- Color-coded labels with hex codes
- Milestones with due dates
- Comment threads with author tracking
- Full event timeline

**API Endpoints**: `/api/issues/*` (6 controllers, documented in Swagger)

**Frontend**: `/projects/:id/issues`, `/projects/:id/issues/new`, `/projects/:id/issues/:number`

**For details**, see Implementation at `apps/backend/src/issues/` and `apps/frontend/src/app/projects/[id]/issues/`

---

### Code Search
**Status**: ✅ IMPLEMENTED (Phase 2.5-2.7)

**Workflow**: `File Upload → Language Detection → Symbol Extraction → MeiliSearch Indexing → Permission-filtered Search`

**Supported Languages**:
1. **TypeScript/JavaScript** (AST-based): Classes, functions, interfaces, enums
2. **Python** (Regex-based): Classes, functions, decorators, constants
3. **Java** (Regex-based): Classes, interfaces, methods, annotations

**Key Features**:
- Global search across all accessible projects
- Project-scoped search
- Advanced filters (language, extension, sort)
- **Cmd+K** shortcut for quick access
- Permission-aware results (ProjectMember filtering)
- Incremental indexing (SHA256 hash comparison)

**API Endpoints**:
- `POST /api/search` - Search with filters
- `POST /api/search/index/project/:projectId` - Trigger reindexing
- `GET /api/search/index/status/:projectId` - Indexing status

**Frontend**: `/search` (global), `/projects/:id/search` (project-scoped)

**Test Coverage**: 140+ unit tests (100% pass rate), 9 E2E tests

**Performance**: ~100 files/sec indexing, <100ms search latency

---

### Pull Request System
**Status**: ✅ IMPLEMENTED (Sprint 3)

**Workflow**: `Create PR → Code Review → Approval → Merge`

**Core Features**:
- Auto-increment PR number per project
- Code review workflow (APPROVED/CHANGES_REQUESTED/COMMENTED)
- Line-level comments on diffs with commitHash locking
- Merge strategies: MERGE/SQUASH/REBASE
- PR approval rules (requireApprovals, allowSelfMerge)
- Review summary aggregation
- Branch protection rules
- Notification system with WebSocket

**API Endpoints**: 38 endpoints (PR: 14, Git: 11, Notifications: 8, Branch Protection: 5)

**Frontend**: `/projects/:id/pulls`, `/projects/:id/pulls/new`, `/projects/:id/pulls/:number`

**Components**: `DiffFileView`, `ReviewSummaryCard`, notification toast integration

**E2E Tests**: 5 test files, 2377 lines (workflow, review, merge, line comments)

---

### Organization & Team System
**Status**: ✅ IMPLEMENTED (v1.0.0-MVP)

**Hierarchy**:
```
User
 └── OrganizationMember (role: OWNER | ADMIN | MEMBER)
      └── Organization
           └── Team
                └── TeamMember (role: MAINTAINER | MEMBER)
                     └── ProjectPermission (access: READ | WRITE | ADMIN)
```

**Key Concepts**:
- **Personal Organization**: Auto-created for each user (`isPersonal=true`), slug: `user-{username}`
- **Organization Roles**: OWNER (full control), ADMIN (manage members), MEMBER (read-only)
- **Team Roles**: MAINTAINER (manage team), MEMBER (access projects)
- **Project Permissions**: Teams assigned READ/WRITE/ADMIN per project

**API Field Convention**: Backend returns `myRole` (current user's role in org/team)

**For detailed design**, see [组织与团队权限架构设计.md](./docs/组织与团队权限架构设计.md)

---

### Raft Consensus Algorithm
**Status**: ✅ IMPLEMENTED

**Core Components** (`apps/backend/src/raft/`):
- `raft-node.ts` - Leader election & log replication
- `git-state-machine.ts` - Git-aware state machine
- `websocket-transport.ts` - Inter-node communication
- `storage.ts` - Persistent state storage
- `types.ts` - Raft protocol types

**Frontend Dashboard** (`/raft` page):
- Real-time cluster topology visualization (React Flow)
- Performance metrics charts (Recharts)
- Node management UI
- WebSocket live updates

**For implementation details**, see [分布式共识算法设计方案.md](./docs/分布式共识算法设计方案.md)

---

### Git HTTP Smart Protocol
**Status**: ✅ IMPLEMENTED (Sprint 3)

**Endpoints** (11 total):
- `GET /api/git/:owner/:repo/info/refs` - Git info/refs
- `POST /api/git/:owner/:repo/git-upload-pack` - Fetch/clone
- `POST /api/git/:owner/:repo/git-receive-pack` - Push

**Storage**: All Git operations go through Prisma + MinIO (not direct filesystem)

**Integration**: Works with standard Git clients (`git clone`, `git push`, `git pull`)

---

### Bootstrap Admin Mechanism
**Status**: ✅ IMPLEMENTED

**Three Methods**:
1. **Environment Variable** (Production): `INITIAL_ADMIN_EMAIL="admin@company.com"`
2. **First User Auto-Promotion** (Development): First registered user becomes SUPER_ADMIN
3. **Database Seed Script** (CI/CD): `pnpm prisma db seed`

**Security**:
- Uses CUID for user IDs (prevents enumeration attacks)
- No "ID=1 = SUPER_ADMIN" pattern
- Warning logs for first-user auto-promotion

**Implementation**: See `apps/backend/src/auth/auth.service.ts:56-96`

---

### Monitoring & Performance
**Backend**:
- **Global Performance Middleware**: Tracks request duration, logs slow requests (>1000ms)
  - Located: `src/common/middleware/performance-monitoring.middleware.ts`
  - Applied globally in `app.module.ts:40`
- **Monitoring API**: `/api/monitoring/metrics` - Real-time metrics

**Frontend**:
- Playwright E2E tests with comprehensive coverage
- Test reports in `test-results/` directory

---

## 🛠️ Development Workflow

### 1️⃣ Authentication Flow
1. User registers/logs in via `/api/auth/register` or `/api/auth/login`
2. Backend returns JWT access token + refresh token
3. Frontend stores tokens, includes in `Authorization: Bearer <token>` header
4. Protected routes verify JWT via `JwtAuthGuard`
5. User info extracted via `@CurrentUser()` decorator

### 2️⃣ File Upload Flow
1. Frontend uploads file via `POST /api/files/upload` (multipart/form-data)
2. Backend validates and uploads to MinIO bucket
3. File metadata saved to PostgreSQL with MinIO path
4. Frontend downloads via `GET /api/files/:id/download`

### 3️⃣ Development Principles

**ECP Compliance** (from global `~/.claude/CLAUDE.md`):
- **SOLID Principles**: Primary design philosophy
- **High Cohesion, Low Coupling**: Modular architecture
- **DRY**: Eliminate code duplication
- **KISS**: Simplest implementation
- **Defensive Programming**: Validate all external inputs
- **Design for Testability**: Maintain ≥70% unit test coverage

**TDD Workflow**:
1. Write failing test (Red)
2. Implement minimum code to pass (Green)
3. Refactor while keeping tests green
4. Document with Swagger decorators
5. Generate completion report with ECP self-check

### 4️⃣ Key Implementation Guidelines
- Git operations must go through Prisma + MinIO (not direct filesystem)
- Use NestJS validation pipes for DTO validation
- Implement pagination for lists (default: 20 items/page)
- Support Markdown with sanitization in Issue/PR body
- Auto-increment numbers per project (Issue, PR)
- **NEVER** hard-code user-facing strings (use i18n keys)

---

## 📚 Documentation Index

### Core Documentation (`/docs`)
| Document | Description |
|----------|-------------|
| [品牌故事.md](./docs/品牌故事.md) | Brand story and vision (bilingual: zh/en) |
| [需求分析文档.md](./docs/需求分析文档.md) | Requirements analysis |
| [架构设计文档.md](./docs/架构设计文档.md) | Architecture design |
| [数据库设计文档.md](./docs/数据库设计文档.md) | Database schema design + index optimization |
| [分布式共识算法设计方案.md](./docs/分布式共识算法设计方案.md) | Raft algorithm design |
| [组织与团队权限架构设计.md](./docs/组织与团队权限架构设计.md) | Organization & team permissions |
| [UI设计与实现文档.md](./docs/UI设计与实现文档.md) | UI implementation guide |

### Frontend Documentation (`apps/frontend/`)
| Document | Description |
|----------|-------------|
| [DESIGN_SYSTEM.md](./apps/frontend/DESIGN_SYSTEM.md) | Design system (colors, typography, components) |
| [TESTING_GUIDE.md](./apps/frontend/TESTING_GUIDE.md) | E2E testing guide and checklist |
| [PERFORMANCE_CHECKLIST.md](./apps/frontend/PERFORMANCE_CHECKLIST.md) | Performance optimization guidelines |

### Strategic Planning
| Document | Description |
|----------|-------------|
| [ROADMAP_2025.md](./docs/ROADMAP_2025.md) | 24-month strategic development plan |
| [UI_UX_UPGRADE_PLAN.md](./docs/UI_UX_UPGRADE_PLAN.md) | 7-day UI/UX upgrade execution plan |
| [CHANGELOG.md](./CHANGELOG.md) | Project changelog |

**Important**: Always consult these documents before implementing major features.

---

## 🐛 Troubleshooting

### Database Cleanup for Tests
Playwright E2E tests may accumulate test data:
```bash
# Check organization count
docker exec flotilla-postgres psql -U devplatform -d cloud_dev_platform -c "SELECT COUNT(*) FROM organizations;"

# View recent organizations
docker exec flotilla-postgres psql -U devplatform -d cloud_dev_platform -c "SELECT id, name, slug, \"isPersonal\" FROM organizations ORDER BY \"createdAt\" DESC LIMIT 10;"

# Clean up test organizations (keep personal orgs)
docker exec flotilla-postgres psql -U devplatform -d cloud_dev_platform -c "DELETE FROM organizations WHERE \"isPersonal\" = false;"

# Clean up teams
docker exec flotilla-postgres psql -U devplatform -d cloud_dev_platform -c "DELETE FROM teams;"
```

### Playwright Test Debugging
```bash
cd apps/frontend

# Run specific test with retries
pnpm exec playwright test tests/organizations/organization-crud.spec.ts --workers=1 --retries=2

# Run in headed mode (see browser)
pnpm exec playwright test tests/teams/team-crud.spec.ts --headed

# View test report
pnpm test:report

# Debug with trace viewer
pnpm exec playwright show-trace test-results/<test-name>/trace.zip
```

**Common Test Issues**:
- **Strict mode violations**: Selector matches multiple elements → Use more specific selectors (role + name)
- **Timeout errors**: Element not found → Check page load, verify ARIA attributes
- **Dialog not closing**: Backend error → Check screenshot in `test-results/`

### Frontend Component Debugging
**Tabs Component** (Shadcn/ui):
- Must have `role="tab"`, `role="tablist"`, `role="tabpanel"` for Playwright
- Location: `apps/frontend/src/components/ui/tabs.tsx`

**Dialog Component**:
- Auto-managed by Radix UI via `data-state="open"`
- Dialog should close on successful submission (`setOpen(false)`)
- Errors should display in dialog, NOT navigate away

### Docker Production Deployment
**CRITICAL**: After building new image, MUST force-recreate container!

```bash
# ❌ WRONG - Uses old cached image
docker-compose build frontend
docker-compose restart frontend

# ✅ CORRECT - Force recreate to use new image
docker-compose build frontend
docker-compose up -d frontend --force-recreate

# Or build with --no-cache
docker-compose build --no-cache frontend
docker-compose up -d frontend --force-recreate
```

**Verification**:
```bash
# Check container uses latest image
docker inspect flotilla-frontend --format='{{.Image}}' | head -c 12
docker images cloud-dev-platform-frontend:latest --format='{{.ID}}'
# First 12 characters should match

# Verify health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000  # Should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000  # Should return 200
```

**Common Gotchas**:
- Next.js production builds are cached aggressively → Use `--no-cache` if seeing stale code
- Environment variables baked into frontend build → Rebuild after changing `NEXT_PUBLIC_*` vars
- Database migrations must be run manually: `docker exec flotilla-backend pnpm prisma migrate deploy`

---

## 📌 Important Notes

### Environment Variables
- **Location**: `.env.example` in project root (copy to `.env`)
- **Backend**: Database, Redis, MinIO, JWT, Raft configuration
- **Frontend**: Use `NEXT_PUBLIC_*` prefix for client-side vars

### Internationalization Best Practices
- **NEVER** hard-code user-facing strings
- **ALWAYS** use translation keys from `src/locales/*.ts`
- **Template strings**: Use `.replace('{placeholder}', value)` for dynamic content
- **Add translations in parallel**: Update both `zh.ts` and `en.ts` simultaneously
- **TypeScript types**: Update `language-context.tsx` interfaces when adding keys
- **React Hook dependencies**: Include `t` in dependency arrays when using translations

### Testing Strategy
- **Backend**: Jest for unit/integration tests (`*.spec.ts`)
- **Frontend**: Playwright for E2E tests
- **Coverage**: Maintain ≥70% unit test coverage
- **Run tests before committing**

### Code Style
- **Formatting**: `pnpm format` (root) via Prettier
- **Linting**: `pnpm lint` (per app) via ESLint
- **Conventions**: Follow NestJS/Next.js official conventions

### Current Focus (Phase 1.5)
**Quality Assurance**:
- Performance testing (Git clone speed, PR diff rendering)
- Security audit (Git protocol, XSS/CSRF protection)
- Documentation updates (API docs, deployment guide)
- Production deployment preparation

**Phase 2 Preview** (Q2 2026):
- Raft-Native Git Storage
- Git objects replication through Raft consensus
- Distributed Ref management
- Multi-region deployment support

---

## 🎯 Development Philosophy

**"We don't just host code. We build consensus."**

This project uses Raft consensus algorithm as both a technical implementation and a philosophical metaphor for distributed team collaboration.

**Academic Rigor**:
1. Requirements Analysis
2. Architecture Design
3. Implementation
4. Testing
5. Documentation

**Documentation-first approach**: Check `/docs` before implementing major features.

**Frontend-Backend Separation**:
- Backend provides RESTful APIs (see Swagger at `/api/docs`)
- Frontend consumes APIs without direct database access
- API changes must be documented

---

**For questions or feedback**: Report issues at https://github.com/anthropics/claude-code/issues
