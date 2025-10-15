/**
 * API 客户端工具
 * ECP-A2: 高内聚低耦合 - 统一的API调用层
 * ECP-C1: 防御性编程 - 错误处理和令牌管理
 */

import type { Project, ProjectsResponse, Branch } from '@/types/project'
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

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
      throw new ApiError(
        response.status,
        errorData.message || response.statusText,
        errorData
      )
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
      apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }, false),

    register: (data: { username: string; email: string; password: string }) =>
      apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }, false),

    refresh: (refreshToken: string) =>
      apiRequest<RefreshTokenResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }, false),

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
      return apiRequest<{users: User[], total: number, page: number, pageSize: number}>(`/users?${queryParams.toString()}`)
    },

    getById: (id: string) => apiRequest<User>(`/users/${id}`),

    update: (id: string, data: { avatar?: string; bio?: string }) =>
      apiRequest<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    updatePassword: (id: string, data: { oldPassword: string; newPassword: string }) =>
      apiRequest<{message: string}>(`/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<{message: string}>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  /**
   * 项目相关 API
   */
  projects: {
    getAll: (params?: { page?: number; pageSize?: number; search?: string; visibility?: string }) => {
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

    update: (id: string, data: { name?: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE' }) =>
      apiRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<{message: string}>(`/projects/${id}`, {
        method: 'DELETE',
      }),

    addMember: (projectId: string, data: { userId: string; role: 'OWNER' | 'MEMBER' | 'VIEWER' }) =>
      apiRequest<{message: string}>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removeMember: (projectId: string, userId: string) =>
      apiRequest<{message: string}>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),

    updateMemberRole: (projectId: string, userId: string, role: 'OWNER' | 'MEMBER' | 'VIEWER') =>
      apiRequest<{message: string}>(`/projects/${projectId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
  },

  /**
   * 仓库相关 API
   */
  repositories: {
    // 手动创建Repository（用于未自动创建的旧项目）
    createRepository: (projectId: string) =>
      apiRequest<{id: string, projectId: string}>(`/projects/${projectId}/repository`, {
        method: 'POST',
      }),

    getRepository: (projectId: string) =>
      apiRequest<{id: string, projectId: string, defaultBranch: string}>(`/projects/${projectId}/repository`),

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
          'Authorization': `Bearer ${accessToken}`,
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
      return fetch(`${API_BASE_URL}/projects/${projectId}/repository/branches/${branchId}/files/download?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
    },

    getCommits: (projectId: string, branchId: string, params?: { page?: number; pageSize?: number }) => {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      return apiRequest<unknown[]>(`/projects/${projectId}/repository/branches/${branchId}/commits?${queryParams.toString()}`)
    },

    createCommit: (projectId: string, data: { branchId: string; message: string }) =>
      apiRequest<unknown>(`/projects/${projectId}/repository/commits`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
    getFiles: (params: { projectId: string; folder?: string; search?: string; page?: number; pageSize?: number }) => {
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
          'Authorization': `Bearer ${accessToken}`,
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
          'Authorization': `Bearer ${accessToken}`,
        },
      })
    },

    // 删除文件
    deleteFile: (id: string) =>
      apiRequest<{ message: string }>(`/files/${id}`, {
        method: 'DELETE',
      }),
  },
}
