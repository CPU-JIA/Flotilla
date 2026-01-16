'use client'

/**
 * Git Clone URL Panel
 * ECP-A1: 单一职责 - 显示 Git clone URL 和使用指南
 * ECP-B2: KISS - 简单直观的复制功能
 */

import { logger } from '@/lib/logger'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/language-context'

interface CloneUrlPanelProps {
  projectId: string
}

export function CloneUrlPanel({ projectId }: CloneUrlPanelProps) {
  const { t } = useLanguage()
  const [showGuide, setShowGuide] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedClone, setCopiedClone] = useState(false)
  const [copiedPush, setCopiedPush] = useState(false)
  const [copiedPull, setCopiedPull] = useState(false)

  // ECP-D3: No magic strings - API URL from environment
  // Note: Git HTTP Smart Protocol routes are excluded from /api prefix
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'
  const cloneUrl = `${baseUrl}/repo/${projectId}`

  // 复制 URL 到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logger.error('Failed to copy:', err)
      alert(t.git.cloneUrl.copyFailed || 'Failed to copy URL')
    }
  }

  // 复制命令到剪贴板
  const handleCopyCommand = async (command: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logger.error('Failed to copy command:', err)
      alert(t.git.cloneUrl.copyFailed || 'Failed to copy command')
    }
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">🔗</span>
          <span>{t.git.cloneUrl.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clone URL Input */}
        <div className="flex gap-2">
          <Input
            value={cloneUrl}
            readOnly
            className="font-mono text-sm bg-white dark:bg-gray-900"
          />
          <Button
            onClick={handleCopy}
            variant={copied ? 'default' : 'outline'}
            className="shrink-0"
          >
            {copied ? (
              <>
                <span className="mr-2">✅</span>
                {t.git.cloneUrl.copied}
              </>
            ) : (
              <>
                <span className="mr-2">📋</span>
                {t.git.cloneUrl.copy}
              </>
            )}
          </Button>
        </div>

        {/* Toggle Guide Button */}
        <Button
          onClick={() => setShowGuide(!showGuide)}
          variant="ghost"
          className="w-full"
          size="sm"
        >
          <span className="mr-2">📖</span>
          {showGuide ? t.git.cloneUrl.hideGuide : t.git.cloneUrl.showGuide}
        </Button>

        {/* Usage Guide */}
        {showGuide && (
          <div className="space-y-3 pt-2 border-t border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm text-card-foreground">{t.git.cloneUrl.guide}:</h4>

            {/* Clone Command */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.git.cloneUrl.cloneCommand}:</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded text-xs overflow-x-auto">
                  git clone {cloneUrl}
                </code>
                <Button
                  onClick={() => handleCopyCommand(`git clone ${cloneUrl}`, setCopiedClone)}
                  variant={copiedClone ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                >
                  {copiedClone ? (
                    <>
                      <span className="mr-1">✅</span>
                      {t.git.cloneUrl.copied}
                    </>
                  ) : (
                    <>
                      <span className="mr-1">📋</span>
                      {t.git.cloneUrl.copy}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Push Command */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.git.cloneUrl.pushCommand}:</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded text-xs overflow-x-auto">
                  git add .{'\n'}
                  git commit -m &quot;your message&quot;{'\n'}
                  git push origin main
                </code>
                <Button
                  onClick={() =>
                    handleCopyCommand(
                      'git add .\ngit commit -m "your message"\ngit push origin main',
                      setCopiedPush
                    )
                  }
                  variant={copiedPush ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                >
                  {copiedPush ? (
                    <>
                      <span className="mr-1">✅</span>
                      {t.git.cloneUrl.copied}
                    </>
                  ) : (
                    <>
                      <span className="mr-1">📋</span>
                      {t.git.cloneUrl.copy}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Pull Command */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.git.cloneUrl.pullCommand}:</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded text-xs overflow-x-auto">
                  git pull origin main
                </code>
                <Button
                  onClick={() => handleCopyCommand('git pull origin main', setCopiedPull)}
                  variant={copiedPull ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                >
                  {copiedPull ? (
                    <>
                      <span className="mr-1">✅</span>
                      {t.git.cloneUrl.copied}
                    </>
                  ) : (
                    <>
                      <span className="mr-1">📋</span>
                      {t.git.cloneUrl.copy}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
