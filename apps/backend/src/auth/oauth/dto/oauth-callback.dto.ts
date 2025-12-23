import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * OAuth Callback DTO
 * OAuth 回调参数验证
 * ECP-C1: Defensive Programming - 严格验证回调参数
 */
export class OAuthCallbackDto {
  @ApiProperty({ description: 'OAuth authorization code' })
  @IsNotEmpty()
  @IsString()
  code: string

  @ApiProperty({ description: 'State parameter for CSRF protection', required: false })
  @IsString()
  state?: string
}
