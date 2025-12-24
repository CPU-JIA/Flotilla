import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * Webhook签名验证Guard
 * ECP-C1: 防御性编程 - HMAC-SHA256签名验证防止伪造请求
 * ECP-C2: 系统化错误处理 - 明确的验证失败响应
 *
 * 验证流程：
 * 1. 从请求头读取签名 (X-Webhook-Signature)
 * 2. 使用密钥对请求体进行HMAC-SHA256哈希
 * 3. 对比签名是否匹配
 *
 * 使用方式：
 * @UseGuards(WebhookSignatureGuard)
 * async updatePipelineStatus(...) { ... }
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. 获取签名头
    const signature = request.headers['x-webhook-signature'] as string;

    if (!signature) {
      this.logger.warn('Missing X-Webhook-Signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // 2. 验证签名格式 (应为 "sha256=<hex>")
    if (!signature.startsWith('sha256=')) {
      this.logger.warn(`Invalid signature format: ${signature}`);
      throw new UnauthorizedException('Invalid signature format');
    }

    // 3. 获取密钥（从环境变量）
    const secret = this.configService.get<string>('WEBHOOK_SECRET');

    if (!secret) {
      this.logger.error('WEBHOOK_SECRET not configured in environment');
      throw new Error('Webhook secret not configured');
    }

    // 4. 计算预期签名
    const payload = JSON.stringify(request.body);
    const expectedSignature = this.generateSignature(secret, payload);

    // 5. 常量时间比对（防止时序攻击）
    const isValid = this.secureCompare(signature, expectedSignature);

    if (!isValid) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug('Webhook signature verified successfully');
    return true;
  }

  /**
   * 生成 HMAC-SHA256 签名
   * @param secret - 密钥
   * @param payload - 负载字符串
   * @returns 格式化的签名 "sha256=<hex>"
   */
  private generateSignature(secret: string, payload: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * 常量时间字符串比对
   * ECP-C1: 防御性编程 - 防止时序攻击
   * @param a - 字符串A
   * @param b - 字符串B
   * @returns 是否相等
   */
  private secureCompare(a: string, b: string): boolean {
    // 使用Node.js内置的timingSafeEqual
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    try {
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
