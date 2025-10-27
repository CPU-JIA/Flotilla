'use client'

/**
 * SearchResultItem Component
 *
 * 显示单个搜索结果：
 * - 文件名和路径
 * - 代码预览（带语法高亮）
 * - 匹配的符号列表
 * - 元数据（语言、大小、修改时间）
 *
 * ECP-B3: 清晰的命名和结构
 * ECP-D1: 组件职责清晰，易于测试
 */

import React from 'react'
import Link from 'next/link'
import { File, Code, Calendar, Hash } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SearchHit } from '@/types/search'
import { cn } from '@/lib/utils'

interface SearchResultItemProps {
  hit: SearchHit
  query: string
  onClick?: () => void
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 格式化时间
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

/**
 * 高亮匹配的文本
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}

export function SearchResultItem({ hit, query, onClick }: SearchResultItemProps) {
  // 使用 MeiliSearch 的 _formatted 字段（包含高亮标记）或原始内容
  const fileName = hit._formatted?.fileName || hit.fileName
  const filePath = hit._formatted?.filePath || hit.filePath
  const contentPreview = hit._formatted?.content || hit.content

  // 截取代码预览（最多3行）
  const previewLines = contentPreview.split('\n').slice(0, 3).join('\n')
  const hasMore = contentPreview.split('\n').length > 3

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <Link
          href={`/projects/${hit.projectId}/files?path=${encodeURIComponent(hit.filePath)}&branch=${hit.branchName}`}
          onClick={onClick}
          className="block space-y-3"
        >
          {/* Header: 文件名和路径 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <h3 className="font-medium truncate">
                  {highlightText(fileName, query)}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {highlightText(filePath, query)}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">
                {hit.language}
              </Badge>
            </div>
          </div>

          {/* Code Preview */}
          {previewLines && (
            <div className="relative">
              <pre className={cn(
                "text-xs bg-muted/50 rounded-md p-3 overflow-x-auto",
                "border border-border/50"
              )}>
                <code className="language-{hit.language}">
                  {highlightText(previewLines, query)}
                  {hasMore && <span className="text-muted-foreground">...</span>}
                </code>
              </pre>
            </div>
          )}

          {/* Symbols (if any) */}
          {hit.symbols && hit.symbols.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Code className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                {hit.symbols.slice(0, 5).map((symbol, index) => (
                  <Badge key={index} variant="outline" className="text-xs font-mono">
                    {highlightText(symbol, query)}
                  </Badge>
                ))}
                {hit.symbols.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{hit.symbols.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer: 额外信息 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>{hit.branchName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(hit.lastModified)}</span>
            </div>
            <span>{formatFileSize(hit.size)}</span>
            <span>{hit.lineCount} lines</span>
          </div>

          {/* Commit Message (if any) */}
          {hit.commitMessage && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              {hit.commitMessage}
            </p>
          )}
        </Link>
      </CardContent>
    </Card>
  )
}
