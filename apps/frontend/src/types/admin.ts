/**
 * 管理员相关类型定义
 * ECP-D2: 类型安全 - 完整的类型定义
 */

export enum UserRole {
  USER = 'USER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface AdminUser {
  id: string
  username: string
  email: string
  avatar: string | null
  bio: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    ownedProjects: number
    projectMembers: number
  }
}

export interface AdminUserDetail extends AdminUser {
  ownedProjects: Array<{
    id: string
    name: string
    visibility: string
    createdAt: string
  }>
  projectMembers: Array<{
    project: {
      id: string
      name: string
    }
    role: string
    joinedAt: string
  }>
  commits: Array<{
    id: string
    message: string
    createdAt: string
  }>
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminProject {
  id: string
  name: string
  description: string | null
  visibility: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    username: string
    email: string
  }
  _count: {
    members: number
  }
}

export interface AdminProjectsResponse {
  projects: AdminProject[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SystemStats {
  users: {
    total: number
    active: number
    inactive: number
    superAdmins: number
    admins: number
    regularUsers: number
  }
  projects: {
    total: number
    public: number
    private: number
  }
  commits: {
    total: number
  }
  recent: {
    users: Array<{
      id: string
      username: string
      email: string
      createdAt: string
    }>
    projects: Array<{
      id: string
      name: string
      owner: {
        username: string
      }
      createdAt: string
    }>
  }
}

export interface UpdateUserRoleDto {
  role: UserRole
}

export interface ToggleUserActiveDto {
  isActive: boolean
}

export interface AdminQueryUsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: UserRole
  isActive?: boolean
}
