import { Prisma } from '@prisma/client';

/**
 * 🔒 ECP-A1 DRY原则: PR 详情查询的统一 include 配置
 * 在 findOne, findByNumber 等方法中复用
 * 包含完整的关联数据：作者、合并者、项目、评审、评论、事件
 */
export const PR_DETAIL_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
    },
  },
  merger: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  reviews: {
    include: {
      reviewer: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  comments: {
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  events: {
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const satisfies Prisma.PullRequestInclude;

/**
 * PR 列表查询的简化 include（不包含 comments 和 events）
 * 用于 findAll() 等列表查询，减少数据库查询量
 */
export const PR_LIST_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
  _count: {
    select: {
      comments: true,
      reviews: true,
    },
  },
} as const satisfies Prisma.PullRequestInclude;

/**
 * PR 创建/更新时的简化 include（仅包含作者和项目）
 */
export const PR_BASIC_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.PullRequestInclude;

/**
 * 用户信息 select（完整版，包含email）
 * 复用于 author select 等场景
 */
export const USER_SELECT_FULL = {
  id: true,
  username: true,
  email: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;

/**
 * 用户信息 select（基础版，不包含email）
 * 复用于 reviewer, actor, merger 等场景
 */
export const USER_SELECT_BASIC = {
  id: true,
  username: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;
