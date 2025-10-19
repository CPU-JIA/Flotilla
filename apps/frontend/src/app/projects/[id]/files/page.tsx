'use client'

/**
 * 文件管理页面
 * ECP-A1: 单一职责 - 项目文件管理和浏览
 * ECP-C3: 性能意识 - 分页加载，按需获取
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileUpload } from '@/components/files/file-upload'
import { CreateFolderDialog } from '@/components/files/create-folder-dialog'
import { FileList } from '@/components/files/file-list'
import { api, ApiError } from '@/lib/api'
import type { ProjectFile, FilesListResponse } from '@/types/file'
import type { Project } from '@/types/project'

export default function FilesPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [currentFolder, setCurrentFolder] = useState('/')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalSize, setTotalSize] = useState(0)
  const [canManage, setCanManage] = useState(false)

  // 加载项目信息
  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectData = await api.projects.getById(projectId)
        setProject(projectData)

        // 检查用户权限（项目所有者或OWNER/MEMBER角色可以管理文件）
        const currentUser = await api.auth.me()
        const isOwner = projectData.ownerId === currentUser.id
        const userRole = projectData.members?.find(m => m.userId === currentUser.id)?.role
        setCanManage(isOwner || userRole === 'OWNER' || userRole === 'MEMBER')
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError(t.projects.files.loadProject)
        }
      }
    }

    loadProject()
  }, [projectId, t])

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response: FilesListResponse = await api.files.getFiles({
        projectId,
        folder: currentFolder,
        search: searchQuery || undefined,
      })

      setFiles(response.files)
      setTotalSize(response.totalSize)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.projects.files.loadFilesFailed)
      } else {
        setError(t.projects.files.networkError)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, currentFolder, searchQuery, t])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // 处理文件夹导航
  const handleFolderClick = (folderPath: string) => {
    setCurrentFolder(folderPath)
  }

  // 返回上级目录
  const handleBackClick = () => {
    if (currentFolder === '/') return

    const pathParts = currentFolder.split('/').filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.length > 0 ? `/${pathParts.join('/')}/` : '/'
    setCurrentFolder(parentPath)
  }

  // 处理文件下载
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await api.files.downloadFile(fileId)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.projects.files.downloadFailed)
      } else {
        alert(t.projects.files.downloadFailedRetry)
      }
    }
  }

  // 处理文件删除
  const handleDelete = async (fileId: string) => {
    try {
      await api.files.deleteFile(fileId)
      loadFiles() // 重新加载文件列表
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message || t.projects.files.deleteFailed)
      } else {
        alert(t.projects.files.deleteFailedRetry)
      }
    }
  }

  // 处理文件编辑 - 跳转到代码编辑器
  const handleEdit = (fileId: string) => {
    router.push(`/projects/${projectId}/editor?fileId=${fileId}`)
  }

  // 格式化存储容量
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 GB'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  // 面包屑导航
  const renderBreadcrumb = () => {
    const pathParts = currentFolder.split('/').filter(Boolean)

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => setCurrentFolder('/')}
          className="hover:text-blue-600 transition-colors"
        >
          {t.projects.files.rootFolder}
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

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}`)}
                className="bg-card"
              >
                {t.projects.detail.backToProject}
              </Button>
              <h1 className="text-3xl font-bold text-card-foreground">{project.name} - {t.projects.files.title}</h1>
            </div>
            <Button
              onClick={() => router.push(`/projects/${projectId}/editor`)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {t.projects.files.openEditor}
            </Button>
          </div>

          {/* 存储使用情况 */}
          <Card className="bg-card rounded-[14px] shadow-[10px_10px_15px_black]">
            <CardContent className="p-[22px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.projects.files.storage}</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {formatStorageSize(totalSize)} / 1.00 GB
                  </p>
                </div>
                <div className="text-6xl">💾</div>
              </div>
              <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 导航栏 */}
        <div className="mb-6">
          <Card className="bg-card rounded-[14px] shadow-[10px_10px_15px_black]">
            <CardContent className="p-[22px]">
              <div className="flex items-center justify-between gap-4">
                {renderBreadcrumb()}

                <div className="flex items-center gap-2">
                  {currentFolder !== '/' && (
                    <Button
                      variant="outline"
                      onClick={handleBackClick}
                      className="bg-card"
                    >
                      ⬆️ {t.projects.files.parentFolder}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和操作栏 */}
        {canManage && (
          <div className="mb-6">
            <Card className="bg-card rounded-[14px] shadow-[10px_10px_15px_black]">
              <CardContent className="p-[22px]">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder={t.projects.files.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <CreateFolderDialog
                    projectId={projectId}
                    parentPath={currentFolder}
                    onSuccess={loadFiles}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 文件上传区域 */}
        {canManage && (
          <div className="mb-6">
            <Card className="bg-card rounded-[14px] shadow-[10px_10px_15px_black]">
              <CardContent className="p-[22px]">
                <FileUpload
                  projectId={projectId}
                  currentFolder={currentFolder}
                  onSuccess={loadFiles}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6">
            <Card className="bg-red-50 border-red-200 rounded-[14px]">
              <CardContent className="p-[22px]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 文件列表 */}
        <div className="mb-6">
          {loading ? (
            <Card className="bg-card rounded-[14px] shadow-[10px_10px_15px_black]">
              <CardContent className="p-[22px] text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-muted-foreground">{t.projects.files.loadingFiles}</p>
              </CardContent>
            </Card>
          ) : (
            <FileList
              files={files}
              onFolderClick={handleFolderClick}
              onFileDelete={handleDelete}
              onDownload={handleDownload}
              onEdit={handleEdit}
              canManage={canManage}
            />
          )}
        </div>
      </div>
    </div>
  )
}
