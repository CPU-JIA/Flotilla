import { IsBoolean, IsOptional } from 'class-validator';

/**
 * 更新通知偏好DTO
 *
 * 用户可自定义接收哪些类型的通知
 *
 * ECP-A1: SOLID - 单一职责，仅处理偏好设置更新
 */
export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  prCreated?: boolean; // PR创建通知

  @IsOptional()
  @IsBoolean()
  prMerged?: boolean; // PR合并通知

  @IsOptional()
  @IsBoolean()
  prReviewed?: boolean; // PR审查通知

  @IsOptional()
  @IsBoolean()
  prCommented?: boolean; // PR评论通知

  @IsOptional()
  @IsBoolean()
  issueMentioned?: boolean; // Issue提及通知

  @IsOptional()
  @IsBoolean()
  issueAssigned?: boolean; // Issue分配通知

  @IsOptional()
  @IsBoolean()
  issueCommented?: boolean; // Issue评论通知

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean; // 邮件通知（暂未实现）
}
