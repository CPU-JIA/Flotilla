import { Module } from '@nestjs/common';
import { ApiTokenController } from './api-token.controller';
import { ApiTokenService } from './api-token.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * API Token 模块
 * ECP-A1: SOLID原则 - 模块化设计
 */
@Module({
  imports: [PrismaModule], // 导入PrismaModule而不是直接提供PrismaService
  controllers: [ApiTokenController],
  providers: [ApiTokenService],
  exports: [ApiTokenService], // 导出服务供Guard使用
})
export class ApiTokenModule {}
