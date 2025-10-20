'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n'
import Image from 'next/image'
import { Github } from 'lucide-react'

export function Footer() {
  const t = useTranslations()

  const quickLinks = [
    { href: '/docs/getting-started', label: t('footer.quickStart') },
    { href: '/docs/architecture', label: t('footer.architecture') },
    { href: '/docs/api', label: t('footer.apiReference') },
    { href: '/docs/contributing', label: t('footer.contributing') },
  ]

  const moreLinks = [
    { href: '/about', label: t('footer.about') },
    { href: '/roadmap', label: t('footer.roadmap') },
    { href: '/license', label: t('footer.license') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/changelog', label: t('footer.changelog') },
  ]

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Grid - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Logo + Tagline */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.svg"
                alt="Cloud Dev Platform Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="font-bold text-lg">
                Cloud Dev Platform
              </span>
            </Link>
            <p className="text-sm text-foreground/60 max-w-xs">
              {t('footer.tagline')}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: More */}
          <div>
            <h3 className="font-semibold text-sm mb-4">
              {t('footer.more')}
            </h3>
            <ul className="space-y-2">
              {moreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/40">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-foreground/60 text-center sm:text-left">
              {t('footer.copyright')}
            </p>
            <p className="text-xs text-foreground/40">
              v0.1.0
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
