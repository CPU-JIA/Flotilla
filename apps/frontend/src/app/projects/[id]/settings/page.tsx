'use client'

/**
 * Project Settings Root Page
 * ECP-A1: 单一职责 - 重定向到General Settings
 */

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ProjectSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/settings/general`)
    }
  }, [projectId, router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )
}
