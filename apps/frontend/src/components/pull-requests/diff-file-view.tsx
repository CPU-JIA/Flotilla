'use client'

import { useState } from 'react'
import { FileDiff, PRCommentWithAuthor } from '@/types/pull-request'

interface DiffFileViewProps {
  file: FileDiff
  comments: PRCommentWithAuthor[]
  pullRequestId: string
  commitHash?: string
  onAddComment: (filePath: string, lineNumber: number, body: string, commitHash?: string) => Promise<void>
}

export function DiffFileView({ file, comments, pullRequestId, commitHash, onAddComment }: DiffFileViewProps) {
  const [activeLineNumber, setActiveLineNumber] = useState<number | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  // Group comments by line number
  const commentsByLine = comments.reduce((acc, comment) => {
    if (comment.filePath === file.path && comment.lineNumber) {
      const key = comment.lineNumber
      if (!acc[key]) acc[key] = []
      acc[key].push(comment)
    }
    return acc
  }, {} as Record<number, PRCommentWithAuthor[]>)

  // Parse patch into lines with proper line number tracking
  const lines = file.patch ? file.patch.split('\n') : []

  // Track line numbers for new file (+ lines)
  const lineNumbers: (number | null)[] = []
  let currentNewLine = 0

  lines.forEach((line) => {
    if (line.startsWith('@@')) {
      // Parse hunk header to get starting line number
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
      if (match) {
        currentNewLine = parseInt(match[1], 10)
      }
      lineNumbers.push(null) // Hunk headers don't have line numbers
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      // Addition: this is a new line
      lineNumbers.push(currentNewLine)
      currentNewLine++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // Deletion: no line number in new file
      lineNumbers.push(null)
    } else if (!line.startsWith('\\')) {
      // Context line: exists in both old and new
      lineNumbers.push(currentNewLine)
      currentNewLine++
    } else {
      lineNumbers.push(null)
    }
  })

  const handleAddComment = async (lineNumber: number) => {
    if (!commentBody.trim()) return

    setSubmitting(true)
    try {
      await onAddComment(file.path, lineNumber, commentBody, commitHash)
      setCommentBody('')
      setActiveLineNumber(null)
    } catch (err) {
      console.error('Failed to add comment:', err)
      alert('Failed to add comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded mb-4">
      {/* File Header */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-600">
        <div className="font-mono text-sm">
          <span className="font-semibold">{file.path}</span>
          <span className="ml-2 text-gray-600 dark:text-gray-400">({file.status})</span>
        </div>
        <div className="text-sm">
          <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
          {' '}
          <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
        </div>
      </div>

      {/* Diff Content */}
      <div className="bg-white dark:bg-gray-900 font-mono text-xs">
        {lines.length > 0 ? (
          <div>
            {lines.map((line, idx) => {
              const isAddition = line.startsWith('+') && !line.startsWith('+++')
              const isDeletion = line.startsWith('-') && !line.startsWith('---')
              const isHunkHeader = line.startsWith('@@')
              const lineNumber = lineNumbers[idx]

              const lineClass = isAddition
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : isDeletion
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                : isHunkHeader
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200'

              const canComment = lineNumber !== null && !isDeletion && !isHunkHeader
              const hasComments = lineNumber && commentsByLine[lineNumber]
              const isCommentFormActive = activeLineNumber === lineNumber

              return (
                <div key={idx}>
                  {/* Code Line */}
                  <div
                    className={`group ${lineClass} flex items-center border-l-4 ${
                      isAddition
                        ? 'border-green-500'
                        : isDeletion
                        ? 'border-red-500'
                        : 'border-transparent'
                    }`}
                    onMouseEnter={() => canComment && setHoveredLine(lineNumber)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    {/* Line Number */}
                    <span className="select-none text-gray-400 px-4 py-1 inline-block w-20 text-right flex-shrink-0">
                      {!isHunkHeader && lineNumber !== null ? lineNumber : ''}
                    </span>

                    {/* Code Content */}
                    <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                      {line}
                    </span>

                    {/* Add Comment Button (visible on hover) */}
                    {canComment && hoveredLine === lineNumber && !isCommentFormActive && (
                      <button
                        onClick={() => setActiveLineNumber(lineNumber)}
                        className="flex-shrink-0 mr-2 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                        title="Add comment"
                      >
                        💬 Add comment
                      </button>
                    )}
                  </div>

                  {/* Inline Comment Form */}
                  {isCommentFormActive && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        ✏️ Adding comment on line {lineNumber}
                      </div>
                      <textarea
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Write your comment..."
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAddComment(lineNumber!)}
                          disabled={!commentBody.trim() || submitting}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? 'Submitting...' : 'Add comment'}
                        </button>
                        <button
                          onClick={() => {
                            setActiveLineNumber(null)
                            setCommentBody('')
                          }}
                          disabled={submitting}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing Line Comments */}
                  {hasComments && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        💬 {commentsByLine[lineNumber!].length} comment(s) on line {lineNumber}
                      </div>
                      {commentsByLine[lineNumber!].map((comment) => (
                        <div key={comment.id} className="flex gap-3 mb-2 last:mb-0">
                          <img
                            src={comment.author.avatar || '/default-avatar.png'}
                            alt={comment.author.username}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                                {comment.author.username}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {file.status === 'deleted' ? 'File deleted' : 'No diff available'}
          </div>
        )}
      </div>
    </div>
  )
}
