'use client'

import * as React from 'react'
import { Link } from '@/lib/i18n'
import { ChevronRight, FileText, BookOpen, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocSection {
  title: string
  items: {
    title: string
    href: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export function DocsSidebar() {
  const sections: DocSection[] = [
    {
      title: 'Getting Started',
      items: [
        { title: 'Introduction', href: '/docs', icon: BookOpen },
        { title: 'Quick Start', href: '/docs/quick-start', icon: Zap },
        { title: 'Installation', href: '/docs/installation', icon: Settings },
      ],
    },
    {
      title: 'Core Concepts',
      items: [
        { title: 'Raft Consensus', href: '/docs/raft', icon: FileText },
        { title: 'Architecture', href: '/docs/architecture', icon: FileText },
        { title: 'Organizations & Teams', href: '/docs/organizations', icon: FileText },
      ],
    },
    {
      title: 'Development',
      items: [
        { title: 'API Reference', href: '/docs/api', icon: FileText },
        { title: 'Testing', href: '/docs/testing', icon: FileText },
        { title: 'Contributing', href: '/docs/contributing', icon: FileText },
      ],
    },
  ]

  return (
    <aside className="w-64 border-r border-border/40 bg-card/30 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-6 space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
