import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

/**
 * 创建通知DTO
 *
 * ECP-C1: 防御性编程 - 使用class-validator验证所有输入
 */
export class CreateNotificationDto {
  @IsString()
  userId: string; // 通知接收者ID

  @IsEnum(NotificationType, { message: '无效的通知类型' })
  type: NotificationType; // 通知类型

  @IsString()
  @MaxLength(200, { message: '通知标题最多200个字符' })
  title: string; // 通知标题

  @IsOptional()
  @IsString()
  body?: string; // 通知内容（支持Markdown）

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '链接最多500个字符' })
  link?: string; // 相关资源链接

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; // 额外元数据（JSON）
}
