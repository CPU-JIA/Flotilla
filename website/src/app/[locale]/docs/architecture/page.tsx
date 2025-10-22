import { Layers, Database, Server, Code, Box, ArrowRight } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Architecture - Flotilla Documentation',
  description: 'Explore Flotilla architecture: monorepo structure, backend/frontend separation, and microservices design.',
}

export default function ArchitecturePage() {
  const monorepoStructure = `Cloud-Dev-Platform/
├── apps/
│   ├── backend/          # NestJS API Server
│   │   ├── src/
│   │   │   ├── auth/           # Authentication (JWT, Passport)
│   │   │   ├── users/          # User management
│   │   │   ├── organizations/  # Organization CRUD
│   │   │   ├── teams/          # Team management
│   │   │   ├── projects/       # Project operations
│   │   │   ├── repositories/   # Git repository mgmt
│   │   │   ├── files/          # File upload/download
│   │   │   ├── raft/           # Raft consensus core
│   │   │   ├── raft-cluster/   # Raft WebSocket gateway
│   │   │   ├── monitoring/     # System metrics
│   │   │   └── prisma/         # Database ORM
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   │
│   ├── frontend/         # Next.js Application
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   ├── components/     # React components
│   │   │   ├── contexts/       # React Context
│   │   │   ├── lib/            # API client & utils
│   │   │   └── locales/        # i18n translations
│   │   └── tests/
│   │       └── **/*.spec.ts    # Playwright E2E tests
│   │
│   └── website/          # Marketing Site (Next.js)
│
├── packages/             # Shared packages (future)
├── docs/                 # Design documentation
└── docker-compose.yml    # Infrastructure orchestration`

  const techStackCode = `# Frontend Stack
Next.js 15.5        # React framework with App Router
React 19            # UI library
TypeScript 5.7      # Type system
Tailwind CSS 4      # Utility-first CSS
Shadcn/ui (80%)     # Radix UI components
Mantine 7.15 (20%)  # Advanced components
Monaco Editor       # Code editor
TanStack Query 5    # Server state (Raft monitoring)
React Flow          # Node graphs (cluster topology)

# Backend Stack
NestJS 11           # Progressive Node.js framework
Prisma 6            # ORM with PostgreSQL
Passport + JWT      # Authentication strategy
MinIO               # S3-compatible object storage
Swagger             # API documentation

# Infrastructure
PostgreSQL 16       # Primary database
Redis 7             # Cache & session storage
MinIO               # Object storage
Docker Compose      # Local development`

  const authFlowCode = `// 1. User Registration/Login
POST /api/auth/register { email, password }
  ↓
Backend returns { accessToken, refreshToken }
  ↓
Frontend stores tokens in memory + httpOnly cookie

// 2. Protected API Requests
fetch('/api/projects', {
  headers: {
    'Authorization': 'Bearer <accessToken>'
  }
})
  ↓
Backend verifies JWT via JwtAuthGuard
  ↓
Extract user info via @CurrentUser() decorator
  ↓
Return authorized data

// 3. Token Refresh
POST /api/auth/refresh { refreshToken }
  ↓
Backend validates refresh token
  ↓
Returns new { accessToken, refreshToken }`

  return (
    <div className="py-12 px-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
          <Layers className="h-4 w-4" />
          <span>System Design</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          Architecture
        </h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          Flotilla is built on a modern monorepo architecture with clear separation of concerns,
          microservices principles, and production-grade infrastructure.
        </p>
      </div>

      {/* High-Level Overview */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">High-Level Overview</h2>
        <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 bg-secondary/20 mb-6">
          <Image
            src="/images/architecture-viz.png"
            alt="Flotilla Architecture Diagram"
            fill
            className="object-contain p-4"
          />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Code,
              title: 'Frontend (Next.js)',
              description: 'Server-side rendering, static generation, and client-side interactivity with React 19.',
              color: 'text-cyan-500',
            },
            {
              icon: Server,
              title: 'Backend (NestJS)',
              description: 'RESTful API with JWT auth, Prisma ORM, and WebSocket support for Raft.',
              color: 'text-red-500',
            },
            {
              icon: Database,
              title: 'Infrastructure',
              description: 'PostgreSQL for data, Redis for cache, MinIO for object storage, all in Docker.',
              color: 'text-green-500',
            },
          ].map((layer) => {
            const Icon = layer.icon
            return (
              <div
                key={layer.title}
                className="p-6 rounded-xl bg-card border border-border/40"
              >
                <Icon className={`h-8 w-8 ${layer.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-2">{layer.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {layer.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Monorepo Structure */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Monorepo Structure</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">
            Flotilla uses <strong className="text-foreground">pnpm workspace</strong> for efficient dependency management and code sharing.
            All apps share a common <code className="px-2 py-1 rounded bg-secondary">node_modules</code> at the root.
          </p>
          <CodeBlock
            code={monorepoStructure}
            language="bash"
            filename="Project Structure"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-semibold mb-2">Benefits of Monorepo</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• Shared dependencies (single source of truth)</li>
                <li>• Easier refactoring across apps</li>
                <li>• Consistent tooling (ESLint, Prettier)</li>
                <li>• Atomic commits for multi-app changes</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h4 className="font-semibold mb-2">Why pnpm?</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• 3x faster than npm/yarn</li>
                <li>• Saves disk space (content-addressable)</li>
                <li>• Strict dependency isolation</li>
                <li>• Native workspace support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Tech Stack</h2>
        <CodeBlock
          code={techStackCode}
          language="yaml"
          filename="Technology Stack"
        />
        <div className="mt-6 p-6 rounded-xl bg-secondary/20 border border-border/40">
          <h4 className="font-semibold mb-3">Why These Technologies?</h4>
          <div className="space-y-3 text-sm text-foreground/70">
            <p>
              <strong className="text-foreground">Next.js 15 + React 19:</strong> Latest features including Server Components,
              Turbopack for instant dev server startup, and improved performance.
            </p>
            <p>
              <strong className="text-foreground">NestJS 11:</strong> Enterprise-grade framework with built-in dependency injection,
              module system, and excellent TypeScript support. Perfect for scalable APIs.
            </p>
            <p>
              <strong className="text-foreground">Prisma 6:</strong> Type-safe database access with automatic migrations,
              introspection, and excellent DX (Developer Experience).
            </p>
          </div>
        </div>
      </section>

      {/* Backend Architecture */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Backend Architecture</h2>

        {/* Module Structure */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Module-Based Design</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                module: 'AuthModule',
                description: 'JWT authentication, Passport strategies, guards, and decorators',
                routes: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
              },
              {
                module: 'OrganizationsModule',
                description: 'Organization CRUD, member management, role-based access control',
                routes: ['/api/organizations', '/api/organizations/:id/members'],
              },
              {
                module: 'TeamsModule',
                description: 'Team operations, project permissions, and member management',
                routes: ['/api/teams', '/api/teams/:id/permissions'],
              },
              {
                module: 'RaftClusterModule',
                description: 'WebSocket gateway for Raft consensus, cluster monitoring',
                routes: ['/raft (WebSocket)', '/api/monitoring/metrics'],
              },
            ].map((mod) => (
              <div
                key={mod.module}
                className="p-4 rounded-lg bg-card border border-border/40"
              >
                <div className="font-semibold text-primary mb-2">{mod.module}</div>
                <div className="text-sm text-foreground/70 mb-3">{mod.description}</div>
                <div className="space-y-1">
                  {mod.routes.map((route) => (
                    <div key={route} className="text-xs font-mono text-foreground/50">
                      {route}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication Flow */}
        <div>
          <h3 className="text-2xl font-semibold mb-4">Authentication Flow</h3>
          <CodeBlock
            code={authFlowCode}
            language="typescript"
            filename="Authentication Process"
          />
        </div>
      </section>

      {/* Frontend Architecture */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Frontend Architecture</h2>
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'App Router',
                description: 'Next.js 15 App Router with Server Components for improved performance and SEO',
                icon: Box,
              },
              {
                title: 'API Client',
                description: 'Centralized fetch wrapper (src/lib/api.ts) handles authentication and error handling',
                icon: Server,
              },
              {
                title: 'State Management',
                description: 'React Context for auth/language/theme, TanStack Query for server state',
                icon: Database,
              },
              {
                title: 'i18n Support',
                description: 'React Context-based i18n with zh/en translations, auto-persisted to localStorage',
                icon: Layers,
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="p-4 rounded-lg bg-secondary/20 border border-border/40"
                >
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <div className="font-semibold mb-2">{feature.title}</div>
                  <div className="text-sm text-foreground/70">{feature.description}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Database Schema */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Database Schema</h2>
        <div className="p-6 rounded-xl bg-secondary/20 border border-border/40">
          <h4 className="font-semibold mb-4">Core Models (Prisma)</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {[
              { model: 'User', fields: 'id, email, password, username, role' },
              { model: 'Organization', fields: 'id, name, slug, isPersonal' },
              { model: 'OrganizationMember', fields: 'userId, organizationId, role' },
              { model: 'Team', fields: 'id, name, organizationId' },
              { model: 'TeamMember', fields: 'userId, teamId, role' },
              { model: 'Project', fields: 'id, name, organizationId' },
              { model: 'ProjectPermission', fields: 'teamId, projectId, access' },
              { model: 'Repository', fields: 'id, projectId, gitUrl' },
              { model: 'File', fields: 'id, path, minioPath, size' },
            ].map((schema) => (
              <div
                key={schema.model}
                className="p-3 rounded-lg bg-card border border-border/40"
              >
                <div className="font-mono font-semibold text-accent">{schema.model}</div>
                <div className="text-xs text-foreground/60 mt-1">{schema.fields}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-foreground/60">
            📄 Full schema: <code className="px-2 py-1 rounded bg-secondary">apps/backend/prisma/schema.prisma</code>
          </div>
        </div>
      </section>

      {/* Performance & Monitoring */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Performance & Monitoring</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <h4 className="font-semibold mb-4">Backend Monitoring</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>• Global performance middleware (tracks request duration)</li>
              <li>• Slow query logging (&gt;1000ms threshold)</li>
              <li>• Metrics endpoint: <code className="px-2 py-1 rounded bg-secondary">/api/monitoring/metrics</code></li>
              <li>• Raft cluster health monitoring</li>
            </ul>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <h4 className="font-semibold mb-4">Frontend Monitoring</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>• Playwright E2E test suite (9 test suites, 50+ cases)</li>
              <li>• Performance reports in test-results/</li>
              <li>• Real-time Raft metrics via WebSocket</li>
              <li>• Monaco Editor integration for code editing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Further Reading */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Further Reading</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/docs/raft"
            className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-secondary/30 transition-all group"
          >
            <div>
              <div className="font-semibold group-hover:text-primary transition-colors">
                Raft Consensus
              </div>
              <div className="text-sm text-foreground/60">
                Learn about distributed consensus
              </div>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/docs/api"
            className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-secondary/30 transition-all group"
          >
            <div>
              <div className="font-semibold group-hover:text-primary transition-colors">
                API Reference
              </div>
              <div className="text-sm text-foreground/60">
                Explore all API endpoints
              </div>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  )
}
