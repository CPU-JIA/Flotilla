/**
 * useErrorHandler Hook - 统一错误处理
 * ECP-C2: 系统化错误处理
 * ECP-B1: DRY - 复用错误处理逻辑
 */

'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { ApiError } from '@/lib/api'
import { showError, showSuccess, showWarning, showInfo } from '@/lib/notifications'

export function useErrorHandler() {
  const { language, t } = useLanguage()

  /**
   * 处理错误并显示通知
   */
  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message =
        error instanceof ApiError
          ? error.message
          : customMessage || (language === 'zh' ? '操作失败' : 'Operation failed')

      const title = language === 'zh' ? '错误' : 'Error'

      showError(message, title)
    },
    [language]
  )

  /**
   * 显示成功消息
   */
  const handleSuccess = useCallback(
    (message: string) => {
      const title = language === 'zh' ? '成功' : 'Success'
      showSuccess(message, title)
    },
    [language]
  )

  /**
   * 显示警告消息
   */
  const handleWarning = useCallback(
    (message: string) => {
      const title = language === 'zh' ? '警告' : 'Warning'
      showWarning(message, title)
    },
    [language]
  )

  /**
   * 显示信息消息
   */
  const handleInfo = useCallback(
    (message: string) => {
      const title = language === 'zh' ? '信息' : 'Info'
      showInfo(message, title)
    },
    [language]
  )

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    t,
    language,
  }
}
