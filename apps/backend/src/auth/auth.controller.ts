import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Logger,
  Param,
  Query,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, AuthResponse } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import {
  RegisterDto,
  LoginDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDoc,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('认证系统')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {}

  /**
   * 🔒 SECURITY FIX: 设置 HttpOnly Cookie (防止 XSS 攻击)
   * CWE-79: Cross-site Scripting (XSS)
   * CWE-922: Insecure Storage of Sensitive Information
   *
   * @param response Express Response对象
   * @param accessToken JWT访问令牌 (15分钟有效期)
   * @param refreshToken JWT刷新令牌 (7天有效期)
   */
  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // 设置 accessToken Cookie (15分钟)
    response.cookie('accessToken', accessToken, {
      httpOnly: true, // 防止 JavaScript 访问 (XSS 防护)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF 防护
      maxAge: 15 * 60 * 1000, // 15分钟
      path: '/', // 所有路径可用
    });

    // 设置 refreshToken Cookie (7天)
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/api/v1/auth/refresh', // 仅刷新端点可用
    });

    this.logger.debug('🍪 Auth cookies set successfully');
  }

  /**
   * 🔒 SECURITY FIX: 清除认证 Cookie
   */
  private clearAuthCookies(response: Response): void {
    response.clearCookie('accessToken', { path: '/' });
    response.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    this.logger.debug('🍪 Auth cookies cleared');
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 🔒 SECURITY FIX C2: 5次/分钟（防止垃圾注册攻击）
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponseDoc({ status: 201, description: '注册成功' })
  @ApiResponseDoc({ status: 409, description: '用户名或邮箱已存在' })
  @ApiResponseDoc({
    status: 429,
    description: 'Rate limit exceeded: 超过频率限制（5次/分钟）',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponse, 'accessToken' | 'refreshToken'>> {
    this.logger.log(`📝 Registration attempt for username: ${dto.username}`);

    // Extract IP and User-Agent for token fingerprinting
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    const result = await this.authService.register(dto, ipAddress, userAgent);

    // 🔒 SECURITY FIX: 使用 HttpOnly Cookie 存储 Token (防止 XSS 攻击)
    // CWE-79: Cross-site Scripting (XSS)
    // CWE-922: Insecure Storage of Sensitive Information
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    // 不在响应体中返回 Token
    return {
      user: result.user,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 🔒 SECURITY FIX C2: 5次/分钟（防止暴力破解）
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponseDoc({ status: 200, description: '登录成功' })
  @ApiResponseDoc({ status: 401, description: '用户名或密码错误' })
  @ApiResponseDoc({
    status: 429,
    description: 'Rate limit exceeded: 超过频率限制（5次/分钟）',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponse, 'accessToken' | 'refreshToken'>> {
    this.logger.log(`🔐 Login attempt for: ${dto.usernameOrEmail}`);

    // 🔒 Phase 4: 提取IP和User-Agent
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    const result = await this.authService.login(dto, ipAddress, userAgent);

    // 🔒 SECURITY FIX: 使用 HttpOnly Cookie 存储 Token
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    // 不在响应体中返回 Token
    return {
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponseDoc({ status: 200, description: '令牌刷新成功' })
  @ApiResponseDoc({ status: 401, description: '刷新令牌无效或已过期' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    this.logger.log('🔄 Token refresh attempt');

    // 🔒 SECURITY FIX: 从 Cookie 读取 refreshToken
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('刷新令牌缺失');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // 设置新的 Cookie
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return { message: '令牌刷新成功' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiResponseDoc({
    status: 200,
    description: '登出成功，所有设备的Token已失效',
  })
  @ApiBearerAuth()
  async logout(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log(`🚪 Logout request from: ${user.username}`);

    // 清除 Cookie
    this.clearAuthCookies(response);

    return this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取所有活跃会话（设备列表）' })
  @ApiResponseDoc({
    status: 200,
    description: '返回用户所有活跃登录设备',
  })
  @ApiBearerAuth()
  async getSessions(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    this.logger.log(`📱 Get sessions request from: ${user.username}`);
    return this.authService.getUserSessions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤销特定会话（单个设备登出）' })
  @ApiResponseDoc({
    status: 200,
    description: '设备已登出成功',
  })
  @ApiResponseDoc({
    status: 404,
    description: '会话不存在或无权限操作',
  })
  @ApiBearerAuth()
  async revokeSession(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Param('sessionId') sessionId: string,
  ) {
    this.logger.log(
      `🚫 Revoke session request: ${sessionId} from ${user.username}`,
    );
    return this.authService.revokeSession(user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    this.logger.log(`👤 Fetching current user info: ${user.username}`);

    // ECP-C1: 防御性编程 - 使用Redis缓存提高性能
    // Write-Through缓存策略：配合users.service.ts的缓存更新机制
    const cacheKey = `user:${user.id}`;
    const cachedUser =
      await this.redisService.get<Omit<User, 'passwordHash'>>(cacheKey);

    if (cachedUser) {
      this.logger.debug(
        `✅ Cache hit for user ${user.id} with avatar: ${cachedUser.avatar?.substring(0, 50) || 'none'}`,
      );
      return cachedUser;
    }

    // 缓存未命中，从数据库查询最新用户信息
    this.logger.debug(`❌ Cache miss for user ${user.id}, fetching from DB`);
    const freshUser = await this.usersService.findOne(user.id);

    // 缓存用户信息（TTL: 60秒）
    // ECP-C3: 性能意识 - 60秒TTL平衡性能和数据新鲜度
    await this.redisService.set(cacheKey, freshUser, 60);

    this.logger.debug(
      `📝 Cached user ${user.id} with avatar: ${freshUser.avatar?.substring(0, 50) || 'none'}`,
    );

    return freshUser;
  }

  /**
   * 邮箱验证
   */
  @Public()
  @Post('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱' })
  @ApiResponseDoc({ status: 200, description: '邮箱验证成功' })
  @ApiResponseDoc({ status: 400, description: '验证链接无效或已过期' })
  async verifyEmail(@Param('token') token: string) {
    this.logger.log(
      `📧 Email verification attempt with token: ${token.substring(0, 10)}...`,
    );
    return this.authService.verifyEmail(token);
  }

  /**
   * 重新发送验证邮件
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 requests/hour
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新发送验证邮件' })
  @ApiResponseDoc({ status: 200, description: '验证邮件已发送' })
  @ApiResponseDoc({ status: 400, description: '邮箱已验证或用户不存在' })
  @ApiResponseDoc({
    status: 429,
    description: 'Rate limit exceeded: 超过频率限制（5次/小时）',
  })
  async resendVerificationEmail(@Body() dto: ResendVerificationDto) {
    this.logger.log(`📧 Resend verification email to: ${dto.email}`);
    return this.authService.resendVerificationEmail(dto);
  }

  /**
   * 忘记密码 - 发送密码重置邮件
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 requests/hour
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码' })
  @ApiResponseDoc({
    status: 200,
    description: '如果邮箱存在，将收到密码重置邮件',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`🔑 Password reset requested for: ${dto.email}`);
    return this.authService.forgotPassword(dto);
  }

  /**
   * 重置密码
   */
  @Public()
  @Post('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码' })
  @ApiResponseDoc({ status: 200, description: '密码重置成功' })
  @ApiResponseDoc({ status: 400, description: '重置链接无效或已过期' })
  async resetPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    this.logger.log(
      `🔑 Password reset attempt with token: ${token.substring(0, 10)}...`,
    );
    return this.authService.resetPassword(token, dto);
  }

  /**
   * 验证密码重置token有效性（仅查询，不执行重置）
   */
  @Public()
  @Get('verify-reset-token/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证密码重置token有效性' })
  @ApiResponseDoc({
    status: 200,
    description: '返回token验证结果',
    schema: {
      example: {
        valid: true,
        message: '重置链接有效',
        expiresAt: '2025-10-31T12:00:00.000Z',
      },
    },
  })
  async verifyResetToken(@Param('token') token: string) {
    this.logger.log(`🔍 Verifying reset token: ${token.substring(0, 10)}...`);
    return this.authService.verifyResetToken(token);
  }

  /**
   * 验证邮箱验证token有效性（仅查询，不执行验证）
   */
  @Public()
  @Get('verify-email-token/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱验证token有效性' })
  @ApiResponseDoc({
    status: 200,
    description: '返回token验证结果',
    schema: {
      example: {
        valid: true,
        message: '验证链接有效',
        expiresAt: '2025-11-01T12:00:00.000Z',
      },
    },
  })
  async verifyEmailToken(@Param('token') token: string) {
    this.logger.log(`🔍 Verifying email token: ${token.substring(0, 10)}...`);
    return this.authService.verifyEmailVerificationToken(token);
  }

  /**
   * 🧪 测试专用API - 获取密码重置token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅测试环境可用，生产环境自动禁止
   */
  @Public()
  @Get('test/get-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🧪 [TEST ONLY] 获取密码重置token',
    description: '仅测试环境可用，用于E2E测试获取token。生产环境自动禁止访问。',
  })
  @ApiResponseDoc({
    status: 200,
    description: '返回用户的密码重置token',
    schema: {
      example: {
        token: 'abc123def456...',
        expiresAt: '2025-10-31T12:00:00.000Z',
      },
    },
  })
  async getResetTokenForTest(@Query('email') email: string) {
    // ECP-C1: 防御性编程 - 生产环境禁止调用
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        '🚫 Test endpoints are disabled in production',
      );
    }

    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }

    this.logger.log(`🧪 [TEST] Get reset token request for: ${email}`);
    return this.authService.getResetTokenForTest(email);
  }

  /**
   * 🧪 测试专用API - 获取邮箱验证token
   * ECP-D1: Design for Testability - E2E测试支持
   * 仅测试环境可用，生产环境自动禁止
   */
  @Public()
  @Get('test/get-email-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🧪 [TEST ONLY] 获取邮箱验证token',
    description: '仅测试环境可用，用于E2E测试获取token。生产环境自动禁止访问。',
  })
  @ApiResponseDoc({
    status: 200,
    description: '返回用户的邮箱验证token',
    schema: {
      example: {
        token: 'xyz789abc123...',
        expiresAt: '2025-11-01T12:00:00.000Z',
      },
    },
  })
  async getEmailTokenForTest(@Query('email') email: string) {
    // ECP-C1: 防御性编程 - 生产环境禁止调用
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        '🚫 Test endpoints are disabled in production',
      );
    }

    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }

    this.logger.log(`🧪 [TEST] Get email token request for: ${email}`);
    return this.authService.getEmailTokenForTest(email);
  }
}
