'use client'

/**
 * 认证上下文
 * ECP-A1: 单一职责 - 集中管理认证状态
 * ECP-C4: 无状态原则 - 使用JWT令牌，无服务器端会话
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, clearTokens, setTokens } from '@/lib/api'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth'

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
   */
  const refreshUser = useCallback(async () => {
    try {
      // 检查是否有token，没有token直接跳过API调用
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken')
        if (!token) {
          setUser(null)
          setIsLoading(false)
          return
        }
      }

      const userData = await api.auth.me()
      setUser(userData)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      clearTokens()
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
   */
  const login = useCallback(async (data: LoginRequest) => {
    try {
      const response: AuthResponse = await api.auth.login(data)
      setTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }, [])

  /**
   * 注册方法
   */
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response: AuthResponse = await api.auth.register(data)
      setTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }, [])

  /**
   * 登出方法
   */
  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    api.auth.logout()
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
