import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * 性能监控中间件
 * ECP-C3: 性能意识 - 监控API响应时间和请求统计
 * ECP-D2: 注释说明设计意图
 */
@Injectable()
export class PerformanceMonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger('PerformanceMonitoring')

  // 性能统计数据
  private static stats = {
    totalRequests: 0,
    totalResponseTime: 0,
    requestsByEndpoint: new Map<string, number>(),
    responseTimesByEndpoint: new Map<string, number[]>(),
    errorCount: 0,
    slowRequestCount: 0, // 超过500ms的请求
  }

  // 慢请求阈值（毫秒）
  private readonly SLOW_REQUEST_THRESHOLD = 500

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    const endpoint = `${req.method} ${req.path}`

    // 在响应完成时记录性能数据
    res.on('finish', () => {
      const duration = Date.now() - startTime
      const statusCode = res.statusCode

      // ECP-C1: 防御性编程 - 只记录API请求
      if (req.path.startsWith('/api/')) {
        this.recordMetrics(endpoint, duration, statusCode)

        // 记录慢请求
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          this.logger.warn(
            `🐌 Slow request: ${endpoint} took ${duration}ms (status: ${statusCode})`
          )
        }

        // 记录错误请求
        if (statusCode >= 400) {
          this.logger.warn(
            `⚠️ Error request: ${endpoint} returned ${statusCode} (${duration}ms)`
          )
        }
      }
    })

    next()
  }

  /**
   * 记录性能指标
   * ECP-A1: 单一职责 - 专注于指标记录
   */
  private recordMetrics(endpoint: string, duration: number, statusCode: number) {
    // 更新总计数据
    PerformanceMonitoringMiddleware.stats.totalRequests++
    PerformanceMonitoringMiddleware.stats.totalResponseTime += duration

    // 更新端点计数
    const count = PerformanceMonitoringMiddleware.stats.requestsByEndpoint.get(endpoint) || 0
    PerformanceMonitoringMiddleware.stats.requestsByEndpoint.set(endpoint, count + 1)

    // 更新端点响应时间
    const times = PerformanceMonitoringMiddleware.stats.responseTimesByEndpoint.get(endpoint) || []
    times.push(duration)

    // ECP-C3: 性能意识 - 限制存储的响应时间数量，只保留最近1000条
    if (times.length > 1000) {
      times.shift()
    }
    PerformanceMonitoringMiddleware.stats.responseTimesByEndpoint.set(endpoint, times)

    // 更新错误计数
    if (statusCode >= 400) {
      PerformanceMonitoringMiddleware.stats.errorCount++
    }

    // 更新慢请求计数
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      PerformanceMonitoringMiddleware.stats.slowRequestCount++
    }
  }

  /**
   * 获取性能统计数据
   * 供监控端点使用
   */
  static getStats() {
    const topEndpoints = Array.from(this.stats.requestsByEndpoint.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => {
        const times = this.stats.responseTimesByEndpoint.get(endpoint) || []
        const avgTime = times.length > 0
          ? times.reduce((sum, t) => sum + t, 0) / times.length
          : 0

        // 计算P95响应时间
        const sortedTimes = [...times].sort((a, b) => a - b)
        const p95Index = Math.floor(sortedTimes.length * 0.95)
        const p95Time = sortedTimes[p95Index] || 0

        return {
          endpoint,
          requests: count,
          avgResponseTime: Math.round(avgTime),
          p95ResponseTime: Math.round(p95Time),
        }
      })

    return {
      summary: {
        totalRequests: this.stats.totalRequests,
        averageResponseTime: this.stats.totalRequests > 0
          ? Math.round(this.stats.totalResponseTime / this.stats.totalRequests)
          : 0,
        errorCount: this.stats.errorCount,
        errorRate: this.stats.totalRequests > 0
          ? ((this.stats.errorCount / this.stats.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
        slowRequestCount: this.stats.slowRequestCount,
        slowRequestRate: this.stats.totalRequests > 0
          ? ((this.stats.slowRequestCount / this.stats.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
      },
      topEndpoints,
      endpointCount: this.stats.requestsByEndpoint.size,
    }
  }

  /**
   * 重置统计数据
   * 用于测试或定期清理
   */
  static resetStats() {
    this.stats = {
      totalRequests: 0,
      totalResponseTime: 0,
      requestsByEndpoint: new Map(),
      responseTimesByEndpoint: new Map(),
      errorCount: 0,
      slowRequestCount: 0,
    }
  }
}
