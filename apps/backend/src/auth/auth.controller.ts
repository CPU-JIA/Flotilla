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
} from '@nestjs/common';
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDoc,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('认证系统')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    this.logger.log(`📝 Registration attempt for username: ${dto.username}`);
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`🔐 Login attempt for: ${dto.usernameOrEmail}`);
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    this.logger.log('🔄 Token refresh attempt');
    return this.authService.refreshTokens(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    this.logger.log(`👤 Fetching current user info: ${user.username}`);

    // ECP-C1: 防御性编程 - 从Redis缓存中尝试获取用户信息
    const cacheKey = `user:${user.id}`;
    const cachedUser = await this.redisService.get<Omit<User, 'passwordHash'>>(cacheKey);

    if (cachedUser) {
      this.logger.debug(`✅ Cache hit for user ${user.id}`);
      return cachedUser;
    }

    // 缓存未命中，从数据库查询最新用户信息
    this.logger.debug(`❌ Cache miss for user ${user.id}, fetching from DB`);
    const freshUser = await this.usersService.findOne(user.id);

    // 缓存用户信息（TTL: 10秒）
    // ECP-C3: 性能意识 - 短期缓存平衡性能和数据新鲜度
    await this.redisService.set(cacheKey, freshUser, 10);

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
    this.logger.log(`📧 Email verification attempt with token: ${token.substring(0, 10)}...`);
    return this.authService.verifyEmail(token);
  }

  /**
   * 重新发送验证邮件
   */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新发送验证邮件' })
  @ApiResponseDoc({ status: 200, description: '验证邮件已发送' })
  @ApiResponseDoc({ status: 400, description: '邮箱已验证或用户不存在' })
  async resendVerificationEmail(@Body() dto: ResendVerificationDto) {
    this.logger.log(`📧 Resend verification email to: ${dto.email}`);
    return this.authService.resendVerificationEmail(dto);
  }

  /**
   * 忘记密码 - 发送密码重置邮件
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码' })
  @ApiResponseDoc({ status: 200, description: '如果邮箱存在，将收到密码重置邮件' })
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
    this.logger.log(`🔑 Password reset attempt with token: ${token.substring(0, 10)}...`);
    return this.authService.resetPassword(token, dto);
  }
}
