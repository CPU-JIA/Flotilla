import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Newsletter Service
 * ECP-A1: SOLID - 单一职责，专注Newsletter订阅管理
 * ECP-C1: 防御性编程 - 邮箱验证和重复检查
 * ECP-C2: 系统化错误处理 - 完善的异常处理
 */
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 订阅Newsletter
   * @param email - 订阅邮箱
   */
  async subscribe(email: string): Promise<{ message: string }> {
    // 标准化邮箱（小写、去空格）
    const normalizedEmail = email.toLowerCase().trim();

    // 检查是否已订阅
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.confirmed) {
        throw new ConflictException('This email is already subscribed');
      } else {
        // 重新发送确认邮件
        await this.sendConfirmationEmail(existing.email, existing.confirmToken);
        return {
          message: 'Confirmation email resent. Please check your inbox.',
        };
      }
    }

    // 生成确认token
    const confirmToken = this.generateConfirmToken();

    // 创建订阅记录（未确认状态）
    await this.prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        confirmToken,
        confirmed: false,
      },
    });

    // 发送确认邮件
    await this.sendConfirmationEmail(normalizedEmail, confirmToken);

    this.logger.log(`New newsletter subscription: ${normalizedEmail}`);

    return {
      message: 'Subscription successful! Please check your email to confirm.',
    };
  }

  /**
   * 确认订阅
   * @param token - 确认token
   */
  async confirmSubscription(token: string): Promise<{ message: string }> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      throw new ConflictException('Invalid confirmation token');
    }

    if (subscriber.confirmed) {
      return { message: 'Email already confirmed' };
    }

    // 更新为已确认
    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmed: true,
        confirmedAt: new Date(),
      },
    });

    this.logger.log(`Newsletter subscription confirmed: ${subscriber.email}`);

    return {
      message: 'Email confirmed successfully! Welcome to Flotilla updates.',
    };
  }

  /**
   * 取消订阅
   * @param email - 邮箱地址
   */
  async unsubscribe(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscriber) {
      throw new ConflictException('Email not found in subscribers');
    }

    await this.prisma.newsletterSubscriber.delete({
      where: { id: subscriber.id },
    });

    this.logger.log(`Newsletter unsubscribed: ${normalizedEmail}`);

    return { message: 'Successfully unsubscribed from newsletter' };
  }

  /**
   * 获取订阅统计
   */
  async getStats(): Promise<{
    total: number;
    confirmed: number;
    pending: number;
  }> {
    const [total, confirmed] = await Promise.all([
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({ where: { confirmed: true } }),
    ]);

    return {
      total,
      confirmed,
      pending: total - confirmed,
    };
  }

  /**
   * 发送确认邮件
   * @private
   */
  private async sendConfirmationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const websiteUrl =
      this.configService.get<string>('WEBSITE_URL') || 'http://localhost:3003';
    const confirmUrl = `${websiteUrl}/newsletter/confirm?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: 'Confirm your Flotilla Newsletter subscription',
        template: 'newsletter-confirm',
        context: {
          confirmUrl,
          websiteUrl,
        },
      });

      this.logger.debug(`Confirmation email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email to ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 生成随机确认token
   * @private
   */
  private generateConfirmToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
