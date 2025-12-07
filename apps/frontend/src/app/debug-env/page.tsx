'use client'

/**
 * 环境变量调试页面
 * 增强版：包含API连接测试和HSTS诊断
 */

import { useState, useEffect } from 'react'

export default function DebugEnvPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET'
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [storageState, setStorageState] = useState({ accessToken: 'NONE', refreshToken: 'NONE' })

  // ECP-C1: 防御性编程 - 在客户端挂载后才读取 localStorage，避免 SSR hydration mismatch
  useEffect(() => {
    setStorageState({
      accessToken: localStorage.getItem('accessToken') ? 'EXISTS' : 'NONE',
      refreshToken: localStorage.getItem('refreshToken') ? 'EXISTS' : 'NONE',
    })
  }, [])

  // 测试API连接
  const testApiConnection = async () => {
    setIsLoading(true)
    setTestResult('Testing...')

    try {
      const fullUrl = apiUrl.startsWith('/')
        ? `${window.location.origin}${apiUrl}/monitoring/health`
        : `${apiUrl}/monitoring/health`

      console.log('[Debug] Testing URL:', fullUrl)

      const startTime = performance.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      const data = await response.json().catch(() => null)

      setTestResult(
        `✅ SUCCESS\n` +
        `Status: ${response.status} ${response.statusText}\n` +
        `URL: ${fullUrl}\n` +
        `Protocol: ${new URL(fullUrl).protocol}\n` +
        `Duration: ${duration}ms\n` +
        `Response: ${JSON.stringify(data, null, 2)}`
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setTestResult(
        `❌ FAILED\n` +
        `Error: ${errorMsg}\n` +
        `\nTroubleshooting:\n` +
        `1. Check if backend is running (http://localhost:4000)\n` +
        `2. Check NEXT_PUBLIC_API_URL value\n` +
        `3. Check browser Network tab for actual request\n` +
        `4. Try clearing browser cache and HSTS settings`
      )
      console.error('[Debug] Fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 测试直接后端连接（绕过代理）
  const testDirectBackend = async () => {
    setIsLoading(true)
    setTestResult('Testing direct backend connection...')

    try {
      const backendUrl = 'http://localhost:4000/api/monitoring/health'
      console.log('[Debug] Testing direct backend:', backendUrl)

      const startTime = performance.now()
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      const data = await response.json().catch(() => null)

      setTestResult(
        `✅ DIRECT BACKEND SUCCESS\n` +
        `This means HSTS is NOT the problem.\n\n` +
        `Status: ${response.status} ${response.statusText}\n` +
        `Duration: ${duration}ms\n` +
        `Response: ${JSON.stringify(data, null, 2)}`
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setTestResult(
        `❌ DIRECT BACKEND FAILED\n` +
        `This suggests HSTS or CORS issue.\n\n` +
        `Error: ${errorMsg}\n` +
        `\n🔧 Solution:\n` +
        `1. Use API Proxy (NEXT_PUBLIC_API_URL=/api-proxy)\n` +
        `2. OR clear HSTS cache (see HSTS_CLEANUP_GUIDE.md)\n` +
        `3. Check browser Network tab - does it show https instead of http?`
      )
      console.error('[Debug] Direct backend error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Environment & API Debug Panel</h1>

        {/* Environment Variables */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex">
              <span className="w-64 font-bold">NEXT_PUBLIC_API_URL:</span>
              <span className="text-blue-600 dark:text-blue-400">{apiUrl}</span>
            </div>
            <div className="flex">
              <span className="w-64 font-bold">NODE_ENV:</span>
              <span className="text-blue-600 dark:text-blue-400">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex">
              <span className="w-64 font-bold">Using Proxy:</span>
              <span className={`${apiUrl.startsWith('/') ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {apiUrl.startsWith('/') ? 'YES ✓ (Recommended)' : 'NO (Direct connection)'}
              </span>
            </div>
          </div>
        </div>

        {/* LocalStorage Tokens */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">LocalStorage Tokens</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex">
              <span className="w-64 font-bold">Access Token:</span>
              <span className="text-green-600 dark:text-green-400">{storageState.accessToken}</span>
            </div>
            <div className="flex">
              <span className="w-64 font-bold">Refresh Token:</span>
              <span className="text-green-600 dark:text-green-400">{storageState.refreshToken}</span>
            </div>
          </div>
        </div>

        {/* API Connection Tests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">API Connection Tests</h2>
          <div className="flex gap-3 mb-4">
            <button
              onClick={testApiConnection}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Testing...' : 'Test Current Config'}
            </button>
            <button
              onClick={testDirectBackend}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Testing...' : 'Test Direct Backend'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded font-mono text-sm whitespace-pre-wrap ${
              testResult.includes('SUCCESS')
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              {testResult}
            </div>
          )}
        </div>

        {/* Configuration Guide */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>📘 Configuration Guide:</strong>
            <br />
            <br /><strong>If using API Proxy (Recommended):</strong>
            <br />NEXT_PUBLIC_API_URL=/api-proxy
            <br />
            <br /><strong>If using Direct Connection:</strong>
            <br />NEXT_PUBLIC_API_URL=http://localhost:4000/api
            <br />
            <br /><strong>After changing .env.local:</strong>
            <br />1. Stop dev server (Ctrl+C)
            <br />2. Delete .next folder: <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">rm -rf .next</code>
            <br />3. Restart: <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">pnpm dev</code>
          </p>
        </div>

        {/* Documentation Links */}
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>📚 Documentation:</strong>
            <br />• Complete solutions: <code className="px-1 bg-yellow-100 dark:bg-yellow-900 rounded">apps/frontend/CONNECTION_SOLUTIONS.md</code>
            <br />• HSTS cleanup guide: <code className="px-1 bg-yellow-100 dark:bg-yellow-900 rounded">apps/frontend/HSTS_CLEANUP_GUIDE.md</code>
          </p>
        </div>
      </div>
    </div>
  )
}
