/**
 * 认证相关类型定义
 * ECP-B3: 清晰的类型命名
 */

export interface User {
  id: string
  username: string
  email: string
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

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshTokenResponse {
  accessToken: string
}
