/**
 * 项目相关类型定义
 * ECP-B3: 清晰的类型命名
 */

export interface Project {
  id: string
  name: string
  description?: string
  visibility: 'PUBLIC' | 'PRIVATE'
  ownerId: string
  createdAt: string
  updatedAt: string
  owner?: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  members?: ProjectMember[]
  repository?: Repository
  _count?: {
    members: number
  }
}

export interface ProjectMember {
  id: string
  userId: string
  projectId: string
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
  joinedAt: string
  user?: {
    id: string
    username: string
    email: string
    avatar?: string
  }
}

export interface Repository {
  id: string
  projectId: string
  defaultBranch: string
  storageUsed: number
  createdAt: string
  updatedAt: string
  branches?: Branch[]
  _count?: {
    branches: number
    commits: number
    files: number
  }
}

export interface Branch {
  id: string
  name: string
  repositoryId: string
  lastCommitId?: string
  createdAt: string
  updatedAt: string
  _count?: {
    commits: number
  }
}

export interface Commit {
  id: string
  message: string
  hash: string
  repositoryId: string
  branchId: string
  authorId: string
  parentCommitId?: string
  createdAt: string
  author?: {
    id: string
    username: string
    email: string
    avatar?: string
  }
}

export interface File {
  id: string
  repositoryId: string
  branchId: string
  path: string
  objectName: string
  size: number
  mimeType?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
}

export interface AddMemberRequest {
  userId: string
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
}

export interface UpdateMemberRoleRequest {
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
  page: number
  pageSize: number
}
