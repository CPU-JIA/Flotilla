/**
 * 邮件发送提供商抽象接口
 * ECP-A1: SOLID原则 - 依赖倒置原则
 *
 * 通过接口抽象，支持多种邮件服务提供商：
 * - SMTP（Brevo, Gmail, 自托管服务器）
 * - API（SendGrid, Resend等）
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string; // 模板名称
  context?: Record<string, any>; // 模板变量
  html?: string; // 直接HTML内容
  text?: string; // 纯文本内容
  from?: string; // 发件人地址（可选，使用默认值）
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 邮件提供商接口
 * 所有邮件服务（SMTP/API）都必须实现此接口
 */
export interface IEmailProvider {
  /**
   * 发送邮件
   * @param options 邮件选项
   * @returns 发送结果
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;
}
