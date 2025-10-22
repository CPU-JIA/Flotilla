import { Rocket, Target, CheckCircle, Circle, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Roadmap - Flotilla',
  description: 'Flotilla development roadmap 2025-2027. See what we are building next.',
}

export default function RoadmapPage() {
  const phases = [
    {
      number: 1,
      name: 'Foundation',
      period: '0-6 months',
      dates: '2025-10 ~ 2026-04',
      status: 'in_progress',
      goal: 'From academic demo to production-ready product',
      features: [
        { name: 'Issue Tracking System', status: 'completed' },
        { name: 'Notification System', status: 'in_progress' },
        { name: 'Git Protocol Layer', status: 'planned' },
        { name: 'Pull Request & Code Review', status: 'planned' },
        { name: 'Git Visualization', status: 'planned' },
      ],
    },
    {
      number: 2,
      name: 'Growth',
      period: '6-12 months',
      dates: '2026-04 ~ 2026-10',
      status: 'planned',
      goal: 'From usable to preferred by developers',
      features: [
        { name: 'CI/CD Pipeline Integration', status: 'planned' },
        { name: 'Security Scanning (SAST/DAST)', status: 'planned' },
        { name: 'Container Registry', status: 'planned' },
        { name: 'API Rate Limiting & Billing', status: 'planned' },
        { name: 'Third-party OAuth Integration', status: 'planned' },
      ],
    },
    {
      number: 3,
      name: 'Differentiation',
      period: '12-18 months',
      dates: '2026-10 ~ 2027-04',
      status: 'planned',
      goal: 'Build unique competitive advantages',
      features: [
        { name: 'Distributed Git Storage (Raft-based)', status: 'planned' },
        { name: 'Cross-Region Replication', status: 'planned' },
        { name: 'Real-time Collaboration', status: 'planned' },
        { name: 'Advanced Conflict Resolution', status: 'planned' },
        { name: 'Team Analytics Dashboard', status: 'planned' },
      ],
    },
    {
      number: 4,
      name: 'Innovation',
      period: '18-24 months',
      dates: '2027-04 ~ 2027-10',
      status: 'planned',
      goal: 'AI-powered development platform',
      features: [
        { name: 'AI Code Review Assistant', status: 'planned' },
        { name: 'Intelligent Commit Messages', status: 'planned' },
        { name: 'Automated Conflict Resolution', status: 'planned' },
        { name: 'Code Quality Prediction', status: 'planned' },
        { name: 'Smart Project Insights', status: 'planned' },
      ],
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500'
      case 'in_progress': return 'text-yellow-500'
      case 'planned': return 'text-blue-500'
      default: return 'text-foreground/40'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'in_progress': return Clock
      case 'planned': return Circle
      default: return Circle
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <Rocket className="h-4 w-4" />
            <span>Product Roadmap</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            Flotilla 2.0 Roadmap
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-8">
            24-month strategic plan from academic demo to AI-powered development platform
          </p>
          <div className="inline-flex items-center gap-2 text-foreground/60">
            <span>2025-10</span>
            <ArrowRight className="h-4 w-4" />
            <span>2027-10</span>
          </div>
        </div>
      </section>

      {/* Strategic Vision */}
      <section className="py-16 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border/40">
              <div className="flex items-start gap-4 mb-6">
                <Target className="h-10 w-10 text-primary flex-shrink-0" />
                <div>
                  <h2 className="text-3xl font-bold mb-2">Strategic Vision</h2>
                  <p className="text-xl text-foreground/60">
                    &quot;Be 10x better at distributed collaboration, not 1.1x at everything&quot;
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-secondary/30">
                  <h4 className="font-semibold mb-2">Core Philosophy</h4>
                  <p className="text-sm text-foreground/70">
                    Make distributed teams as reliable as distributed systems using Raft consensus.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <h4 className="font-semibold mb-2">Target Users</h4>
                  <p className="text-sm text-foreground/70">
                    Academic institutions, startups, open source communities, and enterprise teams.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <h4 className="font-semibold mb-2">Technical Direction</h4>
                  <p className="text-sm text-foreground/70">
                    Balanced development: feature breadth + technical depth dual-drive.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <h4 className="font-semibold mb-2">Business Goal</h4>
                  <p className="text-sm text-foreground/70">
                    SaaS product achieving commercialization within 2 years.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phases */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            {phases.map((phase) => {
              const isActive = phase.status === 'in_progress'
              return (
                <div
                  key={phase.number}
                  className={`p-8 rounded-2xl border ${
                    isActive
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card border-border/40'
                  }`}
                >
                  {/* Phase Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${
                        isActive ? 'bg-primary' : 'bg-secondary'
                      } text-${isActive ? 'primary-foreground' : 'foreground'} flex items-center justify-center text-2xl font-bold`}>
                        {phase.number}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-3xl font-bold">{phase.name}</h3>
                          {isActive && (
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/60 mb-1">{phase.period}</p>
                        <p className="text-sm text-foreground/50">{phase.dates}</p>
                      </div>
                    </div>
                  </div>

                  {/* Phase Goal */}
                  <div className="mb-6 p-4 rounded-lg bg-secondary/30">
                    <h4 className="font-semibold mb-2">Goal</h4>
                    <p className="text-foreground/70">{phase.goal}</p>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold mb-4">Key Features</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {phase.features.map((feature) => {
                        const StatusIcon = getStatusIcon(feature.status)
                        return (
                          <div
                            key={feature.name}
                            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                          >
                            <StatusIcon className={`h-5 w-5 mt-0.5 ${getStatusColor(feature.status)}`} />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{feature.name}</div>
                              <div className="text-xs text-foreground/50 capitalize">{feature.status.replace('_', ' ')}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="py-16 border-t border-border/40 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">Status Legend</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { status: 'completed', label: 'Completed', description: 'Feature is live in production' },
                { status: 'in_progress', label: 'In Progress', description: 'Currently under active development' },
                { status: 'planned', label: 'Planned', description: 'Scheduled for future development' },
              ].map((item) => {
                const Icon = getStatusIcon(item.status)
                return (
                  <div
                    key={item.status}
                    className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/40"
                  >
                    <Icon className={`h-6 w-6 ${getStatusColor(item.status)} flex-shrink-0`} />
                    <div>
                      <div className="font-semibold mb-1">{item.label}</div>
                      <div className="text-sm text-foreground/70">{item.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Want to Contribute?</h2>
          <p className="text-foreground/60 mb-8 max-w-2xl mx-auto">
            We are building Flotilla in public. Join us in shaping the future of distributed collaboration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs/contributing"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Contributing Guide
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
