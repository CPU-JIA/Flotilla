#!/usr/bin/env node

/**
 * Flotilla 负载测试脚本
 *
 * 测试场景:
 * 1. API响应时间 (有/无缓存)
 * 2. 并发请求处理
 * 3. Rate Limiting 触发
 * 4. 数据库连接池性能
 *
 * 使用方式:
 * node scripts/load-test.js
 */

const https = require('https')
const http = require('http')

const API_URL = process.env.API_URL || 'http://localhost:4000/api'
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT || '50', 10)
const TOTAL_REQUESTS = parseInt(process.env.TOTAL || '1000', 10)

// 解析URL
const url = new URL(API_URL)
const protocol = url.protocol === 'https:' ? https : http

class LoadTester {
  constructor() {
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      rateLimited: 0,
      responseTimes: [],
      startTime: null,
      endTime: null,
    }
  }

  /**
   * 发送单个请求
   */
  async sendRequest(endpoint = '') {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const req = protocol.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + endpoint,
          method: 'GET',
        },
        (res) => {
          const responseTime = Date.now() - startTime
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            this.results.total++
            this.results.responseTimes.push(responseTime)

            if (res.statusCode === 200) {
              this.results.success++
            } else if (res.statusCode === 429) {
              this.results.rateLimited++
            } else {
              this.results.failed++
            }

            resolve({
              statusCode: res.statusCode,
              responseTime,
            })
          })
        }
      )

      req.on('error', (error) => {
        this.results.total++
        this.results.failed++
        resolve({
          statusCode: 0,
          responseTime: Date.now() - startTime,
          error: error.message,
        })
      })

      req.end()
    })
  }

  /**
   * 并发测试
   */
  async runConcurrent(count, endpoint = '') {
    const promises = []
    for (let i = 0; i < count; i++) {
      promises.push(this.sendRequest(endpoint))
    }
    return Promise.all(promises)
  }

  /**
   * 计算统计数据
   */
  calculateStats() {
    const times = this.results.responseTimes.sort((a, b) => a - b)
    const sum = times.reduce((a, b) => a + b, 0)

    return {
      min: times[0] || 0,
      max: times[times.length - 1] || 0,
      avg: Math.round(sum / times.length) || 0,
      p50: times[Math.floor(times.length * 0.5)] || 0,
      p95: times[Math.floor(times.length * 0.95)] || 0,
      p99: times[Math.floor(times.length * 0.99)] || 0,
    }
  }

  /**
   * 运行完整测试
   */
  async run() {
    console.log('🧪 Flotilla Load Test')
    console.log('======================\n')
    console.log(`API URL: ${API_URL}`)
    console.log(`Concurrent: ${CONCURRENT_REQUESTS}`)
    console.log(`Total Requests: ${TOTAL_REQUESTS}\n`)

    this.results.startTime = Date.now()

    // Test 1: 健康检查基准测试
    console.log('📊 Test 1: Health Check Baseline')
    console.log('---------------------------------')
    await this.runConcurrent(10)
    const baseline = this.calculateStats()
    console.log(`  Response Time: ${baseline.avg}ms (avg), ${baseline.p95}ms (p95)`)
    console.log(`  Success: ${this.results.success}, Failed: ${this.results.failed}\n`)

    // 重置结果
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      rateLimited: 0,
      responseTimes: [],
      startTime: this.results.startTime,
    }

    // Test 2: 并发负载测试
    console.log('🔥 Test 2: Concurrent Load Test')
    console.log('---------------------------------')

    const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS)

    for (let i = 0; i < batches; i++) {
      const currentBatch = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i * CONCURRENT_REQUESTS)
      await this.runConcurrent(currentBatch)

      // 进度报告
      if ((i + 1) % 5 === 0 || i === batches - 1) {
        const progress = Math.round((this.results.total / TOTAL_REQUESTS) * 100)
        console.log(
          `  Progress: ${progress}% (${this.results.total}/${TOTAL_REQUESTS}) - Success: ${this.results.success}, Rate Limited: ${this.results.rateLimited}, Failed: ${this.results.failed}`
        )
      }
    }

    this.results.endTime = Date.now()

    // 最终统计
    console.log('\n📈 Final Results')
    console.log('================\n')

    const stats = this.calculateStats()
    const duration = (this.results.endTime - this.results.startTime) / 1000
    const rps = Math.round(this.results.total / duration)

    console.log(`总请求数: ${this.results.total}`)
    console.log(
      `成功: ${this.results.success} (${Math.round((this.results.success / this.results.total) * 100)}%)`
    )
    console.log(
      `失败: ${this.results.failed} (${Math.round((this.results.failed / this.results.total) * 100)}%)`
    )
    console.log(
      `限流: ${this.results.rateLimited} (${Math.round((this.results.rateLimited / this.results.total) * 100)}%)`
    )
    console.log(`\n耗时: ${duration.toFixed(2)}s`)
    console.log(`吞吐量: ${rps} req/s`)
    console.log(`\n响应时间:`)
    console.log(`  最小: ${stats.min}ms`)
    console.log(`  最大: ${stats.max}ms`)
    console.log(`  平均: ${stats.avg}ms`)
    console.log(`  P50: ${stats.p50}ms`)
    console.log(`  P95: ${stats.p95}ms`)
    console.log(`  P99: ${stats.p99}ms`)

    // 性能评估
    console.log('\n🎯 Performance Assessment')
    console.log('=========================\n')

    if (stats.avg < 50) {
      console.log('✅ 优秀 - 平均响应时间 < 50ms')
    } else if (stats.avg < 100) {
      console.log('✅ 良好 - 平均响应时间 < 100ms')
    } else if (stats.avg < 200) {
      console.log('⚠️  可接受 - 平均响应时间 < 200ms')
    } else {
      console.log('❌ 需要优化 - 平均响应时间 >= 200ms')
    }

    if (this.results.failed === 0) {
      console.log('✅ 稳定性优秀 - 0% 失败率')
    } else if (this.results.failed / this.results.total < 0.01) {
      console.log('✅ 稳定性良好 - 失败率 < 1%')
    } else {
      console.log('⚠️  稳定性需要改进 - 失败率 >= 1%')
    }

    if (this.results.rateLimited > 0) {
      console.log(`✅ Rate Limiting 工作正常 - 触发 ${this.results.rateLimited} 次`)
    } else {
      console.log('ℹ️  Rate Limiting 未触发 (请求量未超过限制)')
    }

    console.log('\n✅ 负载测试完成！\n')
  }
}

// 运行测试
const tester = new LoadTester()
tester.run().catch((error) => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})
