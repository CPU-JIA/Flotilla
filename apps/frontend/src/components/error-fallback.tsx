'use client'

/**
 * ErrorFallback - 错误展示UI组件
 * ECP-A1: 单一职责 - 专注于错误展示和用户交互
 * ECP-B2: KISS - 简洁的错误展示界面
 * ECP-D2: 注释"Why" - 为什么需要技术详情的显示/隐藏
 */

import React, { useState } from 'react'
import { AlertCircle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useLanguage } from '@/contexts/language-context'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary?: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const { t } = useLanguage()
  const [showDetails, setShowDetails] = useState(process.env.NODE_ENV === 'development')

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // 生成错误代码（基于时间戳）
  const errorCode = `ERR-${Date.now().toString(36).toUpperCase()}`
  const timestamp = new Date().toLocaleString()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t.errorBoundary.title}
          </CardTitle>
          <CardDescription className="text-base">
            {t.errorBoundary.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 错误描述 */}
          <Alert>
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              {t.errorBoundary.description}
            </AlertDescription>
          </Alert>

          {/* 错误元数据 */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {t.errorBoundary.errorCode}:
              </span>
              <code className="rounded bg-gray-200 px-2 py-1 font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {errorCode}
              </code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {t.errorBoundary.timestamp}:
              </span>
              <span className="text-gray-700 dark:text-gray-300">{timestamp}</span>
            </div>
          </div>

          {/* 技术详情（可折叠） - Why: 开发时帮助调试，生产环境保护用户不被吓到 */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.errorBoundary.technicalDetails}
              </span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {showDetails && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Error Message
                    </p>
                    <p className="break-words font-mono text-sm text-red-600 dark:text-red-400">
                      {error.message}
                    </p>
                  </div>

                  {error.stack && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        Stack Trace
                      </p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900 p-3 font-mono text-xs text-gray-100">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={resetErrorBoundary || handleRefresh}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t.errorBoundary.retry}
            </Button>

            <Button onClick={handleGoHome} className="flex-1" variant="outline">
              <Home className="mr-2 h-4 w-4" />
              {t.errorBoundary.goHome}
            </Button>
          </div>

          {/* 支持提示 */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t.errorBoundary.contactSupport}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
