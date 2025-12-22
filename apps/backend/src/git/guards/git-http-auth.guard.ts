/**
 * Git HTTP Basic Auth Guard
 *
 * 🔒 SECURITY FIX: 实现 Git HTTP 协议认证
 * CWE-306: Missing Authentication for Critical Function
 * OWASP A01:2021 – Broken Access Control
 *
 * Git HTTP Smart Protocol 支持 HTTP Basic Authentication
 * 格式: Authorization: Basic base64(username:password)
 *
 * ECP-C1: 防御性编程 - 验证 Git 操作权限
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, MemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';

@Injectable()
export class GitHttpAuthGuard implements CanActivate {
  private readonly logger = new Logger(GitHttpAuthGuard.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 解析 HTTP Basic Auth header
   * 格式: "Basic base64(username:password)"
   */
  private parseBasicAuth(
    authHeader: string,
  ): { username: string; password: string } | null {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    try {
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'utf-8',
      );
      const [username, password] = credentials.split(':');

      if (!username || !password) {
        return null;
      }

      return { username, password };
    } catch (error) {
      this.logger.warn(`Failed to parse Basic Auth: ${error.message}`);
      return null;
    }
  }

  /**
   * 验证用户凭据
   */
  private async validateCredentials(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; role: UserRole } | null> {
    // 🔒 SECURITY FIX: 并行查询用户名和邮箱（防止时序攻击）
    const [userByUsername, userByEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { username } }),
      this.prisma.user.findUnique({ where: { email: username } }), // 支持邮箱登录
    ]);

    const user = userByUsername || userByEmail;

    if (!user || !user.isActive) {
      return null;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * 检查项目权限
   *
   * 🔒 SECURITY FIX (CWE-862): Enhanced permission checks
   *
   * - git-upload-pack (clone/fetch): 需要 READ 权限
   * - git-receive-pack (push): 需要 WRITE 权限 (MEMBER 及以上)
   *
   * 权限检查增强:
   * - 验证项目未被删除/归档
   * - 验证仓库已初始化
   * - 公开仓库也要求用户已认证
   */
  private async checkProjectPermission(
    userId: string,
    userRole: UserRole,
    projectId: string,
    operation: 'read' | 'write',
  ): Promise<boolean> {
    // SUPER_ADMIN bypass
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // 🔒 SECURITY FIX: Query project with repository to ensure repo exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
        repositories: true, // Verify repository exists
      },
    });

    if (!project) {
      this.logger.warn(`Project not found: ${projectId}`);
      return false;
    }

    // 🔒 SECURITY FIX: Check if repository is initialized
    if (!project.repositories || project.repositories.length === 0) {
      this.logger.warn(`Repository not initialized for project: ${projectId}`);
      return false;
    }

    const repository = project.repositories[0];

    // 🔒 SECURITY FIX: Check if repository is archived (read-only for archived repos)
    if (operation === 'write' && repository.isArchived) {
      this.logger.warn(
        `Write operation denied - repository is archived: ${projectId}`,
      );
      return false;
    }

    // 🔒 SECURITY FIX: Public projects require authenticated user for read
    // This prevents anonymous access and ensures audit trail
    if (operation === 'read' && project.visibility === 'PUBLIC') {
      // User is authenticated (passed validateCredentials), allow read
      this.logger.debug(
        `Allowing read access to public project: ${projectId} by user: ${userId}`,
      );
      return true;
    }

    // Check if user is project owner
    if (project.ownerId === userId) {
      return true;
    }

    // Check project membership
    const member = project.members[0];
    if (!member) {
      this.logger.debug(
        `User ${userId} is not a member of project ${projectId}`,
      );
      return false;
    }

    // Write operations require MEMBER role or higher (VIEWER is read-only)
    if (operation === 'write' && member.role === MemberRole.VIEWER) {
      this.logger.warn(
        `Write operation denied - user has VIEWER role: ${userId}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Guard 主逻辑
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const projectId = request.params.projectId;

    if (!projectId) {
      throw new BadRequestException('Project ID is required');
    }

    // 解析 Basic Auth
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'Authentication required for Git operations',
        {
          description:
            'Git HTTP requires Basic Authentication. Use: git clone http://username:password@host/repo/projectId',
        },
      );
    }

    const credentials = this.parseBasicAuth(authHeader);
    if (!credentials) {
      throw new UnauthorizedException('Invalid Basic Auth credentials');
    }

    // 验证用户凭据
    const user = await this.validateCredentials(
      credentials.username,
      credentials.password,
    );
    if (!user) {
      this.logger.warn(
        `Git HTTP auth failed for username: ${credentials.username}`,
      );
      throw new UnauthorizedException('Invalid username or password');
    }

    this.logger.log(
      `✅ Git HTTP auth success: ${user.username} (project: ${projectId})`,
    );

    // 确定操作类型 (read/write)
    const operation = request.path.includes('git-receive-pack')
      ? 'write'
      : 'read';

    // 检查项目权限
    const hasPermission = await this.checkProjectPermission(
      user.id,
      user.role,
      projectId,
      operation,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Git HTTP permission denied: ${user.username} (project: ${projectId}, operation: ${operation})`,
      );
      throw new ForbiddenException(
        `You don't have ${operation} permission for this repository`,
      );
    }

    this.logger.log(
      `✅ Git HTTP permission granted: ${user.username} (project: ${projectId}, operation: ${operation})`,
    );

    // 将用户信息注入到 request 对象
    request['user'] = user;

    return true;
  }
}
