import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { TokenBlacklistService } from '../token-blacklist.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHash } from 'crypto';
import { validateJwtSecretOrThrow } from '../../common/utils/secret-validator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private tokenBlacklistService: TokenBlacklistService,
    private configService: ConfigService,
  ) {
    // 🔒 SECURITY: 使用增强的密钥验证（HS256要求256位/43字符）
    const jwtSecret =
      configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;

    validateJwtSecretOrThrow(jwtSecret, 'JWT_SECRET');

    const options: StrategyOptionsWithRequest = {
      // 🔒 SECURITY FIX: 从 Cookie 读取 JWT Token (优先)
      // 兼容 Authorization Header (用于 API 调用和 Swagger 测试)
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 优先级1: 从 Cookie 读取 (HttpOnly, XSS 防护)
        (request: Request) => {
          return request?.cookies?.accessToken || null;
        },
        // 优先级2: 从 Authorization Header 读取 (向后兼容)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!,
      // 传递请求对象，用于获取IP和User-Agent验证fingerprint
      passReqToCallback: true,
    };
    super(options);
  }

  /**
   * 生成Token指纹（与TokenService中的逻辑一致）
   */
  private generateFingerprint(request: Request): string {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';

    // 提取User-Agent的关键部分
    const uaMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    const browserSignature = uaMatch
      ? `${uaMatch[1]}/${uaMatch[2]}`
      : userAgent.substring(0, 20);

    // 提取IP地址的网段
    const ipSignature = ipAddress.includes(':')
      ? ipAddress.split(':').slice(0, 4).join(':')
      : ipAddress.split('.').slice(0, 3).join('.');

    const fingerprintData = `${browserSignature}:${ipSignature}`;
    return createHash('sha256').update(fingerprintData).digest('hex');
  }

  async validate(request: Request, payload: JwtPayload) {
    try {
      // 🔒 SECURITY: 1. 检查Token是否在黑名单中
      if (payload.jti) {
        const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token已被撤销，请重新登录');
        }
      }

      // 🔒 SECURITY: 2. 验证Token指纹（防止Token盗用）
      if (payload.fingerprint) {
        const currentFingerprint = this.generateFingerprint(request);
        if (payload.fingerprint !== currentFingerprint) {
          throw new UnauthorizedException(
            'Token指纹验证失败，请重新登录（可能是跨设备使用或网络环境变化）',
          );
        }
      }

      // 3. 验证用户
      const user = await this.authService.validateUser(payload.sub);

      // 🔒 SECURITY FIX: 4. 验证tokenVersion（防止使用已撤销的旧Token）
      // CWE-613: Insufficient Session Expiration
      if (user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException(
          'Token已失效，请重新登录（密码已重置或已登出）',
        );
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效的认证令牌');
    }
  }
}
