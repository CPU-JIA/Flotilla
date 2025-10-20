import { ArrowRight, Github, Rocket, BookOpen, Code, TestTube } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'

export default function DocsPage() {
  const installCommand = `# Clone the repository
git clone https://github.com/CPU-JIA/Cloud-Dev-Platform.git
cd Cloud-Dev-Platform

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis + MinIO)
docker-compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev

# Start development servers
cd ../..
pnpm dev

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000`

  return (
    <div className="py-12 px-8">
      {/* Hero */}
      <div className="mb-16">
        <h1 className="text-5xl font-bold mb-4">
          Documentation
        </h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          Everything you need to know about Cloud Dev Platform. From quick start to advanced architecture.
        </p>
      </div>

      {/* Quick Start Card */}
      <div className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Quick Start</h2>
            <p className="text-foreground/70">
              Get up and running in 10 minutes with Docker Compose.
            </p>
          </div>
        </div>

        <CodeBlock
          code={installCommand}
          language="bash"
          filename="terminal"
        />

        <div className="mt-6 flex gap-3">
          <a
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Full Quick Start Guide
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8">Core Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: BookOpen,
              title: 'Raft Consensus Algorithm',
              description: 'Production-ready distributed consensus with 150ms failover. Real WebSocket communication, persistent logs, automatic leader election.',
              href: '/docs/raft',
            },
            {
              icon: Code,
              title: 'Full-Stack TypeScript',
              description: 'Next.js 15 + React 19 frontend. NestJS 11 + Prisma 6 backend. End-to-end type safety with monorepo architecture.',
              href: '/docs/architecture',
            },
            {
              icon: TestTube,
              title: 'Comprehensive Testing',
              description: 'Playwright E2E tests, Jest unit tests, 80%+ coverage. Every feature is battle-tested before merge.',
              href: '/docs/testing',
            },
            {
              icon: Github,
              title: 'Open Source & Self-Hosted',
              description: 'MIT License. Fork, modify, build, sell. No vendor lock-in. Complete control over your infrastructure.',
              href: '/docs/contributing',
            },
          ].map((feature) => {
            const Icon = feature.icon
            return (
              <a
                key={feature.title}
                href={feature.href}
                className="group p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <Icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                  Learn more
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8">Tech Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Next.js', version: '15.5' },
            { name: 'React', version: '19' },
            { name: 'NestJS', version: '11' },
            { name: 'Prisma', version: '6' },
            { name: 'PostgreSQL', version: '16' },
            { name: 'Redis', version: '7' },
            { name: 'TypeScript', version: '5.7' },
            { name: 'Tailwind', version: '4' },
          ].map((tech) => (
            <div
              key={tech.name}
              className="p-4 rounded-xl bg-secondary/30 border border-border/40 text-center"
            >
              <div className="font-semibold">{tech.name}</div>
              <div className="text-sm text-foreground/60">{tech.version}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="p-8 rounded-2xl bg-card border border-border/40">
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <ul className="space-y-3">
          {[
            { text: 'Read the Architecture Guide', href: '/docs/architecture' },
            { text: 'Understand Raft Consensus', href: '/docs/raft' },
            { text: 'Explore API Reference', href: '/docs/api' },
            { text: 'Learn about Contributing', href: '/docs/contributing' },
          ].map((step) => (
            <li key={step.text}>
              <a
                href={step.href}
                className="flex items-center gap-3 text-foreground/80 hover:text-primary transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                {step.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
