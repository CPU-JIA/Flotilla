import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Link OAuth Account DTO
 * 将 OAuth 账户关联到现有用户账户
 * ECP-C1: Defensive Programming - 验证关联参数
 */
export class LinkOAuthDto {
  @ApiProperty({ description: 'OAuth provider', enum: ['github', 'google'] })
  @IsNotEmpty()
  @IsEnum(['github', 'google'])
  provider: 'github' | 'google'

  @ApiProperty({ description: 'OAuth authorization code' })
  @IsNotEmpty()
  @IsString()
  code: string
}
