import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IEmailProvider } from './interfaces/email-provider.interface';
import type {
  EmailOptions,
  EmailResult,
} from './interfaces/email-provider.interface';

/**
 * 邮件服务（业务层）
 * ECP-A1: 单一职责原则 - 只负责业务逻辑，不关心具体发送实现
 * ECP-A2: 依赖倒置原则 - 依赖IEmailProvider接口，而非具体实现
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly baseUrl: string;
  private readonly fromEmail: string;

  constructor(
    @Inject('IEmailProvider') private readonly emailProvider: IEmailProvider,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      'noreply@flotilla.dev';
  }

  /**
   * 发送邮箱验证邮件
   * ECP-C1: 防御性编程 - 验证输入参数
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<EmailResult> {
    if (!email || !username || !token) {
      throw new Error('Missing required parameters for verification email');
    }

    const verifyUrl = `${this.baseUrl}/auth/verify-email/${token}`;

    this.logger.log(`Sending verification email to: ${email}`);

    return this.emailProvider.sendEmail({
      to: email,
      subject: 'Verify your email address - Flotilla',
      template: 'email-verification',
      context: {
        username,
        verifyUrl,
        baseUrl: this.baseUrl,
      },
      from: this.fromEmail,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<EmailResult> {
    if (!email || !username || !token) {
      throw new Error('Missing required parameters for password reset email');
    }

    const resetUrl = `${this.baseUrl}/auth/reset-password/${token}`;

    this.logger.log(`Sending password reset email to: ${email}`);

    return this.emailProvider.sendEmail({
      to: email,
      subject: 'Reset your password - Flotilla',
      template: 'password-reset',
      context: {
        username,
        resetUrl,
        baseUrl: this.baseUrl,
      },
      from: this.fromEmail,
    });
  }

  /**
   * 发送欢迎邮件（邮箱验证成功后）
   */
  async sendWelcomeEmail(
    email: string,
    username: string,
  ): Promise<EmailResult> {
    if (!email || !username) {
      throw new Error('Missing required parameters for welcome email');
    }

    this.logger.log(`Sending welcome email to: ${email}`);

    return this.emailProvider.sendEmail({
      to: email,
      subject: 'Welcome to Flotilla! 🎉',
      template: 'welcome',
      context: {
        username,
        dashboardUrl: `${this.baseUrl}/dashboard`,
        baseUrl: this.baseUrl,
      },
      from: this.fromEmail,
    });
  }

  /**
   * 通用邮件发送方法（供其他模块使用）
   * ECP-B2: KISS原则 - 提供简单的发送接口
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.emailProvider.sendEmail({
      ...options,
      from: options.from || this.fromEmail,
    });
  }
}
