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
   * - git-upload-pack (clone/fetch): 需要 READ 权限 (任何角色)
   * - git-receive-pack (push): 需要 WRITE 权限 (MEMBER 及以上)
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

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      return false;
    }

    // Public 项目，任何人都可以 read
    if (operation === 'read' && project.visibility === 'PUBLIC') {
      return true;
    }

    // 检查项目所有者
    if (project.ownerId === userId) {
      return true;
    }

    // 检查项目成员
    const member = project.members[0];
    if (!member) {
      return false;
    }

    // Write 操作需要 MEMBER 及以上角色 (VIEWER 只读)
    if (operation === 'write' && member.role === MemberRole.VIEWER) {
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
