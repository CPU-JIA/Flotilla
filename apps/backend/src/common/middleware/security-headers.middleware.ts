import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Security Headers Middleware
 *
 * Phase 3: 安全 Headers 中间件 (替代 Helmet.js)
 *
 * ECP-C1: 防御性编程 - 设置多层安全 HTTP headers
 * 基于 OWASP 安全最佳实践和 Helmet.js 推荐配置
 *
 * @see https://owasp.org/www-project-secure-headers/
 * @see https://helmetjs.github.io/
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Phase 4 P4.1: 生成 CSP nonce（每次请求唯一）
    // nonce = 'number used once'，防止 XSS 攻击
    const cspNonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = cspNonce; // 供前端使用
    res.setHeader('X-CSP-Nonce', cspNonce); // 通过 header 传递给前端

    // 1. X-DNS-Prefetch-Control: 控制浏览器 DNS 预取
    // off = 禁用 DNS 预取，防止信息泄露
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // 2. X-Frame-Options: 防止点击劫持 (Clickjacking)
    // DENY = 禁止在任何 iframe 中嵌入
    res.setHeader('X-Frame-Options', 'DENY');

    // 3. X-Content-Type-Options: 防止 MIME 类型嗅探
    // nosniff = 浏览器必须遵守 Content-Type，不进行 MIME 嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 4. X-XSS-Protection: 启用浏览器内置 XSS 过滤器
    // 1; mode=block = 检测到 XSS 时阻止页面渲染
    // 注意: 现代浏览器依赖 CSP，但保留此 header 以兼容旧浏览器
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 5. Strict-Transport-Security (HSTS): 强制 HTTPS
    // 仅在 HTTPS 连接时设置 (HTTP 设置此 header 会被忽略)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      // max-age=31536000: HSTS 有效期 1 年
      // includeSubDomains: 包括所有子域名
      // preload: 允许被浏览器 HSTS 预加载列表收录
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // 6. Referrer-Policy: 控制 Referer header 发送策略
    // strict-origin-when-cross-origin:
    //   - 同源请求: 发送完整 URL
    //   - 跨域请求: 仅发送 origin (不包含路径和参数)
    //   - HTTPS->HTTP: 不发送 Referer (降级保护)
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 7. X-Permitted-Cross-Domain-Policies: 限制跨域访问
    // none = 禁止 Flash/PDF 等插件跨域访问
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // 8. X-Download-Options: 防止 IE 执行下载的文件
    // noopen = IE 不自动打开下载的文件
    res.setHeader('X-Download-Options', 'noopen');

    // 9. 移除 X-Powered-By: 隐藏服务器技术栈信息
    // 防止攻击者获取框架版本信息
    res.removeHeader('X-Powered-By');

    // 10. Permissions-Policy: 控制浏览器特性权限
    // 禁用不必要的浏览器 API 以减小攻击面
    const permissionsPolicy = [
      'camera=()', // 禁用摄像头
      'microphone=()', // 禁用麦克风
      'geolocation=()', // 禁用地理位置
      'payment=()', // 禁用支付 API
      'usb=()', // 禁用 USB API
      'magnetometer=()', // 禁用磁力计
      'accelerometer=()', // 禁用加速度计
      'gyroscope=()', // 禁用陀螺仪
    ].join(', ');
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // 11. X-Request-ID: 添加请求追踪 ID (可选，便于日志关联)
    if (!res.getHeader('X-Request-ID')) {
      res.setHeader(
        'X-Request-ID',
        `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      );
    }

    // 12. Content-Security-Policy (CSP): 防止 XSS、数据注入等攻击
    // Phase 4: API 和前端 CSP 策略分离
    const isApiRoute =
      req.path.startsWith('/api') || req.path.startsWith('/repo');

    let cspDirectives: string[];

    if (isApiRoute) {
      // API 路由：严格 CSP（API 只返回 JSON，不需要前端资源）
      cspDirectives = [
        "default-src 'none'", // 默认禁止所有
        "connect-src 'self'", // 仅允许同源 AJAX（前端调用 API）
        "frame-ancestors 'none'", // 禁止 iframe 嵌入
        "base-uri 'none'", // 禁止 <base> 标签
        "form-action 'none'", // 禁止表单提交（API 不应有表单）
      ];

      // 仅在 HTTPS 环境下添加 upgrade-insecure-requests
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        cspDirectives.push('upgrade-insecure-requests');
      }
    } else {
      // 前端路由：使用 nonce 机制的 CSP（Phase 4 P4.1）
      cspDirectives = [
        // default-src: 默认策略（其他未指定的资源类型继承此策略）
        "default-src 'self'",

        // script-src: JavaScript 来源
        // 'self': 允许同源脚本
        // nonce-{cspNonce}: 允许带有匹配 nonce 的内联脚本（替代 unsafe-inline）
        // 'strict-dynamic': 允许已信任脚本动态加载的脚本
        `script-src 'self' 'nonce-${cspNonce}' 'strict-dynamic'`,

        // style-src: CSS 来源
        // 'self': 允许同源样式
        // nonce-{cspNonce}: 允许带有匹配 nonce 的内联样式
        `style-src 'self' 'nonce-${cspNonce}'`,

        // img-src: 图片来源
        // 'self': 同源图片
        // data:: 允许 data URI（Base64 图片）
        // blob:: 允许 Blob URL（文件上传预览）
        // https:: 允许所有 HTTPS 图片（用户头像、外部图片）
        "img-src 'self' data: blob: https:",

        // font-src: 字体来源
        // 'self': 同源字体
        // data:: 允许 data URI 字体
        "font-src 'self' data:",

        // connect-src: AJAX、WebSocket、EventSource 来源
        // 'self': 同源 API 请求
        // ws://localhost:*: WebSocket 连接（开发环境）
        // wss://*: WebSocket 连接（生产环境）
        "connect-src 'self' ws://localhost:* wss://*",

        // media-src: 音频/视频来源
        "media-src 'self'",

        // object-src: <object>、<embed>、<applet> 来源
        // 'none': 禁止所有插件（Flash、Java Applet）
        "object-src 'none'",

        // frame-src: <iframe> 来源
        // 'self': 仅允许同源 iframe
        "frame-src 'self'",

        // base-uri: <base> 标签 URL 限制
        // 'self': 仅允许同源 base URL
        "base-uri 'self'",

        // form-action: 表单提交目标限制
        // 'self': 表单只能提交到同源
        "form-action 'self'",

        // frame-ancestors: 控制哪些页面可以嵌入当前页面
        // 'none': 禁止任何页面嵌入（与 X-Frame-Options: DENY 相同）
        "frame-ancestors 'none'",

        // upgrade-insecure-requests: 自动将 HTTP 请求升级为 HTTPS
        // 注意: 仅在 HTTPS 环境下有效
        'upgrade-insecure-requests',
      ];
    }

    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

    next();
  }
}
