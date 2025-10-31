'use client'

/**
 * 密码重置页面
 * ECP-A1: 单一职责 - 仅处理密码重置逻辑
 * ECP-C1: 防御性编程 - 客户端表单验证
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * 表单输入处理
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) setError('')
  }

  /**
   * 客户端表单验证
   */
  const validateForm = (): string | null => {
    if (!formData.password || !formData.confirmPassword) {
      return '请填写所有字段'
    }

    // 密码强度验证（与后端保持一致）
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(formData.password)) {
      return '密码必须至少8个字符，包含大小写字母和数字'
    }

    // 确认密码匹配
    if (formData.password !== formData.confirmPassword) {
      return '两次输入的密码不一致'
    }

    return null
  }

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 客户端验证
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const token = params.token as string
    if (!token) {
      setError('无效的重置链接')
      return
    }

    setIsLoading(true)

    try {
      await api.auth.resetPassword(token, {
        newPassword: formData.password,
      })
      // 重置成功，跳转到登录页
      router.push('/auth/login?reset=success')
    } catch (err: unknown) {
      // ECP-C1: 防御性编程 - 类型守卫检查错误对象
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        setError(err.message)
      } else {
        setError('密码重置失败，请重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center text-foreground">
            重置密码
          </h1>
          <p className="text-center text-muted-foreground">
            请输入您的新密码
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">新密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="输入新密码"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                autoFocus
              />
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '重置中...' : '重置密码'}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              想起密码了？{' '}
              <Link
                href="/auth/login"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                返回登录
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
