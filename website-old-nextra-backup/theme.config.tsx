import React from 'react'
import { useRouter } from 'next/router'
import type { DocsThemeConfig } from 'nextra-theme-docs'
import Image from 'next/image'

const config: DocsThemeConfig = {
  logo: (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Image src="/images/logo.png" alt="Flotilla Logo" width={32} height={32} />
      <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Flotilla</span>
    </div>
  ),
  project: {
    link: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',
  },
  docsRepositoryBase: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/website',
  banner: {
    key: 'flotilla-launch-2025',
    text: (
      <a href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/register`} target="_blank" rel="noopener noreferrer">
        🎉 Flotilla is live! Sign up for free and start building with Raft consensus →
      </a>
    ),
  },
  footer: {
    // Force recompilation to apply footer changes
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://github.com/CPU-JIA/Cloud-Dev-Platform" target="_blank">
          Flotilla
        </a>
        .
      </span>
    ),
  },
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== '/') {
      return {
        titleTemplate: '%s – Flotilla'
      }
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Flotilla - We Build Consensus" />
      <meta property="og:description" content="A cloud-native development platform powered by Raft consensus algorithm. Make distributed teams as reliable as distributed systems." />
      <meta name="description" content="Flotilla - Production-grade Raft consensus for team collaboration. Built with Next.js, NestJS, and academic rigor." />
      <meta name="keywords" content="Flotilla, Raft, distributed systems, consensus algorithm, NestJS, Next.js, TypeScript, open source, cloud development" />
      <link rel="icon" type="image/png" href="/images/logo.png" />
    </>
  ),
  primaryHue: 210,
  darkMode: true,
  nextThemes: {
    defaultTheme: 'system',
  },
}

export default config
