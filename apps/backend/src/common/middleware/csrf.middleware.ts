import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection Middleware
 *
 * 🔒 SECURITY FIX: 实施 CSRF 保护
 * CWE-352: Cross-Site Request Forgery (CSRF)
 * OWASP A01:2021 – Broken Access Control
 *
 * 使用 Double Submit Cookie 模式:
 * 1. 服务器生成随机 CSRF token，通过 Cookie 发送给客户端
 * 2. 客户端必须在请求 header 中携带相同的 token
 * 3. 服务器验证 Cookie token 和 Header token 是否一致
 *
 * ECP-C1: 防御性编程 - 防止跨站请求伪造攻击
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  /**
   * 需要 CSRF 保护的 HTTP 方法
   */
  private readonly protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  /**
   * 免除 CSRF 检查的路径
   * - /api/auth/login: 登录时还没有 CSRF token
   * - /api/auth/register: 注册时还没有 CSRF token
   * - /api/auth/refresh: Token 刷新端点
   * - /repo/*: Git HTTP Protocol (使用 Basic Auth)
   */
  private readonly exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
    '/repo/', // Git HTTP endpoints
  ];

  /**
   * 检查路径是否免除 CSRF 检查
   */
  private isExemptPath(path: string): boolean {
    return this.exemptPaths.some((exemptPath) => path.startsWith(exemptPath));
  }

  /**
   * 生成 CSRF token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 验证 CSRF token
   */
  private validateToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
    if (!cookieToken || !headerToken) {
      return false;
    }

    // 使用常量时间比较，防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 生产环境才启用 CSRF 保护（开发环境免除以简化测试）
    const isProduction = process.env.NODE_ENV === 'production';
    const enableCsrf = process.env.ENABLE_CSRF !== 'false'; // 默认启用

    if (!isProduction || !enableCsrf) {
      return next();
    }

    // GET/HEAD/OPTIONS 请求不需要 CSRF 保护
    if (!this.protectedMethods.includes(req.method)) {
      // 为 GET 请求生成新的 CSRF token (如果还没有)
      if (!req.cookies?.['XSRF-TOKEN']) {
        const token = this.generateToken();
        res.cookie('XSRF-TOKEN', token, {
          httpOnly: false, // 必须允许 JavaScript 读取 (用于设置 header)
          secure: isProduction,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000, // 24小时
        });
      }
      return next();
    }

    // 检查是否为免除路径
    if (this.isExemptPath(req.path)) {
      return next();
    }

    // 验证 CSRF token
    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'] as string;

    if (!this.validateToken(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token validation failed');
    }

    next();
  }
}
