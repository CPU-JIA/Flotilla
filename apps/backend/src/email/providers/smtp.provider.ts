import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  IEmailProvider,
  EmailOptions,
  EmailResult,
} from '../interfaces/email-provider.interface';

/**
 * SMTP邮件提供商实现
 * ECP-A1: SOLID原则 - 接口实现
 *
 * 支持所有SMTP服务：
 * - Brevo (smtp-relay.brevo.com)
 * - Gmail (smtp.gmail.com)
 * - 自托管SMTP服务器
 */
@Injectable()
export class SMTPProvider implements IEmailProvider {
  private readonly logger = new Logger(SMTPProvider.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * 通过SMTP发送邮件
   * ECP-C2: 系统化错误处理
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // ECP-C1: 防御性编程 - 验证必需参数
      if (!options.to || !options.subject) {
        throw new Error('Missing required email fields: to or subject');
      }

      this.logger.debug(
        `Sending email to ${String(options.to)} with subject: ${options.subject}`,
      );

      const result = await this.mailerService.sendMail({
        to: options.to,
        from: options.from,
        subject: options.subject,
        template: options.template, // Handlebars模板名称
        context: options.context, // 模板变量
        html: options.html, // 直接HTML（如果不用模板）
        text: options.text, // 纯文本版本
      });

      this.logger.log(
        `✅ Email sent successfully to ${String(options.to)} (messageId: ${result.messageId})`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      // ECP-C2: 错误处理 - 记录详细错误信息
      const err = error as Error;
      this.logger.error(
        `❌ Failed to send email to ${String(options.to)}: ${err.message}`,
        err.stack,
      );

      return {
        success: false,
        error: err.message,
      };
    }
  }
}
