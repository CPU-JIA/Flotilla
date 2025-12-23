/**
 * OAuth Profile DTO
 * 标准化不同 OAuth 提供商的用户资料数据
 * ECP-B1: DRY - 统一接口，消除重复代码
 */
export class OAuthProfileDto {
  provider: 'github' | 'google' | 'saml'
  providerId: string
  email: string
  displayName: string
  username?: string
  avatar?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
  metadata?: Record<string, any>
}
