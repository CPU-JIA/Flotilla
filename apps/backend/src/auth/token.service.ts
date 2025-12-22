/**
 * Token Service - JWT令牌管理
 * ECP-A1: SOLID - 单一职责原则，专注于令牌生成与验证
 * ECP-A2: 高内聚 - 所有令牌相关操作集中管理
 *
 * 从AuthService分离出来的职责：
 * - JWT令牌生成（Access Token + Refresh Token）
 * - Refresh Token验证与轮换
 * - Token Payload管理
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { validateJwtSecretOrThrow } from '../common/utils/secret-validator';

/**
 * 将过期时间字符串转换为秒数
 * @param duration 时间字符串如 '7d', '30d', '1h'
 * @returns 秒数
 */
function parseExpiresIn(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60; // 默认7天

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

/**
 * JWT Payload接口
 * 🔒 SECURITY: 最小化Payload，只包含必要字段
 * 🔒 SECURITY ENHANCEMENT: 添加jti和fingerprint防止Token盗用
 */
export interface JwtPayload {
  sub: string; // User ID
  role: string; // User role
  tokenVersion: number; // 🔒 Token版本号（用于撤销旧Token）
  jti: string; // 🔒 JWT ID（Token唯一标识符，用于黑名单）
  fingerprint: string; // 🔒 Token指纹（基于User-Agent和IP的哈希，防止Token盗用）
  // 🔒 SECURITY FIX: 移除email和username（减小Payload，降低信息泄露风险）
  // email和username可通过validateUser从数据库获取
  // iat, exp由JWT库自动添加
}

/**
 * Token生成上下文（用于生成fingerprint）
 */
export interface TokenContext {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token对接口
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    // 🔒 SECURITY: 使用增强的密钥验证（HS256要求256位/43字符）
    this.jwtSecret = this.validateSecret(process.env.JWT_SECRET, 'JWT_SECRET');
    this.jwtRefreshSecret = this.validateSecret(
      process.env.JWT_REFRESH_SECRET,
      'JWT_REFRESH_SECRET',
    );
  }

  /**
   * 验证密钥配置（使用增强的验证逻辑）
   * 🔒 SECURITY: CWE-326 - HS256要求256位密钥（43字符base64编码）
   * @param secret 密钥值
   * @param name 密钥名称
   */
  private validateSecret(secret: string | undefined, name: string): string {
    validateJwtSecretOrThrow(secret, name);
    return secret!;
  }

  /**
   * 生成Token指纹
   * 🔒 SECURITY: 基于User-Agent和IP地址的哈希，防止Token盗用
   *
   * 注意：指纹不应过于严格，否则会影响用户体验：
   * - User-Agent可能因浏览器更新而变化
   * - IP地址可能因网络切换而变化
   *
   * 策略：使用User-Agent的前缀（浏览器主要信息）+ IP的前缀（同一网段）
   *
   * @param context Token上下文
   * @returns 指纹哈希
   */
  private generateFingerprint(context?: TokenContext): string {
    const userAgent = context?.userAgent || 'unknown';
    const ipAddress = context?.ipAddress || 'unknown';

    // 提取User-Agent的关键部分（浏览器名称和主版本号）
    // 例如: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" -> "Chrome/120"
    const uaMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    const browserSignature = uaMatch ? `${uaMatch[1]}/${uaMatch[2]}` : userAgent.substring(0, 20);

    // 提取IP地址的网段（IPv4前3段，IPv6前4段）
    const ipSignature = ipAddress.includes(':')
      ? ipAddress.split(':').slice(0, 4).join(':') // IPv6
      : ipAddress.split('.').slice(0, 3).join('.'); // IPv4

    // 生成指纹哈希
    const fingerprintData = `${browserSignature}:${ipSignature}`;
    return createHash('sha256').update(fingerprintData).digest('hex');
  }

  /**
   * 生成Token对（Access Token + Refresh Token）
   * 🔒 SECURITY: 使用最小化JWT Payload + jti + fingerprint
   * @param user 用户实体
   * @param context Token上下文（User-Agent, IP）
   * @returns Token对
   */
  async generateTokens(user: User, context?: TokenContext): Promise<TokenPair> {
    // 生成唯一的JWT ID
    const accessJti = randomBytes(16).toString('hex');
    const refreshJti = randomBytes(16).toString('hex');

    // 生成指纹
    const fingerprint = this.generateFingerprint(context);

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      jti: accessJti,
      fingerprint,
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      jti: refreshJti,
      fingerprint,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtSecret,
        expiresIn: parseExpiresIn(process.env.JWT_EXPIRATION || '7d'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtRefreshSecret,
        expiresIn: parseExpiresIn(process.env.JWT_REFRESH_EXPIRATION || '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 刷新Token（带Token轮换）
   * 🔒 SECURITY FIX: Refresh Token Rotation - 每次刷新都生成新的Refresh Token
   * 🔒 验证tokenVersion防止使用已撤销的Token
   * 🔒 验证fingerprint防止Token盗用
   * @param refreshToken 当前的Refresh Token
   * @param context Token上下文（用于验证fingerprint）
   * @returns 新的Token对
   */
  async refreshTokens(refreshToken: string, context?: TokenContext): Promise<TokenPair> {
    try {
      // 验证Refresh Token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      // 🔒 SECURITY: 验证fingerprint（如果payload中有fingerprint）
      if (payload.fingerprint && context) {
        const currentFingerprint = this.generateFingerprint(context);
        if (payload.fingerprint !== currentFingerprint) {
          this.logger.warn(
            `Token fingerprint mismatch for user ${payload.sub}. Possible token theft.`,
          );
          throw new UnauthorizedException(
            'Token指纹验证失败，请重新登录（可能是跨设备使用或网络环境变化）',
          );
        }
      }

      // 查找用户
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

      // 生成新的Token对（Token轮换），保持同样的context
      const newTokens = await this.generateTokens(user, context);

      this.logger.debug(`🔄 Tokens refreshed for user: ${user.id}`);

      return newTokens;
    } catch (error) {
      // Re-throw UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Token验证失败
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 验证Access Token并返回Payload
   * @param token Access Token
   * @returns JWT Payload
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * 解码Token（不验证签名）
   * 用于调试或获取过期Token的信息
   * @param token JWT Token
   * @returns 解码后的Payload或null
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch {
      return null;
    }
  }
}
