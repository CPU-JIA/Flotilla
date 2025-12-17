import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
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

export interface JwtPayload {
  sub: string; // User ID
  role: string; // User role
  tokenVersion: number; // 🔒 Token版本号（用于撤销旧Token）
  // 🔒 SECURITY FIX: 移除email和username（减小Payload，降低信息泄露风险）
  // email和username可通过validateUser从数据库获取
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // 🔒 SECURITY FIX: 并行查询用户名和邮箱（防止时序攻击）
    // CWE-203: Observable Discrepancy (Timing Attack)
    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { username: dto.username } }),
      this.prisma.user.findUnique({ where: { email: dto.email } }),
    ]);

    // 使用统一错误消息（防止用户枚举）
    if (existingUsername || existingEmail) {
      throw new ConflictException('用户名或邮箱已被使用');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 环境变量预检查（用于优化性能）
    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const envMode = process.env.NODE_ENV || 'development';

    // 🔒 SECURITY FIX: 将角色确定逻辑移入事务内（防止TOCTOU竞态条件）
    // CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition
    // 创建用户（使用事务保证原子性 - ECP-C1: 防御性编程）
    const result = await this.prisma.$transaction(async (tx) => {
      // 🔐 Bootstrap Admin Logic: 在事务内确定用户角色
      let role: UserRole = UserRole.USER; // Default role

      // 优先级1: 环境变量指定的初始管理员邮箱
      if (initialAdminEmail && dto.email === initialAdminEmail) {
        role = UserRole.SUPER_ADMIN;
        this.logger.warn(
          `🔐 Creating INITIAL_ADMIN from INITIAL_ADMIN_EMAIL env: ${dto.email}`,
        );
      }
      // ⚠️ SECURITY FIX: In production, MUST set INITIAL_ADMIN_EMAIL
      else if (envMode === 'production' && !initialAdminEmail) {
        // 🔒 在事务内检查用户数量（原子操作，防止竞态条件）
        const userCount = await tx.user.count();
        if (userCount === 0) {
          // First user in production but no INITIAL_ADMIN_EMAIL set
          throw new BadRequestException(
            'INITIAL_ADMIN_EMAIL environment variable must be set in production environment. ' +
              'Cannot create first user without explicit admin designation.',
          );
        }
      }
      // 优先级2: 首个用户自动提升为SUPER_ADMIN（仅开发/测试环境）
      else if (envMode !== 'production') {
        // 🔒 在事务内检查用户数量（原子操作，防止竞态条件）
        const userCount = await tx.user.count();
        if (userCount === 0) {
          role = UserRole.SUPER_ADMIN;
          this.logger.warn(
            `🚨 FIRST USER AUTO-PROMOTED TO SUPER_ADMIN (${envMode} mode): ${dto.email}`,
          );
          this.logger.warn(
            '⚠️  This behavior is only allowed in development/test environments.',
          );
        }
      }
      // 生成邮箱验证token（24小时有效）
      const emailVerifyToken = randomBytes(32).toString('hex');
      const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

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
        `✅ New user registered: ${user.username} (role: ${user.role})`,
      );

      // 2. 自动创建个人组织（Personal Organization）
      // ECP-A1: SOLID原则 - 完整的用户注册流程
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

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(result);

    // 发送验证邮件（异步，不阻塞注册流程）
    this.emailService
      .sendVerificationEmail(
        result.email,
        result.username,
        result.emailVerifyToken!,
      )
      .then((emailResult) => {
        if (emailResult.success) {
          this.logger.log(`📧 Verification email sent to: ${result.email}`);
        } else {
          this.logger.error(
            `❌ Failed to send verification email to ${result.email}: ${emailResult.error}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `❌ Unexpected error sending verification email: ${error.message}`,
        );
      });

    // 移除密码字段
    const { passwordHash, ...userWithoutPassword } = result;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * 登录
   * 🔒 Phase 4: 添加会话记录（设备管理、异地登录检测）
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // 查找用户（通过用户名或邮箱）
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

    // 🔒 SECURITY FIX: 检查账户状态和邮箱验证（防止未验证/禁用账户登录）
    // CWE-287: Improper Authentication
    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用，请联系管理员');
    }

    // 邮箱验证检查（可通过环境变量REQUIRE_EMAIL_VERIFICATION=false关闭）
    const requireEmailVerification =
      process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
    if (requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException(
        '邮箱未验证，请先验证邮箱后再登录。如未收到验证邮件，请使用"重新发送验证邮件"功能',
      );
    }

    this.logger.log(`✅ User logged in: ${user.username}`);

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 🔒 Phase 4: 创建会话记录
    if (ipAddress && userAgent) {
      const parsedUA = this.parseUserAgent(userAgent);
      const expiresAt = new Date(
        Date.now() +
          this.parseExpiration(process.env.JWT_REFRESH_EXPIRATION || '30d'),
      );

      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          device: parsedUA.device,
          browser: parsedUA.browser,
          os: parsedUA.os,
          tokenVersion: user.tokenVersion,
          expiresAt,
        },
      });

      this.logger.log(
        `📱 Session created: ${user.username} from ${ipAddress} (${parsedUA.browser}/${parsedUA.os})`,
      );
    }

    // 移除密码字段
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async generateTokens(user: User) {
    // 🔒 SECURITY FIX: 最小化JWT Payload（只包含必要字段）
    // CWE-209: Generation of Error Message Containing Sensitive Information
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '30d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 🔒 SECURITY FIX: 验证tokenVersion（防止使用已撤销的Refresh Token）
      // CWE-613: Insufficient Session Expiration
      if (user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException(
          'Refresh Token已失效，请重新登录（密码已重置或已登出）',
        );
      }

      // 🔒 SECURITY FIX: 检查账户状态（防止禁用账户刷新Token）
      if (!user.isActive) {
        throw new UnauthorizedException('账户已被禁用');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };

      // 🔒 SECURITY FIX: Refresh Token Rotation (刷新令牌轮换)
      // 生成新的 accessToken 和 refreshToken
      const [accessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_SECRET,
          expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
        }),
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '30d') as any,
        }),
      ]);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      // Re-throw UnauthorizedException from user validation
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Otherwise it's a token verification error
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 登出 - 撤销所有Token
   * 🔒 SECURITY FIX: 通过递增tokenVersion使所有现有Token失效
   * CWE-613: Insufficient Session Expiration
   */
  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 }, // 递增版本号，撤销所有Token
      },
    });

    // 🔒 Phase 4: 将所有会话标记为失效
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    this.logger.log(`✅ User logged out: ${userId}, all tokens revoked`);

    return { message: '登出成功，所有设备的登录状态已失效' };
  }

  /**
   * 🔒 Phase 4: 获取用户所有活跃会话
   */
  async getUserSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        device: true,
        browser: true,
        os: true,
        location: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }

  /**
   * 🔒 Phase 4: 撤销特定会话（单个设备登出）
   */
  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在或无权限操作');
    }

    if (!session.isActive) {
      throw new BadRequestException('会话已失效');
    }

    // 标记会话为失效
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    this.logger.log(
      `✅ Session revoked: ${sessionId} for user ${userId}`,
    );

    return { message: '设备已登出成功' };
  }

  /**
   * 🔒 Phase 4: 解析User-Agent字符串（提取设备、浏览器、OS信息）
   * 简化版实现，生产环境建议使用ua-parser-js库
   */
  private parseUserAgent(userAgent: string): {
    device: string | null;
    browser: string | null;
    os: string | null;
  } {
    if (!userAgent) {
      return { device: null, browser: null, os: null };
    }

    // 设备检测
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      device = 'Tablet';
    }

    // 浏览器检测
    let browser = 'Unknown';
    if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge/')) {
      browser = 'Edge';
    }

    // 操作系统检测
    let os = 'Unknown';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
      os = 'iOS';
    }

    return { device, browser, os };
  }

  /**
   * 🔒 Phase 4: 解析过期时间字符串（如"7d"、"15m"）为毫秒数
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // 默认30天

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 验证邮箱
   * ECP-C1: 防御性编程 - 验证token有效性和过期时间
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

    // 发送欢迎邮件
    this.emailService
      .sendWelcomeEmail(user.email, user.username)
      .catch((error) => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });

    return { message: '邮箱验证成功！' };
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证，无需重复验证');
    }

    // 生成新的验证token
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
   * 忘记密码 - 发送密码重置邮件
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 为了安全，即使用户不存在也返回成功消息（防止邮箱枚举攻击）
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${dto.email}`,
      );
      return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
    }

    // 生成密码重置token（1小时有效）
    const passwordResetToken = randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

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
      this.logger.error(`Failed to send password reset email to ${user.email}`);
      throw new BadRequestException('发送密码重置邮件失败，请稍后重试');
    }

    this.logger.log(`📧 Password reset email sent to: ${user.email}`);

    return { message: '如果该邮箱已注册，您将收到密码重置邮件' };
  }

  /**
   * 重置密码
   * 🔒 SECURITY FIX: 添加密码历史检查（防止重用最近3次密码）
   * CWE-521: Weak Password Requirements
   */
  async resetPassword(
    token: string,
    dto: ResetPasswordDto,
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
    const recentPasswords = await this.prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3, // 最近3次密码
    });

    // 验证新密码是否与历史密码匹配
    for (const history of recentPasswords) {
      const isSamePassword = await bcrypt.compare(
        dto.newPassword,
        history.passwordHash,
      );
      if (isSamePassword) {
        throw new BadRequestException(
          '新密码不能与最近使用的3次密码相同，请选择不同的密码',
        );
      }
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // 🔒 SECURITY FIX: 更新密码、递增tokenVersion、保存密码历史
    // 使用事务确保原子性
    await this.prisma.$transaction(async (tx) => {
      // 1. 保存当前密码到历史记录（在更新前）
      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.passwordHash, // 保存旧密码hash
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

      // 3. 清理旧历史记录（只保留最近5次）
      const allHistories = await tx.passwordHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (allHistories.length > 5) {
        const idsToDelete = allHistories.slice(5).map((h) => h.id);
        await tx.passwordHistory.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    });

    this.logger.log(
      `✅ Password reset successful for user: ${user.username}, tokenVersion incremented`,
    );

    return { message: '密码重置成功，请使用新密码登录' };
  }

  /**
   * 验证密码重置token有效性（不执行重置操作）
   * ECP-A1: 单一职责 - 仅验证token，不修改数据
   * ECP-C1: 防御性编程 - 完整的错误处理和状态返回
   */
  async verifyResetToken(token: string): Promise<{
    valid: boolean;
    message: string;
    expiresAt?: Date;
  }> {
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
      this.logger.warn(
        `Invalid reset token attempted: ${token.substring(0, 10)}...`,
      );
      return {
        valid: false,
        message: '重置链接不存在或已被使用',
      };
    }

    // 检查token是否过期
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      this.logger.warn(
        `Expired reset token attempted: ${token.substring(0, 10)}...`,
      );
      return {
        valid: false,
        message: '重置链接已过期（有效期1小时）',
        expiresAt: user.passwordResetExpires,
      };
    }

    this.logger.log(
      `✅ Valid reset token verified: ${token.substring(0, 10)}...`,
    );
    return {
      valid: true,
      message: '重置链接有效',
      expiresAt: user.passwordResetExpires || undefined,
    };
  }

  /**
   * 验证邮箱验证token有效性（不执行验证操作）
   * ECP-A1: 单一职责 - 仅验证token，不修改数据
   * ECP-C1: 防御性编程 - 完整的错误处理和状态返回
   */
  async verifyEmailVerificationToken(token: string): Promise<{
    valid: boolean;
    message: string;
    expiresAt?: Date;
  }> {
    if (!token || token.length < 10) {
      return {
        valid: false,
        message: '无效的验证��接格式',
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
   * 🧪 测试专用API - 获取密码重置token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅供测试环境使用，生产环境禁止调用
   */
  async getResetTokenForTest(email: string): Promise<{
    token: string | null;
    expiresAt: Date | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        passwordResetToken: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`用户不存在: ${email}`);
    }

    this.logger.log(`🧪 [TEST] Retrieved reset token for: ${email}`);
    return {
      token: user.passwordResetToken,
      expiresAt: user.passwordResetExpires,
    };
  }

  /**
   * 🧪 测试专用API - 获取邮箱验证token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅供测试环境使用，生产环境禁止调用
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
