import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

/**
 * 通知元数据类型定义
 * ECP-C1: 类型安全 - 使用联合类型替代 any
 */
type SerializableValue = string | number | boolean | null;

export type NotificationMetadata =
  | {
      type: 'ISSUE_CREATED';
      issueId: string;
      issueNumber: number;
      issueTitle: string;
      projectId: string;
    }
  | {
      type: 'ISSUE_UPDATED';
      issueId: string;
      issueNumber: number;
      changes: string[];
      updatedBy: string;
    }
  | {
      type: 'ISSUE_CLOSED';
      issueId: string;
      issueNumber: number;
      closedBy: string;
      reason?: string;
    }
  | {
      type: 'ISSUE_ASSIGNED';
      issueId: string;
      issueNumber?: number;
      projectId: string;
      assignerId: string;
      assigneeName?: string;
    }
  | {
      type: 'PR_CREATED';
      prId: string;
      prNumber: number;
      prTitle: string;
      sourceBranch: string;
      targetBranch: string;
      authorId?: string;
      repoName?: string;
    }
  | {
      type: 'PR_UPDATED';
      prId: string;
      prNumber: number;
      changes: string[];
      updatedBy: string;
    }
  | {
      type: 'PR_MERGED';
      prId: string;
      prNumber: number;
      mergedBy: string;
      mergerId?: string;
      targetBranch: string;
      commitCount: number;
    }
  | {
      type: 'PR_CLOSED';
      prId: string;
      prNumber: number;
      closedBy: string;
      closerId?: string;
      reason?: string;
    }
  | {
      type: 'COMMENT_CREATED';
      commentId: string;
      parentType: 'issue' | 'pr';
      parentId: string;
      commentBy: string;
    }
  | {
      type: 'COMMENT_REPLY';
      commentId: string;
      parentCommentId: string;
      replyBy: string;
      filePath?: string;
    }
  | {
      type: 'MENTION';
      mentionedIn: string;
      mentionedBy: string;
      context: string;
      entityType: 'issue' | 'pr' | 'comment';
    }
  | {
      type: 'ASSIGNED';
      assigneeId: string;
      assigneeName: string;
      entityType: 'issue' | 'pr';
      entityId: string;
      assignedBy: string;
    }
  | {
      type: 'REVIEW_REQUESTED';
      reviewerId: string;
      reviewerName: string;
      prId: string;
      prNumber: number;
      requestedBy: string;
    }
  | {
      type: 'REVIEW_SUBMITTED';
      reviewId: string;
      prId: string;
      prNumber: number;
      reviewStatus: 'approved' | 'changes_requested' | 'commented';
      reviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
      reviewBy: string;
    }
  | {
      type: 'PROJECT_INVITE';
      projectId: string;
      projectName: string;
      role: string;
      invitedBy: string;
      inviteId: string;
    }
  | {
      type: 'TEAM_INVITE';
      teamId: string;
      teamName: string;
      role: string;
      invitedBy: string;
      inviteId: string;
    }
  | {
      type: 'PERMISSION_CHANGED';
      entityType: 'project' | 'team' | 'repository';
      entityId: string;
      oldRole: string;
      newRole: string;
      changedBy: string;
    }
  | {
      type: 'WEBHOOK_FAILED';
      webhookId: string;
      webhookUrl: string;
      event: string;
      errorMessage: string;
      retryCount: number;
    }
  | {
      type: 'PIPELINE_STARTED';
      pipelineId: string;
      pipelineName: string;
      triggeredBy: string;
      commitSha?: string;
    }
  | {
      type: 'PIPELINE_COMPLETED';
      pipelineId: string;
      pipelineName: string;
      status: 'success' | 'failure';
      duration: number;
    }
  | {
      type: 'SECURITY_ALERT';
      severity: 'low' | 'medium' | 'high' | 'critical';
      alertType: string;
      details: string;
      affectedEntity?: string;
    }
  | { type: 'GENERIC'; data?: Record<string, SerializableValue> };

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
  metadata?: NotificationMetadata; // 额外元数据（JSON）
}
