import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditEntityType } from '@prisma/client';

/**
 * 审计日志元数据键
 */
export const AUDIT_METADATA_KEY = 'audit';

/**
 * 审计日志配置接口
 */
export interface AuditMetadata {
  action: AuditAction;
  entityType: AuditEntityType;
  description: string;
}

/**
 * 审计日志装饰器
 *
 * Phase 4: 自动记录审计日志
 *
 * 用法示例：
 * ```typescript
 * @Audit({ action: AuditAction.CREATE, entityType: AuditEntityType.PROJECT, description: '创建项目' })
 * async createProject(dto: CreateProjectDto, user: User) {
 *   // ... 业务逻辑
 * }
 * ```
 *
 * @param metadata 审计日志元数据
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
