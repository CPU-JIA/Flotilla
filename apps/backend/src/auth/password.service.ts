/**
 * Password Service - 密码管理
 * ECP-A1: SOLID - 单一职责原则，专注于密码相关操作
 * ECP-C1: 防御性编程 - 完整的安全验证和密码策略
 *
 * 从AuthService分离出来的职责：
 * - 忘记密码（发送重置邮件）
 * - 密码重置（验证Token + 更新密码）
 * - 密码历史检查（防止重用）
 * - 重置Token验证
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  maskEmail,
  maskUsername,
  maskToken,
} from '../common/utils/log-sanitizer';

/**
 * 重置Token验证结果
 */
export interface TokenValidationResult {
  valid: boolean;
  message: string;
  expiresAt?: Date;
}

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  // 密码历史保留数量
  private readonly PASSWORD_HISTORY_LIMIT = 5;
  // 密码历史检查数量（防止重用最近N次密码）
  private readonly PASSWORD_REUSE_CHECK = 3;
  // 重置Token有效期（1小时）
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 忘记密码 - 发送密码重置邮件
   * 🔒 SECURITY: 即使用户不存在也返回成功消息（防止邮箱枚举攻击）
   * @param email 用户邮箱
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 为了安全，即使用户不存在也返回成功消息（防止邮箱枚举攻击）
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${maskEmail(email)}`,
      );
      return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
    }

    // 生成密码重置token（1小时有效）
    const passwordResetToken = randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // 发送密码重置邮件
    const result = await this.emailService.sendPasswordResetEmail(
      user.email,
      user.username,
      passwordResetToken,
    );

    if (!result.success) {
      this.logger.error(
        `Failed to send password reset email to ${maskEmail(user.email)}`,
      );
      throw new BadRequestException('发送密码重置邮件失败，请稍后重试');
    }

    this.logger.log(
      `📧 Password reset email sent to: ${maskEmail(user.email)}`,
    );

    return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
  }

  /**
   * 重置密码
   * 🔒 SECURITY FIX: 添加密码历史检查（防止重用最近3次密码）
   * 🔒 CWE-521: Weak Password Requirements
   * @param token 重置Token
   * @param newPassword 新密码
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('无效的重置链接');
    }

    // 检查token是否过期
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('重置链接已过期，请重新申请密码重置');
    }

    // 🔒 检查新密码是否与最近3次密码相同
    await this.checkPasswordHistory(user.id, newPassword);

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 🔒 SECURITY FIX: 更新密码、递增tokenVersion、保存密码历史
    // 使用事务确保原子性
    await this.prisma.$transaction(async (tx) => {
      // 1. 保存当前密码到历史记录（在更新前）
      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.passwordHash,
        },
      });

      // 2. 更新用户密码和tokenVersion
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          tokenVersion: { increment: 1 }, // 递增版本号，撤销所有旧Token
        },
      });

      // 3. 清理旧历史记录（只保留最近N次）
      await this.cleanupPasswordHistory(tx, user.id);
    });

    this.logger.log(
      `✅ Password reset successful for user: ${maskUsername(user.username)}, tokenVersion incremented`,
    );

    return { message: '密码重置成功，请使用新密码登录' };
  }

  /**
   * 验证密码重置token有效性（不执行重置操作）
   * ECP-A1: 单一职责 - 仅验证token，不修改数据
   * @param token 重置Token
   */
  async verifyResetToken(token: string): Promise<TokenValidationResult> {
    if (!token || token.length < 10) {
      return {
        valid: false,
        message: '无效的重置链接格式',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: {
        id: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      this.logger.warn(`Invalid reset token attempted: ${maskToken(token)}`);
      return {
        valid: false,
        message: '重置链接不存在或已被使用',
      };
    }

    // 检查token是否过期
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      this.logger.warn(`Expired reset token attempted: ${maskToken(token)}`);
      return {
        valid: false,
        message: '重置链接已过期（有效期1小时）',
        expiresAt: user.passwordResetExpires,
      };
    }

    this.logger.log(`✅ Valid reset token verified: ${maskToken(token)}`);
    return {
      valid: true,
      message: '重置链接有效',
      expiresAt: user.passwordResetExpires || undefined,
    };
  }

  /**
   * 🧪 测试专用API - 获取密码重置token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅供测试环境使用，生产环境禁止调用
   * 🔒 SECURITY: 生产环境禁用此API
   * @param email 用户邮箱
   */
  async getResetTokenForTest(email: string): Promise<{
    token: string | null;
    expiresAt: Date | null;
  }> {
    // 🔒 SECURITY: 生产环境禁止调用此测试API
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Test API is disabled in production environment',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`用户不存在: ${maskEmail(email)}`);
    }

    this.logger.log(`🧪 [TEST] Retrieved reset token for: ${maskEmail(email)}`);
    return {
      token: user.passwordResetToken,
      expiresAt: user.passwordResetExpires,
    };
  }

  /**
   * 检查密码历史（防止重用最近N次密码）
   * @param userId 用户ID
   * @param newPassword 新密码（明文）
   */
  private async checkPasswordHistory(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const recentPasswords = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: this.PASSWORD_REUSE_CHECK,
    });

    for (const history of recentPasswords) {
      const isSamePassword = await bcrypt.compare(
        newPassword,
        history.passwordHash,
      );
      if (isSamePassword) {
        throw new BadRequestException(
          `新密码不能与最近使用的${this.PASSWORD_REUSE_CHECK}次密码相同，请选择不同的密码`,
        );
      }
    }
  }

  /**
   * 清理旧的密码历史记录
   * @param tx Prisma事务客户端
   * @param userId 用户ID
   */
  private async cleanupPasswordHistory(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
  ): Promise<void> {
    const allHistories = await tx.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (allHistories.length > this.PASSWORD_HISTORY_LIMIT) {
      const idsToDelete = allHistories
        .slice(this.PASSWORD_HISTORY_LIMIT)
        .map((h) => h.id);
      await tx.passwordHistory.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}
