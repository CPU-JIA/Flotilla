# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flotilla is a cloud-based code hosting and collaboration platform implementing distributed consensus algorithms (simplified Raft). It's a pnpm monorepo with NestJS backend, Next.js frontend, and marketing website.

**Brand Mission**: "We don't just host code. We build consensus."

## Development Commands

### Quick Start

```bash
pnpm install                    # Install all dependencies
docker-compose up -d            # Start infrastructure (PostgreSQL, Redis, MinIO, MeiliSearch)
cd apps/backend && pnpm prisma migrate dev  # Run database migrations
pnpm dev                        # Start frontend (3000) + backend (4000) in parallel
```

### Root Level (Monorepo)

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm test         # Run all tests
pnpm lint         # Lint all apps
pnpm format       # Format all code (Prettier)
```

### Backend (apps/backend)

```bash
pnpm start:dev           # Development with hot reload
pnpm test                # Run Jest unit tests
pnpm test:watch          # Jest watch mode
pnpm test:cov            # Coverage report
pnpm test:e2e            # E2E tests
pnpm lint                # ESLint with auto-fix
pnpm prisma migrate dev  # Run migrations
pnpm prisma studio       # Database GUI
pnpm prisma generate     # Regenerate client after schema changes
```

### Frontend (apps/frontend)

```bash
pnpm dev                 # Next.js dev with Turbopack
pnpm test                # Run Playwright E2E tests
pnpm test:ui             # Interactive Playwright UI
pnpm test:debug          # Debug mode
pnpm lint                # ESLint
```

### Running Single Tests

```bash
# Backend (Jest) - run specific test file
cd apps/backend && pnpm jest path/to/file.spec.ts

# Frontend (Playwright) - run specific test file
cd apps/frontend && pnpm playwright test tests/specific-test.spec.ts
```

## Architecture

### Monorepo Structure

```
apps/backend/     # NestJS 11 API server (port 4000)
apps/frontend/    # Next.js 15.5 App Router (port 3000)
website/          # Marketing site (port 3003)
packages/         # Shared packages (reserved)
docs/             # Project documentation
```

### Backend Architecture (NestJS Modular)

Each domain is a **Feature Module** with:

- `.controller.ts` - REST endpoints with Swagger decorators
- `.service.ts` - Business logic
- `.module.ts` - Module definition & DI
- `dto/` - Data Transfer Objects with class-validator

**Key Modules**:

- `auth/` - JWT authentication, Passport guards, decorators (@CurrentUser, @Roles)
- `git/` - Git HTTP Smart Protocol (info/refs, upload-pack, receive-pack)
- `raft/` & `raft-cluster/` - Distributed consensus implementation
- `organizations/` → `teams/` → `projects/` → `repositories/` - Multi-tenant hierarchy
- `issues/` & `pull-requests/` - Issue tracking and code review
- `search/` - MeiliSearch integration for code search
- `notifications/` - WebSocket + email notifications

### Frontend Architecture (Next.js App Router)

```
app/              # File-based routing with server/client components
  (authenticated) # Protected route group
components/       # Reusable UI components
contexts/         # React Context (auth, notifications)
hooks/            # Custom React hooks
providers/        # App providers (Theme, Query, Toast)
```

**UI Stack**: Shadcn/ui (80%) + Mantine (20%) for enterprise components

**State**: TanStack Query for server state, React Context for auth

### Database (Prisma + PostgreSQL)

Schema location: `apps/backend/prisma/schema.prisma`

**Core Models**: User → Organization → Team → Project → Repository → Issue/PullRequest

### Infrastructure Services

| Service     | Port      | Purpose                      |
| ----------- | --------- | ---------------------------- |
| PostgreSQL  | 5434      | Primary database             |
| Redis       | 6380      | Cache, sessions, pub/sub     |
| MinIO       | 9000/9001 | S3-compatible object storage |
| MeiliSearch | 7700      | Full-text code search        |

## Key Patterns

### Git HTTP Smart Protocol

Custom implementation in `git/git-http.controller.ts` using isomorphic-git. Endpoints: `/git/{org}/{repo}.git/info/refs`, `upload-pack`, `receive-pack`.

### Raft Consensus

Distributed state replication across nodes. Core in `raft/raft-node.ts`, cluster management in `raft-cluster/`. Real-time visualization available in frontend.

### Permission System

Role-based (Admin, Maintainer, Developer, Viewer) with scopes at Organization, Team, and Project levels. Enforced via NestJS guards.

### Rate Limiting

Global: 100 requests/minute via ThrottlerGuard in `app.module.ts`.

## Code Style

**Prettier**: No semicolons, single quotes, 2-space tabs, 100 char width, trailing commas (ES5)

**ESLint**: TypeScript strict mode, Next.js core web vitals for frontend

**Commit Convention**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)

## API Documentation

Swagger UI available at `http://localhost:4000/api/docs` when backend is running.

## Testing Strategy

- **Backend**: Jest unit tests, target ≥70% coverage
- **Frontend**: Playwright E2E tests for user workflows
- **Test timeout**: 60s per test, 300s global (Playwright)
