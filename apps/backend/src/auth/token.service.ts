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

/**
 * JWT Payload接口
 * 🔒 SECURITY: 最小化Payload，只包含必要字段
 */
export interface JwtPayload {
  sub: string; // User ID
  role: string; // User role
  tokenVersion: number; // 🔒 Token版本号（用于撤销旧Token）
  // 🔒 SECURITY FIX: 移除email和username（减小Payload，降低信息泄露风险）
  // email和username可通过validateUser从数据库获取
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 生成Token对（Access Token + Refresh Token）
   * 🔒 SECURITY: 使用最小化JWT Payload
   * @param user 用户实体
   * @returns Token对
   */
  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION || '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 刷新Token（带Token轮换）
   * 🔒 SECURITY FIX: Refresh Token Rotation - 每次刷新都生成新的Refresh Token
   * 🔒 验证tokenVersion防止使用已撤销的Token
   * @param refreshToken 当前的Refresh Token
   * @returns 新的Token对
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // 验证Refresh Token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

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

      // 生成新的Token对（Token轮换）
      const newPayload: JwtPayload = {
        sub: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };

      const [accessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRATION || '7d',
        }),
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
        }),
      ]);

      this.logger.debug(`🔄 Tokens refreshed for user: ${user.id}`);

      return { accessToken, refreshToken: newRefreshToken };
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
        secret: process.env.JWT_SECRET,
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
