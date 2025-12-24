import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/providers/theme-provider'
import { QueryProvider } from '@/providers/query-provider'
import { ErrorBoundaryProvider } from '@/providers/error-boundary-provider'
import { LanguageProvider } from '@/contexts/language-context'
import { translations } from '@/locales'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { mantineTheme } from '@/config/mantine-theme'
import { Toaster } from '@/components/ui/sonner'

// Mantine CSS imports
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Flotilla - 基于云计算的开发协作平台',
  description: 'A cloud-based development collaboration platform with distributed consensus',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MantineProvider theme={mantineTheme}>
            <Notifications position="top-right" limit={5} />
            <Toaster position="top-right" richColors closeButton />
            <QueryProvider>
              <LanguageProvider translations={translations}>
                <ErrorBoundaryProvider>
                  <AuthProvider>{children}</AuthProvider>
                </ErrorBoundaryProvider>
              </LanguageProvider>
            </QueryProvider>
          </MantineProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
