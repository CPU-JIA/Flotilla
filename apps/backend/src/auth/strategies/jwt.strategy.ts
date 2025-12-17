import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
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
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'default-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.validateUser(payload.sub);

      // 🔒 SECURITY FIX: 验证tokenVersion（防止使用已撤销的旧Token）
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
