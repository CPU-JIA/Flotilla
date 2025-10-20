'use client'

/**
 * 首页 - 欢迎页面
 * 如果用户已登录，自动跳转到 Dashboard
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Flotilla
          </CardTitle>
          <CardDescription className="text-lg">
            基于云计算的开发协作平台
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              一个现代化的云端开发协作平台，支持项目管理、代码仓库、分支管理和实时协作
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">🚀</div>
                <div className="mt-2 font-semibold">高性能</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">基于现代技术栈</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">🔒</div>
                <div className="mt-2 font-semibold">安全可靠</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">企业级安全保障</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">⚡</div>
                <div className="mt-2 font-semibold">易于使用</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">直观的用户界面</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/auth/login">
                <Button size="lg" className="w-full sm:w-auto">
                  登录
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  注册账号
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>技术栈：Next.js 15 · React 19 · NestJS 11 · PostgreSQL 16 · MinIO</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
