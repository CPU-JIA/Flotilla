import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  ArrayNotEmpty,
} from 'class-validator';

/**
 * 创建 Webhook DTO
 * ECP-C1: Defensive Programming - 输入验证
 */
export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook 接收端点 URL',
    example: 'https://api.example.com/webhooks',
  })
  @IsUrl({}, { message: 'URL must be a valid URL' })
  url: string;

  @ApiProperty({
    description: '订阅的事件类型数组',
    example: ['push', 'pull_request.opened', 'issue.closed'],
    isArray: true,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Events array must not be empty' })
  @IsString({ each: true })
  events: string[];

  @ApiProperty({
    description: '是否激活 Webhook',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
