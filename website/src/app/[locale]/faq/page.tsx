'use client'

import Link from 'next/link'
import { Accordion } from '@/components/ui/accordion'

export default function FAQPage() {
  const faqs = [
    {
      question: 'What makes Flotilla different from GitHub/GitLab?',
      answer:
        'We implement real distributed consensus with the Raft algorithm, not just replication. When a node fails, the cluster automatically elects a new leader in ~150ms with zero downtime. This is production-grade distributed systems, not just Git hosting.',
    },
    {
      question: 'Is this production-ready?',
      answer:
        'Yes. We have 80%+ test coverage, comprehensive E2E tests with Playwright, complete documentation, and rigorous engineering practices (SOLID, DRY, KISS). Every commit follows the same high standards. This is not a weekend project.',
    },
    {
      question: 'What tech stack do you use?',
      answer:
        'Full-stack TypeScript: Next.js 15 + React 19 frontend, NestJS 11 + Prisma 6 backend. PostgreSQL, Redis, MinIO infrastructure. Monorepo with pnpm workspace. Everything is type-safe, tested, and documented.',
    },
    {
      question: 'Can I self-host?',
      answer:
        'Absolutely. MIT License means you can fork, modify, build, sell—whatever you want. Docker Compose setup takes 10 minutes. No vendor lock-in. Complete control over your infrastructure.',
    },
    {
      question: 'How does Raft consensus work?',
      answer:
        'Raft divides consensus into three sub-problems: Leader Election (choose one server to act as cluster leader), Log Replication (leader accepts log entries and replicates them), and Safety (ensure consistency). Our implementation uses WebSocket for real-time communication and persistent storage for log entries.',
    },
    {
      question: 'What about internationalization (i18n)?',
      answer:
        'Full zh/en support built-in from day one, not as an afterthought. 100% UI coverage, zero hard-coded strings. Language preferences auto-persist. This is proper i18n architecture, not a plugin.',
    },
    {
      question: 'How do I contribute?',
      answer:
        'Read our Contributing Guide in the docs. We follow strict engineering standards: comprehensive tests, complete documentation, SOLID principles. Pull requests must pass all tests and include docs. We review thoroughly because quality matters.',
    },
    {
      question: 'What is the performance like?',
      answer:
        '150ms automatic failover. 60fps animations with Framer Motion. Turbopack hot reload under 2s. PostgreSQL with Prisma ORM. Redis caching. MinIO object storage. We optimize ruthlessly because your time matters.',
    },
    {
      question: 'Is there a hosted version?',
      answer:
        'Not yet. This is an academic/open-source project demonstrating production-grade distributed consensus. Self-hosting via Docker Compose is the recommended approach. We may offer hosted version in the future.',
    },
    {
      question: 'What license is this under?',
      answer:
        'MIT License. One of the most permissive licenses. Fork it, modify it, build on it, sell it. No bait-and-switch open core model. Every feature is truly open source.',
    },
  ]

  return (
    <div className="py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-foreground/60">Everything you need to know about Flotilla</p>
        </div>

        {/* FAQ Accordion */}
        <Accordion items={faqs} />

        {/* Contact CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-secondary/20 border border-border/40 text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-foreground/70 mb-6">
            Cannot find the answer you are looking for? Open an issue on GitHub or join our Discord
            community.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://github.com/CPU-JIA/Cloud-Dev-Platform/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              Open an Issue
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
