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
  sub: string;
  username: string;
  email: string;
  role: string;
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
    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 🔐 Bootstrap Admin Logic: 确定用户角色
    let role: UserRole = UserRole.USER; // Default role
    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const envMode = process.env.NODE_ENV || 'development';

    // 优先级1: 环境变量指定的初始管理员邮箱
    if (initialAdminEmail && dto.email === initialAdminEmail) {
      role = UserRole.SUPER_ADMIN;
      this.logger.warn(
        `🔐 Creating INITIAL_ADMIN from INITIAL_ADMIN_EMAIL env: ${dto.email}`,
      );
    }
    // ⚠️ SECURITY FIX: In production, MUST set INITIAL_ADMIN_EMAIL
    else if (envMode === 'production' && !initialAdminEmail) {
      const userCount = await this.prisma.user.count();
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
      const userCount = await this.prisma.user.count();
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

    // 创建用户（使用事务保证原子性 - ECP-C1: 防御性编程）
    const result = await this.prisma.$transaction(async (tx) => {
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

  async login(dto: LoginDto): Promise<AuthResponse> {
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

    this.logger.log(`✅ User logged in: ${user.username}`);

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(user);

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
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
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

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
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

      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
      });

      return { accessToken };
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

    // 加密新密码
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // 更新密码并清除重置token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    this.logger.log(`✅ Password reset successful for user: ${user.username}`);

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
