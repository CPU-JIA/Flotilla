'use client'

/**
 * Root Error Page - 根级别错误页面
 * ECP-A1: 单一职责 - 处理应用根级别的错误
 * Next.js 15约定: error.tsx用于捕获路由段的错误
 *
 * Why: 此页面捕获根layout下的所有错误（包括服务器端和客户端错误）
 */

import { logger } from '@/lib/logger'
import { useEffect } from 'react'
import { ErrorFallback } from '@/components/error-fallback'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 记录错误到控制台或错误监控服务
    logger.error('Root error:', error)
  }, [error])

  return <ErrorFallback error={error} resetErrorBoundary={reset} />
}
