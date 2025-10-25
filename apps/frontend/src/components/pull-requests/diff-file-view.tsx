'use client'

import { FileDiff, PRCommentWithAuthor } from '@/types/pull-request'

interface DiffFileViewProps {
  file: FileDiff
  comments: PRCommentWithAuthor[]
}

export function DiffFileView({ file, comments }: DiffFileViewProps) {
  // Group comments by line number
  const commentsByLine = comments.reduce((acc, comment) => {
    if (comment.filePath === file.path && comment.lineNumber) {
      const key = comment.lineNumber
      if (!acc[key]) acc[key] = []
      acc[key].push(comment)
    }
    return acc
  }, {} as Record<number, PRCommentWithAuthor[]>)

  // Parse patch into lines
  const lines = file.patch ? file.patch.split('\n') : []

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded mb-4">
      {/* File Header */}
      <div className="bg-gray-100 dark:border-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-600">
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

              // Extract line number from context (simplified)
              let lineNumber: number | null = null
              if (isHunkHeader) {
                const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
                lineNumber = match ? parseInt(match[1], 10) : null
              }

              const lineClass = isAddition
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : isDeletion
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                : isHunkHeader
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200'

              return (
                <div key={idx}>
                  <div
                    className={`${lineClass} px-4 py-1 border-l-4 ${
                      isAddition
                        ? 'border-green-500'
                        : isDeletion
                        ? 'border-red-500'
                        : 'border-transparent'
                    }`}
                  >
                    <span className="select-none text-gray-400 mr-4 inline-block w-12 text-right">
                      {!isHunkHeader && idx + 1}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line}</span>
                  </div>

                  {/* Line Comments */}
                  {lineNumber && commentsByLine[lineNumber] && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        💬 {commentsByLine[lineNumber].length} comment(s) on line {lineNumber}
                      </div>
                      {commentsByLine[lineNumber].map((comment) => (
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
