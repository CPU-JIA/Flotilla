'use client'

/**
 * 密码重置页面 - 完整token验证实现
 * ECP-A1: 单一职责 - 仅处理密码重置逻辑
 * ECP-C1: 防御性编程 - 完整的状态机和错误处理
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'

type TokenState = 'VALIDATING' | 'VALID' | 'INVALID' | 'EXPIRED'

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  // 状态管理
  const [tokenState, setTokenState] = useState<TokenState>('VALIDATING')
  const [tokenMessage, setTokenMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  /**
   * Token验证 - useEffect在页面加载时执行
   */
  useEffect(() => {
    const verifyToken = async () => {
      if (!token || token.length < 10) {
        setTokenState('INVALID')
        setTokenMessage('无效的重置链接格式')
        return
      }

      try {
        const result = await api.auth.verifyResetToken(token)

        if (result.valid) {
          setTokenState('VALID')
          setTokenMessage(result.message)
          setExpiresAt(result.expiresAt || null)
        } else {
          // 判断是过期还是无效
          if (result.message.includes('过期')) {
            setTokenState('EXPIRED')
          } else {
            setTokenState('INVALID')
          }
          setTokenMessage(result.message)
          setExpiresAt(result.expiresAt || null)
        }
      } catch (error) {
        setTokenState('INVALID')
        setTokenMessage('验证链接失败，请重试')
        console.error('Token verification error:', error)
      }
    }

    verifyToken()
  }, [token])

  /**
   * 表单输入处理
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (submitError) setSubmitError('')
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
    setSubmitError('')

    // 客户端验证
    const validationError = validateForm()
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      await api.auth.resetPassword(token, {
        newPassword: formData.password,
      })
      // 重置成功，跳转到登录页
      router.push('/auth/login?reset=success')
    } catch (err: unknown) {
      // ECP-C1: 防御性编程 - 类型守卫检查错误对象
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        setSubmitError(err.message)
      } else {
        setSubmitError('密码重置失败，请重试')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * 渲染不同状态的UI
   */
  const renderContent = () => {
    // VALIDATING 状态 - 显示loading
    if (tokenState === 'VALIDATING') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-muted-foreground">正在验证重置链接...</p>
        </div>
      )
    }

    // INVALID 或 EXPIRED 状态 - 显示错误消息
    if (tokenState === 'INVALID' || tokenState === 'EXPIRED') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {tokenState === 'EXPIRED' ? '链接已过期' : '链接无效'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {tokenMessage}
            </p>
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                过期时间: {new Date(expiresAt).toLocaleString('zh-CN')}
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full"
            >
              重新申请密码重置
            </Button>
            <Link
              href="/auth/login"
              className="text-sm text-center text-muted-foreground hover:text-foreground"
            >
              返回登录
            </Link>
          </div>
        </div>
      )
    }

    // VALID 状态 - 显示密码输入表单
    return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {submitError}
            </div>
          )}

          {expiresAt && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-md text-sm">
              ⏱️ 链接将在 {new Date(expiresAt).toLocaleString('zh-CN')} 过期
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex flex-col space-y-4 mt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '重置中...' : '重置密码'}
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
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center text-foreground">
            重置密码
          </h1>
          <p className="text-center text-muted-foreground">
            {tokenState === 'VALID' ? '请输入您的新密码' : '验证重置链接'}
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  )
}
