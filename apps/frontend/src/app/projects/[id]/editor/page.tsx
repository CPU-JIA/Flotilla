'use client'

/**
 * 在线代码编辑器页面
 * ECP-A1: 单一职责 - 专注于代码编辑功能
 * ECP-C3: 性能意识 - 按需加载文件内容
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CodeEditor } from '@/components/editor'
import { api, ApiError } from '@/lib/api'
import { detectLanguage } from '@/lib/language-detector'
import type { ProjectFile } from '@/types/file'
import type { Project } from '@/types/project'

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const fileIdFromUrl = searchParams.get('fileId')

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [fileContentLoading, setFileContentLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentFolder, setCurrentFolder] = useState('/')
  const [autoOpenFileId, setAutoOpenFileId] = useState<string | null>(fileIdFromUrl)
  const [sidebarWidth, setSidebarWidth] = useState(320) // 左侧面板宽度
  const [isResizing, setIsResizing] = useState(false)

  // 加载项目信息
  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectData = await api.projects.getById(projectId)
        setProject(projectData)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('加载项目信息失败')
        }
      }
    }

    loadProject()
  }, [projectId])

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.files.getFiles({
        projectId,
        folder: currentFolder,
      })

      setFiles(response.files)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '加载文件列表失败')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, currentFolder])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // 自动打开URL参数指定的文件
  useEffect(() => {
    if (autoOpenFileId && !loading && !currentFile) {
      const openFileById = async () => {
        try {
          const fileInfo = await api.files.getFileInfo(autoOpenFileId)
          const response = await api.files.getFileContent(autoOpenFileId)
          setCurrentFile(fileInfo)
          setFileContent(response.content)
          setAutoOpenFileId(null) // 只自动打开一次
        } catch (err) {
          console.error('Failed to auto-open file:', err)
          setAutoOpenFileId(null)
        }
      }
      openFileById()
    }
  }, [autoOpenFileId, loading, currentFile])

  // 打开文件并加载内容
  const handleFileClick = async (file: ProjectFile) => {
    if (file.type === 'folder') {
      setCurrentFolder(file.path)
      return
    }

    try {
      setFileContentLoading(true)
      const response = await api.files.getFileContent(file.id)
      setCurrentFile(file)
      setFileContent(response.content)
      setError('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '加载文件内容失败')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setFileContentLoading(false)
    }
  }

  // 返回上级目录
  const handleBackClick = () => {
    if (currentFolder === '/') return

    const pathParts = currentFolder.split('/').filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.length > 0 ? `/${pathParts.join('/')}/` : '/'
    setCurrentFolder(parentPath)
  }

  // 处理面板拖动调整大小
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // 面包屑导航
  const renderBreadcrumb = () => {
    const pathParts = currentFolder.split('/').filter(Boolean)

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button
          onClick={() => setCurrentFolder('/')}
          className="hover:text-blue-600 transition-colors"
        >
          📁 根目录
        </button>
        {pathParts.map((part, index) => {
          const path = `/${pathParts.slice(0, index + 1).join('/')}/`
          return (
            <div key={path} className="flex items-center gap-2">
              <span>/</span>
              <button
                onClick={() => setCurrentFolder(path)}
                className="hover:text-blue-600 transition-colors"
              >
                {part}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // 文件图标
  const getFileIcon = (file: ProjectFile) => {
    if (file.type === 'folder') return '📁'

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const iconMap: Record<string, string> = {
      '.js': '📜',
      '.ts': '📘',
      '.jsx': '⚛️',
      '.tsx': '⚛️',
      '.py': '🐍',
      '.java': '☕',
      '.cpp': '⚙️',
      '.c': '⚙️',
      '.go': '🐹',
      '.rs': '🦀',
      '.html': '🌐',
      '.css': '🎨',
      '.json': '📋',
      '.md': '📝',
    }
    return iconMap[ext] || '📄'
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/files`)}
            className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
          >
            ← 返回文件管理
          </Button>
          <h1 className="text-xl font-bold text-white">{project.name} - 代码编辑器</h1>
        </div>

        {currentFile && (
          <div className="text-sm text-gray-400">
            当前文件: {currentFile.name}
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件树 */}
        <div
          className="bg-gray-800 border-r border-gray-700 flex flex-col"
          style={{ width: `${sidebarWidth}px`, minWidth: '200px', maxWidth: '600px' }}
        >
          {/* 面包屑导航 */}
          <div className="p-4 border-b border-gray-700">
            {renderBreadcrumb()}
            {currentFolder !== '/' && (
              <Button
                variant="outline"
                onClick={handleBackClick}
                className="mt-2 w-full bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
                size="sm"
              >
                ⬆️ 上级目录
              </Button>
            )}
          </div>

          {/* 文件列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-sm">加载中...</p>
              </div>
            ) : error ? (
              <div className="p-4">
                <Card className="bg-red-900 border-red-700">
                  <CardContent className="p-3">
                    <p className="text-red-200 text-sm">{error}</p>
                  </CardContent>
                </Card>
              </div>
            ) : files.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <div className="text-2xl mb-2">📂</div>
                <p className="text-sm">暂无文件</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`w-full p-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                      currentFile?.id === file.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <span className="text-xl">{getFileIcon(file)}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-white text-sm truncate">{file.name}</p>
                      <p className="text-gray-400 text-xs">
                        {file.type === 'folder' ? '文件夹' : `${(file.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 可拖动分隔条 */}
        <div
          className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
          style={{ userSelect: 'none' }}
        />

        {/* 右侧编辑器 */}
        <div className="flex-1 flex flex-col">
          {fileContentLoading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                <p className="text-gray-400">正在加载文件...</p>
              </div>
            </div>
          ) : currentFile ? (
            <CodeEditor
              fileId={currentFile.id}
              projectId={projectId}
              initialContent={fileContent}
              language={detectLanguage(currentFile.name)}
              onSave={() => {
                // 保存成功后的回调（可选）
                console.log('File saved:', currentFile.name)
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-400 text-lg">从左侧选择一个文件开始编辑</p>
                <p className="text-gray-500 text-sm mt-2">支持30+种编程语言</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
