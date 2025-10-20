import { Heart, Zap, Users, Target } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            About Us
          </h1>
          <p className="text-xl text-foreground/60">
            We build consensus. For code. For teams. For the future.
          </p>
        </div>

        {/* Brand Story */}
        <div className="prose prose-lg dark:prose-invert max-w-none mb-16">
          <h2 className="text-3xl font-bold mb-6">Our Story</h2>
          <p className="text-foreground/80 leading-relaxed mb-4">
            In distributed systems, <strong>consensus is everything</strong>. When nodes cannot agree, systems fail. When teams cannot align, projects stall. When developers lack reliable tools, innovation slows.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-4">
            That is why we built <strong>Flotilla</strong>. Not just another Git hosting service. A platform where <em>distributed consensus</em> is not just a feature—it is the foundation.
          </p>
          <p className="text-foreground/80 leading-relaxed mb-4">
            We implemented the <strong>Raft algorithm</strong> not because it is trendy, but because it works. 150ms failover. Zero downtime. Automatic leader election. This is how reliable systems operate.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We document everything not because we have to, but because we believe in <strong>academic rigor</strong>. Every line of code has design docs. Every feature has test coverage. Every decision follows engineering principles.
          </p>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Zap,
                title: 'Performance First',
                description: '150ms failover is not marketing. It is a commitment. We optimize ruthlessly because your time matters.',
              },
              {
                icon: Heart,
                title: 'Open Source Always',
                description: 'MIT License. No bait-and-switch. Every feature is open. Every decision is transparent. That is how community works.',
              },
              {
                icon: Users,
                title: 'Developer Experience',
                description: 'Type safety. Hot reload. Clear errors. We use the tools ourselves. If it annoys us, we fix it.',
              },
              {
                icon: Target,
                title: 'Academic Rigor',
                description: 'Requirements → Design → Implementation → Testing → Documentation. This is software engineering, not cowboy coding.',
              },
            ].map((value) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="p-6 rounded-2xl bg-card border border-border/40"
                >
                  <Icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8">The Team</h2>
          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center text-3xl font-bold">
                JIA
              </div>
              <div>
                <h3 className="text-2xl font-bold">JIA</h3>
                <p className="text-foreground/70">Creator & Maintainer</p>
              </div>
            </div>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Software engineer passionate about distributed systems, type safety, and developer experience. Built Flotilla as an academic project to demonstrate production-ready Raft consensus implementation.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Believes in rigorous software engineering: SOLID principles, comprehensive testing, complete documentation. Every commit follows the same high standards.
            </p>
          </div>
        </div>

        {/* Tech Philosophy */}
        <div className="p-8 rounded-2xl bg-card border border-border/40">
          <h2 className="text-2xl font-bold mb-4">Tech Philosophy</h2>
          <ul className="space-y-3 text-foreground/80">
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">▸</span>
              <span><strong>Type safety</strong> prevents bugs before they happen. TypeScript everywhere.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">▸</span>
              <span><strong>Testing</strong> is not optional. 80%+ coverage. Playwright E2E. Merge when green.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">▸</span>
              <span><strong>Documentation</strong> is code. If it is not documented, it does not exist.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">▸</span>
              <span><strong>Performance</strong> is a feature. 150ms failover. 60fps animations. No compromises.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-1">▸</span>
              <span><strong>Open source</strong> is the only way. MIT License. Fork, modify, build, sell.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
