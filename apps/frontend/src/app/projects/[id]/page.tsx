'use client'

/**
 * 项目详情页面
 * ECP-A1: 单一职责 - 显示项目详情和管理成员
 * ECP-C2: 系统化错误处理
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectMembersPanel } from '@/components/projects/project-members-panel'
import { CloneUrlPanel } from '@/components/git/clone-url-panel'
import { api, ApiError } from '@/lib/api'
import type { Project } from '@/types/project'

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasRepository, setHasRepository] = useState<boolean | null>(null)
  const [initializingRepo, setInitializingRepo] = useState(false)
  const [defaultBranchId, setDefaultBranchId] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.projects.getById(projectId)
      setProject(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.projects.detail.fetchError)
        if (err.status === 403 || err.status === 404) {
          setTimeout(() => router.push('/projects'), 2000)
        }
      } else {
        setError(t.projects.detail.networkError)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, router, t])

  // Phase 3: 检查Repository是否存在并获取默认分支
  const checkRepository = useCallback(async () => {
    if (!projectId) return
    try {
      await api.repositories.getRepository(projectId)
      setHasRepository(true)

      // 获取分支列表以确定默认分支ID
      try {
        const branches = await api.repositories.getBranches(projectId)
        if (branches && branches.length > 0) {
          const defaultBranch = branches.find((b) => b.name === 'main') || branches[0]
          setDefaultBranchId(defaultBranch.id)
        }
      } catch (branchErr) {
        console.error('Failed to fetch branches:', branchErr)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setHasRepository(false)
      } else {
        console.error('Failed to check repository:', err)
      }
    }
  }, [projectId])

  // Phase 3: 初始化Repository
  const handleInitializeRepository = async () => {
    if (!projectId || initializingRepo) return

    setInitializingRepo(true)
    try {
      await api.repositories.createRepository(projectId)
      setHasRepository(true)
      alert(t.projects.detail.initSuccess)
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.projects.detail.initFailed}：${err.message}`)
      } else {
        alert(t.projects.detail.initFailedRetry)
      }
    } finally {
      setInitializingRepo(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchProject()
      checkRepository()
    }
  }, [isAuthenticated, projectId, fetchProject, checkRepository])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }

  const isOwner = project?.ownerId === user?.id
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canManageMembers = isOwner || isSuperAdmin

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-[22px]"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t.projects.detail.loading}</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">{error}</h3>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              {t.projects.detail.backToList}
            </Button>
          </div>
        ) : project ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-card-foreground">{project.name}</h1>
                    <Badge variant={project.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                      {project.visibility === 'PUBLIC'
                        ? `🌍 ${t.projects.visibility.public}`
                        : `🔒 ${t.projects.visibility.private}`}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-base">
                    {project.description || t.projects.noDescription}
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push('/projects')}>
                  ← {t.projects.detail.backToList}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.projects.detail.owner}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <div>
                        <p className="font-semibold text-card-foreground">
                          {project.owner?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{project.owner?.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.projects.detail.memberCount}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <p className="text-3xl font-bold text-card-foreground">
                        {project._count?.members || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.projects.detail.createdAt}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <p className="font-semibold text-card-foreground">
                        {new Date(project.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div>
              <ProjectMembersPanel
                projectId={project.id}
                members={project.members || []}
                canManageMembers={canManageMembers}
                onMembersChange={fetchProject}
              />
            </div>

            {/* Git Clone URL Panel - 显示给所有用户 */}
            {hasRepository === true && (
              <div>
                <CloneUrlPanel projectId={project.id} />
              </div>
            )}

            {isOwner && (
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  {t.projects.detail.projectActions}
                </h3>
                <div className="flex gap-4 flex-wrap">
                  {/* Phase 3: Repository状态和初始化按钮 */}
                  {hasRepository === false && (
                    <Button
                      variant="default"
                      onClick={handleInitializeRepository}
                      disabled={initializingRepo}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {initializingRepo
                        ? t.projects.detail.initializing
                        : t.projects.detail.initRepository}
                    </Button>
                  )}
                  {hasRepository === true && (
                    <Badge variant="default" className="px-4 py-2 text-sm">
                      {t.projects.detail.repositoryReady}
                    </Badge>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/settings`)}
                  >
                    ⚙️ {t.projects.detail.projectSettings}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/files`)}
                  >
                    📁 {t.projects.detail.browseFiles}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/editor`)}
                  >
                    💻 {t.projects.detail.codeEditor}
                  </Button>
                  {hasRepository === true && defaultBranchId && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/projects/${project.id}/history?branchId=${defaultBranchId}`)
                      }
                      className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                      📜 {t.projects.detail.versionHistory}
                    </Button>
                  )}
                  {/* Phase 1.2: Issue tracking navigation */}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/issues`)}
                    className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    🐛 Issues
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/labels`)}
                  >
                    🏷️ Labels
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/milestones`)}
                  >
                    🎯 Milestones
                  </Button>
                  {/* Phase 1.3: Pull Request navigation */}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/projects/${project.id}/pulls`)}
                    className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    🔀 Pull Requests
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
