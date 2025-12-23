import { Module } from '@nestjs/common'
import { GdprController } from './gdpr.controller'
import { GdprService } from './gdpr.service'
import { PrismaModule } from '../prisma/prisma.module'
import { MinioModule } from '../minio/minio.module'
import { EmailModule } from '../email/email.module'

/**
 * GDPR 数据导出模块
 * ECP-A1: SOLID 原则 - 模块化设计
 */
@Module({
  imports: [PrismaModule, MinioModule, EmailModule],
  controllers: [GdprController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
