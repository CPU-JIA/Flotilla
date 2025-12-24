/**
 * Team相关类型定义
 * ECP-B3: 清晰的类型命名
 */

export type TeamRole = 'MAINTAINER' | 'MEMBER'

export interface Team {
  id: string
  slug: string
  name: string
  description: string | null
  organizationId: string
  organizationSlug?: string
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
    projectPermissions: number
  }
  role?: TeamRole // 当前用户在Team中的角色
  members?: TeamMember[]
}

export interface TeamMember {
  userId: string
  teamId: string
  role: TeamRole
  joinedAt: string
  user: {
    id: string
    username: string
    email: string
    avatar?: string | null
  }
}

export type MemberRole = 'OWNER' | 'MAINTAINER' | 'MEMBER' | 'VIEWER'

export interface TeamProjectPermission {
  teamId: string
  projectId: string
  role: MemberRole
  grantedAt: string
  project: {
    id: string
    name: string
    description?: string | null
  }
}

export interface CreateTeamRequest {
  organizationSlug: string
  name: string
  slug: string
  description?: string
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
}

export interface AddTeamMemberRequest {
  email: string
  role: TeamRole
}

export interface UpdateTeamMemberRoleRequest {
  role: TeamRole
}

export interface AssignProjectPermissionRequest {
  projectId: string
  role: MemberRole
}

export interface UpdateProjectPermissionRequest {
  role: MemberRole
}

export interface TeamsResponse {
  teams: Team[]
  total: number
  page: number
  pageSize: number
}
