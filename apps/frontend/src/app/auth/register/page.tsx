'use client'

/**
 * 注册页面
 * ECP-A1: 单一职责 - 仅处理用户注册逻辑
 * ECP-C1: 防御性编程 - 客户端表单验证
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  /**
   * 监听认证状态变化，注册成功后自动跳转
   * 修复：避免React状态更新时序竞争导致的重定向循环
   */
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  /**
   * 表单输入处理
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // 清除错误消息
    if (error) setError('')
  }

  /**
   * 客户端表单验证
   * ECP-C1: 防御性编程 - 验证用户输入
   */
  const validateForm = (): string | null => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      return t.auth.allFieldsRequired
    }

    // 用户名验证（3-20个字符，字母数字下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
      return t.auth.usernameInvalid
    }

    // 邮箱验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return t.auth.emailInvalid
    }

    // 密码强度验证（与后端register.dto.ts保持一致）
    // 至少8个字符，必须包含大小写字母和数字
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(formData.password)) {
      return t.auth.passwordStrengthRequirement
    }

    // 确认密码匹配
    if (formData.password !== formData.confirmPassword) {
      return t.auth.passwordMismatch
    }

    return null
  }

  /**
   * 表单提交处理
   * ECP-C2: 系统化错误处理
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

    setIsLoading(true)

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })
      // 注册成功，重置loading状态，让useEffect处理跳转
      setIsLoading(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t.auth.registerFailed)
      } else {
        setError(t.auth.networkError)
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center text-foreground">{t.auth.registerTitle}</h1>
          <p className="text-center text-muted-foreground">{t.auth.registerSubtitle}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t.auth.usernamePlaceholder}
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">{t.auth.usernameHelper}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder={t.auth.emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t.auth.passwordPlaceholder}
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t.auth.confirmPasswordPlaceholder}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t.auth.registering : t.auth.registerButton}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              {t.auth.alreadyHaveAccount}{' '}
              <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {t.auth.loginNow}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
