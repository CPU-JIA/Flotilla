import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PerformanceMonitoringMiddleware } from '../common/middleware/performance-monitoring.middleware';

/**
 * 监控端点控制器
 * ECP-A1: 单一职责 - 提供系统监控和健康检查接口
 */
@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  /**
   * 健康检查端点
   * 用于容器编排、负载均衡器健康检查
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * 性能指标端点
   * 提供API性能统计信息
   */
  @Public()
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
   */
  @Public()
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
