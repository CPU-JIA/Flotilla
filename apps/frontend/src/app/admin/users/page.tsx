'use client'

/**
 * 用户管理页面 - 重构版本
 * 设计语言：统一蓝色主题 + 渐变背景 + 柔和阴影
 * ECP-A1: 单一职责 - 管理所有用户
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { api, ApiError } from '@/lib/api'
import type { AdminUser } from '@/types/admin'
import { UserRole } from '@/types/admin'
import { AppLayout } from '@/components/layout/AppLayout'
import { AddUserDialog } from '@/components/admin/add-user-dialog'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated, isLoading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async (searchQuery?: string) => {
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
        setError('加载用户列表失败')
      }
    } finally {
      setLoading(false)
    }
  }, [page])

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
    if (!confirm(`确定要${isActive ? '解封' : '封禁'}此用户吗？`)) {
      return
    }

    try {
      await api.admin.toggleUserActive(userId, { isActive })
      alert('操作成功')
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`操作失败：${err.message}`)
      } else {
        alert('操作失败')
      }
    }
  }

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    if (!confirm(`确定要将此用户角色修改为 ${role} 吗？`)) {
      return
    }

    try {
      await api.admin.updateUserRole(userId, { role })
      alert('角色修改成功')
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`操作失败：${err.message}`)
      } else {
        alert('操作失败')
      }
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？此操作不可撤销！')) {
      return
    }

    try {
      await api.admin.deleteUser(userId)
      alert('用户已删除')
      fetchUsers()
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`删除失败：${err.message}`)
      } else {
        alert('删除失败')
      }
    }
  }

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-red-50 text-red-600 border-red-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return '超级管理员'
      default:
        return '普通用户'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div
        className="bg-white rounded-[14px] p-6"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        {/* 页头 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
            <p className="text-gray-600 mt-1">共 {total} 个用户</p>
          </div>
          <AddUserDialog onSuccess={fetchUsers} />
        </div>

        {/* 搜索栏 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-gray-100">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchUsers(search)
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={() => fetchUsers(search)}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-sm hover:bg-blue-600 hover:shadow-md transition-all"
            >
              搜索
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {/* 用户列表 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">用户列表</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* 用户信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-bold text-lg text-gray-900">
                        {user.username}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(
                          user.role
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                      {!user.isActive && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                          已封禁
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      📧 {user.email}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      📅 创建于: {new Date(user.createdAt).toLocaleString('zh-CN')}
                    </div>
                    {user._count && (
                      <div className="text-xs text-gray-500 mt-1">
                        📁 拥有 {user._count.ownedProjects} 个项目，参与{' '}
                        {user._count.projectMembers} 个项目
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
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                        }`}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.isActive ? '封禁' : '解封'}
                      </button>
                    )}

                    {/* 修改角色（仅超级管理员） */}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleUpdateRole(user.id, e.target.value as UserRole)
                        }
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        disabled={user.id === currentUser?.id}
                      >
                        <option value={UserRole.USER}>普通用户</option>
                        <option value={UserRole.SUPER_ADMIN}>超级管理员</option>
                      </select>
                    )}

                    {/* 删除（仅超级管理员） */}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all"
                        disabled={user.id === currentUser?.id}
                      >
                        删除
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
                className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} 页 / 共 {Math.ceil(total / 20)} 页
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
