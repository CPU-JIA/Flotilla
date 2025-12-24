import { Module } from '@nestjs/common';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Wiki Module
 * ECP-A1: SOLID - 模块化设计，封装 Wiki 相关功能
 * ECP-A2: 高内聚低耦合 - 导入 CommonModule 获取共享服务
 */
@Module({
  imports: [PrismaModule, CommonModule], // 导入 PrismaService 和 PermissionService
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService], // 导出 WikiService 供其他模块使用
})
export class WikiModule {}
