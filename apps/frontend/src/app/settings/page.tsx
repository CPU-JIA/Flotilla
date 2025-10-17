'use client'

/**
 * 个人设置页面
 * ECP-A1: 单一职责 - 用户资料和密码管理
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 * ECP-D1: 可测试性设计 - 分离表单组件
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiRequest } from '@/lib/api'

interface ProfileFormData {
  username: string
  email: string
  bio: string
  avatar: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()

  // 个人资料表单
  const [profileData, setProfileData] = useState<ProfileFormData>({
    username: '',
    email: '',
    bio: '',
    avatar: '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // 密码修改表单
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }

    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      })
    }
  }, [isAuthenticated, isLoading, router, user])

  /**
   * 更新个人资料
   * ECP-C2: 系统化错误处理
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setIsUpdatingProfile(true)

    try {
      // ECP-C1: 前端验证
      if (profileData.username.length < 3) {
        throw new Error('用户名至少3个字符')
      }
      if (profileData.bio.length > 500) {
        throw new Error('个人简介最多500个字符')
      }

      await apiRequest('/users/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          username: profileData.username,
          bio: profileData.bio,
          avatar: profileData.avatar,
        }),
      })

      setProfileSuccess('个人资料更新成功！')
      // 刷新用户信息
      await refreshUser()

      // 3秒后清除成功提示
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新个人资料失败，请重试'
      setProfileError(errorMessage)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  /**
   * 修改密码
   * ECP-C1: 防御性编程 - 密码强度验证
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    setIsChangingPassword(true)

    try {
      // ECP-C1: 前端验证
      if (passwordData.newPassword.length < 8) {
        throw new Error('新密码至少8个字符')
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('两次输入的新密码不一致')
      }

      // 密码强度验证
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(passwordData.newPassword)) {
        throw new Error('新密码必须包含大小写字母和数字')
      }

      await apiRequest('/users/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      setPasswordSuccess('密码修改成功！')
      // 清空表单
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // 3秒后清除成功提示
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '修改密码失败，请重试'
      setPasswordError(errorMessage)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AppLayout>
      <div
        className="bg-white rounded-[14px] p-8 max-w-4xl mx-auto"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">个人设置</h1>
          <p className="text-gray-600">管理您的账户信息和安全设置</p>
        </div>

        {/* 基本信息 */}
        <section className="mb-10 pb-10 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">基本信息</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* 用户名 */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="mt-2"
                placeholder="请输入用户名（至少3个字符）"
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            {/* 邮箱（只读） */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                className="mt-2 bg-gray-50"
                disabled
                title="邮箱地址不可修改"
              />
              <p className="mt-1 text-xs text-gray-500">邮箱地址不支持修改</p>
            </div>

            {/* 个人简介 */}
            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
                个人简介
              </Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="mt-2"
                placeholder="介绍一下自己..."
                rows={4}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {profileData.bio.length} / 500 字符
              </p>
            </div>

            {/* 头像URL（暂时使用文本输入，未来可改为上传） */}
            <div>
              <Label htmlFor="avatar" className="text-sm font-medium text-gray-700">
                头像URL
              </Label>
              <Input
                id="avatar"
                type="url"
                value={profileData.avatar}
                onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                className="mt-2"
                placeholder="https://example.com/avatar.jpg"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">请输入头像图片链接</p>
            </div>

            {/* 错误/成功提示 */}
            {profileError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">❌ {profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">✅ {profileSuccess}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile} className="px-8">
                {isUpdatingProfile ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </section>

        {/* 修改密码 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">修改密码</h2>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* 当前密码 */}
            <div>
              <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                当前密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="mt-2"
                placeholder="请输入当前密码"
                required
              />
            </div>

            {/* 新密码 */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                新密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="mt-2"
                placeholder="至少8个字符，包含大小写字母和数字"
                minLength={8}
                required
              />
            </div>

            {/* 确认新密码 */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                确认新密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="mt-2"
                placeholder="再次输入新密码"
                minLength={8}
                required
              />
            </div>

            {/* 密码要求提示 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">密码要求：</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>至少8个字符</li>
                <li>包含至少一个大写字母</li>
                <li>包含至少一个小写字母</li>
                <li>包含至少一个数字</li>
              </ul>
            </div>

            {/* 错误/成功提示 */}
            {passwordError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">❌ {passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">✅ {passwordSuccess}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword} className="px-8">
                {isChangingPassword ? '修改中...' : '修改密码'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </AppLayout>
  )
}
