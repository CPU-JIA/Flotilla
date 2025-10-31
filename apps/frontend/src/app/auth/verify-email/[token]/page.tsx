'use client'

/**
 * 邮箱验证页面 - 完整token验证实现
 * ECP-A1: 单一职责 - 仅处理邮箱验证逻辑
 * ECP-C1: 防御性编程 - 完整的状态机和错误处理
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type VerificationState = 'VALIDATING' | 'VALID' | 'VERIFYING' | 'SUCCESS' | 'ERROR'
type ErrorType = 'INVALID' | 'EXPIRED' | 'ALREADY_VERIFIED' | 'UNKNOWN'

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  // 状态管理
  const [state, setState] = useState<VerificationState>('VALIDATING')
  const [errorType, setErrorType] = useState<ErrorType>('UNKNOWN')
  const [errorMessage, setErrorMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)

  /**
   * Step 1: Token预验证（GET请求，不执行验证操作）
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token || token.length < 10) {
        setState('ERROR')
        setErrorType('INVALID')
        setErrorMessage('无效的验证链接格式')
        return
      }

      try {
        const result = await api.auth.verifyEmailToken(token)

        if (result.valid) {
          setState('VALID')
          setExpiresAt(result.expiresAt || null)
          // 预验证通过，立即执行实际验证
          performVerification()
        } else {
          setState('ERROR')
          setErrorMessage(result.message)

          // 判断错误类型
          if (result.message.includes('过期')) {
            setErrorType('EXPIRED')
          } else if (result.message.includes('已验证')) {
            setErrorType('ALREADY_VERIFIED')
          } else {
            setErrorType('INVALID')
          }
          setExpiresAt(result.expiresAt || null)
        }
      } catch (error) {
        setState('ERROR')
        setErrorType('UNKNOWN')
        setErrorMessage('验证链接检查失败，请重试')
        console.error('Token validation error:', error)
      }
    }

    validateToken()
  }, [token])

  /**
   * Step 2: 执行实际验证（POST请求）
   */
  const performVerification = async () => {
    setState('VERIFYING')

    try {
      await api.auth.verifyEmail(token)
      setState('SUCCESS')
    } catch (err: unknown) {
      setState('ERROR')
      setErrorType('UNKNOWN')
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('验证失败，请重试')
      }
    }
  }

  /**
   * Step 3: 成功后自动跳转倒计时
   */
  useEffect(() => {
    if (state === 'SUCCESS') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/auth/login')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [state, router])

  /**
   * 立即跳转按钮
   */
  const handleImmediateRedirect = () => {
    router.push('/auth/login')
  }

  /**
   * 渲染不同状态的UI
   */
  const renderContent = () => {
    // VALIDATING 状态 - 正在检查token
    if (state === 'VALIDATING') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-muted-foreground">正在检查验证链接...</p>
        </div>
      )
    }

    // VERIFYING 状态 - 正在执行验证
    if (state === 'VERIFYING') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-muted-foreground">正在验证您的邮箱...</p>
        </div>
      )
    }

    // SUCCESS 状态 - 验证成功，自动跳转
    if (state === 'SUCCESS') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
              ✓ 邮箱验证成功！
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              您的邮箱已成功验证，现在可以登录使用所有功能
            </p>
            <p className="text-xs text-muted-foreground">
              {countdown}秒后自动跳转到登录页面...
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleImmediateRedirect}
              className="w-full"
            >
              立即登录
            </Button>
          </div>
        </div>
      )
    }

    // ERROR 状态 - 验证失败
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {errorType === 'EXPIRED' && '链接已过期'}
            {errorType === 'INVALID' && '链接无效'}
            {errorType === 'ALREADY_VERIFIED' && '邮箱已验证'}
            {errorType === 'UNKNOWN' && '验证失败'}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {errorMessage}
          </p>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              过期时间: {new Date(expiresAt).toLocaleString('zh-CN')}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          {errorType === 'ALREADY_VERIFIED' ? (
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              前往登录
            </Button>
          ) : (
            <>
              <Button
                onClick={() => router.push('/auth/register')}
                className="w-full"
              >
                重新注册
              </Button>
              <Link
                href="/auth/login"
                className="text-sm text-center text-muted-foreground hover:text-foreground"
              >
                返回登录
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-yellow-50 to-gray-100 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <div className="bg-card rounded-[14px] p-8 max-w-md w-full border border-border shadow-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-center text-foreground">
            邮箱验证
          </h1>
          <p className="text-center text-muted-foreground">
            {state === 'VALIDATING' && '正在检查验证链接'}
            {state === 'VERIFYING' && '正在验证您的邮箱'}
            {state === 'SUCCESS' && '验证成功'}
            {state === 'ERROR' && '验证失败'}
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  )
}
