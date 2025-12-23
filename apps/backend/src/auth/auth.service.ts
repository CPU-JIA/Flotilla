/**
 * Auth Service - 核心认证服务
 * ECP-A1: SOLID - 单一职责原则，专注于核心认证逻辑
 * ECP-A2: 高内聚低耦合 - 通过委托模式使用专门化的服务
 *
 * 重构后的职责（P1-2）：
 * - 用户注册
 * - 用户登录
 * - 用户登出
 * - 用户验证
 *
 * 委托的职责：
 * - TokenService: JWT令牌管理
 * - SessionService: 会话管理
 * - PasswordService: 密码重置
 * - EmailVerificationService: 邮箱验证
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TokenService, TokenPair } from './token.service';
import { SessionService } from './session.service';
import { PasswordService, TokenValidationResult } from './password.service';
import {
  EmailVerificationService,
  VerificationResult,
} from './email-verification.service';
import {
  RegisterDto,
  LoginDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { maskEmail, maskUsername } from '../common/utils/log-sanitizer';

// Re-export for backward compatibility
export type { JwtPayload } from './token.service';

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly passwordService: PasswordService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * 用户注册
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // 🔒 SECURITY FIX: 并行查询用户名和邮箱（防止时序攻击）
    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { username: dto.username } }),
      this.prisma.user.findUnique({ where: { email: dto.email } }),
    ]);

    if (existingUsername || existingEmail) {
      throw new ConflictException('用户名或邮箱已被使用');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 环境变量预检查
    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const envMode = process.env.NODE_ENV || 'development';

    // 创建用户（使用事务保证原子性）
    const result = await this.prisma.$transaction(async (tx) => {
      let role: UserRole = UserRole.USER;

      // 优先级1: 环境变量指定的初始管理员邮箱
      if (initialAdminEmail && dto.email === initialAdminEmail) {
        role = UserRole.SUPER_ADMIN;
        this.logger.warn(
          `🔐 Creating INITIAL_ADMIN from INITIAL_ADMIN_EMAIL env: ${maskEmail(dto.email)}`,
        );
      }
      // 生产环境必须设置 INITIAL_ADMIN_EMAIL
      else if (envMode === 'production' && !initialAdminEmail) {
        const userCount = await tx.user.count();
        if (userCount === 0) {
          throw new BadRequestException(
            'INITIAL_ADMIN_EMAIL environment variable must be set in production environment.',
          );
        }
      }
      // 开发/测试环境: 首个用户自动提升为SUPER_ADMIN
      else if (envMode !== 'production') {
        const userCount = await tx.user.count();
        if (userCount === 0) {
          role = UserRole.SUPER_ADMIN;
          this.logger.warn(
            `🚨 FIRST USER AUTO-PROMOTED TO SUPER_ADMIN (${envMode} mode): ${maskEmail(dto.email)}`,
          );
        }
      }

      // 生成邮箱验证token
      const emailVerifyToken = randomBytes(32).toString('hex');
      const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // 1. 创建用户
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash: hashedPassword,
          role,
          emailVerifyToken,
          emailVerifyExpires,
        },
      });

      this.logger.log(
        `✅ New user registered: ${maskUsername(user.username)} (role: ${user.role})`,
      );

      // 2. 自动创建个人组织
      const personalOrgSlug = `user-${user.username}`;
      const personalOrg = await tx.organization.create({
        data: {
          name: `${user.username}'s Organization`,
          slug: personalOrgSlug,
          description: `Personal workspace for ${user.username}`,
          isPersonal: true,
        },
      });

      // 3. 将用户添加为组织 OWNER
      await tx.organizationMember.create({
        data: {
          organizationId: personalOrg.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      this.logger.log(`🏢 Personal organization created: ${personalOrg.slug}`);

      return user;
    });

    // 生成 Token（委托给 TokenService），传递context用于fingerprint
    const tokenContext = { userAgent, ipAddress };
    const tokens = await this.tokenService.generateTokens(result, tokenContext);

    // 发送验证邮件（异步，不阻塞注册流程）
    this.emailService
      .sendVerificationEmail(
        result.email,
        result.username,
        result.emailVerifyToken!,
      )
      .then((emailResult) => {
        if (emailResult.success) {
          this.logger.log(
            `📧 Verification email sent to: ${maskEmail(result.email)}`,
          );
        } else {
          this.logger.error(
            `❌ Failed to send verification email to ${maskEmail(result.email)}: ${emailResult.error}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `❌ Unexpected error sending verification email: ${error.message}`,
        );
      });

    const { passwordHash: _passwordHash, ...userWithoutPassword } = result;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 用户登录
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // 查找用户
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账户状态
    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用，请联系管理员');
    }

    // 邮箱验证检查
    const requireEmailVerification =
      process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
    if (requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException(
        '邮箱未验证，请先验证邮箱后再登录。如未收到验证邮件，请使用"重新发送验证邮件"功能',
      );
    }

    this.logger.log(`✅ User logged in: ${maskUsername(user.username)}`);

    // 生成 Token（委托给 TokenService），传递context用于fingerprint
    const tokenContext = { userAgent, ipAddress };
    const tokens = await this.tokenService.generateTokens(user, tokenContext);

    // 创建会话记录（委托给 SessionService）
    if (ipAddress && userAgent) {
      const expiresIn = this.sessionService.parseExpiration(
        process.env.JWT_REFRESH_EXPIRATION || '30d',
      );
      await this.sessionService.createSession(
        user.id,
        ipAddress,
        userAgent,
        user.tokenVersion,
        expiresIn,
      );
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 验证用户
   */
  async validateUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 用户登出 - 撤销所有Token
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    // 撤销所有会话（委托给 SessionService）
    await this.sessionService.revokeAllSessions(userId);

    this.logger.log(`✅ User logged out: ${userId}, all tokens revoked`);

    return { message: '登出成功，所有设备的登录状态已失效' };
  }

  // ==================== 委托方法 ====================
  // 以下方法委托给专门化的服务，保持向后兼容

  /**
   * 刷新Token（委托给 TokenService）
   * @param refreshToken Refresh Token
   * @param ipAddress 请求IP地址（用于fingerprint验证）
   * @param userAgent 请求User-Agent（用于fingerprint验证）
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const tokenContext =
      ipAddress && userAgent ? { ipAddress, userAgent } : undefined;
    return this.tokenService.refreshTokens(refreshToken, tokenContext);
  }

  /**
   * 获取用户会话（委托给 SessionService）
   */
  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  /**
   * 撤销特定会话（委托给 SessionService）
   */
  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  /**
   * 忘记密码（委托给 PasswordService）
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.passwordService.forgotPassword(dto.email);
  }

  /**
   * 重置密码（委托给 PasswordService）
   */
  async resetPassword(
    token: string,
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordService.resetPassword(token, dto.newPassword);
  }

  /**
   * 验证重置Token（委托给 PasswordService）
   */
  async verifyResetToken(token: string): Promise<TokenValidationResult> {
    return this.passwordService.verifyResetToken(token);
  }

  /**
   * 验证邮箱（委托给 EmailVerificationService）
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.emailVerificationService.verifyEmail(token);
  }

  /**
   * 重新发送验证邮件（委托给 EmailVerificationService）
   */
  async resendVerificationEmail(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.emailVerificationService.resendVerificationEmail(dto.email);
  }

  /**
   * 验证邮箱Token（委托给 EmailVerificationService）
   */
  async verifyEmailVerificationToken(
    token: string,
  ): Promise<VerificationResult> {
    return this.emailVerificationService.verifyEmailToken(token);
  }

  // ==================== 测试辅助方法 ====================

  /**
   * 🧪 测试专用 - 获取重置Token（委托给 PasswordService）
   */
  async getResetTokenForTest(email: string) {
    return this.passwordService.getResetTokenForTest(email);
  }

  /**
   * 🧪 测试专用 - 获取邮箱Token（委托给 EmailVerificationService）
   */
  async getEmailTokenForTest(email: string) {
    return this.emailVerificationService.getEmailTokenForTest(email);
  }
}
