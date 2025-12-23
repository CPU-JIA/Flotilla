import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator'

/**
 * 更新 Webhook DTO
 * ECP-C1: Defensive Programming - 输入验证
 */
export class UpdateWebhookDto {
  @ApiProperty({
    description: 'Webhook 接收端点 URL',
    example: 'https://api.example.com/webhooks',
    required: false,
  })
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsOptional()
  url?: string

  @ApiProperty({
    description: '订阅的事件类型数组',
    example: ['push', 'pull_request.opened', 'issue.closed'],
    isArray: true,
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  events?: string[]

  @ApiProperty({
    description: '是否激活 Webhook',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean
}
