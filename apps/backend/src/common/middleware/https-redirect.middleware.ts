import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS Redirect Middleware
 *
 * Phase 3: HTTPS 强制重定向中间件
 *
 * ECP-C1: 防御性编程 - 确保生产环境所有连接使用 HTTPS
 * 防止中间人攻击（MITM）和数据窃听
 *
 * @see https://owasp.org/www-community/Transport_Layer_Security_Cheat_Sheet
 */
@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // ECP-C1: 防御性编程 - 仅在生产环境明确启用 HTTPS 重定向
    // 默认行为：开发环境不启用（避免 NODE_ENV 未设置时误触发）
    const isProduction = process.env.NODE_ENV === 'production';
    const forceHttps = process.env.FORCE_HTTPS === 'true';

    // 开发环境和测试环境默认不强制 HTTPS（除非明确指定 FORCE_HTTPS=true）
    if (!isProduction && !forceHttps) {
      return next();
    }

    // 检查是否已经是 HTTPS 连接
    const isHttps =
      req.secure || // req.secure = true when connection is over HTTPS
      req.protocol === 'https' || // Express protocol
      req.get('x-forwarded-proto') === 'https'; // Behind reverse proxy (Nginx, CloudFlare, etc.)

    // 如果已经是 HTTPS，继续处理请求
    if (isHttps) {
      return next();
    }

    // 如果是 HTTP 请求，重定向到 HTTPS
    // 构建 HTTPS URL
    const host = req.get('host') || 'localhost';
    const httpsUrl = `https://${host}${req.originalUrl}`;

    // 301 永久重定向（浏览器会缓存）
    // 或 307 临时重定向（保持 HTTP 方法，POST 仍为 POST）
    res.redirect(301, httpsUrl);
  }
}
