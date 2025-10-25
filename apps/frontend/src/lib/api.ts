/**
 * API 客户端工具
 * ECP-A2: 高内聚低耦合 - 统一的API调用层
 * ECP-C1: 防御性编程 - 错误处理和令牌管理
 */

import type { Project, ProjectsResponse, Branch, UpdateProjectRequest } from '@/types/project'
import type { User, AuthResponse, RefreshTokenResponse } from '@/types/auth'
import type {
  AdminUsersResponse,
  AdminUserDetail,
  AdminProjectsResponse,
  SystemStats,
  UpdateUserRoleDto,
  ToggleUserActiveDto,
  AdminQueryUsersParams,
} from '@/types/admin'
import type { ProjectFile, FilesListResponse } from '@/types/file'
import type {
  Organization,
  OrganizationMember,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  AddOrganizationMemberRequest,
  UpdateOrganizationMemberRoleRequest,
} from '@/types/organization'
import type {
  Team,
  TeamMember,
  TeamProjectPermission,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
  UpdateTeamMemberRoleRequest,
  AssignProjectPermissionRequest,
  UpdateProjectPermissionRequest,
} from '@/types/team'
import type {
  Issue,
  IssuesResponse,
  CreateIssueDto,
  UpdateIssueDto,
  IssueQueryParams,
  Label,
  Milestone,
  IssueComment,
} from '@/types/issue'

// Commit interface for type safety
interface Commit {
  id: string
  message: string
  hash?: string
  createdAt: string
  author: {
    id: string
    username: string
    email: string
    avatar?: string
  }
  filesCount?: number
}

// CommitDiff interface for type safety
interface CommitDiff {
  commit: {
    id: string
    message: string
    createdAt: string
  }
  stats: {
    added: number
    modified: number
    deleted: number
    total: number
  }
  changes: {
    added: Array<{ id: string; path: string; size: number }>
    modified: Array<{ id: string; path: string; size: number }>
    deleted: Array<{ id: string; path: string; size: number }>
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

/**
 * 存储令牌到 localStorage
 */
export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }
}

/**
 * 获取访问令牌
 */
export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken')
  }
  return null
}

/**
 * 获取刷新令牌
 */
export const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken')
  }
  return null
}

/**
 * 清除所有令牌
 */
export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
}

/**
 * API 错误类
 * ECP-C2: 系统化错误处理
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 刷新访问令牌
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return null
    }

    const data = await response.json()
    setTokens(data.accessToken, refreshToken)
    return data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

/**
 * 统一的 API 请求方法
 * ECP-C1: 防御性编程 - 自动令牌刷新和错误处理
 *
 * @param endpoint - API 端点路径（不包含baseURL）
 * @param options - fetch 选项
 * @param requireAuth - 是否需要认证
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const headers: Record<string, string> = {}

  // ECP-C1: 防御性编程 - FormData上传需要浏览器自动设置Content-Type
  // 只有在 body 不是 FormData 时才手动设置 Content-Type
  // FormData 需要浏览器自动生成 multipart/form-data 和 boundary 参数
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // 合并用户传入的 headers
  Object.assign(headers, options.headers as Record<string, string>)

  // 添加认证令牌
  if (requireAuth) {
    const accessToken = getAccessToken()
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
  }

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    })

    // 如果401未授权且有刷新令牌，尝试刷新
    if (response.status === 401 && requireAuth) {
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        headers['Authorization'] = `Bearer ${newAccessToken}`
        response = await fetch(url, {
          ...options,
          headers,
        })
      } else {
        // 刷新失败，重定向到登录页
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new ApiError(401, 'Unauthorized')
      }
    }

    // 处理非 2xx 响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData.message || response.statusText, errorData)
    }

    // 解析响应
    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(0, 'Network error or invalid response', error)
  }
}

/**
 * API 端点封装
 * ECP-B1: DRY原则 - 避免重复的API调用代码
 */
export const api = {
  /**
   * 认证相关 API
   */
  auth: {
    login: (data: { usernameOrEmail: string; password: string }) =>
      apiRequest<AuthResponse>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      ),

    register: (data: { username: string; email: string; password: string }) =>
      apiRequest<AuthResponse>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      ),

    refresh: (refreshToken: string) =>
      apiRequest<RefreshTokenResponse>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        },
        false
      ),

    me: () => apiRequest<User>('/auth/me'),

    logout: () => {
      clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    },
  },

  /**
   * 用户相关 API
   */
  users: {
    getAll: (params?: { page?: number; pageSize?: number; search?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.search) queryParams.append('search', params.search)
      return apiRequest<{ users: User[]; total: number; page: number; pageSize: number }>(
        `/users?${queryParams.toString()}`
      )
    },

    getById: (id: string) => apiRequest<User>(`/users/${id}`),

    update: (id: string, data: { avatar?: string; bio?: string }) =>
      apiRequest<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    updatePassword: (id: string, data: { oldPassword: string; newPassword: string }) =>
      apiRequest<{ message: string }>(`/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * 项目相关 API
   */
  projects: {
    getAll: (params?: {
      page?: number
      pageSize?: number
      search?: string
      visibility?: string
    }) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.search) queryParams.append('search', params.search)
      if (params?.visibility) queryParams.append('visibility', params.visibility)
      return apiRequest<ProjectsResponse>(`/projects?${queryParams.toString()}`)
    },

    getById: (id: string) => apiRequest<Project>(`/projects/${id}`),

    create: (data: { name: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE' }) =>
      apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateProjectRequest) =>
      apiRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<{ message: string }>(`/projects/${id}`, {
        method: 'DELETE',
      }),

    getMembers: (projectId: string) =>
      apiRequest<Array<{
        id: string
        role: string
        joinedAt: string
        user: {
          id: string
          username: string
          email: string
        }
      }>>(`/projects/${projectId}/members`),

    addMember: (projectId: string, data: { userId: string; role: 'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER' }) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removeMember: (projectId: string, userId: string) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),

    updateMemberRole: (projectId: string, userId: string, role: 'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER') =>
      apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),

    archive: (id: string) =>
      apiRequest<Project>(`/projects/${id}/archive`, {
        method: 'POST',
      }),

    unarchive: (id: string) =>
      apiRequest<Project>(`/projects/${id}/unarchive`, {
        method: 'POST',
      }),
  },

  /**
   * 仓库相关 API
   */
  repositories: {
    // 手动创建Repository（用于未自动创建的旧项目）
    createRepository: (projectId: string) =>
      apiRequest<{ id: string; projectId: string }>(`/projects/${projectId}/repository`, {
        method: 'POST',
      }),

    getRepository: (projectId: string) =>
      apiRequest<{ id: string; projectId: string; defaultBranch: string }>(
        `/projects/${projectId}/repository`
      ),

    getBranches: (projectId: string) =>
      apiRequest<Branch[]>(`/projects/${projectId}/repository/branches`),

    createBranch: (projectId: string, data: { name: string }) =>
      apiRequest<Branch>(`/projects/${projectId}/repository/branches`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getFiles: (projectId: string, branchId: string) =>
      apiRequest<unknown[]>(`/projects/${projectId}/repository/branches/${branchId}/files`),

    uploadFile: (projectId: string, branchId: string, file: File, path: string) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)

      const accessToken = getAccessToken()
      return fetch(`${API_BASE_URL}/projects/${projectId}/repository/branches/${branchId}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new ApiError(response.status, errorData.message || response.statusText, errorData)
        }
        return response.json()
      })
    },

    downloadFile: (projectId: string, branchId: string, filePath: string) => {
      const accessToken = getAccessToken()
      return fetch(
        `${API_BASE_URL}/projects/${projectId}/repository/branches/${branchId}/files/download?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    },

    getCommits: (
      projectId: string,
      branchId: string,
      params?: { page?: number; pageSize?: number }
    ) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      return apiRequest<{ commits: Commit[]; total: number; page: number; pageSize: number }>(
        `/projects/${projectId}/repository/branches/${branchId}/commits?${queryParams.toString()}`
      )
    },

    createCommit: (projectId: string, data: { branchId: string; message: string }) =>
      apiRequest<unknown>(`/projects/${projectId}/repository/commits`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 获取单个提交详情
    getCommit: (projectId: string, branchId: string, commitId: string) =>
      apiRequest<unknown>(
        `/projects/${projectId}/repository/branches/${branchId}/commits/${commitId}`
      ),

    // 获取提交间差异
    getCommitDiff: (projectId: string, branchId: string, commitId: string, compareTo?: string) => {
      const queryParams = new URLSearchParams()
      if (compareTo) queryParams.append('compareTo', compareTo)
      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      return apiRequest<CommitDiff>(
        `/projects/${projectId}/repository/branches/${branchId}/commits/${commitId}/diff${query}`
      )
    },

    // 获取提交的文件内容
    getCommitFiles: (projectId: string, branchId: string, commitId: string, filePath?: string) => {
      const queryParams = new URLSearchParams()
      if (filePath) queryParams.append('path', filePath)
      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      return apiRequest<unknown>(
        `/projects/${projectId}/repository/branches/${branchId}/commits/${commitId}/files${query}`
      )
    },
  },

  /**
   * 管理员相关 API
   * ECP-A1: SOLID原则 - 管理员功能独立封装
   */
  admin: {
    // 用户管理
    getAllUsers: (params?: AdminQueryUsersParams) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.search) queryParams.append('search', params.search)
      if (params?.role) queryParams.append('role', params.role)
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
      return apiRequest<AdminUsersResponse>(`/admin/users?${queryParams.toString()}`)
    },

    getUserById: (id: string) => apiRequest<AdminUserDetail>(`/admin/users/${id}`),

    createUser: (data: { username: string; email: string; password: string; role?: string }) =>
      apiRequest<User>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateUserRole: (id: string, data: UpdateUserRoleDto) =>
      apiRequest<User>(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    toggleUserActive: (id: string, data: ToggleUserActiveDto) =>
      apiRequest<User>(`/admin/users/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteUser: (id: string) =>
      apiRequest<{ message: string }>(`/admin/users/${id}`, {
        method: 'DELETE',
      }),

    // 项目管理
    getAllProjects: (params?: { page?: number; pageSize?: number; search?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.search) queryParams.append('search', params.search)
      return apiRequest<AdminProjectsResponse>(`/admin/projects?${queryParams.toString()}`)
    },

    deleteProject: (id: string) =>
      apiRequest<{ message: string }>(`/admin/projects/${id}`, {
        method: 'DELETE',
      }),

    // 系统统计
    getSystemStats: () => apiRequest<SystemStats>('/admin/stats'),
  },

  /**
   * 文件管理相关 API
   * ECP-A1: SOLID原则 - 文件管理功能独立封装
   */
  files: {
    // 获取文件列表
    getFiles: (params: {
      projectId: string
      folder?: string
      search?: string
      page?: number
      pageSize?: number
    }) => {
      const queryParams = new URLSearchParams()
      queryParams.append('projectId', params.projectId)
      if (params.folder) queryParams.append('folder', params.folder)
      if (params.search) queryParams.append('search', params.search)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      return apiRequest<FilesListResponse>(`/files?${queryParams.toString()}`)
    },

    // 上传文件
    uploadFile: (projectId: string, file: File, folder: string = '/') => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('folder', folder)

      const accessToken = getAccessToken()
      return fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new ApiError(response.status, errorData.message || response.statusText, errorData)
        }
        return response.json()
      })
    },

    // 创建文件夹
    createFolder: (data: { projectId: string; name: string; parentPath: string }) =>
      apiRequest<ProjectFile>('/files/folder', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 获取文件信息
    getFileInfo: (id: string) => apiRequest<ProjectFile>(`/files/${id}`),

    // 获取文件内容（用于代码编辑器）
    getFileContent: (id: string) =>
      apiRequest<{ content: string; file: ProjectFile }>(`/files/${id}/content`),

    // 更新文件内容（保存代码编辑）
    updateFileContent: (id: string, content: string) =>
      apiRequest<ProjectFile>(`/files/${id}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),

    // 下载文件
    downloadFile: (id: string) => {
      const accessToken = getAccessToken()
      return fetch(`${API_BASE_URL}/files/${id}/download`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    },

    // 删除文件
    deleteFile: (id: string) =>
      apiRequest<{ message: string }>(`/files/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * 组织相关 API
   * ECP-A1: SOLID原则 - 组织管理功能独立封装
   */
  organizations: {
    // 获取用户所属组织列表
    getAll: (params?: { page?: number; pageSize?: number; search?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.search) queryParams.append('search', params.search)
      return apiRequest<Organization[]>(`/organizations?${queryParams.toString()}`)
    },

    // 创建组织
    create: (data: CreateOrganizationRequest) =>
      apiRequest<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 获取组织详情
    getBySlug: (slug: string) => apiRequest<Organization>(`/organizations/${slug}`),

    // 更新组织
    update: (slug: string, data: UpdateOrganizationRequest) =>
      apiRequest<Organization>(`/organizations/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 删除组织
    delete: (slug: string) =>
      apiRequest<{ message: string }>(`/organizations/${slug}`, {
        method: 'DELETE',
      }),

    // 获取组织成员列表
    getMembers: (slug: string) =>
      apiRequest<OrganizationMember[]>(`/organizations/${slug}/members`),

    // 添加组织成员
    addMember: (slug: string, data: AddOrganizationMemberRequest) =>
      apiRequest<OrganizationMember>(`/organizations/${slug}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新成员角色
    updateMemberRole: (slug: string, userId: string, data: UpdateOrganizationMemberRoleRequest) =>
      apiRequest<OrganizationMember>(`/organizations/${slug}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 移除成员
    removeMember: (slug: string, userId: string) =>
      apiRequest<{ message: string }>(`/organizations/${slug}/members/${userId}`, {
        method: 'DELETE',
      }),
  },

  /**
   * Team相关 API
   * ECP-A1: SOLID原则 - Team管理功能独立封装
   */
  teams: {
    // 获取用户在组织中的Teams列表
    getAll: (organizationSlug: string) =>
      apiRequest<Team[]>(`/organizations/${organizationSlug}/teams`),

    // 创建Team
    create: (organizationSlug: string, data: CreateTeamRequest) =>
      apiRequest<Team>(`/organizations/${organizationSlug}/teams`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 获取Team详情
    getBySlug: (organizationSlug: string, teamSlug: string) =>
      apiRequest<Team>(`/organizations/${organizationSlug}/teams/${teamSlug}`),

    // 更新Team
    update: (organizationSlug: string, teamSlug: string, data: UpdateTeamRequest) =>
      apiRequest<Team>(`/organizations/${organizationSlug}/teams/${teamSlug}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 删除Team
    delete: (organizationSlug: string, teamSlug: string) =>
      apiRequest<{ message: string }>(`/organizations/${organizationSlug}/teams/${teamSlug}`, {
        method: 'DELETE',
      }),

    // 获取Team成员列表
    getMembers: (organizationSlug: string, teamSlug: string) =>
      apiRequest<TeamMember[]>(`/organizations/${organizationSlug}/teams/${teamSlug}/members`),

    // 添加Team成员
    addMember: (organizationSlug: string, teamSlug: string, data: AddTeamMemberRequest) =>
      apiRequest<TeamMember>(`/organizations/${organizationSlug}/teams/${teamSlug}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新成员角色
    updateMemberRole: (
      organizationSlug: string,
      teamSlug: string,
      userId: string,
      data: UpdateTeamMemberRoleRequest
    ) =>
      apiRequest<TeamMember>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/members/${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      ),

    // 移除成员
    removeMember: (organizationSlug: string, teamSlug: string, userId: string) =>
      apiRequest<{ message: string }>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/members/${userId}`,
        {
          method: 'DELETE',
        }
      ),

    // 获取Team项目权限列表
    getPermissions: (organizationSlug: string, teamSlug: string) =>
      apiRequest<TeamProjectPermission[]>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/permissions`
      ),

    // 分配项目权限给Team
    assignPermission: (
      organizationSlug: string,
      teamSlug: string,
      data: AssignProjectPermissionRequest
    ) =>
      apiRequest<TeamProjectPermission>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/permissions`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),

    // 更新项目权限级别
    updatePermission: (
      organizationSlug: string,
      teamSlug: string,
      projectId: string,
      data: UpdateProjectPermissionRequest
    ) =>
      apiRequest<TeamProjectPermission>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/permissions/${projectId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      ),

    // 撤销项目权限
    revokePermission: (organizationSlug: string, teamSlug: string, projectId: string) =>
      apiRequest<{ message: string }>(
        `/organizations/${organizationSlug}/teams/${teamSlug}/permissions/${projectId}`,
        {
          method: 'DELETE',
        }
      ),
  },

  // ============================================
  // Issues API
  // ============================================
  issues: {
    // 获取Issue列表
    list: (projectId: string, params?: IssueQueryParams) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.state) searchParams.append('state', params.state)
      if (params?.assignee) searchParams.append('assignee', params.assignee)
      if (params?.labels) searchParams.append('labels', params.labels)
      if (params?.milestone) searchParams.append('milestone', params.milestone)
      if (params?.search) searchParams.append('search', params.search)

      const query = searchParams.toString()
      return apiRequest<IssuesResponse>(
        `/projects/${projectId}/issues${query ? `?${query}` : ''}`
      )
    },

    // 获取单个Issue
    get: (projectId: string, number: number) =>
      apiRequest<Issue>(`/projects/${projectId}/issues/${number}`),

    // 创建Issue
    create: (projectId: string, data: CreateIssueDto) =>
      apiRequest<Issue>(`/projects/${projectId}/issues`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新Issue
    update: (projectId: string, number: number, data: UpdateIssueDto) =>
      apiRequest<Issue>(`/projects/${projectId}/issues/${number}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 关闭Issue
    close: (projectId: string, number: number) =>
      apiRequest<Issue>(`/projects/${projectId}/issues/${number}/close`, {
        method: 'POST',
      }),

    // 重新打开Issue
    reopen: (projectId: string, number: number) =>
      apiRequest<Issue>(`/projects/${projectId}/issues/${number}/reopen`, {
        method: 'POST',
      }),

    // 删除Issue
    delete: (projectId: string, number: number) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/issues/${number}`, {
        method: 'DELETE',
      }),
  },

  // ============================================
  // Labels API
  // ============================================
  labels: {
    // 获取标签列表
    list: (projectId: string) =>
      apiRequest<Label[]>(`/projects/${projectId}/labels`),

    // 获取单个标签
    get: (projectId: string, id: string) =>
      apiRequest<Label>(`/projects/${projectId}/labels/${id}`),

    // 创建标签
    create: (projectId: string, data: { name: string; color: string; description?: string }) =>
      apiRequest<Label>(`/projects/${projectId}/labels`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新标签
    update: (projectId: string, id: string, data: Partial<{ name: string; color: string; description?: string }>) =>
      apiRequest<Label>(`/projects/${projectId}/labels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 删除标签
    delete: (projectId: string, id: string) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/labels/${id}`, {
        method: 'DELETE',
      }),
  },

  // ============================================
  // Milestones API
  // ============================================
  milestones: {
    // 获取里程碑列表
    list: (projectId: string, state?: 'OPEN' | 'CLOSED') => {
      const query = state ? `?state=${state}` : ''
      return apiRequest<Milestone[]>(`/projects/${projectId}/milestones${query}`)
    },

    // 获取单个里程碑
    get: (projectId: string, id: string) =>
      apiRequest<Milestone>(`/projects/${projectId}/milestones/${id}`),

    // 创建里程碑
    create: (projectId: string, data: { title: string; description?: string; dueDate?: string }) =>
      apiRequest<Milestone>(`/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新里程碑
    update: (projectId: string, id: string, data: Partial<{ title: string; description?: string; dueDate?: string; state?: 'OPEN' | 'CLOSED' }>) =>
      apiRequest<Milestone>(`/projects/${projectId}/milestones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 删除里程碑
    delete: (projectId: string, id: string) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * Issue Comments 相关 API
   * ECP-A1: SOLID原则 - 评论功能独立封装
   */
  comments: {
    // 获取Issue的所有评论
    list: (projectId: string, issueNumber: number) =>
      apiRequest<IssueComment[]>(`/projects/${projectId}/issues/${issueNumber}/comments`),

    // 添加评论
    create: (projectId: string, issueNumber: number, data: { body: string }) =>
      apiRequest<IssueComment>(`/projects/${projectId}/issues/${issueNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 更新评论
    update: (projectId: string, issueNumber: number, commentId: string, data: { body: string }) =>
      apiRequest<IssueComment>(`/projects/${projectId}/issues/${issueNumber}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // 删除评论
    delete: (projectId: string, issueNumber: number, commentId: string) =>
      apiRequest<{ message: string }>(`/projects/${projectId}/issues/${issueNumber}/comments/${commentId}`, {
        method: 'DELETE',
      }),
  },
}
