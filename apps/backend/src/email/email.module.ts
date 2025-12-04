import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './email.service';
import { SMTPProvider } from './providers/smtp.provider';
import { IEmailProvider } from './interfaces/email-provider.interface';

/**
 * 邮件模块
 * ECP-A1: 模块化设计 - 封装邮件功能
 *
 * 配置：
 * 1. MailerModule：NestJS邮件发送模块（基于Nodemailer）
 * 2. Handlebars模板引擎：用于HTML邮件模板
 * 3. SMTP配置：通过环境变量注入
 */
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const port = configService.get<number>('SMTP_PORT') || 587;
        // Auto-detect secure mode based on port: 465 uses SSL, 587 uses STARTTLS
        const secure = port === 465;

        console.log(
          `[EmailModule] SMTP Configuration: host=${configService.get('SMTP_HOST')}, port=${port}, secure=${secure}`,
        );

        return {
          transport: {
            host: configService.get<string>('SMTP_HOST'),
            port,
            secure, // true for port 465 (SSL), false for port 587 (STARTTLS)
            auth: {
              user: configService.get<string>('SMTP_USER'),
              pass: configService.get<string>('SMTP_PASS'),
            },
          },
          defaults: {
            from:
              configService.get<string>('SMTP_FROM_EMAIL') ||
              'noreply@flotilla.dev',
          },
          template: {
            dir: join(process.cwd(), 'src/email/templates'),
            adapter: new HandlebarsAdapter(), // Handlebars模板引擎
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [
    SMTPProvider,
    {
      provide: 'IEmailProvider',
      useExisting: SMTPProvider,
    },
    EmailService,
  ],
  exports: [EmailService], // 导出EmailService供其他模块使用
})
export class EmailModule {}
