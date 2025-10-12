import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto, LoginDto } from './dto'
import * as bcrypt from 'bcrypt'
import { User } from '@prisma/client'

export interface JwtPayload {
  sub: string
  username: string
  email: string
  role: string
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // 检查用户名是否已存在
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    })
    if (existingUsername) {
      throw new ConflictException('用户名已被使用')
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (existingEmail) {
      throw new ConflictException('邮箱已被注册')
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 12)

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash: hashedPassword,
      },
    })

    this.logger.log(`✅ New user registered: ${user.username}`)

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(user)

    // 移除密码字段
    const { passwordHash, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // 查找用户（通过用户名或邮箱）
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.usernameOrEmail },
          { email: dto.usernameOrEmail },
        ],
      },
    })

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    this.logger.log(`✅ User logged in: ${user.username}`)

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(user)

    // 移除密码字段
    const { passwordHash, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  async validateUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '30d') as any,
      }),
    ])

    return { accessToken, refreshToken }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new UnauthorizedException('用户不存在')
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }

      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
      })

      return { accessToken }
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}
