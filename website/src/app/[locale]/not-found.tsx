import Link from 'next/link'
import { Home, Search, FileQuestion } from 'lucide-react'

export const metadata = {
  title: '404 - Page Not Found | Flotilla',
  description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Illustration */}
        <div className="mb-8">
          <FileQuestion className="h-32 w-32 text-foreground/20 mx-auto mb-6" />
          <h1 className="text-9xl font-bold text-foreground/10 mb-4">404</h1>
        </div>

        {/* Content */}
        <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
        <p className="text-lg text-foreground/60 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Home className="h-5 w-5" />
            Go Home
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
          >
            <Search className="h-5 w-5" />
            Browse Docs
          </Link>
        </div>

        {/* Suggestions */}
        <div className="mt-12 p-6 rounded-xl bg-secondary/30 border border-border/40 text-left">
          <h3 className="font-semibold mb-3">Looking for something?</h3>
          <ul className="space-y-2 text-sm text-foreground/70">
            <li>• Check the URL for typos</li>
            <li>
              • Go back to the{' '}
              <Link href="/" className="text-primary hover:underline">
                homepage
              </Link>
            </li>
            <li>
              • Browse our{' '}
              <Link href="/docs" className="text-primary hover:underline">
                documentation
              </Link>
            </li>
            <li>
              • Visit the{' '}
              <Link href="/roadmap" className="text-primary hover:underline">
                roadmap
              </Link>{' '}
              to see what is coming
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
