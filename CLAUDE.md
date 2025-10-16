# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**基于云计算的开发协作平台** - A cloud-based code hosting and collaboration platform with distributed consensus algorithm (simplified Raft).

## Tech Stack

### Monorepo Architecture
- **pnpm workspace** - Package manager with workspace support
- **Apps**: `apps/backend` (NestJS) + `apps/frontend` (Next.js)

### Frontend (`apps/frontend`)
- **Next.js 15.5** with Turbopack - React framework with SSR/SSG
- **React 19** - UI library
- **TypeScript 5.7** - Type system
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui** - Component library (Radix UI based)
- **Monaco Editor** - Code editor integration
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
```

### Frontend Commands

```bash
cd apps/frontend

# Development
pnpm dev                    # Next.js with Turbopack

# Testing
pnpm test                   # Run Playwright tests
pnpm test:ui                # Interactive UI mode
pnpm test:debug             # Debug mode
pnpm test:report            # View test report

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
    └── interceptors/  # Response interceptors
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
│   └── layout.tsx     # Root layout
├── components/        # Reusable React components
│   ├── editor/        # Monaco Editor wrapper
│   ├── files/         # File browser components
│   └── ui/            # Shadcn/ui components
├── contexts/          # React Context providers
├── lib/               # Utilities and API client
│   ├── api.ts         # Fetch wrapper for backend API
│   └── language-detector.ts  # File extension to language mapping
└── types/             # TypeScript type definitions
```

**Key Frontend Patterns:**
- **App Router**: Uses Next.js 15 App Router with Server Components
- **API client**: Centralized `api.ts` handles all backend requests with error handling
- **Form handling**: Uses `react-hook-form` + `zod` for validation
- **State management**: Primarily React Context (no global state library yet)
- **Monaco Editor**: Integrated for code editing with language auto-detection
- **i18n Support**: Multi-language support (zh/en) via React Context
  - Translation files: `src/locales/zh.ts`, `src/locales/en.ts`
  - Language context: `src/contexts/language-context.tsx`
  - Auto-persists language preference to localStorage
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

### File Upload Flow

1. Frontend uploads file via `POST /api/files/upload` (multipart/form-data)
2. Backend receives file, validates, and uploads to MinIO bucket
3. File metadata saved to PostgreSQL with MinIO object path
4. Frontend can download via `GET /api/files/:id/download`

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

## Development Philosophy

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

## Important Notes

### Environment Variables
- Backend: Configured via `.env` file in `apps/backend/` (see `.env.example`)
- Frontend: Uses `NEXT_PUBLIC_*` prefix for client-side env vars

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

## Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **Swagger Docs**: http://localhost:4000/api/docs
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **Prisma Studio**: `cd apps/backend && pnpm prisma studio`
