import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';

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

    // 优先级1: 环境变量指定的初始管理员邮箱（生产环境）
    if (initialAdminEmail && dto.email === initialAdminEmail) {
      role = UserRole.SUPER_ADMIN;
      this.logger.warn(
        `🔐 Creating INITIAL_ADMIN from INITIAL_ADMIN_EMAIL env: ${dto.email}`,
      );
    }
    // 优先级2: 首个用户自动提升为SUPER_ADMIN（开发/测试环境）
    else {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        role = UserRole.SUPER_ADMIN;
        const envMode = process.env.NODE_ENV || 'development';
        this.logger.warn(
          `🚨 FIRST USER AUTO-PROMOTED TO SUPER_ADMIN (${envMode} mode): ${dto.email}`,
        );
        if (envMode === 'production') {
          this.logger.error(
            '⚠️  WARNING: First user in production became SUPER_ADMIN. Consider setting INITIAL_ADMIN_EMAIL env variable for explicit control.',
          );
        }
      }
    }

    // 创建用户（使用事务保证原子性 - ECP-C1: 防御性编程）
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 创建用户
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash: hashedPassword,
          role,
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

      this.logger.log(
        `🏢 Personal organization created: ${personalOrg.slug}`,
      );

      return user;
    });

    // 生成 Token
    const { accessToken, refreshToken } = await this.generateTokens(result);

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
}
