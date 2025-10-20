import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Github, Zap } from 'lucide-react'
import { FeaturesBentoGrid } from '@/components/sections/features-bento-grid'
import { RaftLiveDemo } from '@/components/sections/raft-live-demo'
import { CodeBlock } from '@/components/ui/code-block'

export default function Home() {
  const t = useTranslations()

  const raftCodeExample = `// Raft Node Implementation
class RaftNode {
  private state: 'leader' | 'follower' | 'candidate'
  private term: number = 0
  private votedFor: string | null = null

  async requestVote(request: VoteRequest): Promise<VoteResponse> {
    if (request.term > this.term) {
      this.term = request.term
      this.state = 'follower'
      this.votedFor = null
    }

    const voteGranted =
      request.term >= this.term &&
      (this.votedFor === null || this.votedFor === request.candidateId)

    if (voteGranted) {
      this.votedFor = request.candidateId
    }

    return { term: this.term, voteGranted }
  }

  async appendEntries(request: AppendEntriesRequest) {
    if (request.term >= this.term) {
      this.term = request.term
      this.state = 'follower'
      this.resetElectionTimeout()
    }
    // Log replication logic...
  }
}`

  return (
    <div className="relative">
      {/* Hero Section with Mesh Gradient Background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 text-center">
          {/* Hero Content */}
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/40 text-sm">
              <Zap className="h-4 w-4 text-accent" />
              <span className="font-medium">Production-Ready Distributed Consensus</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-foreground">
                We do not just host code.
              </span>
              <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                We build consensus.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-foreground/60 max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a
                href={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
                className="group inline-flex items-center gap-2 px-8 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 font-medium"
              >
                {t('hero.cta')}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 h-12 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
              >
                <Github className="h-5 w-5" />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { label: t('stats.opensource'), sublabel: t('stats.license') },
              { label: t('stats.failover'), sublabel: t('stats.election') },
              { label: t('stats.coverage'), sublabel: t('stats.e2e') },
              { label: t('stats.setup'), sublabel: t('stats.docker') },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/40 hover:border-border transition-colors"
              >
                <div className="text-2xl font-bold text-foreground">{stat.label}</div>
                <div className="text-sm text-foreground/60 mt-1">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid Section */}
      <FeaturesBentoGrid />

      {/* Raft Live Demo Section */}
      <RaftLiveDemo />

      {/* Code Example Section */}
      <section className="py-24 bg-secondary/20 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Clean, Type-Safe Code
              </h2>
              <p className="text-lg text-foreground/60">
                Built with TypeScript for maximum reliability and developer experience.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <CodeBlock
                code={raftCodeExample}
                language="typescript"
                filename="apps/backend/src/raft/raft-node.ts"
              />

              <div className="space-y-6 lg:pt-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">Production-Ready Implementation</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Our Raft implementation is not a toy demo. It is production-grade code with:
                  </p>
                  <ul className="space-y-2 text-foreground/70">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Type-safe RPC communication with full TypeScript support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Persistent state storage with automatic recovery</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>WebSocket-based real-time cluster communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Comprehensive test coverage with performance benchmarks</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/docs/raft"
                  className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
                >
                  Read Raft Documentation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Collaboration Visual Section */}
      <section className="py-24 border-t border-border/40 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Built for Scale & Collaboration
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              Visualize your distributed architecture and empower global teams to work together seamlessly.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Architecture Visualization */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm">
                <Image
                  src="/images/architecture-viz.png"
                  alt="Flotilla Architecture Visualization"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Visual Architecture</h3>
                <p className="text-foreground/70">
                  Understand your system at a glance with interactive architecture diagrams and real-time cluster monitoring.
                </p>
              </div>
            </div>

            {/* Global Collaboration */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm">
                <Image
                  src="/images/global-team.png"
                  alt="Global Team Collaboration"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Global Collaboration</h3>
                <p className="text-foreground/70">
                  Connect teams across continents with distributed consensus ensuring every voice is heard.
                </p>
              </div>
            </div>
          </div>

          {/* Distributed Network Visual */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm">
              <Image
                src="/images/distributed-network.png"
                alt="Abstract Distributed Network"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center mt-6 space-y-2">
              <h3 className="text-2xl font-bold">Distributed by Design</h3>
              <p className="text-foreground/70 max-w-2xl mx-auto">
                Every node in the network is equal. No single point of failure. Pure distributed consensus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 border-t border-border/40 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to build consensus?
          </h2>
          <p className="text-lg text-foreground/60 mb-8 max-w-2xl mx-auto">
            Join developers who are building reliable distributed systems with academic rigor and production-ready tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium shadow-lg"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
            >
              View Showcase
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
