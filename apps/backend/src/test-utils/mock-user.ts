/**
 * 测试工具 - 统一的 User Mock 数据
 * ECP-D1: 可测试性设计 - 集中管理测试数据
 *
 * 使用方法:
 * import { createMockUser, mockUser } from '../test-utils/mock-user';
 */

import { UserRole } from '@prisma/client';

/**
 * 完整的 User Mock 类型（匹配 Prisma User 模型）
 */
export interface MockUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
  bio: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 默认的 Mock User 数据
 */
export const mockUser: MockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  avatar: null,
  bio: null,
  role: UserRole.USER,
  isActive: true,
  emailVerified: true,
  emailVerifyToken: null,
  emailVerifyExpires: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  tokenVersion: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * 创建自定义 Mock User
 * @param overrides 要覆盖的字段
 * @returns 完整的 MockUser 对象
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    ...mockUser,
    ...overrides,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
}

/**
 * 创建 Admin Mock User
 */
export const mockAdminUser: MockUser = createMockUser({
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.com',
  role: UserRole.SUPER_ADMIN,
});

/**
 * 创建多个 Mock User（用于列表测试）
 */
export function createMockUsers(count: number): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i + 1}`,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
    }),
  );
}
