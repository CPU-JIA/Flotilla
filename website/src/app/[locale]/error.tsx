'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Error Illustration */}
        <div className="mb-8">
          <AlertTriangle className="h-32 w-32 text-red-500/50 mx-auto mb-6" />
          <h1 className="text-6xl font-bold text-foreground/10 mb-4">Error</h1>
        </div>

        {/* Content */}
        <h2 className="text-4xl font-bold mb-4">Something Went Wrong</h2>
        <p className="text-lg text-foreground/60 mb-8">
          An unexpected error occurred. We are sorry for the inconvenience.
        </p>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
            <h3 className="font-mono text-sm font-semibold mb-2 text-red-400">Error Details</h3>
            <p className="font-mono text-xs text-foreground/70 break-all">{error.message}</p>
            {error.digest && (
              <p className="font-mono text-xs text-foreground/50 mt-2">Digest: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
          >
            <Home className="h-5 w-5" />
            Go Home
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-12 p-6 rounded-xl bg-secondary/30 border border-border/40 text-left">
          <h3 className="font-semibold mb-3">If the problem persists</h3>
          <ul className="space-y-2 text-sm text-foreground/70">
            <li>• Try refreshing the page</li>
            <li>• Clear your browser cache and cookies</li>
            <li>• Check your internet connection</li>
            <li>
              • Report the issue on{' '}
              <a
                href="https://github.com/CPU-JIA/Cloud-Dev-Platform/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
