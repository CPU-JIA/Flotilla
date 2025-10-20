'use client'

import * as React from 'react'
import { codeToHtml } from 'shiki'
import { useTheme } from 'next-themes'
import { Check, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  const { theme } = useTheme()
  const [html, setHtml] = React.useState<string>('')
  const [copied, setCopied] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const highlightCode = async () => {
      try {
        const result = await codeToHtml(code, {
          lang: language,
          theme: theme === 'dark' ? 'github-dark' : 'github-light',
        })
        setHtml(result)
      } catch (error) {
        console.error('Shiki highlight error:', error)
        // Fallback to plain text
        setHtml(`<pre><code>${code}</code></pre>`)
      }
    }

    highlightCode()
  }, [code, language, theme, mounted])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  if (!mounted) {
    return (
      <div className="rounded-xl bg-secondary/50 animate-pulse h-64" />
    )
  }

  return (
    <div className="group relative rounded-xl bg-card border border-border/40 overflow-hidden shadow-lg">
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-secondary/30">
          <span className="text-sm font-mono text-foreground/60">{filename}</span>
          <span className="text-xs text-foreground/40 uppercase">{language}</span>
        </div>
      )}

      {/* Code Content */}
      <div className="relative">
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="h-4 w-4 text-accent" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Copy className="h-4 w-4 text-foreground/60" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Shiki Highlighted Code */}
        <div
          className="overflow-x-auto p-4 text-sm font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
