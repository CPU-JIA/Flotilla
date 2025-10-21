/**
 * 通知系统工具函数
 * ECP-A1: 单一职责 - 统一管理所有通知逻辑
 * ECP-B1: DRY - 避免重复的通知代码
 */

import { notifications } from '@mantine/notifications'

export interface NotificationOptions {
  title?: string
  message: string
  color?: 'green' | 'red' | 'yellow' | 'blue'
  autoClose?: number
}

/**
 * 显示成功通知
 */
export const showSuccess = (message: string, title = 'Success') => {
  notifications.show({
    title,
    message,
    color: 'green',
    autoClose: 3000,
  })
}

/**
 * 显示错误通知
 */
export const showError = (message: string, title = 'Error') => {
  notifications.show({
    title,
    message,
    color: 'red',
    autoClose: 5000,
  })
}

/**
 * 显示警告通知
 */
export const showWarning = (message: string, title = 'Warning') => {
  notifications.show({
    title,
    message,
    color: 'yellow',
    autoClose: 4000,
  })
}

/**
 * 显示信息通知
 */
export const showInfo = (message: string, title = 'Info') => {
  notifications.show({
    title,
    message,
    color: 'blue',
    autoClose: 3000,
  })
}

/**
 * 自定义通知
 */
export const showNotification = (options: NotificationOptions) => {
  notifications.show({
    title: options.title,
    message: options.message,
    color: options.color || 'blue',
    autoClose: options.autoClose ?? 3000,
  })
}
