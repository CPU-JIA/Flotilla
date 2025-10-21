/**
 * DataTable组件 - 基于Mantine Table的数据表格
 * 支持分页、排序、行选择、自定义渲染
 * ECP-A1: 单一职责 - 专注于数据表格展示
 * ECP-B1: DRY - 可复用的表格组件
 */

'use client'

import { Table, Pagination, Loader, Text, Center } from '@mantine/core'
import { useState } from 'react'

export interface DataTableColumn<T> {
  /** 数据访问键 */
  accessor: keyof T | string
  /** 列标题 */
  title: string
  /** 自定义渲染函数 */
  render?: (record: T, index: number) => React.ReactNode
  /** 列宽度 */
  width?: string | number
  /** 文本对齐方式 */
  textAlign?: 'left' | 'center' | 'right'
}

/**
 * DataTable Props
 * T默认为Record<string, unknown>以提供基本类型安全
 */
export interface DataTableProps<T = Record<string, unknown>> {
  /** 列配置 */
  columns: DataTableColumn<T>[]
  /** 数据源 */
  data: T[]
  /** 加载状态 */
  loading?: boolean
  /** 分页配置 */
  pagination?: {
    /** 当前页码（从1开始） */
    page: number
    /** 总记录数 */
    total: number
    /** 每页记录数 */
    recordsPerPage?: number
    /** 页码改变回调 */
    onPageChange: (page: number) => void
  }
  /** 行点击回调 */
  onRowClick?: (record: T, index: number) => void
  /** 空数据提示文本 */
  emptyMessage?: string
  /** 是否显示斑马纹 */
  striped?: boolean
  /** 是否高亮悬停行 */
  highlightOnHover?: boolean
  /** 是否显示边框 */
  withBorder?: boolean
  /** 是否显示列边框 */
  withColumnBorders?: boolean
}

/**
 * 通用数据表格组件
 *
 * @example
 * ```tsx
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 *   role: string;
 * }
 *
 * const columns: DataTableColumn<User>[] = [
 *   { accessor: 'name', title: '姓名' },
 *   { accessor: 'email', title: '邮箱' },
 *   {
 *     accessor: 'role',
 *     title: '角色',
 *     render: (record) => (
 *       <Badge variant={record.role === 'Admin' ? 'default' : 'secondary'}>
 *         {record.role}
 *       </Badge>
 *     ),
 *   },
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   loading={isLoading}
 *   pagination={{
 *     page,
 *     total: totalCount,
 *     onPageChange: setPage,
 *   }}
 *   onRowClick={(user) => router.push(`/users/${user.id}`)}
 * />
 * ```
 */
export function DataTable<T = Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pagination,
  onRowClick,
  emptyMessage = '暂无数据',
  striped = true,
  highlightOnHover = true,
  withBorder = true,
  withColumnBorders = false,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  // 计算总页数
  const totalPages = pagination
    ? Math.ceil(pagination.total / (pagination.recordsPerPage || 10))
    : 0

  // 获取列值
  const getColumnValue = (record: T, accessor: keyof T | string): React.ReactNode => {
    if (typeof accessor === 'string' && accessor.includes('.')) {
      // 支持嵌套属性访问 (e.g., "user.name")
      const value = accessor.split('.').reduce((obj: unknown, key) => {
        return (obj as Record<string, unknown>)?.[key]
      }, record as unknown)
      return value as React.ReactNode
    }
    return record[accessor as keyof T] as React.ReactNode
  }

  return (
    <div className="space-y-4">
      {/* 表格容器 */}
      <div
        className={`
          relative overflow-x-auto rounded-lg
          ${withBorder ? 'border border-gray-200 dark:border-gray-800' : ''}
        `}
      >
        {/* 加载遮罩 */}
        {loading && (
          <Center
            className="
              absolute inset-0 z-10
              bg-white/80 dark:bg-gray-900/80
              backdrop-blur-sm
            "
          >
            <Loader size="lg" color="blue" />
          </Center>
        )}

        <Table
          striped={striped}
          highlightOnHover={highlightOnHover}
          withColumnBorders={withColumnBorders}
          className="
            min-w-full
            bg-white dark:bg-gray-900
          "
        >
          {/* 表头 */}
          <Table.Thead className="bg-gray-50 dark:bg-gray-800/50">
            <Table.Tr>
              {columns.map((column, index) => (
                <Table.Th
                  key={`${String(column.accessor)}-${index}`}
                  style={{
                    width: column.width,
                    textAlign: column.textAlign || 'left',
                  }}
                  className="
                    px-6 py-4
                    text-sm font-semibold
                    text-gray-900 dark:text-gray-50
                    border-b border-gray-200 dark:border-gray-800
                  "
                >
                  {column.title}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          {/* 表体 */}
          <Table.Tbody>
            {data.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={columns.length}
                  className="
                    px-6 py-12
                    text-center
                  "
                >
                  <Text size="sm" c="dimmed">
                    {emptyMessage}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.map((record, rowIndex) => (
                <Table.Tr
                  key={rowIndex}
                  onClick={() => onRowClick?.(record, rowIndex)}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`
                    border-b border-gray-200 dark:border-gray-800
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${hoveredRow === rowIndex ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                    transition-colors duration-150
                  `}
                >
                  {columns.map((column, colIndex) => (
                    <Table.Td
                      key={`${rowIndex}-${colIndex}`}
                      style={{
                        textAlign: column.textAlign || 'left',
                      }}
                      className="
                        px-6 py-4
                        text-sm
                        text-gray-700 dark:text-gray-300
                      "
                    >
                      {column.render
                        ? column.render(record, rowIndex)
                        : getColumnValue(record, column.accessor)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </div>

      {/* 分页控件 */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <Text size="sm" c="dimmed">
            显示{' '}
            {Math.min(
              (pagination.page - 1) * (pagination.recordsPerPage || 10) + 1,
              pagination.total
            )}{' '}
            - {Math.min(pagination.page * (pagination.recordsPerPage || 10), pagination.total)}{' '}
            条，共 {pagination.total} 条记录
          </Text>

          <Pagination
            value={pagination.page}
            onChange={pagination.onPageChange}
            total={totalPages}
            size="sm"
            radius="md"
            withEdges
            classNames={{
              control: `
                text-gray-700 dark:text-gray-300
                border-gray-300 dark:border-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-800
                data-[active]:bg-primary-500 data-[active]:text-white
                data-[active]:border-primary-500
              `,
            }}
          />
        </div>
      )}
    </div>
  )
}
