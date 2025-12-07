'use client'

/**
 * 设置页面 - 重定向到个人资料
 * ECP-A1: 单一职责 - 提供默认路由
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings/profile')
  }, [router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
