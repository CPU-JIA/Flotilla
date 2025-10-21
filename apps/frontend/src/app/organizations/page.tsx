'use client'

/**
 * 组织列表页面
 * ECP-A1: 单一职责 - 显示和管理组织列表
 * ECP-C3: 性能意识 - 分页加载
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog'
import { api, ApiError } from '@/lib/api'
import type { Organization } from '@/types/organization'

export default function OrganizationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * 获取组织列表
   * ECP-C2: 系统化错误处理
   */
  const fetchOrganizations = useCallback(
    async (query?: string) => {
      setLoading(true)
      setError('')

      try {
        const response = await api.organizations.getAll({
          search: query || undefined,
        })
        setOrganizations(response)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t.error)
        } else {
          setError(t.editor.networkError)
        }
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations()
    }
  }, [isAuthenticated, fetchOrganizations])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      {/* 白色卡片容器 - 与项目页面保持一致 + Dark模式支持 */}
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        <div className="space-y-6">
          {/* 页头 */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-card-foreground">
                {t.organizations.myOrganizations}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t.loading === t.loading
                  ? `共 ${organizations.length} 个组织`
                  : `${organizations.length} organizations`}
              </p>
            </div>
            <CreateOrganizationDialog onSuccess={fetchOrganizations} />
          </div>

          {/* 搜索栏 */}
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder={`${t.organizations.title}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchOrganizations(searchQuery)
                }
              }}
              className="max-w-md"
            />
            <Button onClick={() => fetchOrganizations(searchQuery)}>
              {t.loading === t.loading ? '搜索' : 'Search'}
            </Button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* 组织列表 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  {searchQuery
                    ? t.loading === t.loading
                      ? '未找到匹配的组织'
                      : 'No matching organizations found'
                    : t.organizations.noOrganizations}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t.loading === t.loading
                      ? '尝试使用不同的关键词搜索'
                      : 'Try different keywords'
                    : t.loading === t.loading
                      ? '创建您的第一个组织开始协作'
                      : 'Create your first organization to start collaboration'}
                </p>
                {!searchQuery && <CreateOrganizationDialog onSuccess={fetchOrganizations} />}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <Link key={org.id} href={`/organizations/${org.slug}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {org.name}
                          {org.isPersonal && (
                            <Badge variant="outline" className="text-xs">
                              {t.organizations.personal}
                            </Badge>
                          )}
                        </CardTitle>
                        {org.myRole && (
                          <Badge
                            variant={
                              org.myRole === 'OWNER'
                                ? 'default'
                                : org.myRole === 'ADMIN'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {t.organizations.roles[org.myRole]}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {org.description ||
                          (t.loading === t.loading ? '暂无描述' : 'No description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>
                            {org._count?.members || 0} {t.organizations.members}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{new Date(org.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-gray-500 dark:text-gray-500">
                      {org.slug}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
