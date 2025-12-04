import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import type {
  IEmailProvider,
  EmailResult,
} from './interfaces/email-provider.interface';

/**
 * EmailService单元测试
 * ECP-D1: 可测试性设计 - 使用依赖注入和接口抽象
 */
describe('EmailService', () => {
  let service: EmailService;
  let mockEmailProvider: jest.Mocked<IEmailProvider>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Mock EmailProvider
    mockEmailProvider = {
      sendEmail: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      } as EmailResult),
    };

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:3000',
          SMTP_FROM_EMAIL: 'test@flotilla.dev',
        };
        return config[key];
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: 'IEmailProvider',
          useValue: mockEmailProvider,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('应成功发送邮箱验证邮件', async () => {
      const email = 'user@example.com';
      const username = 'testuser';
      const token = 'abc123token';

      const result = await service.sendVerificationEmail(
        email,
        username,
        token,
      );

      expect(result.success).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Verify your email address - Flotilla',
        template: 'email-verification',
        context: {
          username,
          verifyUrl: 'http://localhost:3000/auth/verify-email/abc123token',
          baseUrl: 'http://localhost:3000',
        },
        from: 'test@flotilla.dev',
      });
    });

    it('应在缺少必要参数时抛出错误', async () => {
      await expect(
        service.sendVerificationEmail('', 'user', 'token'),
      ).rejects.toThrow('Missing required parameters for verification email');

      await expect(
        service.sendVerificationEmail('email@test.com', '', 'token'),
      ).rejects.toThrow('Missing required parameters for verification email');

      await expect(
        service.sendVerificationEmail('email@test.com', 'user', ''),
      ).rejects.toThrow('Missing required parameters for verification email');
    });

    it('应使用ConfigService中的FRONTEND_URL构建验证链接', async () => {
      // 创建新的ConfigService mock，在EmailService构造前设置
      const customConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'FRONTEND_URL') return 'https://flotilla.example.com';
          if (key === 'SMTP_FROM_EMAIL') return 'noreply@example.com';
          return null;
        }),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: 'IEmailProvider',
            useValue: mockEmailProvider,
          },
          {
            provide: ConfigService,
            useValue: customConfigService,
          },
        ],
      }).compile();

      const customService = module.get<EmailService>(EmailService);

      await customService.sendVerificationEmail(
        'user@test.com',
        'user',
        'token123',
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            verifyUrl:
              'https://flotilla.example.com/auth/verify-email/token123',
            baseUrl: 'https://flotilla.example.com',
          }),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('应成功发送密码重置邮件', async () => {
      const email = 'user@example.com';
      const username = 'testuser';
      const token = 'reset123token';

      const result = await service.sendPasswordResetEmail(
        email,
        username,
        token,
      );

      expect(result.success).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Reset your password - Flotilla',
        template: 'password-reset',
        context: {
          username,
          resetUrl: 'http://localhost:3000/auth/reset-password/reset123token',
          baseUrl: 'http://localhost:3000',
        },
        from: 'test@flotilla.dev',
      });
    });

    it('应在缺少必要参数时抛出错误', async () => {
      await expect(
        service.sendPasswordResetEmail('', 'user', 'token'),
      ).rejects.toThrow('Missing required parameters for password reset email');

      await expect(
        service.sendPasswordResetEmail('email@test.com', '', 'token'),
      ).rejects.toThrow('Missing required parameters for password reset email');

      await expect(
        service.sendPasswordResetEmail('email@test.com', 'user', ''),
      ).rejects.toThrow('Missing required parameters for password reset email');
    });

    it('应构建正确的密码重置URL', async () => {
      const token = 'unique-reset-token-456';
      await service.sendPasswordResetEmail(
        'test@example.com',
        'testuser',
        token,
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            resetUrl: `http://localhost:3000/auth/reset-password/${token}`,
          }),
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('应成功发送欢迎邮件', async () => {
      const email = 'user@example.com';
      const username = 'testuser';

      const result = await service.sendWelcomeEmail(email, username);

      expect(result.success).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Welcome to Flotilla! 🎉',
        template: 'welcome',
        context: {
          username,
          dashboardUrl: 'http://localhost:3000/dashboard',
          baseUrl: 'http://localhost:3000',
        },
        from: 'test@flotilla.dev',
      });
    });

    it('应在缺少必要参数时抛出错误', async () => {
      await expect(service.sendWelcomeEmail('', 'user')).rejects.toThrow(
        'Missing required parameters for welcome email',
      );

      await expect(
        service.sendWelcomeEmail('email@test.com', ''),
      ).rejects.toThrow('Missing required parameters for welcome email');
    });

    it('应构建正确的dashboard URL', async () => {
      await service.sendWelcomeEmail('test@example.com', 'newuser');

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            dashboardUrl: 'http://localhost:3000/dashboard',
          }),
        }),
      );
    });
  });

  describe('sendEmail', () => {
    it('应成功发送通用邮件', async () => {
      const emailOptions = {
        to: 'custom@example.com',
        subject: 'Custom Subject',
        template: 'custom-template',
        context: { customData: 'test' },
      };

      const result = await service.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith({
        ...emailOptions,
        from: 'test@flotilla.dev',
      });
    });

    it('应使用提供的from地址覆盖默认地址', async () => {
      const emailOptions = {
        to: 'custom@example.com',
        subject: 'Custom Subject',
        template: 'custom-template',
        context: {},
        from: 'custom-sender@example.com',
      };

      await service.sendEmail(emailOptions);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom-sender@example.com',
        }),
      );
    });

    it('应在未提供from地址时使用默认地址', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test',
        template: 'test-template',
        context: {},
      };

      await service.sendEmail(emailOptions);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@flotilla.dev',
        }),
      );
    });
  });

  describe('配置回退机制', () => {
    it('应在FRONTEND_URL未配置时使用默认值', async () => {
      // 创建新的service实例，ConfigService返回null
      mockConfigService.get = jest.fn(() => null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: 'IEmailProvider',
            useValue: mockEmailProvider,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const testService = module.get<EmailService>(EmailService);

      await testService.sendVerificationEmail(
        'test@example.com',
        'user',
        'token',
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            verifyUrl: 'http://localhost:3000/auth/verify-email/token',
            baseUrl: 'http://localhost:3000',
          }),
          from: 'noreply@flotilla.dev',
        }),
      );
    });
  });

  describe('EmailProvider错误处理', () => {
    it('应传播EmailProvider抛出的错误', async () => {
      const testError = new Error('SMTP connection failed');
      mockEmailProvider.sendEmail.mockRejectedValueOnce(testError);

      await expect(
        service.sendVerificationEmail('test@example.com', 'user', 'token'),
      ).rejects.toThrow('SMTP connection failed');
    });

    it('应在EmailProvider返回失败结果时处理', async () => {
      mockEmailProvider.sendEmail.mockResolvedValueOnce({
        success: false,
        error: 'Invalid recipient',
      } as EmailResult);

      const result = await service.sendVerificationEmail(
        'invalid@example.com',
        'user',
        'token',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient');
    });
  });
});
