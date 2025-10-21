'use client'

/**
 * 文件列表组件
 * ECP-A1: 单一职责 - 显示和管理文件列表
 * ECP-C3: 性能意识 - 分页加载
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ProjectFile } from '@/types/file'

interface FileListProps {
  files: ProjectFile[]
  onFolderClick: (folderPath: string) => void
  onFileDelete: (fileId: string) => void
  onDownload: (fileId: string, fileName: string) => void
  onEdit?: (fileId: string) => void
  canManage: boolean
}

export function FileList({
  files,
  onFolderClick,
  onFileDelete,
  onDownload,
  onEdit,
  canManage,
}: FileListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  // 检查文件是否可编辑（代码文件）
  const isEditableFile = (fileName: string): boolean => {
    const codeExtensions = [
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.h',
      '.hpp',
      '.cs',
      '.go',
      '.rs',
      '.php',
      '.rb',
      '.swift',
      '.kt',
      '.scala',
      '.sh',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.vue',
      '.json',
      '.xml',
      '.yaml',
      '.yml',
      '.md',
      '.txt',
      '.sql',
      '.proto',
    ]
    return codeExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const getFileIcon = (file: ProjectFile): string => {
    if (file.type === 'folder') return '📁'

    const ext = file.name.split('.').pop()?.toLowerCase()

    const iconMap: Record<string, string> = {
      // Code files
      js: '📜',
      ts: '📘',
      tsx: '⚛️',
      jsx: '⚛️',
      py: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      go: '🐹',
      rs: '🦀',
      php: '🐘',
      rb: '💎',

      // Web files
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      json: '📋',
      xml: '📋',
      yaml: '📋',
      yml: '📋',

      // Documents
      md: '📝',
      txt: '📄',
      pdf: '📕',
      doc: '📘',
      docx: '📘',

      // Images
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      svg: '🎨',

      // Archives
      zip: '📦',
      tar: '📦',
      gz: '📦',
    }

    return iconMap[ext || ''] || '📄'
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`确定要删除 "${fileName}" 吗？`)) return

    setDeleting(fileId)
    try {
      await onFileDelete(fileId)
    } finally {
      setDeleting(null)
    }
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">文件夹为空</h3>
          <p className="text-gray-600">上传文件或创建文件夹开始管理项目文件</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-4 flex-1 min-w-0"
                onClick={() => {
                  if (file.type === 'folder') {
                    onFolderClick(file.path)
                  }
                }}
              >
                <div className="text-4xl flex-shrink-0">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    {file.type === 'file' && <span>{formatFileSize(file.size)}</span>}
                    <span>
                      {new Date(file.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {file.type === 'file' && isEditableFile(file.name) && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                    onClick={() => onEdit(file.id)}
                  >
                    ✏️ 编辑
                  </Button>
                )}

                {file.type === 'file' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={() => onDownload(file.id, file.name)}
                  >
                    📥 下载
                  </Button>
                )}

                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white"
                    onClick={() => handleDelete(file.id, file.name)}
                    disabled={deleting === file.id}
                  >
                    {deleting === file.id ? '删除中...' : '🗑️ 删除'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
