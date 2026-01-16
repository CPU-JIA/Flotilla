import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { Webhook, WebhookDelivery } from '@prisma/client';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

/**
 * 可序列化值类型定义
 * ECP-C1: 类型安全 - 确保 Webhook Payload 只包含可序列化的值
 */
type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableArray
  | SerializableObject;

interface SerializableObject {
  [key: string]: SerializableValue;
}

interface SerializableArray extends Array<SerializableValue> {}

/**
 * Webhook Payload 类型
 * ECP-C1: 类型安全 - 使用可序列化类型替代 any
 */
export type WebhookPayload = SerializableObject;

/**
 * Webhook Service
 * ECP-A1: SOLID - 单一职责，专注 Webhook 管理和投递
 * ECP-C1: Defensive Programming - 验证输入，处理错误
 * ECP-C2: Systematic Error Handling - 完善的错误处理和重试机制
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly MAX_RETRIES = 3;
  private readonly DELIVERY_TIMEOUT = 10000; // 10s timeout

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建 Webhook
   * ECP-C1: 生成安全的随机密钥用于 HMAC 签名
   * ECP-C1: 存储 SHA256 哈希值而非明文 secret，防止数据库泄露
   */
  async createWebhook(
    projectId: string,
    dto: CreateWebhookDto,
  ): Promise<Webhook & { secret: string }> {
    // 生成随机密钥（32 字节 = 256 bits）
    const secret = crypto.randomBytes(32).toString('hex');
    // 计算 SHA256 哈希值用于存储
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        projectId,
        url: dto.url,
        secret: '', // 清空明文secret字段（向后兼容）
        secretHash,
        events: dto.events,
        active: dto.active ?? true,
      },
    });

    // 仅此一次返回明文 secret 给用户
    return {
      ...webhook,
      secret,
    };
  }

  /**
   * 更新 Webhook
   */
  updateWebhook(webhookId: string, dto: UpdateWebhookDto): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id: webhookId },
      data: dto,
    });
  }

  /**
   * 删除 Webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.prisma.webhook.delete({
      where: { id: webhookId },
    });
  }

  /**
   * 获取单个 Webhook
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    return webhook;
  }

  /**
   * 列出项目的所有 Webhooks
   */
  listWebhooks(projectId: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 触发 Webhook 事件
   * ECP-C2: 异步处理，不阻塞主流程
   * @param projectId 项目 ID
   * @param event 事件类型 (e.g., "push", "pull_request.opened")
   * @param payload 事件负载数据
   */
  async triggerWebhook(
    projectId: string,
    event: string,
    payload: WebhookPayload,
  ): Promise<void> {
    // 查找订阅了该事件的激活 Webhooks
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        projectId,
        active: true,
      },
    });

    // 过滤匹配的 webhooks
    const matchedWebhooks = webhooks.filter((webhook) => {
      // 支持精确匹配 (e.g., "push") 和前缀匹配 (e.g., "pull_request.*")
      return webhook.events.some((subscribedEvent) => {
        if (subscribedEvent.endsWith('.*')) {
          const prefix = subscribedEvent.slice(0, -2);
          return event.startsWith(prefix);
        }
        return subscribedEvent === event;
      });
    });

    if (matchedWebhooks.length === 0) {
      this.logger.debug(
        `No webhooks subscribed to event "${event}" for project ${projectId}`,
      );
      return;
    }

    // 异步投递到所有匹配的 webhooks
    // ECP-C3: Performance Awareness - 并行投递，不阻塞
    const deliveries = matchedWebhooks.map((webhook) =>
      this.deliverWebhook(webhook, event, payload),
    );

    await Promise.allSettled(deliveries);
  }

  /**
   * 投递 Webhook
   * ECP-C1: HMAC-SHA256 签名验证
   * ECP-C2: 完善的错误处理和超时控制
   */
  async deliverWebhook(
    webhook: Webhook,
    event: string,
    payload: WebhookPayload,
  ): Promise<WebhookDelivery> {
    const startTime = Date.now();

    try {
      // 使用 secretHash 生成签名（secretHash 为 null 时使用空字符串作为后备）
      const secretHash = webhook.secretHash || '';
      const signature = this.generateSignature(secretHash, payload);

      // 发送 HTTP POST 请求
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'User-Agent': 'Flotilla-Webhook/1.0',
        },
        timeout: this.DELIVERY_TIMEOUT,
      });

      const _duration = Date.now() - startTime;

      // 记录成功的投递 (_duration暂未使用，schema中未定义duration字段)
      return this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          statusCode: response.status,
          response: this.truncateResponse(response.data),
          success: true,
          // duration 字段暂未在schema中定义,注释掉
          // duration,
        },
      });
    } catch (error) {
      const _duration = Date.now() - startTime;
      let statusCode: number | null = null;
      let errorMessage = 'Unknown error';

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        statusCode = axiosError.response?.status ?? null;
        errorMessage = axiosError.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.logger.error(
        `Webhook delivery failed for ${webhook.url}: ${errorMessage}`,
      );

      // 记录失败的投递
      return this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          statusCode,
          success: false,
          // duration和error字段暂未在schema中定义,将错误信息存入response
          response: { error: errorMessage },
        },
      });
    }
  }

  /**
   * 重试失败的投递
   * ECP-C2: 重试机制
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    if (delivery.success) {
      throw new Error('Cannot retry a successful delivery');
    }

    // 重新投递
    return this.deliverWebhook(
      delivery.webhook,
      delivery.event,
      delivery.payload as WebhookPayload,
    );
  }

  /**
   * 查询 Webhook 的投递历史
   */
  async listDeliveries(
    webhookId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { deliveredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId },
      }),
    ]);

    return { deliveries, total };
  }

  /**
   * 生成并验证 HMAC-SHA256 签名
   * ECP-C1: Security - HMAC 签名防止伪造请求
   * ECP-C1: 使用 timingSafeEqual 防止时序攻击
   * @param secretHash SHA256 哈希值（存储在数据库中）
   * @param payload 事件负载
   * @returns 签名字符串
   */
  private generateSignature(
    secretHash: string,
    payload: Record<string, unknown>,
  ): string {
    const payloadString = JSON.stringify(payload);
    // 使用哈希值作为HMAC密钥进行签名
    const hmac = crypto.createHmac('sha256', secretHash);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * 验证 Webhook 签名
   * ECP-C1: 使用 timingSafeEqual 防止时序攻击
   * @param secretHash 存储的 SHA256 哈希值
   * @param payload 事件负载
   * @param signature 接收到的签名
   * @returns 签名是否有效
   */
  private verifySignature(
    secretHash: string,
    payload: Record<string, unknown>,
    signature: string,
  ): boolean {
    const expectedSignature = this.generateSignature(secretHash, payload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(signature);

    // 使用 timingSafeEqual 防止时序攻击
    try {
      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      // 长度不匹配时 timingSafeEqual 会抛出错误
      return false;
    }
  }

  /**
   * 截断响应内容（防止存储过大的响应）
   * ECP-C3: Performance Awareness - 限制数据库存储大小
   */
  private truncateResponse(data: unknown): string {
    const responseString =
      typeof data === 'string' ? data : JSON.stringify(data);
    const MAX_LENGTH = 1000;
    if (responseString.length > MAX_LENGTH) {
      return responseString.substring(0, MAX_LENGTH) + '... (truncated)';
    }
    return responseString;
  }
}
