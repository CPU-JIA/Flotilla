export default {
  nav: {
    home: 'Home',
    docs: 'Docs',
    showcase: 'Showcase',
    blog: 'Blog',
    about: 'About',
    faq: 'FAQ',
    login: 'Login',
    register: 'Sign Up',
  },
  hero: {
    tagline: "We don't just host code. We build consensus.",
    subtitle: 'Make distributed teams as reliable as distributed systems',
    cta: 'Start Building Free',
    secondaryCta: 'Watch Demo',
  },
  stats: {
    opensource: '100% Open Source',
    license: 'MIT License',
    failover: '150ms Failover',
    election: 'Leader Election',
    coverage: '80%+ Coverage',
    e2e: 'Playwright E2E',
    setup: '10min Setup',
    docker: 'Docker Compose',
    docs: '6+ Design Docs',
    academic: 'Academic Rigor',
    i18n: 'zh/en Native',
    native: 'Internationalization',
  },
  features: {
    raft: {
      title: 'Production-Grade Raft Consensus',
      description:
        'Real distributed consensus, not a demo. WebSocket-based real-time communication, persistent log storage, automatic leader election, and log replication. When a leader fails, the cluster elects a new one in 150ms. This is how reliable systems work.',
      highlight: '150ms failover, zero downtime',
    },
    global: {
      title: 'Global by Design, Not Afterthought',
      description:
        "Internationalization isn't a plugin—it's baked into the architecture from line one. zh/en bilingual support with synchronized UI text, auto-persisted language preference, and culturally appropriate UX. Technology should transcend language barriers, not reinforce them.",
      highlight: '100% UI coverage, zero hard-coded strings',
    },
    academic: {
      title: 'Academic Rigor + Production Ready',
      description:
        "This isn't a weekend hack. Full software engineering lifecycle: Requirements Analysis → Architecture Design → Implementation → Testing → Documentation. Every line of code is backed by design docs. Every feature has test coverage. Every decision follows ECP (Engineering & Code Principles): SOLID, DRY, KISS, defensive programming.",
      highlight: '80%+ test coverage, 100% documented',
    },
    typescript: {
      title: 'Full-Stack TypeScript, Best-in-Class Tools',
      description:
        'Next.js 15 + React 19 frontend. NestJS 11 + Prisma 6 backend. Monaco Editor for code editing. Playwright for E2E testing. PostgreSQL, Redis, MinIO for infrastructure. We use the best tools because you deserve it. Developer experience first, always.',
      highlight: 'Monorepo architecture, pnpm workspace',
    },
    testing: {
      title: 'Ship with Confidence',
      description:
        'Comprehensive Playwright E2E test suites cover authentication, organizations, teams, projects, file management, and theme switching. Every user flow is tested. Every edge case is handled. Green tests before merge. This is how production-grade systems ship.',
      highlight: '9 test suites, 50+ test cases',
    },
    opensource: {
      title: 'Truly Open, Forever Free',
      description:
        "MIT License. Fork it. Break it. Build on it. Sell it. We don't believe in open-core bait-and-switch. Every feature is open source. Every decision is transparent. This is how community-driven development should work. Contribute, and let's build consensus together.",
      highlight: 'No vendor lock-in, self-hosted friendly',
    },
  },
  footer: {
    tagline: 'We build consensus.',
    copyright: '© 2025 Flotilla. Created with ❤️ by JIA',
    quickLinks: 'Quick Links',
    quickStart: 'Quick Start',
    architecture: 'Architecture',
    apiReference: 'API Reference',
    contributing: 'Contributing',
    more: 'More',
    about: 'About',
    roadmap: 'Roadmap',
    license: 'License (MIT)',
    privacy: 'Privacy',
    changelog: 'Changelog',
  },
} as const
