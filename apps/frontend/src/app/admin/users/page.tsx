'use client'

/**
 * 用户管理页面 - 重构版本
 * 设计语言：统一蓝色主题 + 渐变背景 + 柔和阴影
 * ECP-A1: 单一职责 - 管理所有用户
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { api, ApiError } from '@/lib/api'
import type { AdminUser } from '@/types/admin'
import { UserRole } from '@/types/admin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AddUserDialog } from '@/components/admin/add-user-dialog'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(
    async (searchQuery?: string) => {
      try {
        setLoading(true)
        setError('')
        const data = await api.admin.getAllUsers({
          page,
          pageSize: 20,
          search: searchQuery || undefined,
        })
        setUsers(data.users)
        setTotal(data.total)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError(t.admin.users.loadingUsersFailed)
        }
      } finally {
        setLoading(false)
      }
    },
    [page, t]
  )

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchUsers()
  }, [isLoading, isAuthenticated, currentUser, router, fetchUsers])

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!confirm(isActive ? t.admin.users.confirmUnban : t.admin.users.confirmBan)) {
      return
    }

    try {
      await api.admin.toggleUserActive(userId, { isActive })
      alert(t.admin.users.operationSuccess)
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.admin.users.operationFailed}：${err.message}`)
      } else {
        alert(t.admin.users.operationFailed)
      }
    }
  }

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    const roleText = getRoleLabel(role)
    if (!confirm(t.admin.users.confirmUpdateRole.replace('{role}', roleText))) {
      return
    }

    try {
      await api.admin.updateUserRole(userId, { role })
      alert(t.admin.users.roleUpdateSuccess)
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.admin.users.operationFailed}：${err.message}`)
      } else {
        alert(t.admin.users.operationFailed)
      }
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t.admin.users.confirmDelete)) {
      return
    }

    try {
      await api.admin.deleteUser(userId)
      alert(t.admin.users.deleteSuccess)
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`${t.admin.users.deleteFailed}：${err.message}`)
      } else {
        alert(t.admin.users.deleteFailed)
      }
    }
  }

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return t.admin.users.roles.SUPER_ADMIN
      default:
        return t.admin.users.roles.USER
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div
        className="bg-card rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        {/* 页头 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">{t.admin.users.title}</h1>
            <p className="text-muted-foreground mt-1">
              {t.admin.users.totalUsers.replace('{count}', total.toString())}
            </p>
          </div>
          <AddUserDialog onSuccess={fetchUsers} />
        </div>

        {/* 搜索栏 */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder={t.admin.users.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchUsers(search)
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-card text-card-foreground"
            />
            <button
              onClick={() => fetchUsers(search)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-sm hover:bg-blue-600 hover:shadow-md transition-all"
            >
              {t.admin.users.search}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* 用户列表 */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-card-foreground mb-6">{t.admin.users.userList}</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* 用户信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-bold text-lg text-card-foreground">{user.username}</div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                      {!user.isActive && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                          {t.admin.users.banned}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">📧 {user.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      📅 {t.admin.users.createdAt}:{' '}
                      {new Date(user.createdAt).toLocaleString('zh-CN')}
                    </div>
                    {user._count && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📁{' '}
                        {t.admin.users.ownsProjects.replace(
                          '{count}',
                          user._count.ownedProjects.toString()
                        )}
                        ，
                        {t.admin.users.participatesProjects.replace(
                          '{count}',
                          user._count.projectMembers.toString()
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-wrap gap-2">
                    {/* 激活/封禁 */}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleToggleActive(user.id, !user.isActive)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          user.isActive
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.isActive ? t.admin.users.ban : t.admin.users.unban}
                      </button>
                    )}

                    {/* 修改角色（仅超级管理员） */}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-card text-card-foreground"
                        disabled={user.id === currentUser?.id}
                      >
                        <option value={UserRole.USER}>{t.admin.users.roles.USER}</option>
                        <option value={UserRole.SUPER_ADMIN}>
                          {t.admin.users.roles.SUPER_ADMIN}
                        </option>
                      </select>
                    )}

                    {/* 删除（仅超级管理员） */}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all"
                        disabled={user.id === currentUser?.id}
                      >
                        {t.admin.users.delete}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {total > 20 && (
            <div className="mt-6 flex justify-center items-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all bg-card text-card-foreground"
              >
                {t.projects.previousPage}
              </button>
              <span className="text-sm text-muted-foreground">
                {t.projects.pageInfo
                  .replace('{current}', page.toString())
                  .replace('{total}', Math.ceil(total / 20).toString())}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all bg-card text-card-foreground"
              >
                {t.projects.nextPage}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
