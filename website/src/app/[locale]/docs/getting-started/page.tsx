import { ArrowRight, Terminal, Database, Rocket, Github } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import Link from 'next/link'

export const metadata = {
  title: 'Getting Started - Flotilla Documentation',
  description:
    'Get started with Flotilla in 10 minutes. Learn how to set up your local development environment.',
}

export default function GettingStartedPage() {
  const installCommands = `# Clone the repository
git clone https://github.com/CPU-JIA/Cloud-Dev-Platform.git
cd Cloud-Dev-Platform

# Install dependencies (requires pnpm >= 10.0.0)
pnpm install

# Start infrastructure services
docker-compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev
cd ../..

# Start development servers
pnpm dev

# ✅ Frontend: http://localhost:3000
# ✅ Backend:  http://localhost:4000
# ✅ Swagger:  http://localhost:4000/api/docs`

  const envSetup = `# Backend .env file (apps/backend/.env)
DATABASE_URL="postgresql://devplatform:devpassword@localhost:5434/cloud_dev_platform"
REDIS_HOST=localhost
REDIS_PORT=6380

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Frontend .env.local file (apps/frontend/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000`

  return (
    <div className="py-12 px-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
          <Rocket className="h-4 w-4" />
          <span>10 Minutes Setup</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">Getting Started</h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          Set up Flotilla locally and start building distributed applications with production-ready
          Raft consensus.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Prerequisites</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Node.js', version: '>= 20.0.0', icon: Terminal },
            { name: 'pnpm', version: '>= 10.0.0', icon: Terminal },
            { name: 'Docker', version: 'Latest', icon: Database },
          ].map((prereq) => {
            const Icon = prereq.icon
            return (
              <div
                key={prereq.name}
                className="p-4 rounded-xl bg-secondary/30 border border-border/40"
              >
                <Icon className="h-6 w-6 text-primary mb-2" />
                <div className="font-semibold">{prereq.name}</div>
                <div className="text-sm text-foreground/60">{prereq.version}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Installation */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Installation</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">1. Clone and Install</h3>
            <CodeBlock code={installCommands} language="bash" filename="terminal" />
          </div>

          <div className="p-6 rounded-xl bg-accent/10 border border-accent/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-accent" />
              What does this do?
            </h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>• Clones the monorepo and installs all dependencies</li>
              <li>
                • Starts PostgreSQL (port 5434), Redis (port 6380), and MinIO (ports 9000/9001)
              </li>
              <li>• Runs Prisma migrations to set up the database schema</li>
              <li>• Launches both frontend and backend in watch mode</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Environment Configuration</h2>
        <div className="space-y-4">
          <p className="text-foreground/70">
            Copy the example environment files and configure your local settings:
          </p>
          <CodeBlock code={envSetup} language="bash" filename=".env files" />
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <strong>💡 Pro Tip:</strong> Check{' '}
            <code className="px-2 py-1 rounded bg-secondary">.env.example</code> files in both apps
            for complete configuration options.
          </div>
        </div>
      </section>

      {/* Verify Installation */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Verify Installation</h2>
        <div className="space-y-4">
          <p className="text-foreground/70">
            Open your browser and verify these endpoints are running:
          </p>
          <div className="grid gap-4">
            {[
              {
                name: 'Frontend',
                url: 'http://localhost:3000',
                description: 'Main application UI',
              },
              {
                name: 'Backend API',
                url: 'http://localhost:4000/api',
                description: 'REST API endpoints',
              },
              {
                name: 'Swagger Docs',
                url: 'http://localhost:4000/api/docs',
                description: 'Interactive API documentation',
              },
              {
                name: 'MinIO Console',
                url: 'http://localhost:9001',
                description: 'Object storage admin panel',
              },
            ].map((endpoint) => (
              <a
                key={endpoint.url}
                href={endpoint.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-secondary/30 transition-all group"
              >
                <div>
                  <div className="font-semibold group-hover:text-primary transition-colors">
                    {endpoint.name}
                  </div>
                  <div className="text-sm text-foreground/60">{endpoint.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs px-2 py-1 rounded bg-secondary">{endpoint.url}</code>
                  <ArrowRight className="h-4 w-4 text-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: 'Learn Raft Consensus',
              description: 'Understand how distributed consensus works in Flotilla',
              href: '/docs/raft',
              icon: Rocket,
            },
            {
              title: 'Explore Architecture',
              description: 'Dive deep into the system architecture and design decisions',
              href: '/docs/architecture',
              icon: Database,
            },
            {
              title: 'API Reference',
              description: 'Browse all available API endpoints and their usage',
              href: '/docs/api',
              icon: Terminal,
            },
            {
              title: 'Contributing Guide',
              description: 'Learn how to contribute to the Flotilla project',
              href: '/docs/contributing',
              icon: Github,
            },
          ].map((next) => {
            const Icon = next.icon
            return (
              <Link
                key={next.href}
                href={next.href}
                className="group p-6 rounded-xl border border-border/40 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <Icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {next.title}
                </h3>
                <p className="text-sm text-foreground/70 mb-4">{next.description}</p>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Learn more
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Troubleshooting</h2>
        <div className="space-y-4">
          <details className="p-4 rounded-lg border border-border/40 hover:border-border transition-colors">
            <summary className="font-semibold cursor-pointer">Port already in use errors</summary>
            <div className="mt-3 text-sm text-foreground/70 space-y-2">
              <p>
                If you see port conflicts, check if other services are running on the required
                ports:
              </p>
              <CodeBlock
                code={`# Check ports
lsof -i :3000  # Frontend
lsof -i :4000  # Backend
lsof -i :5434  # PostgreSQL
lsof -i :6380  # Redis

# Stop conflicting services or change ports in docker-compose.yml`}
                language="bash"
                filename="terminal"
              />
            </div>
          </details>

          <details className="p-4 rounded-lg border border-border/40 hover:border-border transition-colors">
            <summary className="font-semibold cursor-pointer">Database migration errors</summary>
            <div className="mt-3 text-sm text-foreground/70 space-y-2">
              <p>If migrations fail, reset the database and try again:</p>
              <CodeBlock
                code={`# Reset database
cd apps/backend
pnpm prisma migrate reset
pnpm prisma migrate dev`}
                language="bash"
                filename="terminal"
              />
            </div>
          </details>

          <details className="p-4 rounded-lg border border-border/40 hover:border-border transition-colors">
            <summary className="font-semibold cursor-pointer">
              Docker permission errors (Linux)
            </summary>
            <div className="mt-3 text-sm text-foreground/70 space-y-2">
              <p>Add your user to the docker group:</p>
              <CodeBlock
                code={`sudo usermod -aG docker $USER
# Log out and log back in for changes to take effect`}
                language="bash"
                filename="terminal"
              />
            </div>
          </details>
        </div>
      </section>
    </div>
  )
}
