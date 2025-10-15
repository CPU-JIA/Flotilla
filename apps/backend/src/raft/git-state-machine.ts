/**
 * Git State Machine for Raft
 *
 * 基于Raft共识的Git操作状态机
 * 处理分布式Git命令的执行和状态维护
 *
 * ECP-A1: SOLID - 状态机专注于命令执行
 * ECP-C1: 防御性编程 - 命令验证和错误处理
 * ECP-B1: DRY - 统一的命令处理模式
 */

import { CommandType } from './types'
import type { StateMachine, Command } from './types'

// Git状态数据结构
interface GitRepository {
  id: string
  name: string
  description: string
  branches: Map<string, GitBranch>
  defaultBranch: string
  createdAt: number
  updatedAt: number
}

interface GitBranch {
  name: string
  commits: GitCommit[]
  head: string // commit hash
  createdAt: number
}

interface GitCommit {
  hash: string
  message: string
  author: string
  timestamp: number
  files: Map<string, GitFile>
  parent?: string
}

interface GitFile {
  path: string
  content: string
  size: number
  mimeType: string
  hash: string
}

interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  repositoryId?: string
  createdAt: number
  updatedAt: number
}

// 状态机的完整状态
interface GitStateMachineState {
  projects: Map<string, Project>
  repositories: Map<string, GitRepository>
  users: Map<string, any> // 简化的用户信息
  lastAppliedIndex: number
}

export class GitStateMachine implements StateMachine {
  private state: GitStateMachineState

  constructor(private readonly nodeId: string) {
    this.state = {
      projects: new Map(),
      repositories: new Map(),
      users: new Map(),
      lastAppliedIndex: 0,
    }

    this.debugLog('State machine initialized')
  }

  /**
   * 应用命令到状态机
   * ECP-A1: 单一职责 - 专注于命令执行
   */
  async apply(command: Command): Promise<any> {
    try {
      this.debugLog(`Applying command: ${command.type}`)

      let result: any
      switch (command.type) {
        case CommandType.CREATE_PROJECT:
          result = await this.handleCreateProject(command)
          break

        case CommandType.UPDATE_PROJECT:
          result = await this.handleUpdateProject(command)
          break

        case CommandType.DELETE_PROJECT:
          result = await this.handleDeleteProject(command)
          break

        case CommandType.GIT_COMMIT:
          result = await this.handleGitCommit(command)
          break

        case CommandType.GIT_CREATE_BRANCH:
          result = await this.handleGitCreateBranch(command)
          break

        case CommandType.GIT_MERGE:
          result = await this.handleGitMerge(command)
          break

        case CommandType.CREATE_FILE:
          result = await this.handleCreateFile(command)
          break

        case CommandType.UPDATE_FILE:
          result = await this.handleUpdateFile(command)
          break

        case CommandType.DELETE_FILE:
          result = await this.handleDeleteFile(command)
          break

        default:
          throw new Error(`Unknown command type: ${command.type}`)
      }

      this.debugLog(`Command ${command.type} applied successfully`)
      return result
    } catch (error) {
      this.debugLog(`Error applying command ${command.type}: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * 获取状态机当前状态
   */
  getState(): any {
    return {
      projectCount: this.state.projects.size,
      repositoryCount: this.state.repositories.size,
      userCount: this.state.users.size,
      lastAppliedIndex: this.state.lastAppliedIndex,
      nodeId: this.nodeId,
    }
  }

  /**
   * 创建状态快照
   */
  async createSnapshot(): Promise<Buffer> {
    const snapshot = {
      projects: Object.fromEntries(this.state.projects),
      repositories: Object.fromEntries(
        Array.from(this.state.repositories.entries()).map(([id, repo]) => [
          id,
          {
            ...repo,
            branches: Object.fromEntries(repo.branches),
          },
        ])
      ),
      users: Object.fromEntries(this.state.users),
      lastAppliedIndex: this.state.lastAppliedIndex,
    }

    return Buffer.from(JSON.stringify(snapshot))
  }

  /**
   * 从快照恢复状态
   */
  async restoreFromSnapshot(snapshot: Buffer): Promise<void> {
    try {
      const data = JSON.parse(snapshot.toString())

      this.state.projects = new Map(Object.entries(data.projects))
      this.state.users = new Map(Object.entries(data.users))
      this.state.lastAppliedIndex = data.lastAppliedIndex

      // 恢复repositories（需要重建Map结构）
      this.state.repositories = new Map()
      for (const [id, repoData] of Object.entries(data.repositories as Record<string, any>)) {
        const typedRepoData = repoData as any
        const repo: GitRepository = {
          id: typedRepoData.id,
          name: typedRepoData.name,
          description: typedRepoData.description,
          defaultBranch: typedRepoData.defaultBranch,
          createdAt: typedRepoData.createdAt,
          updatedAt: typedRepoData.updatedAt,
          branches: new Map(Object.entries(typedRepoData.branches)),
        }
        this.state.repositories.set(id, repo)
      }

      this.debugLog(`Restored state from snapshot: ${this.state.projects.size} projects, ${this.state.repositories.size} repositories`)
    } catch (error) {
      throw new Error(`Failed to restore from snapshot: ${(error as Error).message}`)
    }
  }

  /**
   * 命令处理器实现
   */

  private async handleCreateProject(command: Command): Promise<any> {
    const { id, name, description, ownerId } = command.payload

    if (this.state.projects.has(id)) {
      throw new Error(`Project ${id} already exists`)
    }

    const project: Project = {
      id,
      name,
      description,
      ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.state.projects.set(id, project)

    // 自动创建Git仓库
    const repository: GitRepository = {
      id: `repo-${id}`,
      name,
      description,
      branches: new Map(),
      defaultBranch: 'main',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // 创建默认主分支
    const mainBranch: GitBranch = {
      name: 'main',
      commits: [],
      head: '',
      createdAt: Date.now(),
    }

    repository.branches.set('main', mainBranch)
    this.state.repositories.set(repository.id, repository)

    // 更新项目的仓库关联
    project.repositoryId = repository.id
    this.state.projects.set(id, project)

    return { project, repository }
  }

  private async handleUpdateProject(command: Command): Promise<any> {
    const { id, ...updates } = command.payload

    const project = this.state.projects.get(id)
    if (!project) {
      throw new Error(`Project ${id} not found`)
    }

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: Date.now(),
    }

    this.state.projects.set(id, updatedProject)
    return updatedProject
  }

  private async handleDeleteProject(command: Command): Promise<any> {
    const { id } = command.payload

    const project = this.state.projects.get(id)
    if (!project) {
      throw new Error(`Project ${id} not found`)
    }

    // 删除关联的仓库
    if (project.repositoryId) {
      this.state.repositories.delete(project.repositoryId)
    }

    this.state.projects.delete(id)
    return { deleted: true }
  }

  private async handleGitCommit(command: Command): Promise<any> {
    const { repositoryId, branchName, message, author, files } = command.payload

    const repository = this.state.repositories.get(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    const branch = repository.branches.get(branchName)
    if (!branch) {
      throw new Error(`Branch ${branchName} not found`)
    }

    // 创建提交
    const commitHash = this.generateCommitHash(message, author, Date.now())
    const commit: GitCommit = {
      hash: commitHash,
      message,
      author,
      timestamp: Date.now(),
      files: new Map(),
      parent: branch.head,
    }

    // 处理文件变更
    for (const file of files) {
      const gitFile: GitFile = {
        path: file.path,
        content: file.content,
        size: file.content.length,
        mimeType: file.mimeType || 'text/plain',
        hash: this.generateFileHash(file.content),
      }
      commit.files.set(file.path, gitFile)
    }

    // 更新分支
    branch.commits.push(commit)
    branch.head = commitHash

    // 更新仓库
    repository.updatedAt = Date.now()

    return { commit, branch: branchName, repository: repositoryId }
  }

  private async handleGitCreateBranch(command: Command): Promise<any> {
    const { repositoryId, branchName, fromBranch } = command.payload

    const repository = this.state.repositories.get(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    if (repository.branches.has(branchName)) {
      throw new Error(`Branch ${branchName} already exists`)
    }

    const sourceBranch = repository.branches.get(fromBranch || repository.defaultBranch)
    if (!sourceBranch) {
      throw new Error(`Source branch ${fromBranch} not found`)
    }

    // 创建新分支（复制源分支的提交历史）
    const newBranch: GitBranch = {
      name: branchName,
      commits: [...sourceBranch.commits], // 复制提交历史
      head: sourceBranch.head,
      createdAt: Date.now(),
    }

    repository.branches.set(branchName, newBranch)
    repository.updatedAt = Date.now()

    return { branch: branchName, repository: repositoryId }
  }

  private async handleGitMerge(command: Command): Promise<any> {
    // 简化的合并实现
    const { repositoryId, sourceBranch, targetBranch, message, author } = command.payload

    const repository = this.state.repositories.get(repositoryId)
    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found`)
    }

    const source = repository.branches.get(sourceBranch)
    const target = repository.branches.get(targetBranch)

    if (!source || !target) {
      throw new Error('Source or target branch not found')
    }

    // 简单合并：将源分支的提交添加到目标分支
    const mergeCommit: GitCommit = {
      hash: this.generateCommitHash(message, author, Date.now()),
      message,
      author,
      timestamp: Date.now(),
      files: new Map(),
      parent: target.head,
    }

    target.commits.push(mergeCommit)
    target.head = mergeCommit.hash

    repository.updatedAt = Date.now()

    return { mergeCommit, targetBranch }
  }

  private async handleCreateFile(command: Command): Promise<any> {
    return this.handleFileOperation(command, 'create')
  }

  private async handleUpdateFile(command: Command): Promise<any> {
    return this.handleFileOperation(command, 'update')
  }

  private async handleDeleteFile(command: Command): Promise<any> {
    return this.handleFileOperation(command, 'delete')
  }

  private async handleFileOperation(command: Command, operation: 'create' | 'update' | 'delete'): Promise<any> {
    // 文件操作将作为Git提交处理
    const { repositoryId, branchName, filePath, content, author, message } = command.payload

    const commitMessage = message || `${operation} ${filePath}`
    const files = operation === 'delete' ? [] : [{ path: filePath, content, mimeType: 'text/plain' }]

    return this.handleGitCommit({
      type: CommandType.GIT_COMMIT,
      payload: {
        repositoryId,
        branchName: branchName || 'main',
        message: commitMessage,
        author,
        files,
      },
    })
  }

  /**
   * 工具方法
   */

  private generateCommitHash(message: string, author: string, timestamp: number): string {
    const data = `${message}-${author}-${timestamp}`
    return `commit-${this.simpleHash(data)}`
  }

  private generateFileHash(content: string): string {
    return `file-${this.simpleHash(content)}`
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private debugLog(message: string): void {
    console.log(`[${this.nodeId}] [STATE_MACHINE] ${message}`)
  }

  /**
   * 查询方法（只读操作）
   */

  getProject(id: string): Project | undefined {
    return this.state.projects.get(id)
  }

  getRepository(id: string): GitRepository | undefined {
    return this.state.repositories.get(id)
  }

  getAllProjects(): Project[] {
    return Array.from(this.state.projects.values())
  }

  getProjectRepository(projectId: string): GitRepository | undefined {
    const project = this.state.projects.get(projectId)
    if (!project || !project.repositoryId) {
      return undefined
    }
    return this.state.repositories.get(project.repositoryId)
  }

  getBranchCommits(repositoryId: string, branchName: string): GitCommit[] {
    const repository = this.state.repositories.get(repositoryId)
    if (!repository) {
      return []
    }

    const branch = repository.branches.get(branchName)
    return branch ? branch.commits : []
  }
}