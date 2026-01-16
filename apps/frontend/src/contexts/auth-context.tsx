'use client'

/**
 * 认证上下文
 * ECP-A1: 单一职责 - 集中管理认证状态
 * ECP-C4: 无状态原则 - 使用JWT令牌，无服务器端会话
 *
 * 🔒 SECURITY FIX: Token 已迁移到 HttpOnly Cookie
 * 不再需要手动管理 localStorage 和定时刷新
 */

import { logger } from '@/lib/logger'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { User, LoginRequest, RegisterRequest } from '@/types/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 认证提供者组件
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 刷新用户信息
   * ECP-C1: 防御性编程 - 错误处理
   *
   * 🔒 SECURITY FIX: 不再检查 localStorage
   * 直接调用 API，后端会验证 HttpOnly Cookie
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.auth.me()
      setUser(userData)
    } catch (error) {
      logger.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 初始化时检查用户登录状态
   */
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  /**
   * 登录方法
   * ECP-C2: 系统化错误处理
   *
   * 🔒 SECURITY FIX: 后端会自动设置 HttpOnly Cookie
   * 前端不再手动存储 Token
   */
  const login = useCallback(async (data: LoginRequest) => {
    try {
      const response = await api.auth.login(data)
      // 🔒 后端已通过 Cookie 设置 Token，前端只需设置用户状态
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }, [])

  /**
   * 注册方法
   *
   * 🔒 SECURITY FIX: 后端会自动设置 HttpOnly Cookie
   * 前端不再手动存储 Token
   */
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response = await api.auth.register(data)
      // 🔒 后端已通过 Cookie 设置 Token，前端只需设置用户状态
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }, [])

  /**
   * 登出方法
   *
   * 🔒 SECURITY FIX: 后端 API 会清除 HttpOnly Cookie
   * 前端只需清除本地状态
   */
  const logout = useCallback(() => {
    setUser(null)
    api.auth.logout() // 调用后端API清除Cookie并重定向
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * 使用认证上下文的 Hook
 * ECP-B2: KISS原则 - 简化组件中的认证逻辑
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
