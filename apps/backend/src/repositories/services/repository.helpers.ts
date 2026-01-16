import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '@prisma/client';
import { UserRole, MemberRole } from '@prisma/client';

/**
 * Repository共享辅助方法
 * ECP-A1: 单一职责 - 专注于权限检查和工具函数
 */
@Injectable()
export class RepositoryHelpers {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查项目权限
   * ECP-C1: 防御性编程
   */
  async checkProjectPermission(
    projectId: string,
    currentUser: User,
    requireWrite: boolean = false,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: currentUser.id },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const isOwner = project.ownerId === currentUser.id;
    const member = project.members[0];
    const isMember = !!member;
    const isAdmin = currentUser.role === UserRole.SUPER_ADMIN;

    // 超级管理员拥有所有权限
    if (isAdmin) {
      return;
    }

    if (!isOwner && !isMember) {
      throw new ForbiddenException('您没有权限访问此项目');
    }

    if (requireWrite && !isOwner && member?.role === MemberRole.VIEWER) {
      throw new ForbiddenException('您没有写入权限');
    }
  }

  /**
   * 获取文件Content-Type
   * ECP-B1: DRY原则 - 统一处理
   */
  getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      js: 'application/javascript',
      ts: 'application/typescript',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      md: 'text/markdown',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
