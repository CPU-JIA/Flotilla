'use client'

/**
 * 邮箱验证页面
 * ECP-A1: 单一职责 - 仅处理邮箱验证逻辑
 * ECP-C2: 系统化错误处理 - 清晰的成功/失败状态展示
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type VerificationState = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  const [state, setState] = useState<VerificationState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  /**
   * 页面加载时自动验证邮箱
   */
  useEffect(() => {
    const verifyEmail = async () => {
      const token = params.token as string

      if (!token) {
        setState('error')
        setErrorMessage('无效的验证链接')
        return
      }

      try {
        await api.auth.verifyEmail(token)
        setState('success')
      } catch (err: unknown) {
        // ECP-C1: 防御性编程 - 类型守卫检查错误对象
        setState('error')
        if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
          setErrorMessage(err.message)
        } else {
          setErrorMessage('验证失败，请重试')
        }
      }
    }

    verifyEmail()
  }, [params.token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h1 className="text-2xl font-bold text-foreground">验证中...</h1>
            <p className="text-muted-foreground">正在验证您的邮箱，请稍候</p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                ✓ 邮箱验证成功！
              </h1>
              <p className="text-muted-foreground">
                您的邮箱已成功验证，现在可以登录使用所有功能
              </p>
            </div>
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              前往登录
            </Button>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <svg
                  className="h-12 w-12 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                验证失败
              </h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <p className="text-sm text-muted-foreground">
                验证链接可能已过期或无效
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => router.push('/auth/register')}
                variant="outline"
                className="w-full"
              >
                重新注册
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
