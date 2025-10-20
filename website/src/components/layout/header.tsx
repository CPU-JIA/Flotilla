'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Github, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { cn } from '@/lib/utils'

export function Header() {
  const t = useTranslations()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    if (latest > previous && latest > 150) {
      setHidden(true)
    } else {
      setHidden(false)
    }
  })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/docs', label: t('nav.docs') },
    { href: '/showcase', label: t('nav.showcase') },
    { href: '/about', label: t('nav.about') },
    { href: '/faq', label: t('nav.faq') },
  ]

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80 supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.svg"
              alt="Cloud Dev Platform Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-bold text-lg hidden sm:inline">
              Cloud Dev Platform
            </span>
          </Link>

          {/* Center: Navigation (Desktop only) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Tools */}
          <div className="flex items-center gap-2">
            {/* Language & Theme Toggles */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {/* GitHub Star */}
            <motion.a
              href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Github className="h-4 w-4" />
              <span className="text-sm font-medium hidden lg:inline">
                GitHub
              </span>
            </motion.a>

            {/* Auth Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <motion.a
                href={`${APP_URL}/auth/login`}
                className="px-4 h-9 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('nav.login')}
              </motion.a>
              <motion.a
                href={`${APP_URL}/auth/register`}
                className="px-4 h-9 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center shadow-lg shadow-primary/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('nav.register')} →
              </motion.a>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
        >
          <div className="container mx-auto px-4 py-4 space-y-2">
            {/* Mobile Navigation */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="h-px bg-border/40 my-3" />

            {/* Mobile Tools */}
            <div className="flex items-center gap-2 px-4 py-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <motion.a
                href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="h-4 w-4" />
                <span className="text-sm font-medium">GitHub</span>
              </motion.a>
            </div>

            {/* Mobile Auth Buttons */}
            <div className="flex flex-col gap-2 px-4 py-2">
              <a
                href={`${APP_URL}/auth/login`}
                className="w-full px-4 h-10 rounded-lg text-sm font-medium text-center border border-border hover:bg-secondary transition-colors flex items-center justify-center"
              >
                {t('nav.login')}
              </a>
              <a
                href={`${APP_URL}/auth/register`}
                className="w-full px-4 h-10 rounded-lg text-sm font-medium text-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center shadow-lg shadow-primary/25"
              >
                {t('nav.register')} →
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
