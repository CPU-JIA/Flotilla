import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnvironmentVariables } from './config/env.validation';
import cookieParser from 'cookie-parser';

// ⚠️ CRITICAL: Validate environment variables BEFORE application starts
// This prevents the application from starting with invalid configuration
validateEnvironmentVariables(process.env);

// ECP-C1: 防御性编程 - 全局BigInt序列化支持
// PostgreSQL的BIGINT类型映射为JavaScript的BigInt，需要添加JSON序列化支持

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // ECP-C1: 防御性编程 - 增加请求体大小限制以支持文件上传
  // 支持最大 10MB 的请求体（为 5MB 头像上传留有余地）
  const bodyParser = require('body-parser');

  // 🔒 SECURITY FIX: 启用 Cookie 解析 (用于 HttpOnly Cookie 认证)
  app.use(cookieParser());

  // Git HTTP Protocol 路由需要 raw body (不加 /api 前缀)
  app.use(
    '/repo/:projectId/git-upload-pack',
    bodyParser.raw({ type: '*/*', limit: '50mb' }),
  );
  app.use(
    '/repo/:projectId/git-receive-pack',
    bodyParser.raw({ type: '*/*', limit: '50mb' }),
  );

  // 其他路由使用 JSON parser
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除DTO中未定义的属性
      forbidNonWhitelisted: true, // 如果有未定义的属性，抛出错误
      transform: true, // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 启用 CORS - ECP-C1: 动态读取环境变量确保运行时配置生效
  // Phase 3: 支持多源配置
  const allowedOrigins: string[] = [];

  // 方式1: 使用 CORS_ALLOWED_ORIGINS (生产环境推荐，支持多域名)
  if (process.env.CORS_ALLOWED_ORIGINS) {
    const origins = process.env.CORS_ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    allowedOrigins.push(...origins);
  }

  // 方式2: 使用单独的环境变量 (开发环境)
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  if (process.env.WEBSITE_URL) {
    allowedOrigins.push(process.env.WEBSITE_URL);
  }

  // 默认值：开发环境
  if (allowedOrigins.length === 0) {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3003');
  }

  logger.log(`🌐 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
    maxAge: 3600, // 预检请求缓存 1 小时
  });

  // 设置全局前缀，但排除 Git HTTP Protocol 路由
  // Git 客户端期望仓库 URL 为 http://host/repo/:id，不包含 /api 前缀
  app.setGlobalPrefix('api', {
    exclude: [
      'repo/:projectId/info/refs',
      'repo/:projectId/git-upload-pack',
      'repo/:projectId/git-receive-pack',
    ],
  });

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Flotilla API')
    .setDescription(
      `
基于云计算的开发协作平台 RESTful API 文档

## Rate Limiting 限流策略

本API使用全局限流保护，防止滥用和确保服务可用性。

### 全局限制
- **默认限制**: 100 requests / minute (所有endpoint)

### 敏感endpoint限制
以下endpoint有更严格的限流策略：
- \`POST /auth/forgot-password\`: **5 requests / hour**
- \`POST /auth/resend-verification\`: **5 requests / hour**

### Rate Limit Headers
每个API响应都包含以下headers：
- \`X-RateLimit-Limit\`: 时间窗口内的请求限制数
- \`X-RateLimit-Remaining\`: 剩余可用请求数
- \`X-RateLimit-Reset\`: 限制重置的Unix时间戳

### 429 Too Many Requests
当超过限流限制时，API将返回HTTP 429状态码，响应中包含\`Retry-After\` header指示需要等待的秒数。

**示例响应**:
\`\`\`json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
\`\`\`
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入 JWT token',
        in: 'header',
      },
      'JWT-auth', // 这个名字将用于 @ApiBearerAuth() 装饰器
    )
    .addTag('auth', '认证模块 - 用户注册、登录、令牌管理')
    .addTag('users', '用户模块 - 用户信息管理')
    .addTag('projects', '项目模块 - 项目与成员管理')
    .addTag('repositories', '仓库模块 - 代码仓库、分支、文件、提交管理')
    .addTag('monitoring', '监控模块 - 系统健康检查和性能指标')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger API documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔐 Authentication endpoints: http://localhost:${port}/api/auth`);
}

bootstrap();
