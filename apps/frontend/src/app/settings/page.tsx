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
import { useLanguage } from '@/contexts/language-context'
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
  const { t } = useLanguage()

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
        throw new Error(t.settings.usernameMinLength)
      }
      if (profileData.bio.length > 500) {
        throw new Error(t.settings.bioMaxLength)
      }

      await apiRequest('/users/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          username: profileData.username,
          bio: profileData.bio,
          avatar: profileData.avatar,
        }),
      })

      setProfileSuccess(t.settings.profileUpdateSuccess)
      // 刷新用户信息
      await refreshUser()

      // 3秒后清除成功提示
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.settings.profileUpdateError
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
        throw new Error(t.settings.passwordTooShort)
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(t.settings.passwordMismatch)
      }

      // 密码强度验证
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(passwordData.newPassword)) {
        throw new Error(t.settings.passwordComplexity)
      }

      await apiRequest('/users/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      setPasswordSuccess(t.settings.passwordChangeSuccess)
      // 清空表单
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // 3秒后清除成功提示
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.settings.passwordChangeError
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
          <p className="mt-4 text-muted-foreground">{t.loading}</p>
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
        className="bg-card text-card-foreground rounded-[14px] p-8 max-w-4xl mx-auto"
        style={{
          boxShadow: '10px 10px 15px rgba(0,0,0,0.1)',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))',
        }}
      >
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">{t.settings.title}</h1>
          <p className="text-muted-foreground">{t.settings.description}</p>
        </div>

        {/* 基本信息 */}
        <section className="mb-10 pb-10 border-b border-border">
          <h2 className="text-xl font-bold text-card-foreground mb-6">{t.settings.basicInfo}</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* 用户名 */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                {t.settings.username} <span className="text-red-500">{t.settings.required}</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="mt-2"
                placeholder={t.settings.usernamePlaceholder}
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            {/* 邮箱（只读） */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                {t.settings.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                className="mt-2 bg-muted"
                disabled
                title={t.settings.emailCannotChange}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.emailCannotChange}</p>
            </div>

            {/* 个人简介 */}
            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-foreground">
                {t.settings.bio}
              </Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="mt-2"
                placeholder={t.settings.bioPlaceholder}
                rows={4}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {profileData.bio.length} / 500 {t.settings.bioCharCount}
              </p>
            </div>

            {/* 头像URL（暂时使用文本输入，未来可改为上传） */}
            <div>
              <Label htmlFor="avatar" className="text-sm font-medium text-foreground">
                {t.settings.avatar}
              </Label>
              <Input
                id="avatar"
                type="url"
                value={profileData.avatar}
                onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                className="mt-2"
                placeholder={t.settings.avatarPlaceholder}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.avatarHelper}</p>
            </div>

            {/* 错误/成功提示 */}
            {profileError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">❌ {profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">✅ {profileSuccess}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile} className="px-8">
                {isUpdatingProfile ? t.settings.saving : t.settings.saveChanges}
              </Button>
            </div>
          </form>
        </section>

        {/* 修改密码 */}
        <section>
          <h2 className="text-xl font-bold text-card-foreground mb-6">
            {t.settings.changePassword}
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* 当前密码 */}
            <div>
              <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
                {t.settings.currentPassword}{' '}
                <span className="text-red-500">{t.settings.required}</span>
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="mt-2"
                placeholder={t.settings.currentPasswordPlaceholder}
                required
              />
            </div>

            {/* 新密码 */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                {t.settings.newPassword} <span className="text-red-500">{t.settings.required}</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="mt-2"
                placeholder={t.settings.newPasswordPlaceholder}
                minLength={8}
                required
              />
            </div>

            {/* 确认新密码 */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                {t.settings.confirmPassword}{' '}
                <span className="text-red-500">{t.settings.required}</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="mt-2"
                placeholder={t.settings.confirmPasswordPlaceholder}
                minLength={8}
                required
              />
            </div>

            {/* 密码要求提示 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
                {t.settings.passwordRequirements}
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>{t.settings.passwordMinLength}</li>
                <li>{t.settings.passwordUppercase}</li>
                <li>{t.settings.passwordLowercase}</li>
                <li>{t.settings.passwordNumber}</li>
              </ul>
            </div>

            {/* 错误/成功提示 */}
            {passwordError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">❌ {passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">✅ {passwordSuccess}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword} className="px-8">
                {isChangingPassword ? t.settings.changing : t.settings.changePasswordButton}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </AppLayout>
  )
}
