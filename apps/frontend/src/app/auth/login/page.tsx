'use client'

/**
 * 登录页面
 * ECP-A1: 单一职责 - 仅处理登录逻辑
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  })

  /**
   * 监听认证状态变化，登录成功后自动跳转
   * 修复：避免React状态更新时序竞争导致的重定向循环
   */
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  /**
   * 表单输入处理
   * ECP-B2: KISS原则 - 简单的状态更新
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
   * 表单提交处理
   * ECP-C2: 系统化错误处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 客户端验证
    if (!formData.usernameOrEmail || !formData.password) {
      setError('请填写所有字段')
      return
    }

    setIsLoading(true)

    try {
      await login(formData)
      // 登录成功，重置loading状态，让useEffect处理跳转
      setIsLoading(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '登录失败，请检查用户名和密码')
      } else {
        setError('网络错误，请稍后重试')
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center text-foreground">登录</h1>
          <p className="text-center text-muted-foreground">欢迎回到 Flotilla</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail">用户名或邮箱</Label>
              <Input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                placeholder="请输入用户名或邮箱"
                value={formData.usernameOrEmail}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <div className="text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  忘记密码？
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              还没有账号？{' '}
              <Link
                href="/auth/register"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                立即注册
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
