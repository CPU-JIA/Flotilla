'use client'

/**
 * ErrorBoundaryProvider - 错误边界提供者
 * ECP-A1: 单一职责 - 为应用提供错误边界包装
 * Why: 将ErrorBoundary封装为Provider，便于在layout中使用
 */

import { logger } from '@/lib/logger'
import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

interface ErrorBoundaryProviderProps {
  children: ReactNode
}

export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 可在此处接入错误监控服务
        logger.error('Global error caught:', error)
        logger.error('Error info:', errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
