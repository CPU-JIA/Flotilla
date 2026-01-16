'use client'

/**
 * 忘记密码页面
 * ECP-A1: 单一职责 - 仅处理密码重置请求
 * ECP-C1: 防御性编程 - 客户端表单验证
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  /**
   * 客户端表单验证
   */
  const validateForm = (): string | null => {
    if (!email) {
      return '请输入邮箱地址'
    }

    // 邮箱格式验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return '邮箱格式不正确'
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

    setIsLoading(true)

    try {
      await api.auth.forgotPassword({ email })
      setIsSuccess(true)
    } catch (err: unknown) {
      // ECP-C1: 防御性编程 - 类型守卫检查错误对象
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        setError(err.message)
      } else {
        setError('请求失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        {!isSuccess ? (
          <>
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-bold text-center text-foreground">忘记密码？</h1>
              <p className="text-center text-muted-foreground">
                输入您的邮箱地址，我们将发送密码重置链接
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
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4 mt-6">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '发送中...' : '发送重置邮件'}
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
          </>
        ) : (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <svg
                  className="h-12 w-12 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                ✓ 邮件已发送！
              </h1>
              <p className="text-muted-foreground">如果该邮箱已注册，您将收到密码重置邮件</p>
              <p className="text-sm text-muted-foreground">
                请检查您的收件箱（包括垃圾邮件文件夹）
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <Button onClick={() => setIsSuccess(false)} variant="outline">
                重新发送
              </Button>
              <Link
                href="/auth/login"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-center"
              >
                返回登录
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
