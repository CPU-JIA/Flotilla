/**
 * MarkdownPreview Component
 *
 * Renders Markdown content with syntax highlighting
 *
 * ECP-A1: Single Responsibility - Only handles Markdown rendering
 * ECP-B2: KISS - Simple wrapper around react-markdown
 * ECP-C1: Theme-aware styling for proper contrast in both light and dark modes
 */

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useTheme } from 'next-themes'
import 'github-markdown-css/github-markdown.css'
import type { ReactNode } from 'react'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

interface CodeProps {
  inline?: boolean
  className?: string
  children?: ReactNode
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme()

  if (!content) {
    return null
  }

  // Apply theme-specific classes for proper contrast
  // ECP-C1: Defensive programming - handle theme detection
  const isLight = resolvedTheme === 'light'
  const colorMode = isLight ? 'light' : 'dark'

  return (
    <div
      className={`markdown-body ${className}`}
      data-color-mode={colorMode}
      data-light-theme="light"
      data-dark-theme="dark"
      style={{
        backgroundColor: 'transparent',
        color: isLight ? 'var(--foreground)' : 'var(--foreground)',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // ECP-B1: DRY - Reusable custom component overrides
          pre: ({ children, ...props }) => (
            <pre
              className="bg-muted p-4 rounded-md overflow-x-auto"
              style={{
                backgroundColor: isLight ? '#f6f8fa' : '#161b22',
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </pre>
          ),
          code: ({ inline, className, children, ...props }: CodeProps) => {
            return inline ? (
              <code
                className="bg-muted px-1 py-0.5 rounded text-sm"
                style={{
                  backgroundColor: isLight ? '#f6f8fa' : '#161b22',
                  color: isLight ? '#24292f' : '#e6edf3',
                }}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={className}
                style={{
                  color: isLight ? '#24292f' : '#e6edf3',
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          a: ({ children, ...props }) => (
            <a
              className="text-primary hover:underline"
              style={{
                color: isLight ? '#0969da' : '#58a6ff',
              }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          p: ({ children, ...props }) => (
            <p
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </p>
          ),
          h1: ({ children, ...props }) => (
            <h1
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
                borderBottomColor: isLight ? '#d0d7de' : '#21262d',
              }}
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
                borderBottomColor: isLight ? '#d0d7de' : '#21262d',
              }}
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </h6>
          ),
          strong: ({ children, ...props }) => (
            <strong
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
                fontWeight: 600,
              }}
              {...props}
            >
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              style={{
                color: isLight ? '#57606a' : '#8b949e',
                borderLeftColor: isLight ? '#d0d7de' : '#3b434b',
              }}
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
              }}
              {...props}
            >
              {children}
            </li>
          ),
          table: ({ children, ...props }) => (
            <table
              style={{
                borderColor: isLight ? '#d0d7de' : '#3b434b',
              }}
              {...props}
            >
              {children}
            </table>
          ),
          thead: ({ children, ...props }) => (
            <thead
              style={{
                backgroundColor: isLight ? '#f6f8fa' : '#161b22',
              }}
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
                borderColor: isLight ? '#d0d7de' : '#3b434b',
              }}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              style={{
                color: isLight ? '#24292f' : '#e6edf3',
                borderColor: isLight ? '#d0d7de' : '#3b434b',
              }}
              {...props}
            >
              {children}
            </td>
          ),
          hr: ({ ...props }) => (
            <hr
              style={{
                backgroundColor: isLight ? '#d0d7de' : '#21262d',
                borderColor: isLight ? '#d0d7de' : '#21262d',
              }}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
