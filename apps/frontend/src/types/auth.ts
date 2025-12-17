/**
 * 认证相关类型定义
 * ECP-B3: 清晰的类型命名
 */

export interface User {
  id: string
  username: string
  email: string
  emailVerified: boolean
  role: 'USER' | 'SUPER_ADMIN'
  isActive: boolean
  avatar?: string
  bio?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  usernameOrEmail: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface ResendVerificationRequest {
  email: string
}

/**
 * 🔒 SECURITY FIX: Token 现在通过 HttpOnly Cookie 传输
 * AuthResponse 不再包含 Token 字段
 */
export interface AuthResponse {
  user: User
}

/** @deprecated Token 现在使用 HttpOnly Cookie */
export interface LegacyAuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshTokenResponse {
  accessToken: string
}
