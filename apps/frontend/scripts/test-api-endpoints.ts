/**
 * API Endpoints Connectivity Test Script
 * ECP-C1: Defensive Programming - API endpoint validation
 *
 * Tests all newly implemented API endpoints to ensure backend connectivity
 * Run with: npx tsx scripts/test-api-endpoints.ts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

interface TestResult {
  endpoint: string
  method: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  statusCode?: number
  message?: string
  duration?: number
}

const results: TestResult[] = []

/**
 * Test a single API endpoint
 */
async function testEndpoint(
  endpoint: string,
  method: string,
  body?: unknown,
  requiresAuth: boolean = true
): Promise<TestResult> {
  const startTime = performance.now()
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(requiresAuth && {
          // Note: Replace with actual token for testing
          Authorization: 'Bearer test-token-here',
        }),
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    const duration = Math.round(performance.now() - startTime)

    // 401/403 means endpoint exists but needs auth (PASS)
    if (response.status === 401 || response.status === 403) {
      return {
        endpoint,
        method,
        status: 'PASS',
        statusCode: response.status,
        message: 'Endpoint exists (auth required)',
        duration,
      }
    }

    // 404 means endpoint doesn't exist (FAIL)
    if (response.status === 404) {
      return {
        endpoint,
        method,
        status: 'FAIL',
        statusCode: 404,
        message: 'Endpoint not found',
        duration,
      }
    }

    // 2xx = success (PASS)
    if (response.ok) {
      return {
        endpoint,
        method,
        status: 'PASS',
        statusCode: response.status,
        message: 'Success',
        duration,
      }
    }

    // Other errors
    return {
      endpoint,
      method,
      status: 'FAIL',
      statusCode: response.status,
      message: await response.text(),
      duration,
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
    }
  }
}

/**
 * Test all webhook endpoints
 */
async function testWebhookEndpoints(projectId: string = 'test-project-id') {
  console.log('\n📡 Testing Webhook Endpoints...\n')

  const tests = [
    { endpoint: `/webhooks/projects/${projectId}`, method: 'GET', desc: 'List webhooks' },
    { endpoint: `/webhooks/projects/${projectId}`, method: 'POST', desc: 'Create webhook' },
    { endpoint: `/webhooks/webhook-id`, method: 'GET', desc: 'Get webhook' },
    { endpoint: `/webhooks/webhook-id`, method: 'PATCH', desc: 'Update webhook' },
    { endpoint: `/webhooks/webhook-id`, method: 'DELETE', desc: 'Delete webhook' },
    { endpoint: `/webhooks/webhook-id/deliveries`, method: 'GET', desc: 'Get deliveries' },
  ]

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method)
    results.push(result)
    printResult(result, test.desc)
  }
}

/**
 * Test all pipeline endpoints
 */
async function testPipelineEndpoints(projectId: string = 'test-project-id') {
  console.log('\n🔧 Testing Pipeline Endpoints...\n')

  const tests = [
    { endpoint: `/pipelines/projects/${projectId}`, method: 'GET', desc: 'List pipelines' },
    { endpoint: `/pipelines/projects/${projectId}`, method: 'POST', desc: 'Create pipeline' },
    { endpoint: `/pipelines/pipeline-id`, method: 'GET', desc: 'Get pipeline' },
    { endpoint: `/pipelines/pipeline-id`, method: 'PATCH', desc: 'Update pipeline' },
    { endpoint: `/pipelines/pipeline-id`, method: 'DELETE', desc: 'Delete pipeline' },
    { endpoint: `/pipelines/pipeline-id/trigger`, method: 'POST', desc: 'Trigger pipeline' },
    { endpoint: `/pipelines/pipeline-id/runs`, method: 'GET', desc: 'Get pipeline runs' },
    { endpoint: `/pipelines/runs/run-id`, method: 'GET', desc: 'Get run details' },
    { endpoint: `/pipelines/runs/run-id/cancel`, method: 'POST', desc: 'Cancel run' },
  ]

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method)
    results.push(result)
    printResult(result, test.desc)
  }
}

/**
 * Test branch protection endpoints
 */
async function testBranchProtectionEndpoints(projectId: string = 'test-project-id') {
  console.log('\n🛡️ Testing Branch Protection Endpoints...\n')

  const tests = [
    {
      endpoint: `/projects/${projectId}/branch-protection`,
      method: 'GET',
      desc: 'List protection rules',
    },
    {
      endpoint: `/projects/${projectId}/branch-protection`,
      method: 'POST',
      desc: 'Create protection rule',
    },
    { endpoint: `/branch-protection/rule-id`, method: 'PATCH', desc: 'Update protection rule' },
    { endpoint: `/branch-protection/rule-id`, method: 'DELETE', desc: 'Delete protection rule' },
  ]

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method)
    results.push(result)
    printResult(result, test.desc)
  }
}

/**
 * Test GDPR endpoints
 */
async function testGDPREndpoints() {
  console.log('\n🔒 Testing GDPR Endpoints...\n')

  const tests = [
    { endpoint: `/gdpr/export`, method: 'POST', desc: 'Export user data' },
    { endpoint: `/gdpr/account`, method: 'DELETE', desc: 'Delete account' },
  ]

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method)
    results.push(result)
    printResult(result, test.desc)
  }
}

/**
 * Test audit log endpoints
 */
async function testAuditLogEndpoints() {
  console.log('\n📊 Testing Audit Log Endpoints...\n')

  const tests = [
    { endpoint: `/audit/user-logs`, method: 'GET', desc: 'Get personal audit logs' },
    { endpoint: `/admin/audit`, method: 'GET', desc: 'Get admin audit logs' },
  ]

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method)
    results.push(result)
    printResult(result, test.desc)
  }
}

/**
 * Print test result
 */
function printResult(result: TestResult, description: string) {
  const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⏭️' : '❌'
  const statusText = result.status.padEnd(6)
  const durationText = result.duration ? `(${result.duration}ms)` : ''

  console.log(`${statusIcon} ${statusText} ${result.method.padEnd(6)} ${result.endpoint}`)
  console.log(`   ${description} ${durationText}`)

  if (result.message) {
    console.log(`   ${result.message}`)
  }
  console.log()
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n' + '='.repeat(80))
  console.log('📈 Test Summary Report')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const skipped = results.filter((r) => r.status === 'SKIP').length
  const total = results.length

  const passRate = ((passed / total) * 100).toFixed(1)

  console.log(`Total Tests:    ${total}`)
  console.log(`✅ Passed:      ${passed}`)
  console.log(`❌ Failed:      ${failed}`)
  console.log(`⏭️  Skipped:     ${skipped}`)
  console.log(`📊 Pass Rate:   ${passRate}%\n`)

  if (failed > 0) {
    console.log('Failed Tests:')
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  - ${r.method} ${r.endpoint}`)
        console.log(`    ${r.message || 'Unknown error'}`)
      })
    console.log()
  }

  const avgDuration =
    results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
  console.log(`⏱️  Average Response Time: ${Math.round(avgDuration)}ms`)

  console.log('\n' + '='.repeat(80) + '\n')
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n🚀 Starting API Endpoint Connectivity Tests...')
  console.log(`📍 Base URL: ${API_BASE_URL}\n`)

  try {
    await testWebhookEndpoints()
    await testPipelineEndpoints()
    await testBranchProtectionEndpoints()
    await testGDPREndpoints()
    await testAuditLogEndpoints()

    printSummary()

    // Exit with error code if any tests failed
    const hasFailed = results.some((r) => r.status === 'FAIL')
    process.exit(hasFailed ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Test runner error:', error)
    process.exit(1)
  }
}

// Run tests
main()
