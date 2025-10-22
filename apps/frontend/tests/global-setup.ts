/**
 * Playwright Global Setup
 * 在所有测试执行前创建测试用户
 *
 * 测试用户策略:
 * 1. jia (SUPER_ADMIN) - 主要测试用户，首个用户自动提升
 * 2. admin (SUPER_ADMIN) - 备用管理员
 * 3. testuser (USER) - 普通测试用户
 * 4. normaluser (USER) - 用于权限对比测试
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// 测试用户配置
const TEST_USERS = [
  {
    username: 'jia',
    email: 'jia@example.com',
    password: 'Jia123456',
    expectedRole: 'SUPER_ADMIN', // 第一个用户会自动提升
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123',
    expectedRole: 'SUPER_ADMIN',
  },
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    expectedRole: 'USER',
  },
  {
    username: 'normaluser',
    email: 'normal@example.com',
    password: 'Password123',
    expectedRole: 'USER',
  },
]

/**
 * 等待后端服务可用
 */
async function waitForBackend(maxRetries = 30, delayMs = 1000): Promise<void> {
  console.log('⏳ Waiting for backend service to be ready...')

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/`, {
        method: 'GET',
      })

      if (response.ok || response.status === 404) {
        console.log('✅ Backend service is ready!')
        return
      }
    } catch {
      // Backend not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error('Backend service did not become ready in time')
}

/**
 * 创建测试用户
 */
async function createTestUser(user: (typeof TEST_USERS)[0]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        password: user.password,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Created user: ${user.username} (role: ${data.user.role})`)

      // 验证角色是否符合预期
      if (data.user.role !== user.expectedRole) {
        console.warn(
          `⚠️  Warning: ${user.username} expected role ${user.expectedRole}, got ${data.user.role}`
        )
      }
    } else if (response.status === 409) {
      // 用户已存在，尝试验证登录
      console.log(`ℹ️  User ${user.username} already exists, verifying credentials...`)

      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail: user.username,
          password: user.password,
        }),
      })

      if (loginResponse.ok) {
        console.log(`✅ User ${user.username} verified (existing)`)
      } else {
        console.error(`❌ User ${user.username} exists but credentials invalid!`)
        throw new Error(`Test user ${user.username} exists with different password`)
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Failed to create ${user.username}: ${errorData.message || response.statusText}`
      )
    }
  } catch (error) {
    console.error(`❌ Error creating user ${user.username}:`, error)
    throw error
  }
}

/**
 * Global Setup 主函数
 */
async function globalSetup() {
  console.log('\n🔧 Starting Playwright Global Setup...\n')

  try {
    // 1. 等待后端服务启动
    await waitForBackend()

    // 2. 按顺序创建测试用户 (jia必须第一个创建以触发Bootstrap Admin)
    console.log('\n👤 Creating test users...\n')

    for (const user of TEST_USERS) {
      await createTestUser(user)
    }

    console.log('\n✅ Global Setup completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Global Setup failed:', error)
    throw error
  }
}

export default globalSetup
