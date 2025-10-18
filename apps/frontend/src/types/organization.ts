/**
 * Organization相关类型定义
 * ECP-B3: 清晰的类型命名
 */

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Organization {
  id: string
  slug: string
  name: string
  description: string | null
  isPersonal: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
  }
  myRole?: OrgRole // 当前用户在组织中的角色（后端返回myRole字段）
  members?: OrganizationMember[]
}

export interface OrganizationMember {
  userId: string
  organizationId: string
  role: OrgRole
  joinedAt: string
  user: {
    id: string
    username: string
    email: string
    avatar?: string | null
  }
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
  description?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
}

export interface AddOrganizationMemberRequest {
  userId: string
  role: OrgRole
}

export interface UpdateOrganizationMemberRoleRequest {
  role: OrgRole
}

export interface OrganizationsResponse {
  organizations: Organization[]
  total: number
  page: number
  pageSize: number
}
