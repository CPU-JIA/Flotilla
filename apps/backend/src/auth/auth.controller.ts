import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto, LoginDto } from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { User } from '@prisma/client';

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
}
