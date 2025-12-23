import { Module } from '@nestjs/common'
import { WebhookService } from './webhooks.service'
import { WebhookController } from './webhooks.controller'
import { PrismaModule } from '../prisma/prisma.module'

/**
 * Webhook Module
 * ECP-A1: SOLID - 模块化设计，封装 Webhook 功能
 */
@Module({
  imports: [PrismaModule], // 导入 PrismaModule 以使用 PrismaService
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService], // 导出 Service 供其他模块使用（触发事件）
})
export class WebhookModule {}
