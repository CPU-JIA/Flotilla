/**
 * Playwright Test Fixtures
 *
 * ⚠️ IMPORTANT: These credentials MUST match the users created in global-setup.ts
 *
 * Test Users Strategy:
 * - jia (SUPER_ADMIN) - Primary test user for all E2E tests (no project limits)
 * - admin (SUPER_ADMIN) - Backup admin user
 * - testuser (USER) - Regular test user (legacy, prefer using jia)
 * - normaluser (USER) - Secondary user for permission/isolation testing
 */

export const TEST_USERS = {
  // Primary SUPER_ADMIN user for all E2E tests
  jia: {
    username: 'jia',
    email: 'jia@example.com',
    password: 'Jia123456',
    expectedRole: 'SUPER_ADMIN',
  },

  // Backup SUPER_ADMIN user
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123',
    expectedRole: 'SUPER_ADMIN',
  },

  // Regular USER (legacy)
  testuser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    expectedRole: 'USER',
  },

  // Regular USER (secondary for comparison tests)
  normaluser: {
    username: 'normaluser',
    email: 'normal@example.com',
    password: 'Password123',
    expectedRole: 'USER',
  },
} as const

/**
 * Helper to get login credentials (username + password only)
 */
export function getLoginCredentials(userKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userKey]
  return {
    username: user.username,
    password: user.password,
  }
}

/**
 * Helper to get full user data including email
 */
export function getFullUserData(userKey: keyof typeof TEST_USERS) {
  return TEST_USERS[userKey]
}
