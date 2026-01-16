'use client'

/**
 * 通用设置页面
 * ECP-A1: 单一职责 - 密码和安全设置
 * ECP-C1: 防御性编程 - 密码强度验证
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function GeneralSettingsPage() {
  const { user } = useAuth()

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  /**
   * 修改密码
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)

    try {
      // 前端验证
      if (passwordData.newPassword.length < 8) {
        toast.error('新密码至少8个字符')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('两次输入的密码不一致')
        return
      }

      await api.users.updatePassword(user!.id, {
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      toast.success('密码修改成功，下次登录请使用新密码')

      // 清空表单
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '密码修改失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更改密码有助于保护您的账户安全</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* 当前密码 */}
            <div>
              <Label htmlFor="currentPassword">
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
                placeholder="输入当前密码"
                required
              />
            </div>

            {/* 新密码 */}
            <div>
              <Label htmlFor="newPassword">
                新密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="mt-2"
                placeholder="输入新密码"
                minLength={8}
                required
              />

              {/* 密码强度指示器 */}
              {passwordData.newPassword && (
                <PasswordStrength password={passwordData.newPassword} showRequirements />
              )}
            </div>

            {/* 确认新密码 */}
            <div>
              <Label htmlFor="confirmPassword">
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
              {passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    两次输入的密码不一致
                  </p>
                )}
            </div>

            {/* 密码要求提示 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">密码要求</p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>至少8个字符</li>
                <li>包含大写字母 (A-Z)</li>
                <li>包含小写字母 (a-z)</li>
                <li>包含数字 (0-9)</li>
                <li>建议包含特殊字符 (!@#$%^&*...)</li>
              </ul>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? '修改中...' : '修改密码'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 账户安全信息 */}
      <Card>
        <CardHeader>
          <CardTitle>账户安全</CardTitle>
          <CardDescription>查看您的账户安全状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">邮箱验证</p>
              <p className="text-xs text-muted-foreground">验证您的邮箱地址</p>
            </div>
            <div>
              {user.emailVerified ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  ✓ 已验证
                </span>
              ) : (
                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  ⚠ 未验证
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">账户状态</p>
              <p className="text-xs text-muted-foreground">您的账户活跃状态</p>
            </div>
            <div>
              {user.isActive ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  ✓ 活跃
                </span>
              ) : (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">✗ 已停用</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">角色</p>
              <p className="text-xs text-muted-foreground">您的系统权限级别</p>
            </div>
            <div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {user.role === 'SUPER_ADMIN'
                  ? '超级管理员'
                  : user.role === 'USER'
                    ? '普通用户'
                    : user.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
