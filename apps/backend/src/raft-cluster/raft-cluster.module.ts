/**
 * Raft集群模块
 *
 * NestJS模块定义，整合Raft集群相关服务
 * ECP-A2: 高内聚低耦合 - 模块职责清晰
 * ECP-D2: 注释原则 - 说明模块设计意图
 */

import { Module } from '@nestjs/common';
import { RaftClusterService } from './raft-cluster.service';
import { RaftClusterController } from './raft-cluster.controller';
import { ClusterConfigService } from './cluster-config.service';

@Module({
  controllers: [RaftClusterController],
  providers: [ClusterConfigService, RaftClusterService],
  exports: [RaftClusterService, ClusterConfigService],
})
export class RaftClusterModule {
  /**
   * 模块配置说明：
   *
   * Controllers:
   * - RaftClusterController: HTTP API接口层
   *
   * Providers:
   * - ClusterConfigService: 集群配置管理
   * - RaftClusterService: 核心集群管理服务
   *
   * Exports:
   * - 导出服务供其他模块使用
   *
   * 依赖关系：
   * RaftClusterController → RaftClusterService → ClusterConfigService
   *                      ↘ ClusterConfigService
   */
}
