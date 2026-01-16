import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Flotilla - We build consensus'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)',
        }}
      >
        {/* Logo + Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
          }}
        >
          {/* Logo SVG */}
          <div
            style={{
              display: 'flex',
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              padding: '24px',
            }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="30" r="12" fill="white" />
              <circle cx="30" cy="70" r="12" fill="white" />
              <circle cx="70" cy="70" r="12" fill="white" />
              <line x1="50" y1="42" x2="35" y2="60" stroke="white" strokeWidth="3" />
              <line x1="50" y1="42" x2="65" y2="60" stroke="white" strokeWidth="3" />
              <line x1="42" y1="70" x2="58" y2="70" stroke="white" strokeWidth="3" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: '72px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            Flotilla
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              color: '#a0a0a0',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            We don&apos;t just host code. We build consensus.
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'flex',
              marginTop: '24px',
              padding: '12px 32px',
              borderRadius: '9999px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontSize: '20px',
              color: '#a5b4fc',
              fontWeight: 'medium',
            }}
          >
            Production-Ready Distributed Consensus
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
