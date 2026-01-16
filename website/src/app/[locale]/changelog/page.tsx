import { FileText, Plus, Wrench, Bug, Zap, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Changelog - Flotilla',
  description: 'Flotilla changelog. See what is new in every release.',
}

export default function ChangelogPage() {
  const releases = [
    {
      version: 'Unreleased',
      date: '2025-10-21',
      status: 'unreleased',
      title: 'Major UI/UX Upgrade',
      changes: {
        added: [
          {
            category: 'Mantine 7.15 Integration',
            items: [
              'Added @mantine/core, @mantine/hooks, @mantine/form, @mantine/notifications, @mantine/dates, @mantine/charts',
              'Integrated Mantine theme system with Tailwind CSS 4',
              'Created useMantineThemeSync() hook for theme synchronization',
            ],
          },
          {
            category: 'Enhanced Theme System',
            items: [
              'New ThemeToggle component with 4 variants',
              'Smooth theme transition animations (<200ms)',
              'Theme persistence via localStorage',
            ],
          },
          {
            category: 'Design System',
            items: [
              'Comprehensive Design System configuration',
              'Tailwind CSS 4 with @theme directive',
              '700+ line design system documentation',
              'Design System showcase page (/design-system)',
            ],
          },
        ],
        changed: [
          'Updated AppLayout with enhanced ThemeToggle and LanguageToggle components',
          'Integrated MantineProvider with custom theme in root layout',
          'Updated globals.css with Tailwind CSS 4 @theme directive',
        ],
        fixed: [
          'Fixed theme hydration mismatch with mounted state check',
          'Fixed language persistence across page reloads',
          'Improved dark mode color contrast for accessibility (WCAG 2.1 AA)',
        ],
        performance: [
          'CSS bundle size optimized with Tailwind CSS 4 JIT mode',
          'Theme switch latency < 50ms',
          'Language switch latency < 100ms',
          'Tree-shaking enabled for Mantine components',
        ],
      },
    },
    {
      version: '1.0.0-MVP',
      date: '2025-10-20',
      status: 'released',
      title: 'Initial MVP Release',
      changes: {
        added: [
          {
            category: 'Core Features',
            items: [
              'Bootstrap admin mechanism (3 methods)',
              'Organization & Team architecture',
              'Raft consensus algorithm implementation',
              'Monitoring & performance tracking',
            ],
          },
          {
            category: 'Internationalization',
            items: [
              'Full i18n support (zh/en)',
              '500+ translations',
              'Auto-persisted language preference',
            ],
          },
          {
            category: 'Testing & DevOps',
            items: [
              'Playwright E2E test suite (9 suites, 50+ cases)',
              'Docker production deployment',
              '80%+ test coverage',
            ],
          },
        ],
      },
    },
  ]

  const getIconForType = (type: string) => {
    switch (type) {
      case 'added':
        return Plus
      case 'changed':
        return Wrench
      case 'fixed':
        return Bug
      case 'performance':
        return Zap
      default:
        return FileText
    }
  }

  const getColorForType = (type: string) => {
    switch (type) {
      case 'added':
        return 'text-green-500'
      case 'changed':
        return 'text-blue-500'
      case 'fixed':
        return 'text-orange-500'
      case 'performance':
        return 'text-purple-500'
      default:
        return 'text-foreground/60'
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-blue-500/10 via-background to-green-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 mb-6">
            <FileText className="h-4 w-4" />
            <span>Changelog</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">What is New</h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Track all changes, improvements, and fixes in Flotilla. We follow semantic versioning.
          </p>
        </div>
      </section>

      {/* Info Banner */}
      <section className="py-8 bg-secondary/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex items-start gap-4 p-4 rounded-lg bg-card border border-border/40">
            <AlertCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Versioning Scheme</h3>
              <p className="text-sm text-foreground/70">
                We follow{' '}
                <a
                  href="https://semver.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Semantic Versioning
                </a>
                . Format: <code className="px-2 py-1 rounded bg-secondary">MAJOR.MINOR.PATCH</code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Releases */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {releases.map((release) => (
              <div
                key={release.version}
                className={`p-8 rounded-2xl border ${
                  release.status === 'unreleased'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-card border-border/40'
                }`}
              >
                {/* Release Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold">{release.version}</h2>
                      {release.status === 'unreleased' && (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                          Unreleased
                        </span>
                      )}
                    </div>
                    <p className="text-lg text-foreground/70 mb-1">{release.title}</p>
                    <p className="text-sm text-foreground/50">{release.date}</p>
                  </div>
                </div>

                {/* Changes */}
                <div className="space-y-8">
                  {Object.entries(release.changes).map(([type, items]) => {
                    const Icon = getIconForType(type)
                    const color = getColorForType(type)

                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-4">
                          <Icon className={`h-5 w-5 ${color}`} />
                          <h3 className="text-xl font-semibold capitalize">{type}</h3>
                        </div>

                        <div className="space-y-4">
                          {Array.isArray(items) ? (
                            <ul className="space-y-2">
                              {items.map((item: string, index: number) => (
                                <li key={index} className="flex items-start gap-3">
                                  <span
                                    className={`mt-1.5 h-1.5 w-1.5 rounded-full ${color} flex-shrink-0`}
                                  />
                                  <span className="text-foreground/70">{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="space-y-6">
                              {items.map(
                                (
                                  group: { category: string; items: string[] },
                                  groupIndex: number
                                ) => (
                                  <div
                                    key={groupIndex}
                                    className="pl-4 border-l-2 border-border/40"
                                  >
                                    <h4 className="font-semibold mb-3">{group.category}</h4>
                                    <ul className="space-y-2">
                                      {group.items.map((item: string, itemIndex: number) => (
                                        <li key={itemIndex} className="flex items-start gap-3">
                                          <span
                                            className={`mt-1.5 h-1.5 w-1.5 rounded-full ${color} flex-shrink-0`}
                                          />
                                          <span className="text-foreground/70 text-sm">{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="py-16 bg-secondary/20 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">Change Types</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { type: 'added', label: 'Added', description: 'New features and capabilities' },
                {
                  type: 'changed',
                  label: 'Changed',
                  description: 'Changes to existing functionality',
                },
                { type: 'fixed', label: 'Fixed', description: 'Bug fixes and corrections' },
                {
                  type: 'performance',
                  label: 'Performance',
                  description: 'Performance improvements',
                },
              ].map((item) => {
                const Icon = getIconForType(item.type)
                const color = getColorForType(item.type)
                return (
                  <div
                    key={item.type}
                    className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/40"
                  >
                    <Icon className={`h-6 w-6 ${color} flex-shrink-0`} />
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
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-foreground/60 mb-8 max-w-2xl mx-auto">
            Follow us on GitHub to receive notifications about new releases and updates.
          </p>
          <a
            href="https://github.com/CPU-JIA/Cloud-Dev-Platform/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            View Releases on GitHub
          </a>
        </div>
      </section>
    </div>
  )
}
