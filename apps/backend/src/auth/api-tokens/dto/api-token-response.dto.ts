import { ApiProperty } from '@nestjs/swagger'

/**
 * API Token 列表响应 DTO
 * ECP-D2: 评论艺术 - 只显示前缀和元数据,不显示完整令牌
 */
export class ApiTokenListDto {
  @ApiProperty({ description: '令牌ID' })
  id: string

  @ApiProperty({ description: '令牌名称' })
  name: string

  @ApiProperty({ description: '令牌前缀（前8字符）', example: 'flo_1234' })
  tokenPrefix: string

  @ApiProperty({ description: '作用域', example: ['read', 'write'] })
  scopes: string[]

  @ApiProperty({ description: '过期时间（可选）', nullable: true })
  expiresAt: Date | null

  @ApiProperty({ description: '最后使用时间（可选）', nullable: true })
  lastUsedAt: Date | null

  @ApiProperty({ description: '创建时间' })
  createdAt: Date
}

/**
 * 创建 API Token 响应 DTO
 * ECP-C1: 防御性编程 - 令牌只在创建时显示一次
 */
export class CreateApiTokenResponseDto extends ApiTokenListDto {
  @ApiProperty({
    description: '完整令牌（只在创建时显示一次）',
    example: 'flo_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
  })
  token: string
}
