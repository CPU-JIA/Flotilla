/**
 * Prisma Select Patterns - 共享的查询模式常量
 * ECP-DRY: 消除代码重复，统一查询模式
 */

// ========== User Select Patterns ==========

/**
 * 基础用户信息选择（用于列表展示）
 */
export const userSelectBasic = {
  id: true,
  username: true,
  email: true,
  avatar: true,
} as const;

/**
 * 用户详细信息选择（用于详情页）
 */
export const userSelectDetail = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

/**
 * 用户公开信息选择（用于公开 API）
 */
export const userSelectPublic = {
  id: true,
  username: true,
  avatar: true,
} as const;

// ========== Include Patterns ==========

/**
 * 作者信息包含（用于 Issue、PR、Comment 等）
 */
export const authorInclude = {
  author: {
    select: userSelectBasic,
  },
} as const;

/**
 * 创建者信息包含
 */
export const creatorInclude = {
  creator: {
    select: userSelectBasic,
  },
} as const;

/**
 * 用户信息包含
 */
export const userInclude = {
  user: {
    select: userSelectBasic,
  },
} as const;

// ========== Organization & Project Patterns ==========

/**
 * 组织基础信息选择
 */
export const organizationSelectBasic = {
  id: true,
  name: true,
  slug: true,
  avatar: true,
} as const;

/**
 * 项目基础信息选择
 */
export const projectSelectBasic = {
  id: true,
  name: true,
  slug: true,
  description: true,
  visibility: true,
} as const;

/**
 * 仓库基础信息选择
 */
export const repositorySelectBasic = {
  id: true,
  name: true,
  defaultBranch: true,
} as const;

// ========== Issue & PR Patterns ==========

/**
 * Issue 列表查询包含
 */
export const issueListInclude = {
  author: {
    select: userSelectBasic,
  },
  assignees: {
    include: {
      user: {
        select: userSelectBasic,
      },
    },
  },
  labels: true,
} as const;

/**
 * PR 列表查询包含
 */
export const prListInclude = {
  author: {
    select: userSelectBasic,
  },
  assignees: {
    include: {
      user: {
        select: userSelectBasic,
      },
    },
  },
  reviewers: {
    include: {
      user: {
        select: userSelectBasic,
      },
    },
  },
} as const;

/**
 * 评论查询包含
 */
export const commentInclude = {
  author: {
    select: userSelectBasic,
  },
} as const;

// ========== Type Exports ==========

export type UserSelectBasic = typeof userSelectBasic;
export type UserSelectDetail = typeof userSelectDetail;
export type AuthorInclude = typeof authorInclude;
