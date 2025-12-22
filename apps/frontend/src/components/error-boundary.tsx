'use client'

/**
 * ErrorBoundary - React错误边界组件
 * ECP-A1: 单一职责 - 捕获并处理组件树中的JavaScript错误
 * ECP-C2: 系统化错误处理 - 全局错误捕获机制
 * ECP-D2: 注释"Why" - 为什么使用类组件和记录错误
 *
 * Why: Error Boundary必须是类组件，这是React的限制
 * Why: 记录错误到console，生产环境可接入错误监控服务（如Sentry）
 */

import React, { Component, ReactNode } from 'react'
import { ErrorFallback } from './error-fallback'

interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * 自定义错误回退UI
   * @default ErrorFallback
   */
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode
  /**
   * 错误回调函数，可用于上报错误
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  /**
   * 当子组件抛出错误时，更新state以显示错误UI
   * Why: getDerivedStateFromError是静态方法，用于render阶段更新state
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * 捕获错误信息并记录
   * Why: componentDidCatch在commit阶段调用，可以执行副作用（如日志记录）
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error)
    console.error('Component stack:', errorInfo.componentStack)

    // 调用用户提供的错误回调
    this.props.onError?.(error, errorInfo)

    // 生产环境可在此接入错误监控服务
    // 例如: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
  }

  /**
   * 重置错误状态，允许用户重试
   */
  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 使用自定义fallback或默认的ErrorFallback组件
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary)
      }

      return <ErrorFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
    }

    return this.props.children
  }
}
