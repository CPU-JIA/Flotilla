/**
 * Email Verification Service - 邮箱验证管理
 * ECP-A1: SOLID - 单一职责原则，专注于邮箱验证流程
 * ECP-C1: 防御性编程 - 完整的验证和错误处理
 *
 * 从AuthService分离出来的职责：
 * - 邮箱验证（验证Token + 更新状态）
 * - 重新发送验证邮件
 * - 验证Token有效性检查
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

/**
 * 验证Token结果
 */
export interface VerificationResult {
  valid: boolean;
  message: string;
  expiresAt?: Date;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  // 验证Token有效期（24小时）
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 验证邮箱
   * ECP-C1: 防御性编程 - 验证token有效性和过期时间
   * @param token 验证Token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('无效的验证链接');
    }

    // 检查token是否过期
    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      throw new BadRequestException('验证链接已过期，请重新发送验证邮件');
    }

    // 更新用户为已验证状态
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    this.logger.log(`✅ Email verified for user: ${user.username}`);

    // 发送欢迎邮件（异步，不阻塞）
    this.emailService
      .sendWelcomeEmail(user.email, user.username)
      .catch((error) => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });

    return { message: '邮箱验证成功！' };
  }

  /**
   * 重新发送验证邮件
   * @param email 用户邮箱
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证，无需重复验证');
    }

    // 生成新的验证token
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(
      Date.now() + this.VERIFICATION_TOKEN_EXPIRY,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken,
        emailVerifyExpires,
      },
    });

    // 发送验证邮件
    const result = await this.emailService.sendVerificationEmail(
      user.email,
      user.username,
      emailVerifyToken,
    );

    if (!result.success) {
      throw new BadRequestException('发送验证邮件失败，请稍后重试');
    }

    this.logger.log(`📧 Verification email resent to: ${user.email}`);

    return { message: '验证邮件已发送，请检查您的邮箱' };
  }

  /**
   * 验证邮箱验证token有效性（不执行验证操作）
   * ECP-A1: 单一职责 - 仅验证token，不修改数据
   * @param token 验证Token
   */
  async verifyEmailToken(token: string): Promise<VerificationResult> {
    if (!token || token.length < 10) {
      return {
        valid: false,
        message: '无效的验证链接格式',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { emailVerifyToken: token },
      select: {
        id: true,
        emailVerified: true,
        emailVerifyExpires: true,
      },
    });

    if (!user) {
      this.logger.warn(
        `Invalid email verification token attempted: ${token.substring(0, 10)}...`,
      );
      return {
        valid: false,
        message: '验证链接不存在或已被使用',
      };
    }

    // 检查邮箱是否已验证
    if (user.emailVerified) {
      this.logger.warn(
        `Email already verified, token: ${token.substring(0, 10)}...`,
      );
      return {
        valid: false,
        message: '邮箱已验证，无需重复验证',
      };
    }

    // 检查token是否过期
    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      this.logger.warn(
        `Expired email verification token attempted: ${token.substring(0, 10)}...`,
      );
      return {
        valid: false,
        message: '验证链接已过期（有效期24小时）',
        expiresAt: user.emailVerifyExpires,
      };
    }

    this.logger.log(
      `✅ Valid email verification token verified: ${token.substring(0, 10)}...`,
    );
    return {
      valid: true,
      message: '验证链接有效',
      expiresAt: user.emailVerifyExpires || undefined,
    };
  }

  /**
   * 生成新的验证Token（内部使用）
   * @param userId 用户ID
   * @returns 新的验证Token
   */
  async generateVerificationToken(userId: string): Promise<string> {
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(
      Date.now() + this.VERIFICATION_TOKEN_EXPIRY,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken,
        emailVerifyExpires,
      },
    });

    return emailVerifyToken;
  }

  /**
   * 🧪 测试专用API - 获取邮箱验证token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅供测试环境使用，生产环境禁止调用
   * @param email 用户邮箱
   */
  async getEmailTokenForTest(email: string): Promise<{
    token: string | null;
    expiresAt: Date | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        emailVerifyToken: true,
        emailVerifyExpires: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`用户不存在: ${email}`);
    }

    this.logger.log(`🧪 [TEST] Retrieved email token for: ${email}`);
    return {
      token: user.emailVerifyToken,
      expiresAt: user.emailVerifyExpires,
    };
  }
}
