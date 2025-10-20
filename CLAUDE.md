# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flotilla** - A cloud-based code hosting and collaboration platform with distributed consensus algorithm (simplified Raft).

**Status**: 🚧 In Development
**Version**: v1.0.0-MVP
**Last Updated**: 2025-10-20

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Docker** & Docker Compose

## Tech Stack

### Monorepo Architecture
- **pnpm workspace** - Package manager with workspace support
- **Apps**: `apps/backend` (NestJS) + `apps/frontend` (Next.js)
- **Note**: The `packages/` directory is reserved for future shared packages but is currently empty

### Frontend (`apps/frontend`)
- **Next.js 15.5** with Turbopack - React framework with SSR/SSG
- **React 19** - UI library
- **TypeScript 5.7** - Type system
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui** - Component library (Radix UI based)
- **Monaco Editor** - Code editor integration
- **TanStack Query 5** - Server state management (used in Raft monitoring)
- **React Flow** - Interactive node graphs (Raft cluster topology visualization)
- **Recharts** - Data visualization (metrics charts)
- **Playwright** - E2E testing framework

### Backend (`apps/backend`)
- **NestJS 11** - Progressive Node.js framework
- **Prisma 6** - ORM with PostgreSQL
- **Passport + JWT** - Authentication strategy
- **MinIO** - S3-compatible object storage
- **Swagger** - API documentation

### Infrastructure
- **PostgreSQL 16** - Primary database (port 5434)
- **Redis 7** - Cache and session storage (port 6380)
- **MinIO** - Object storage (ports 9000/9001)
- **Docker Compose** - Local development orchestration

## Common Commands

### Development Workflow

```bash
# Install dependencies (run once)
pnpm install

# Start infrastructure (PostgreSQL + Redis + MinIO)
docker-compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev
cd ../..

# Start both frontend and backend in parallel
pnpm dev

# Start individual apps
pnpm --filter backend dev    # Backend on http://localhost:4000
pnpm --filter frontend dev   # Frontend on http://localhost:3000
```

### Backend Commands

```bash
cd apps/backend

# Development
pnpm start:dev              # Watch mode
pnpm start:debug            # Debug mode with --inspect

# Database
pnpm prisma migrate dev     # Create and apply migration
pnpm prisma studio          # Open Prisma Studio GUI
pnpm prisma generate        # Regenerate Prisma Client

# Testing
pnpm test                   # Run unit tests (Jest)
pnpm test:watch             # Watch mode
pnpm test:cov               # With coverage
pnpm test:e2e               # E2E tests

# Build
pnpm build                  # Compile TypeScript
pnpm start:prod             # Run production build

# Raft Consensus Algorithm
pnpm raft:demo              # Run Raft demo with example cluster
pnpm raft:test              # Run Raft cluster tests
pnpm raft:performance       # Run Raft performance benchmarks

# Available test files in apps/backend/:
# - raft-demo.ts              (Full demo with 3-node cluster)
# - raft-simple-test.ts       (Basic functionality test)
# - raft-ultra-simple.ts      (Minimal test case)
# - raft-core-verify.ts       (Core algorithm verification)
# - raft-git-test.ts          (Git integration test)
# - raft-advanced-test.ts     (Advanced scenarios)
# - raft-quick-test.ts        (Quick verification)
```

### Frontend Commands

```bash
cd apps/frontend

# Development
pnpm dev                    # Next.js with Turbopack

# Testing
pnpm test                   # Run all Playwright tests
pnpm test:ui                # Interactive UI mode
pnpm test:debug             # Debug mode
pnpm test:report            # View test report
pnpm test:headed            # Run tests in headed browser

# Run specific test file
pnpm exec playwright test tests/auth/login.spec.ts
pnpm exec playwright test tests/settings/settings.spec.ts --retries=2

# Test suites available:
# - tests/auth/           (login, register)
# - tests/organizations/  (organization CRUD, members, teams)
# - tests/teams/          (team CRUD, members, permissions)
# - tests/admin/          (admin panel)
# - tests/dashboard/      (dashboard features)
# - tests/editor/         (code editor)
# - tests/files/          (file management)
# - tests/projects/       (project operations)
# - tests/theme-language/ (theme & i18n)

# Build
pnpm build                  # Production build
pnpm start                  # Serve production build
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Start with replica (read-write separation)
docker-compose --profile replica up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Database backup/restore
docker exec cloud-dev-postgres pg_dump -U devplatform cloud_dev_platform > backup.sql
docker exec -i cloud-dev-postgres psql -U devplatform cloud_dev_platform < backup.sql
```

## Architecture Overview

### Backend Module Structure

```
apps/backend/src/
├── auth/              # Authentication (JWT, Passport strategies)
│   ├── decorators/    # Custom decorators (@Public, @CurrentUser)
│   ├── guards/        # Auth guards (JwtAuthGuard, RolesGuard)
│   └── strategies/    # Passport strategies
├── users/             # User management
├── organizations/     # Organization CRUD and member management
│   ├── decorators/    # @RequireOrgRole decorator
│   ├── guards/        # OrganizationRoleGuard for authorization
│   └── dto/           # DTOs for org operations
├── teams/             # Team CRUD, members, and project permissions
│   ├── decorators/    # @RequireTeamRole decorator
│   ├── guards/        # TeamRoleGuard for authorization
│   └── dto/           # DTOs for team operations
├── projects/          # Project CRUD operations
├── repositories/      # Git repository management
├── files/             # File upload/download (MinIO integration)
├── admin/             # Admin panel endpoints
├── raft/              # Core Raft consensus algorithm implementation
├── raft-cluster/      # Raft cluster management and WebSocket gateway
├── monitoring/        # System monitoring and performance metrics
├── minio/             # MinIO client service
├── prisma/            # Prisma service wrapper
└── common/            # Shared utilities, filters, interceptors
    ├── middleware/    # Global middleware (performance monitoring, logging)
    ├── filters/       # Exception filters
    ├── interceptors/  # Response interceptors
    └── services/      # Global services (CryptoService, etc.)
```

**Key Backend Patterns:**
- **Module-based architecture**: Each feature is a NestJS module with controller/service/module files
- **Prisma integration**: `PrismaService` is injected into services for database access
- **JWT authentication**: Protected routes use `@UseGuards(JwtAuthGuard)`, public routes use `@Public()`
- **DTO validation**: Uses `class-validator` and `class-transformer` for request validation
- **Swagger documentation**: Controllers decorated with `@ApiTags()`, `@ApiOperation()` for auto-generated docs

### Frontend Structure

```
apps/frontend/src/
├── app/               # Next.js App Router pages
│   ├── (auth)/        # Auth-related pages (login, register)
│   ├── projects/      # Project pages with dynamic routes
│   ├── organizations/ # Organization management pages
│   │   └── [slug]/    # Org detail with teams tab
│   │       └── teams/[teamSlug]/  # Team detail pages
│   └── layout.tsx     # Root layout
├── components/        # Reusable React components
│   ├── editor/        # Monaco Editor wrapper
│   ├── files/         # File browser components
│   ├── organizations/ # Org-specific components (MembersTab, TeamsTab, SettingsTab)
│   ├── teams/         # Team-specific components (MembersTab, PermissionsTab, CreateTeamDialog)
│   └── ui/            # Shadcn/ui components (Tabs, Dialog, etc.)
├── contexts/          # React Context providers
├── lib/               # Utilities and API client
│   ├── api.ts         # Fetch wrapper for backend API
│   └── language-detector.ts  # File extension to language mapping
├── locales/           # i18n translation files (zh.ts, en.ts)
└── types/             # TypeScript type definitions (organization.ts, team.ts, etc.)
```

**Key Frontend Patterns:**
- **App Router**: Uses Next.js 15 App Router with Server Components
- **API client**: Centralized `api.ts` handles all backend requests with error handling
- **Form handling**: Uses `react-hook-form` + `zod` for validation
- **State management**:
  - Server state: TanStack Query for Raft monitoring (`/raft` page)
  - UI state: React Context (auth, language, theme)
  - Note: Zustand is installed but currently unused
- **Monaco Editor**: Integrated for code editing with language auto-detection
- **i18n Support**: Multi-language support (zh/en) via React Context
  - Translation files: `src/locales/zh.ts`, `src/locales/en.ts`
  - Language context: `src/contexts/language-context.tsx`
  - Auto-persists language preference to localStorage
  - **Translation Pattern**: Use nested keys like `t.section.subsection.field`
    - Example: `t.projects.detail.loading`, `t.auth.registerTitle`
  - **Template Strings**: Dynamic content uses `.replace()`: `t.projects.history.totalCommits.replace('{count}', String(total))`
  - **Status**: ✅ Full i18n coverage across all pages (completed 2025-10-19)
- **Theme System**: Dark/Light mode toggle using `next-themes`
  - System preference detection
  - Persistent theme storage
  - Monaco Editor theme synchronization
- **Markdown Rendering**: Rich markdown preview with syntax highlighting
  - `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
  - `rehype-highlight` for code syntax highlighting
  - `github-markdown-css` for consistent styling

### Database Schema (Prisma)

Located at `apps/backend/prisma/schema.prisma`. Main models:
- **User**: Authentication and profile
- **Project**: Project metadata
- **Repository**: Git repository information
- **File**: File metadata with MinIO storage paths

**Schema changes workflow:**
1. Edit `schema.prisma`
2. Run `pnpm prisma migrate dev --name <description>`
3. Prisma Client auto-regenerates

### Authentication Flow

1. User registers/logs in via `/api/auth/register` or `/api/auth/login`
2. Backend returns JWT access token + refresh token
3. Frontend stores tokens and includes in `Authorization: Bearer <token>` header
4. Protected backend routes verify JWT via `JwtAuthGuard`
5. User info extracted via `@CurrentUser()` decorator

### Bootstrap Admin Mechanism

**Status**: ✅ **IMPLEMENTED** (Added in commit d770744)

The platform provides three methods to create the initial SUPER_ADMIN user:

**1. Environment Variable Method (Production Recommended)**
```bash
# Set in .env file
INITIAL_ADMIN_EMAIL="admin@company.com"

# User registering with this email automatically becomes SUPER_ADMIN
```

**2. First User Auto-Promotion (Development Fallback)**
- When the database has zero users, the first registered user automatically becomes SUPER_ADMIN
- System logs warning in production mode
- Convenient for development/testing environments

**3. Database Seed Script (CI/CD Automation)**
```bash
# Set in .env file
SEED_ADMIN_EMAIL="admin@company.com"
SEED_ADMIN_PASSWORD="SecurePassword123!"

# Run seed script
cd apps/backend
pnpm prisma db seed
```

**Security Features:**
- Uses CUID for user IDs (prevents enumeration attacks)
- No "ID=1 = SUPER_ADMIN" pattern
- Explicit admin control for production via ENV variables
- Warning logs when first-user auto-promotion occurs
- Idempotent seed script (safe to run multiple times)

**Implementation Location:**
- `apps/backend/src/auth/auth.service.ts:56-96` - Bootstrap logic
- `apps/backend/prisma/seed.ts` - Seed script
- `.env.example` - ENV variable documentation

### File Upload Flow

1. Frontend uploads file via `POST /api/files/upload` (multipart/form-data)
2. Backend receives file, validates, and uploads to MinIO bucket
3. File metadata saved to PostgreSQL with MinIO object path
4. Frontend can download via `GET /api/files/:id/download`

### Organization & Team Architecture

**Status**: ✅ **IMPLEMENTED** (Added in v1.0.0-MVP)

The platform implements a hierarchical permission system with Organizations and Teams:

**Organization Hierarchy**:
```
User
 └── OrganizationMember (role: OWNER | ADMIN | MEMBER)
      └── Organization
           └── Team
                └── TeamMember (role: MAINTAINER | MEMBER)
                     └── ProjectPermission (access: READ | WRITE | ADMIN)
```

**Key Concepts**:
- **Personal Organization**: Auto-created for each user (isPersonal=true), slug format: `user-{username}`
- **Organization Roles**:
  - `OWNER`: Full control, can delete organization
  - `ADMIN`: Can manage members and teams (but not delete org)
  - `MEMBER`: Read-only access to organization
- **Team Roles**:
  - `MAINTAINER`: Can manage team members and assign project permissions
  - `MEMBER`: Can access assigned projects based on ProjectPermission
- **Project Permissions**: Teams can be assigned READ, WRITE, or ADMIN access to specific projects

**API Field Convention**:
- Backend returns `myRole` field (not `role`) to indicate current user's role in organization/team
- Frontend types: `organization.myRole`, `team.role`

**Database Schema** (see `apps/backend/prisma/schema.prisma`):
- `organizations` table
- `organization_members` table (join table with role)
- `teams` table (belongs to organization)
- `team_members` table (join table with role)
- `project_permissions` table (team → project access mapping)

**For detailed design**, see `/docs/组织与团队权限架构设计.md`

### Monitoring & Performance Tracking

**Backend Monitoring**:
- **Global Performance Middleware**: Automatically tracks request duration and status codes
  - Located at `src/common/middleware/performance-monitoring.middleware.ts`
  - Applied to all routes in `app.module.ts:40`
  - Logs slow requests (>1000ms) for optimization
- **Monitoring Controller**: Exposes real-time metrics via `/api/monitoring/metrics`
  - Request counts and response times
  - System health indicators
  - Performance analytics

**Frontend Monitoring**:
- Playwright E2E tests with comprehensive test coverage
- Test reports generated in `test-results/` directory
- Performance measurement via Playwright metrics

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[品牌故事](./docs/品牌故事.md)** - Brand story and vision (bilingual: zh/en)
- **[需求分析文档](./docs/需求分析文档.md)** - Requirements analysis
- **[架构设计文档](./docs/架构设计文档.md)** - Architecture design
- **[数据库设计文档](./docs/数据库设计文档.md)** - Database schema design
- **[分布式共识算法设计方案](./docs/分布式共识算法设计方案.md)** - Raft algorithm design
- **[组织与团队权限架构设计](./docs/组织与团队权限架构设计.md)** - Organization & team permission system
- **[UI设计与实现文档](./docs/UI设计与实现文档.md)** - UI implementation guide

**Important**: Always consult these documents before implementing major features to understand design decisions and architectural constraints.

## Development Philosophy

### Brand Mission
**"We don't just host code. We build consensus."**

This project aims to make distributed teams as reliable as distributed systems, using Raft consensus algorithm as both a technical implementation and a philosophical metaphor. See `/docs/品牌故事.md` for the complete vision.

### Academic Rigor
This is an academic project following structured software engineering lifecycle:
1. Requirements Analysis → 2. Architecture Design → 3. Implementation → 4. Testing → 5. Documentation

**Documentation-first approach**: Check `/docs` directory for design decisions before implementing features.

### Frontend-Backend Separation
- Backend provides RESTful APIs with clear contracts (see Swagger docs at `/api/docs`)
- Frontend consumes APIs without direct database access
- API changes must be documented and communicated

### Distributed Consensus Algorithm (Raft)

**Status**: ✅ **IMPLEMENTED**

The platform implements a simplified Raft consensus algorithm for distributed coordination. The implementation is production-ready and includes:

**Core Components** (`apps/backend/src/raft/`):
- **raft-node.ts**: Core Raft node implementation with leader election and log replication
- **git-state-machine.ts**: Git-aware state machine for distributed repository operations
- **websocket-transport.ts**: WebSocket-based inter-node communication
- **storage.ts**: Persistent storage for Raft state and logs
- **types.ts**: TypeScript type definitions for Raft protocol

**Integration**:
- **RaftClusterModule**: NestJS module integrated into main app (`app.module.ts:13`)
- **WebSocket Gateway**: Real-time communication between Raft nodes
- **State Synchronization**: Ensures consistency across distributed nodes

**Testing & Demos**:
- Multiple test files available in `apps/backend/` (raft-demo.ts, raft-simple-test.ts, etc.)
- Performance testing support via `pnpm raft:performance`

For implementation details, see `/docs/分布式共识算法设计方案.md`.

### Raft Monitoring UI

**Frontend Raft Dashboard** (`/raft` page):
- **Real-time Cluster Visualization**: Interactive topology graph showing node relationships
  - Uses React Flow for draggable node graph
  - Color-coded node states (Leader: green, Follower: blue, Candidate: yellow)
  - Live WebSocket connection for state updates
- **Metrics Charts**: Performance monitoring with Recharts
  - Request latency over time
  - Throughput metrics
  - Leader election events
- **Cluster Management**: Control panel for node operations
  - Add/remove nodes dynamically
  - View node logs and status
  - Monitor consensus state

**Key Components** (`apps/frontend/src/app/raft/components/`):
- `ClusterTopology.tsx` - React Flow visualization
- `MetricsChart.tsx` - Recharts performance graphs
- `NodeList.tsx` - Node management UI

**Data Fetching** (`apps/frontend/src/app/raft/hooks/`):
- `useRaftCluster.ts` - TanStack Query hooks for cluster state

## Docker Production Deployment

### Building and Deploying Frontend/Backend

**CRITICAL**: After building a new Docker image, you MUST force-recreate the container to use the new image. Simply using `docker-compose restart` will NOT pick up the new image!

```bash
# ❌ WRONG - This will use the old cached image
docker-compose build frontend
docker-compose restart frontend

# ✅ CORRECT - Force recreate to use new image
docker-compose build frontend
docker-compose up -d frontend --force-recreate

# Or build with --no-cache to ensure fresh build
docker-compose build --no-cache frontend
docker-compose up -d frontend --force-recreate
```

**Verification Steps**:
```bash
# 1. Check container is using latest image
docker inspect cloud-dev-frontend --format='{{.Image}}' | head -c 12
docker images cloud-dev-platform-frontend:latest --format='{{.ID}}'
# The first 12 characters should match

# 2. Verify frontend/backend health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000  # Should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000  # Should return 200
```

**Common Gotchas**:
- Next.js production builds are cached aggressively - use `--no-cache` if seeing stale code
- Environment variables are baked into frontend build - rebuild after changing `NEXT_PUBLIC_*` vars
- Database migrations must be run manually: `docker exec cloud-dev-backend pnpm prisma migrate deploy`

## Common Debugging Patterns

### Database Cleanup for Tests

Playwright E2E tests create organizations and teams. PostgreSQL may accumulate test data:

```bash
# Check organization count (limit is typically 10 for testing)
docker exec cloud-dev-postgres psql -U devplatform -d cloud_dev_platform -c "SELECT COUNT(*) FROM organizations;"

# View recent organizations
docker exec cloud-dev-postgres psql -U devplatform -d cloud_dev_platform -c "SELECT id, name, slug, \"isPersonal\" FROM organizations ORDER BY \"createdAt\" DESC LIMIT 10;"

# Clean up test organizations (keep personal orgs)
docker exec cloud-dev-postgres psql -U devplatform -d cloud_dev_platform -c "DELETE FROM organizations WHERE \"isPersonal\" = false;"

# Clean up all teams
docker exec cloud-dev-postgres psql -U devplatform -d cloud_dev_platform -c "DELETE FROM teams;"
```

### Playwright Test Debugging

```bash
# Run specific test suite with retries
cd apps/frontend
pnpm exec playwright test tests/organizations/organization-crud.spec.ts --workers=1 --retries=2

# Run in headed mode (see browser)
pnpm exec playwright test tests/teams/team-crud.spec.ts --headed

# View test report
pnpm test:report

# Debug with trace viewer
pnpm exec playwright show-trace test-results/<test-name>/trace.zip
```

**Common Test Issues**:
- **Strict mode violations**: Selector matches multiple elements - use more specific selectors (role + name)
- **Timeout errors**: Element not found - check if page loaded correctly, verify ARIA attributes
- **Dialog not closing**: Backend error or validation failure - check screenshot in `test-results/`

### Frontend Component Debugging

**Tabs Component (Shadcn/ui)**:
- Must have `role="tab"`, `role="tablist"`, `role="tabpanel"` for Playwright tests
- Located at `apps/frontend/src/components/ui/tabs.tsx`
- Used in organization detail page and team detail page

**Dialog Component**:
- Auto-managed by Radix UI via `data-state="open"` attribute
- Dialog should close on successful form submission (check `setOpen(false)`)
- Error messages should display in dialog, NOT navigate away

## Important Notes

### Environment Variables
- **Location**: `.env.example` in project root (copy to `.env` and configure)
- **Backend variables**: Database, Redis, MinIO, JWT, Raft configuration
- **Frontend variables**: Use `NEXT_PUBLIC_*` prefix for client-side env vars
- **Key configurations**:
  - Database ports: PostgreSQL (5434), Redis (6380)
  - MinIO: localhost:9000 (API), localhost:9001 (Console)
  - JWT secrets and expiration times
  - Raft cluster node configuration

### Ports
- Frontend: `3000`
- Backend: `4000` (API at `/api`, Swagger at `/api/docs`)
- PostgreSQL: `5434` (host) / `5432` (container)
- Redis: `6380` (host) / `6379` (container)
- MinIO API: `9000`, MinIO Console: `9001`

### Testing Strategy
- Backend: Jest for unit/integration tests (`*.spec.ts` files)
- Frontend: Playwright for E2E tests
- Run tests before committing code

### Code Style
- Prettier for formatting: `pnpm format` (root)
- ESLint for linting: `pnpm lint` (per app)
- Follow NestJS/Next.js conventions

### Internationalization Best Practices
- **NEVER** hard-code user-facing strings in components
- **ALWAYS** use translation keys from `src/locales/*.ts`
- **Template strings** with dynamic content: use `.replace('{placeholder}', value)`
- **Add translations in parallel**: Update both `zh.ts` and `en.ts` simultaneously
- **Update TypeScript types**: Modify `language-context.tsx` interfaces when adding new translation keys
- **React Hook dependencies**: Include `t` in dependency arrays for useCallback/useEffect when using translations

## Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **Swagger Docs**: http://localhost:4000/api/docs
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **Prisma Studio**: `cd apps/backend && pnpm prisma studio`
