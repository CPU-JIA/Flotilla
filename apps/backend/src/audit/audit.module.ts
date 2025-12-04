import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * 审计日志模块
 *
 * Phase 4: 安全审计日志系统
 *
 * @Global - 全局模块，所有模块都可以使用 AuditService
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService], // 导出服务供其他模块使用
})
export class AuditModule {}
