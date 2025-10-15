/**
 * Raft分布式命令操作面板
 *
 * 允许用户通过界面执行分布式命令
 * ECP-C1: 防御性编程 - 输入验证和错误处理
 * ECP-B3: 清晰命名 - 语义化的操作名称
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  FolderPlus,
  GitCommit,
  GitBranch,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface CommandResult {
  success: boolean
  data?: unknown
  error?: string
  leaderId?: string
  timestamp: number
}

interface CommandHistory {
  id: string
  type: string
  payload: unknown
  result: CommandResult
  timestamp: number
}

export function RaftCommandPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [history, setHistory] = useState<CommandHistory[]>([])

  // 项目创建表单
  const [projectForm, setProjectForm] = useState({
    id: '',
    name: '',
    description: '',
    ownerId: '',
  })

  // Git提交表单
  const [gitCommitForm, setGitCommitForm] = useState({
    repositoryId: '',
    branchName: 'main',
    message: '',
    authorName: '',
    authorEmail: '',
    filePath: '',
    fileContent: '',
  })

  // Git分支表单
  const [gitBranchForm, setGitBranchForm] = useState({
    repositoryId: '',
    branchName: '',
    fromBranch: 'main',
  })

  // 通用命令表单
  const [customCommand, setCustomCommand] = useState({
    type: '',
    payload: '{}',
  })

  // 执行命令的通用方法
  const executeCommand = async (endpoint: string, payload: unknown, commandType: string) => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/raft-cluster/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      const commandResult: CommandResult = {
        ...result,
        timestamp: Date.now(),
      }

      setResult(commandResult)

      // 添加到历史记录
      const historyItem: CommandHistory = {
        id: `cmd-${Date.now()}`,
        type: commandType,
        payload,
        result: commandResult,
        timestamp: Date.now(),
      }

      setHistory(prev => [historyItem, ...prev.slice(0, 9)]) // 保留最近10条

    } catch (err) {
      const errorResult: CommandResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
      }
      setResult(errorResult)
    } finally {
      setLoading(false)
    }
  }

  // 创建项目
  const handleCreateProject = async () => {
    if (!projectForm.id || !projectForm.name || !projectForm.ownerId) {
      setResult({
        success: false,
        error: '请填写所有必需字段',
        timestamp: Date.now(),
      })
      return
    }

    await executeCommand('projects', projectForm, 'CREATE_PROJECT')
  }

  // Git提交
  const handleGitCommit = async () => {
    if (!gitCommitForm.repositoryId || !gitCommitForm.message || !gitCommitForm.authorName) {
      setResult({
        success: false,
        error: '请填写所有必需字段',
        timestamp: Date.now(),
      })
      return
    }

    const commitData = {
      repositoryId: gitCommitForm.repositoryId,
      branchName: gitCommitForm.branchName,
      message: gitCommitForm.message,
      author: {
        name: gitCommitForm.authorName,
        email: gitCommitForm.authorEmail,
      },
      files: gitCommitForm.filePath ? [{
        path: gitCommitForm.filePath,
        content: gitCommitForm.fileContent,
        mimeType: 'text/plain',
      }] : [],
    }

    await executeCommand('git/commit', commitData, 'GIT_COMMIT')
  }

  // Git创建分支
  const handleGitCreateBranch = async () => {
    if (!gitBranchForm.repositoryId || !gitBranchForm.branchName) {
      setResult({
        success: false,
        error: '请填写所有必需字段',
        timestamp: Date.now(),
      })
      return
    }

    await executeCommand('git/branch', gitBranchForm, 'GIT_CREATE_BRANCH')
  }

  // 执行自定义命令
  const handleCustomCommand = async () => {
    if (!customCommand.type) {
      setResult({
        success: false,
        error: '请指定命令类型',
        timestamp: Date.now(),
      })
      return
    }

    try {
      const payload = JSON.parse(customCommand.payload)
      await executeCommand('command', {
        type: customCommand.type,
        payload,
      }, customCommand.type)
    } catch {
      setResult({
        success: false,
        error: 'Invalid JSON payload',
        timestamp: Date.now(),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 命令操作面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            分布式命令执行
          </CardTitle>
          <CardDescription>
            通过Raft共识算法执行分布式操作，确保集群一致性
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="project">创建项目</TabsTrigger>
              <TabsTrigger value="git-commit">Git提交</TabsTrigger>
              <TabsTrigger value="git-branch">Git分支</TabsTrigger>
              <TabsTrigger value="custom">自定义命令</TabsTrigger>
            </TabsList>

            {/* 创建项目 */}
            <TabsContent value="project" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-id">项目ID *</Label>
                  <Input
                    id="project-id"
                    value={projectForm.id}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="unique-project-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-name">项目名称 *</Label>
                  <Input
                    id="project-name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Awesome Project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-owner">项目所有者 *</Label>
                  <Input
                    id="project-owner"
                    value={projectForm.ownerId}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, ownerId: e.target.value }))}
                    placeholder="user-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc">项目描述</Label>
                  <Input
                    id="project-desc"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Project description"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateProject}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-2" />}
                通过Raft共识创建项目
              </Button>
            </TabsContent>

            {/* Git提交 */}
            <TabsContent value="git-commit" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-id">仓库ID *</Label>
                  <Input
                    id="repo-id"
                    value={gitCommitForm.repositoryId}
                    onChange={(e) => setGitCommitForm(prev => ({ ...prev, repositoryId: e.target.value }))}
                    placeholder="repository-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-name">分支名称</Label>
                  <Input
                    id="branch-name"
                    value={gitCommitForm.branchName}
                    onChange={(e) => setGitCommitForm(prev => ({ ...prev, branchName: e.target.value }))}
                    placeholder="main"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-name">作者姓名 *</Label>
                  <Input
                    id="author-name"
                    value={gitCommitForm.authorName}
                    onChange={(e) => setGitCommitForm(prev => ({ ...prev, authorName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-email">作者邮箱</Label>
                  <Input
                    id="author-email"
                    value={gitCommitForm.authorEmail}
                    onChange={(e) => setGitCommitForm(prev => ({ ...prev, authorEmail: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file-path">文件路径</Label>
                  <Input
                    id="file-path"
                    value={gitCommitForm.filePath}
                    onChange={(e) => setGitCommitForm(prev => ({ ...prev, filePath: e.target.value }))}
                    placeholder="src/main.ts"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commit-message">提交信息 *</Label>
                <Input
                  id="commit-message"
                  value={gitCommitForm.message}
                  onChange={(e) => setGitCommitForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Add new feature"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-content">文件内容</Label>
                <Textarea
                  id="file-content"
                  value={gitCommitForm.fileContent}
                  onChange={(e) => setGitCommitForm(prev => ({ ...prev, fileContent: e.target.value }))}
                  placeholder="console.log('Hello, World!')"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleGitCommit}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCommit className="w-4 h-4 mr-2" />}
                通过Raft共识执行Git提交
              </Button>
            </TabsContent>

            {/* Git分支 */}
            <TabsContent value="git-branch" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch-repo-id">仓库ID *</Label>
                  <Input
                    id="branch-repo-id"
                    value={gitBranchForm.repositoryId}
                    onChange={(e) => setGitBranchForm(prev => ({ ...prev, repositoryId: e.target.value }))}
                    placeholder="repository-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-branch-name">新分支名称 *</Label>
                  <Input
                    id="new-branch-name"
                    value={gitBranchForm.branchName}
                    onChange={(e) => setGitBranchForm(prev => ({ ...prev, branchName: e.target.value }))}
                    placeholder="feature-new"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-branch">源分支</Label>
                  <Input
                    id="from-branch"
                    value={gitBranchForm.fromBranch}
                    onChange={(e) => setGitBranchForm(prev => ({ ...prev, fromBranch: e.target.value }))}
                    placeholder="main"
                  />
                </div>
              </div>
              <Button
                onClick={handleGitCreateBranch}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitBranch className="w-4 h-4 mr-2" />}
                通过Raft共识创建Git分支
              </Button>
            </TabsContent>

            {/* 自定义命令 */}
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="command-type">命令类型</Label>
                <Input
                  id="command-type"
                  value={customCommand.type}
                  onChange={(e) => setCustomCommand(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="CREATE_PROJECT, GIT_COMMIT, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="command-payload">命令载荷 (JSON)</Label>
                <Textarea
                  id="command-payload"
                  value={customCommand.payload}
                  onChange={(e) => setCustomCommand(prev => ({ ...prev, payload: e.target.value }))}
                  placeholder='{"key": "value"}'
                  rows={6}
                />
              </div>
              <Button
                onClick={handleCustomCommand}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                执行自定义命令
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 执行结果 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              执行结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  命令执行成功！数据已通过Raft共识复制到集群。
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.error}
                  {result.leaderId && (
                    <div className="mt-2">
                      <Badge variant="outline">重定向到Leader: {result.leaderId}</Badge>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {result.data ? (
              <div className="mt-4">
                <Label>响应数据:</Label>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* 命令历史 */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>命令历史</CardTitle>
            <CardDescription>最近执行的分布式命令记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <Badge variant="outline">{item.type}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.result.success ? '成功' : '失败'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}