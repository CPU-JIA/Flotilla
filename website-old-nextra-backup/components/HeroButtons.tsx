import React from 'react'

/**
 * Hero section CTA buttons
 * Links to main app authentication and demo pages
 */
export function HeroButtons() {
  // Get app URL from environment variable
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <a
        href={`${appUrl}/auth/register`}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Get Started →
      </a>
      <a
        href="/showcase"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#000',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        View Demo
      </a>
      <a
        href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: '0.75rem 1.5rem',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        ★ GitHub
      </a>
    </div>
  )
}
