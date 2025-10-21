/**
 * LoadingSkeleton组件 - 骨架屏加载状态
 * ECP-A1: 单一职责 - 提供统一的加载状态UI
 * ECP-B1: DRY - 复用骨架屏组件
 */

'use client'

import { Skeleton } from '@mantine/core'

/**
 * 成员列表骨架屏
 */
export function MemberListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <Skeleton height={48} circle />
            <div className="flex-1 space-y-2">
              <Skeleton height={20} width="40%" />
              <Skeleton height={16} width="60%" />
            </div>
            <Skeleton height={32} width={80} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 项目卡片列表骨架屏
 */
export function ProjectCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <Skeleton height={24} width="70%" />
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="90%" />
            <div className="flex items-center gap-2 mt-4">
              <Skeleton height={24} width={60} radius="xl" />
              <Skeleton height={24} width={60} radius="xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 表格骨架屏
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton height={40} width="100%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={60} width="100%" />
      ))}
    </div>
  )
}

/**
 * 仪表盘卡片骨架屏
 */
export function DashboardCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <Skeleton height={20} width="60%" />
            <Skeleton height={32} width="40%" />
            <Skeleton height={16} width="80%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 通用内容骨架屏
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton height={32} width="50%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="95%" />
      <Skeleton height={20} width="90%" />
      <div className="pt-4">
        <Skeleton height={200} width="100%" />
      </div>
    </div>
  )
}
