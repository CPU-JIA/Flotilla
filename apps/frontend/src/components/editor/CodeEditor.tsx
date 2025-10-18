'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import 'github-markdown-css/github-markdown-dark.css'

/**
 * CodeEditor 组件
 * ECP-A1: 单一职责原则 - 专注于代码编辑功能
 * ECP-C1: 防御性编程 - 自动保存和错误处理
 * Phase 3.3: 添加版本历史功能
 * 新增: 支持Light/Dark主题切换
 */

interface CodeEditorProps {
  fileId: string
  projectId: string // Phase 3.3: 必需的projectId用于获取Repository信息
  initialContent: string
  language: string
  onSave?: (content: string) => void
}

type ViewMode = 'edit' | 'preview'

interface Commit {
  id: string
  message: string
  createdAt: string
  author: {
    id: string
    username: string
    email: string
    avatar?: string
  }
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  fileId,
  projectId,
  initialContent,
  language,
  onSave,
}) => {
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [showHistory, setShowHistory] = useState(false)
  const [commits, setCommits] = useState<Commit[]>([])
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [branchId, setBranchId] = useState<string>('')
  const [repositoryExists, setRepositoryExists] = useState<boolean>(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { theme } = useTheme()

  // 判断是否为markdown文件
  const isMarkdown = language === 'markdown'

  // 根据主题选择Monaco编辑器主题
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  // 当文件切换时，更新内容和重置状态
  useEffect(() => {
    setContent(initialContent)
    setLastSaved(null)
    setViewMode('edit')
    setShowHistory(false)
    // 清除待保存的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [fileId, initialContent])

  // 加载提交历史
  const loadCommits = useCallback(async () => {
    if (!projectId || !branchId) return

    try {
      setLoadingCommits(true)
      const response = await api.repositories.getCommits(projectId, branchId, { page: 1, pageSize: 20 }) as unknown as { commits: Commit[], total: number, page: number, pageSize: number }
      setCommits(response.commits || [])
    } catch (error) {
      console.error('Failed to load commits:', error)
    } finally {
      setLoadingCommits(false)
    }
  }, [projectId, branchId])

  // 获取默认分支ID
  useEffect(() => {
    const fetchBranchId = async () => {
      if (!projectId) return

      try {
        const branches = await api.repositories.getBranches(projectId)
        const mainBranch = branches.find((b) => b.name === 'main')
        if (mainBranch) {
          setBranchId(mainBranch.id)
          setRepositoryExists(true)
        }
      } catch (error) {
        // 404错误表示Repository不存在，这是正常情况（项目可能刚创建）
        const apiError = error as { status?: number }
        if (apiError?.status === 404) {
          setRepositoryExists(false)
          console.warn('Repository not found for project:', projectId)
        } else {
          console.error('Failed to fetch branches:', error)
        }
      }
    }

    fetchBranchId()
  }, [projectId])

  // Phase 3.3: 保存文件后自动刷新提交历史
  useEffect(() => {
    if (lastSaved && showHistory && branchId) {
      // 延迟500ms等待后端commit创建完成，然后刷新提交列表
      const timer = setTimeout(() => {
        loadCommits()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [lastSaved, showHistory, branchId, loadCommits])

  // ECP-C2: 系统化错误处理 - 保存文件内容
  const saveContent = useCallback(async (newContent: string) => {
    try {
      setSaving(true)
      await api.files.updateFileContent(fileId, newContent)
      setLastSaved(new Date())
      onSave?.(newContent)
    } catch (error) {
      console.error('Failed to save file:', error)
      // TODO: 显示错误提示 toast
    } finally {
      setSaving(false)
    }
  }, [fileId, onSave])

  // ECP-C3: 性能意识 - 使用防抖减少API调用
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return
    setContent(value)

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 设置新的自动保存定时器（2秒防抖）
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(value)
    }, 2000)
  }, [saveContent])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full w-full flex bg-white dark:bg-gray-900">
      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* 左侧按钮组 */}
          <div className="flex items-center gap-2">
            {/* 模式切换按钮（仅markdown文件显示） */}
            {isMarkdown && (
              <>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'edit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  👁️ 预览
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}

            {/* 版本历史按钮 */}
            <button
              onClick={() => {
                setShowHistory(!showHistory)
                if (!showHistory && commits.length === 0) {
                  loadCommits()
                }
              }}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showHistory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📜 版本历史
            </button>
          </div>

          {/* 保存状态 */}
          <div className="text-sm text-gray-600">
            {saving ? (
              <span>💾 正在保存...</span>
            ) : lastSaved ? (
              <span>✓ 已保存于 {lastSaved.toLocaleTimeString()}</span>
            ) : (
              <span>未保存</span>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {/* 编辑器 */}
          {viewMode === 'edit' && (
            <Editor
              height="100%"
              language={language}
              defaultValue={initialContent}
              value={content}
              onChange={handleEditorChange}
              theme={monacoTheme}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          )}

          {/* 预览区（仅markdown文件显示） */}
          {isMarkdown && viewMode === 'preview' && (
            <div className="h-full overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-900 p-8">
              <div className="markdown-body max-w-5xl mx-auto px-12" style={{ backgroundColor: 'transparent' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 3.3: 版本历史侧边栏 - 响应式设计 */}
      {showHistory && (
        <>
          {/* 移动端背景遮罩 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setShowHistory(false)}
          />

          {/* 侧边栏容器 */}
          <div className="
            fixed lg:relative
            inset-y-0 right-0 lg:inset-y-auto
            w-full sm:w-[320px] lg:w-[380px] xl:w-[400px]
            bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700
            flex flex-col
            z-50 lg:z-auto
            transform lg:transform-none
            shadow-xl lg:shadow-none
          ">
            {/* 侧边栏标题 */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <h3 className="text-gray-900 dark:text-white font-semibold">📜 版本历史</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="关闭版本历史"
              >
                ✕
              </button>
            </div>

          {/* 提交列表 */}
          <div className="flex-1 overflow-y-auto">
            {!repositoryExists ? (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-sm">版本控制未初始化</p>
                <p className="text-xs mt-2">项目的Git仓库尚未创建</p>
                <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">保存文件后会自动初始化</p>
              </div>
            ) : loadingCommits ? (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                <div className="text-2xl mb-2 animate-pulse">⏳</div>
                <p className="text-sm">加载中...</p>
              </div>
            ) : commits.length === 0 ? (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-sm">暂无提交记录</p>
                <p className="text-xs mt-1">保存文件后会自动创建提交</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {commits.map((commit) => (
                  <div
                    key={commit.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    title={`${commit.message}\n\n作者: ${commit.author.username}\n时间: ${new Date(commit.createdAt).toLocaleString('zh-CN')}`}
                  >
                    <div className="flex gap-3">
                      {/* 作者头像 */}
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {commit.author.username[0].toUpperCase()}
                      </div>

                      {/* 提交详情 - 优化布局 */}
                      <div className="flex-1 min-w-0">
                        {/* 提交信息 - 限制显示行数 */}
                        <div className="text-gray-900 dark:text-white text-sm mb-1 line-clamp-2 break-words leading-relaxed">
                          {commit.message}
                        </div>

                        {/* 作者和时间信息 - 水平布局节省空间 */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                            {commit.author.username}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {(() => {
                              const now = new Date()
                              const commitDate = new Date(commit.createdAt)
                              const diffMs = now.getTime() - commitDate.getTime()
                              const diffMins = Math.floor(diffMs / (1000 * 60))
                              const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                              if (diffMins < 1) return '刚刚'
                              if (diffMins < 60) return `${diffMins}分钟前`
                              if (diffHours < 24) return `${diffHours}小时前`
                              if (diffDays < 7) return `${diffDays}天前`
                              return commitDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  )
}
