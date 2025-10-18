/**
 * Playwright Test Fixtures
 *
 * ⚠️ IMPORTANT: These credentials MUST match the users created in global-setup.ts
 *
 * Test Users Strategy:
 * 1. admin (SUPER_ADMIN) - First user, auto-promoted via Bootstrap Admin
 * 2. testuser (USER) - Regular test user for standard operations
 * 3. normaluser (USER) - Secondary user for permission/isolation testing
 */

export const TEST_USERS = {
  // SUPER_ADMIN user (first user, auto-promoted)
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123',
    expectedRole: 'SUPER_ADMIN',
  },

  // Regular USER (primary test user)
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
