import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/lib/i18n'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Geist, Geist_Mono } from 'next/font/google'
import { generateMetadata as generateSEO } from '@/lib/seo'
import { Analytics } from '@vercel/analytics/react'
import { WebVitals } from '@/components/analytics/web-vitals'
import { Toaster } from 'sonner'
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/structured-data'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = generateSEO({
  title: 'Flotilla',
  description: 'Production-ready distributed code hosting with Raft consensus algorithm. 150ms automatic failover. Full-stack TypeScript. Academic rigor. MIT License.',
  keywords: ['open source', 'self-hosted', 'monorepo', 'pnpm', 'Docker'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as 'zh' | 'en')) {
    notFound()
  }

  const messages = await getMessages()

  // Base URL for structured data
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://flotilla.dev'

  // Generate global structured data
  const organizationSchema = generateOrganizationSchema(baseUrl)
  const websiteSchema = generateWebSiteSchema(baseUrl)

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(organizationSchema)}
        />
        {/* WebSite Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(websiteSchema)}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <Header />
            <main className="pt-16 min-h-screen">{children}</main>
            <Footer />
            <Toaster richColors position="top-right" />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <WebVitals />
      </body>
    </html>
  )
}
