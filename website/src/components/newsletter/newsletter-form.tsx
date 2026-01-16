'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, Loader2 } from 'lucide-react'

interface NewsletterFormProps {
  variant?: 'default' | 'compact'
  className?: string
}

export function NewsletterForm({ variant = 'default', className = '' }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Subscription failed')
      }

      toast.success('Successfully subscribed! Check your inbox for confirmation.')
      setEmail('')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to subscribe. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          disabled={isLoading}
          className="flex-1 px-4 h-11 rounded-lg bg-background border border-border/40 focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Subscribing...</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              <span>Subscribe</span>
            </>
          )}
        </button>
      </form>
    )
  }

  return (
    <div
      className={`p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/40 ${className}`}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
        <p className="text-foreground/70 max-w-xl mx-auto">
          Subscribe to our newsletter to get the latest articles on distributed systems, Raft
          consensus, and production infrastructure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          disabled={isLoading}
          className="flex-1 px-4 h-11 rounded-lg bg-background border border-border/40 focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Subscribing...</span>
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>

      <p className="text-xs text-foreground/50 text-center mt-4">
        No spam. Unsubscribe anytime. We respect your privacy.
      </p>
    </div>
  )
}
