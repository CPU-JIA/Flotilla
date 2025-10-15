'use client'

/**
 * 版本历史页面
 * US-009: 版本历史和diff可视化
 * ECP-A1: 单一职责 - 专注于版本历史展示
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, User, FileText, Plus, Minus, Edit, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

interface Commit {
  id: string
  message: string
  hash?: string
  createdAt: string
  author: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  filesCount?: number
}

interface CommitDiff {
  commit: {
    id: string
    message: string
    createdAt: string
  }
  stats: {
    added: number
    modified: number
    deleted: number
    total: number
  }
  changes: {
    added: Array<{ id: string; path: string; size: number }>
    modified: Array<{ id: string; path: string; size: number }>
    deleted: Array<{ id: string; path: string; size: number }>
  }
}

export default function VersionHistoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string
  const branchId = searchParams.get('branchId')

  const [commits, setCommits] = useState<Commit[]>([])
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [commitDiff, setCommitDiff] = useState<CommitDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [diffLoading, setDiffLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // 获取提交历史
  const fetchCommits = useCallback(async () => {
    if (!branchId) {
      setError('缺少分支ID参数')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.repositories.getCommits(projectId, branchId, { page, pageSize: 20 })
      setCommits(data.commits || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError('加载提交历史失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [projectId, branchId, page])

  // 获取提交diff
  const fetchCommitDiff = useCallback(async (commitId: string) => {
    if (!branchId) return

    try {
      setDiffLoading(true)
      const data = await api.repositories.getCommitDiff(projectId, branchId, commitId)
      setCommitDiff(data)
    } catch (err) {
      console.error('加载diff失败:', err)
    } finally {
      setDiffLoading(false)
    }
  }, [projectId, branchId])

  useEffect(() => {
    fetchCommits()
  }, [fetchCommits])

  // 处理提交点击
  const handleCommitClick = (commitId: string) => {
    setSelectedCommit(commitId)
    fetchCommitDiff(commitId)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!branchId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">缺少分支参数</h2>
            <p className="text-gray-600 mb-4">请从项目页面选择分支查看版本历史</p>
            <Button onClick={() => router.push(`/projects/${projectId}`)}>
              返回项目
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}`)}
                className="bg-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回项目
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">版本历史</h1>
                <p className="text-gray-600 mt-1">查看所有提交记录和代码变更</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              共 {total} 个提交
            </Badge>
          </div>
        </div>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：提交列表 */}
          <div className="lg:col-span-1">
            <Card className="bg-white rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>提交历史</CardTitle>
                <CardDescription>
                  点击查看详细变更
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">⏳</div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                ) : commits.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-600">暂无提交记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commits.map((commit) => (
                      <div
                        key={commit.id}
                        onClick={() => handleCommitClick(commit.id)}
                        className={`
                          p-4 rounded-xl border-2 transition-all cursor-pointer
                          ${selectedCommit === commit.id
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">📝</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate mb-1">
                              {commit.message}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              <span>{commit.author.username}</span>
                              <Clock className="w-3 h-3 ml-1" />
                              <span>{formatDate(commit.createdAt)}</span>
                            </div>
                            {commit.filesCount !== undefined && (
                              <div className="mt-2 text-xs text-gray-600">
                                <FileText className="w-3 h-3 inline mr-1" />
                                {commit.filesCount} 个文件
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 分页 */}
                {total > 20 && (
                  <div className="mt-4 flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-gray-600">
                      第 {page} 页 / 共 {Math.ceil(total / 20)} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(total / 20)}
                      onClick={() => setPage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：Diff详情 */}
          <div className="lg:col-span-2">
            {!selectedCommit ? (
              <Card className="bg-white rounded-2xl shadow-sm">
                <CardContent className="p-16 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    选择一个提交
                  </h3>
                  <p className="text-gray-600">
                    在左侧列表中点击任意提交查看详细变更
                  </p>
                </CardContent>
              </Card>
            ) : diffLoading ? (
              <Card className="bg-white rounded-2xl shadow-sm">
                <CardContent className="p-16 text-center">
                  <div className="text-6xl mb-4 animate-spin">⏳</div>
                  <p className="text-gray-600">加载变更详情...</p>
                </CardContent>
              </Card>
            ) : commitDiff ? (
              <Card className="bg-white rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 变更详情
                  </CardTitle>
                  <CardDescription>
                    {commitDiff.commit.message}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 统计信息 */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                      <Plus className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">
                        {commitDiff.stats.added}
                      </div>
                      <div className="text-sm text-gray-600">新增</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
                      <Edit className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-600">
                        {commitDiff.stats.modified}
                      </div>
                      <div className="text-sm text-gray-600">修改</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                      <Minus className="w-6 h-6 text-red-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">
                        {commitDiff.stats.deleted}
                      </div>
                      <div className="text-sm text-gray-600">删除</div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* 文件变更列表 */}
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">
                        全部 ({commitDiff.stats.total})
                      </TabsTrigger>
                      <TabsTrigger value="added">
                        新增 ({commitDiff.stats.added})
                      </TabsTrigger>
                      <TabsTrigger value="modified">
                        修改 ({commitDiff.stats.modified})
                      </TabsTrigger>
                      <TabsTrigger value="deleted">
                        删除 ({commitDiff.stats.deleted})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                      <div className="space-y-2">
                        {commitDiff.changes.added.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4 text-green-600" />
                              <code className="text-sm font-mono">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                        {commitDiff.changes.modified.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                          >
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4 text-yellow-600" />
                              <code className="text-sm font-mono">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                        {commitDiff.changes.deleted.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div className="flex items-center gap-2">
                              <Minus className="w-4 h-4 text-red-600" />
                              <code className="text-sm font-mono line-through">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="added" className="mt-4">
                      <div className="space-y-2">
                        {commitDiff.changes.added.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4 text-green-600" />
                              <code className="text-sm font-mono">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="modified" className="mt-4">
                      <div className="space-y-2">
                        {commitDiff.changes.modified.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                          >
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4 text-yellow-600" />
                              <code className="text-sm font-mono">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="deleted" className="mt-4">
                      <div className="space-y-2">
                        {commitDiff.changes.deleted.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div className="flex items-center gap-2">
                              <Minus className="w-4 h-4 text-red-600" />
                              <code className="text-sm font-mono line-through">{file.path}</code>
                            </div>
                            <span className="text-xs text-gray-600">
                              {formatSize(file.size)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
