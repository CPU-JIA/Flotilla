import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PerformanceMonitoringMiddleware } from '../common/middleware/performance-monitoring.middleware';

/**
 * 监控端点控制器
 * ECP-A1: 单一职责 - 提供系统监控和健康检查接口
 */
@ApiTags('monitoring')
@Controller('monitoring')
@Version('1')
export class MonitoringController {
  /**
   * 健康检查端点
   * 用于容器编排、负载均衡器健康检查
   * 保持公开访问，但只返回基本状态信息
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  healthCheck() {
    // 只返回基本状态，不泄露系统信息
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 性能指标端点
   * 提供API性能统计信息
   * ⚠️ 需要SUPER_ADMIN权限 - 包含敏感性能数据
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('metrics')
  @ApiOperation({ summary: '获取性能指标' })
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: PerformanceMonitoringMiddleware.getStats(),
    };
  }

  /**
   * 详细系统信息
   * 包含进程、内存、CPU等信息
   * ⚠️ 需要SUPER_ADMIN权限 - 包含敏感系统信息
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('info')
  @ApiOperation({ summary: '获取系统信息' })
  getSystemInfo() {
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        unit: 'MB',
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };
  }
}
