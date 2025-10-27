import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { IndexService } from './index.service';
import { MeilisearchService } from './meilisearch.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

/**
 * 代码搜索模块
 *
 * 依赖模块：
 * - ConfigModule: 环境变量配置
 * - PrismaModule: 数据库访问
 * - MinioModule: 文件存储访问
 *
 * 导出服务：
 * - SearchService: 供其他模块使用搜索功能
 * - IndexService: 供其他模块触发索引
 *
 * ECP-A2 (高内聚低耦合): SearchModule独立封装，通过exports暴露接口
 * ECP-D1 (可测试性): 依赖注入便于单元测试
 */
@Module({
  imports: [
    ConfigModule,  // 环境变量配置
    PrismaModule,  // 数据库访问
    MinioModule,   // 文件存储
  ],
  controllers: [SearchController],
  providers: [
    MeilisearchService,  // MeiliSearch客户端
    IndexService,        // 索引服务
    SearchService,       // 搜索服务
  ],
  exports: [
    SearchService,  // 导出给其他模块使用
    IndexService,   // 导出给其他模块触发索引
  ],
})
export class SearchModule {}
