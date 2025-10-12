'use client'

/**
 * 登录页面
 * ECP-A1: 单一职责 - 仅处理登录逻辑
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  })

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
      // 登录成功，跳转到首页
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '登录失败，请检查用户名和密码')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `
          radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%),
          radial-gradient(1200px 600px at 110% 10%, #fde68a 0%, transparent 60%),
          #f4f6f9
        `
      }}
    >
      <div
        className="bg-white rounded-[14px] p-8 max-w-md w-full"
        style={{
          boxShadow: '10px 10px 15px black',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.12))'
        }}
      >
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center">登录</h1>
          <p className="text-center text-gray-600">
            欢迎回到 Cloud Dev Platform
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
              <Label htmlFor="usernameOrEmail">用户名或邮箱</Label>
              <Input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                placeholder="请输入用户名或邮箱"
                value={formData.usernameOrEmail}
                onChange={handleChange}
                disabled={isLoading}
                required
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
                required
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>

            <div className="text-sm text-center text-gray-600">
              还没有账号？{' '}
              <Link
                href="/auth/register"
                className="text-blue-600 hover:underline font-medium"
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
