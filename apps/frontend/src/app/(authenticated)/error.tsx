'use client'

/**
 * Authenticated Route Error Page - 认证区域错误页面
 * ECP-A1: 单一职责 - 处理认证区域的错误
 * Next.js 15约定: (authenticated)路由组的错误页面
 *
 * Why: 为认证后的路由提供专门的错误处理，可添加认证相关的错误处理逻辑
 */

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/error-fallback'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthenticatedErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 记录认证区域的错误
    console.error('Authenticated route error:', error)

    // 可在此处添加认证相关的错误处理逻辑
    // 例如：检查是否是认证过期错误，自动跳转到登录页等
  }, [error])

  return <ErrorFallback error={error} resetErrorBoundary={reset} />
}
