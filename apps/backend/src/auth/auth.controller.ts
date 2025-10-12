import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common'
import { AuthService, AuthResponse } from './auth.service'
import { RegisterDto, LoginDto } from './dto'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import type { User } from '@prisma/client'

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    this.logger.log(`📝 Registration attempt for username: ${dto.username}`)
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`🔐 Login attempt for: ${dto.usernameOrEmail}`)
    return this.authService.login(dto)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    this.logger.log('🔄 Token refresh attempt')
    return this.authService.refreshTokens(refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    this.logger.log(`👤 Fetching current user info: ${user.username}`)
    return user
  }
}
