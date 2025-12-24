'use client'

/**
 * 2FA验证页面
 * ECP-A1: 单一职责 - 仅处理2FA验证逻辑
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 *
 * 使用场景：
 * - 用户登录时，如果启用了2FA，会被重定向到此页面
 * - 要求输入6位TOTP验证码
 * - 支持恢复码作为备用验证方式
 */

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Shield, Key } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

function TwoFactorVerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 从URL参数获取临时token（登录时后端返回）
  const tempToken = searchParams.get('token')

  useEffect(() => {
    if (!tempToken) {
      toast.error('Invalid 2FA verification link')
      router.push('/auth/login')
    }
    // 自动聚焦输入框
    inputRef.current?.focus()
  }, [tempToken, router])

  /**
   * 自动提交当验证码长度达到6位
   */
  useEffect(() => {
    if (!useRecoveryCode && code.length === 6) {
      handleSubmit(new Event('submit') as unknown as React.FormEvent)
    }
  }, [code, useRecoveryCode])

  /**
   * 处理验证码输入
   * ECP-B2: KISS原则 - 简单的输入验证
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (error) setError('')
  }

  /**
   * 处理恢复码输入
   */
  const handleRecoveryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 恢复码格式：XXXX-XXXX-XXXX-XXXX (16位)
    let value = e.target.value.toUpperCase().replace(/[^0-9A-F-]/g, '')

    // 自动添加连字符
    if (value.length > 4 && !value.includes('-')) {
      value = value.match(/.{1,4}/g)?.join('-') || value
    }

    value = value.slice(0, 19) // 16 chars + 3 hyphens
    setRecoveryCode(value)
    if (error) setError('')
  }

  /**
   * 提交验证
   * ECP-C2: 系统化错误处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const tokenToVerify = useRecoveryCode ? recoveryCode : code

    // 客户端验证
    if (!tokenToVerify) {
      setError('Please enter a verification code')
      return
    }

    if (!useRecoveryCode && tokenToVerify.length !== 6) {
      setError('Verification code must be 6 digits')
      return
    }

    if (useRecoveryCode && tokenToVerify.replace(/-/g, '').length !== 16) {
      setError('Recovery code must be 16 characters')
      return
    }

    setIsLoading(true)

    try {
      // 调用2FA验证API
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempToken,
          token: tokenToVerify,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Verification failed')
      }

      const data = await response.json()

      // 保存认证token
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // 显示恢复码使用提示
      if (useRecoveryCode) {
        toast.success('Logged in with recovery code. Please disable and re-enable 2FA to get new recovery codes.')
      } else {
        toast.success('Login successful')
      }

      // 跳转到仪表板
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
      setCode('')
      setRecoveryCode('')
      setIsLoading(false)
    }
  }

  /**
   * 切换到恢复码输入
   */
  const toggleRecoveryMode = () => {
    setUseRecoveryCode(!useRecoveryCode)
    setCode('')
    setRecoveryCode('')
    setError('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-gray-50 to-yellow-50 dark:from-blue-950 dark:via-gray-950 dark:to-yellow-950">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="text-center pb-3">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useRecoveryCode
              ? 'Enter one of your recovery codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {!useRecoveryCode ? (
              <div className="space-y-2">
                <Label htmlFor="code" className="sr-only">
                  Verification Code
                </Label>
                <Input
                  ref={inputRef}
                  id="code"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <p className="text-xs text-center text-muted-foreground">
                  The code will expire in 30 seconds
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="recoveryCode" className="sr-only">
                  Recovery Code
                </Label>
                <Input
                  ref={inputRef}
                  id="recoveryCode"
                  value={recoveryCode}
                  onChange={handleRecoveryCodeChange}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  maxLength={19}
                  disabled={isLoading}
                  className="text-center text-xl font-mono tracking-wider h-14"
                  autoFocus
                  autoComplete="off"
                />
                <p className="text-xs text-center text-muted-foreground">
                  Recovery codes are 16 characters long
                </p>
              </div>
            )}

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <Separator />

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={toggleRecoveryMode}
                disabled={isLoading}
              >
                <Key className="w-4 h-4 mr-2" />
                {useRecoveryCode ? 'Use Authenticator Code' : 'Use Recovery Code'}
              </Button>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Back to Login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TwoFactorVerifyContent />
    </Suspense>
  )
}
