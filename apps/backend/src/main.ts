import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// ECP-C1: 防御性编程 - 全局BigInt序列化支持
// PostgreSQL的BIGINT类型映射为JavaScript的BigInt，需要添加JSON序列化支持
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  logger.log(`🌐 CORS enabled for origin: ${frontendUrl}`);
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('Cloud Dev Platform API')
    .setDescription('基于云计算的开发协作平台 RESTful API 文档')
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
