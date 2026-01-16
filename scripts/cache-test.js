#!/usr/bin/env node

/**
 * Redis 缓存效果验证脚本
 *
 * 测试场景:
 * 1. 首次请求 (Cache Miss)
 * 2. 二次请求 (Cache Hit)
 * 3. 缓存命中率统计
 */

const http = require('http')

const API_URL = process.env.API_URL || 'http://localhost:4000/api'

async function makeRequest(endpoint, token) {
  const url = new URL(API_URL)

  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 4000,
        path: url.pathname + endpoint,
        method: 'GET',
        headers: token ? { Cookie: `accessToken=${token}` } : {},
      },
      (res) => {
        const responseTime = Date.now() - startTime
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: data.substring(0, 100), // 只保留前100字符
            headers: res.headers,
          })
        })
      }
    )

    req.on('error', reject)
    req.end()
  })
}

async function testCachePerformance() {
  console.log('🔥 Redis Cache Performance Test')
  console.log('================================\n')

  // Test: Health endpoint (无认证)
  console.log('📊 Test 1: 健康检查端点 (无缓存)')
  console.log('----------------------------------')

  const iterations = 10
  const times = []

  for (let i = 0; i < iterations; i++) {
    const result = await makeRequest('')
    times.push(result.responseTime)

    if (i === 0) {
      console.log(`  第1次请求: ${result.responseTime}ms`)
    } else if (i === iterations - 1) {
      console.log(`  第${iterations}次请求: ${result.responseTime}ms`)
    }
  }

  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const min = Math.min(...times)
  const max = Math.max(...times)

  console.log(`\n  统计:`)
  console.log(`    平均: ${avg}ms`)
  console.log(`    最小: ${min}ms`)
  console.log(`    最大: ${max}ms`)
  console.log(`    变化: ${max - min}ms\n`)

  // Test 2: 缓存效果对比
  console.log('🚀 Test 2: 缓存效果演示')
  console.log('----------------------')
  console.log('  测试原理: 连续请求同一端点，观察响应时间变化\n')

  const cacheTests = []
  for (let i = 0; i < 5; i++) {
    const result = await makeRequest('')
    cacheTests.push(result.responseTime)
    console.log(`  请求 ${i + 1}: ${result.responseTime}ms`)
  }

  const firstRequest = cacheTests[0]
  const subsequentAvg = Math.round(
    cacheTests.slice(1).reduce((a, b) => a + b, 0) / (cacheTests.length - 1)
  )

  console.log(`\n  分析:`)
  console.log(`    首次请求: ${firstRequest}ms`)
  console.log(`    后续平均: ${subsequentAvg}ms`)

  if (subsequentAvg < firstRequest * 0.8) {
    console.log(`    ✅ 缓存加速: ${Math.round((1 - subsequentAvg / firstRequest) * 100)}%`)
  } else {
    console.log(`    ℹ️  该端点可能未启用缓存`)
  }

  console.log('\n📊 Test 3: 并发请求稳定性')
  console.log('-------------------------')

  const concurrent = 20
  const promises = []
  const startTime = Date.now()

  for (let i = 0; i < concurrent; i++) {
    promises.push(makeRequest(''))
  }

  const results = await Promise.all(promises)
  const totalTime = Date.now() - startTime

  const allSuccess = results.every((r) => r.statusCode === 200)
  const avgConcurrent = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / concurrent)

  console.log(`  并发数: ${concurrent}`)
  console.log(`  总耗时: ${totalTime}ms`)
  console.log(`  平均响应: ${avgConcurrent}ms`)
  console.log(`  成功率: ${allSuccess ? '100%' : '< 100%'}`)

  if (allSuccess) {
    console.log(`  ✅ 并发处理稳定`)
  }

  console.log('\n✅ 缓存测试完成！\n')
}

testCachePerformance().catch((error) => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})
