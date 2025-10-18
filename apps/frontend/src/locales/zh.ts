/**
 * 中文翻译
 * ECP-D3: 避免魔法字符串 - 统一管理所有文本
 */

import type { Translations } from '@/contexts/language-context'

export const zh: Translations = {
  // 通用
  appName: 'Cloud Dev Platform',
  loading: '加载中...',
  error: '错误',
  success: '成功',
  confirm: '确认',
  cancel: '取消',
  save: '保存',
  delete: '删除',
  edit: '编辑',
  back: '返回',

  // 导航
  nav: {
    dashboard: '仪表盘',
    projects: '项目',
    organizations: '组织',
    admin: '管理',
    logout: '退出登录',
  },

  // 项目
  projects: {
    title: '项目',
    createNew: '创建新项目',
    myProjects: '我的项目',
    allProjects: '所有项目',
    noProjects: '暂无项目',
    visibility: {
      public: '公开',
      private: '私有',
    },
  },

  // 编辑器
  editor: {
    title: '代码编辑器',
    selectFile: '从左侧选择一个文件开始编辑',
    saving: '正在保存...',
    saved: '已保存',
    unsaved: '未保存',
    versionHistory: '版本历史',
    edit: '编辑',
    preview: '预览',
    backToFiles: '返回文件管理',
    codeEditor: '代码编辑器',
    currentFile: '当前文件',
    parentFolder: '上级目录',
    rootFolder: '根目录',
    noFiles: '暂无文件',
    folder: '文件夹',
    loading: '加载中...',
    loadingFile: '正在加载文件...',
    selectFileToEdit: '从左侧选择一个文件开始编辑',
    languageSupport: '支持30+种编程语言',
    loadError: '加载失败',
    networkError: '网络错误，请稍后重试',
  },

  // 认证
  auth: {
    login: '登录',
    register: '注册',
    username: '用户名',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
  },

  // 组织
  organizations: {
    title: '组织',
    createNew: '创建新组织',
    myOrganizations: '我的组织',
    noOrganizations: '暂无组织',
    personal: '个人组织',
    name: '组织名称',
    slug: '组织标识',
    description: '描述',
    members: '成员',
    memberCount: '成员数',
    role: '角色',
    settings: '设置',
    overview: '概览',
    deleteConfirm: '确定要删除此组织吗？',
    deleteSuccess: '组织已删除',
    createSuccess: '组织创建成功',
    updateSuccess: '组织更新成功',
    slugHelper: '仅限小写字母、数字和连字符',
    roles: {
      OWNER: '所有者',
      ADMIN: '管理员',
      MEMBER: '成员',
    },
    addMember: '添加成员',
    removeMember: '移除成员',
    updateRole: '更新角色',
    selectUser: '选择用户',
    selectRole: '选择角色',
    noMembers: '暂无成员',
  },

  // 团队
  teams: {
    title: '团队',
    createNew: '创建新团队',
    myTeams: '我的团队',
    noTeams: '暂无团队',
    name: '团队名称',
    slug: '团队标识',
    description: '描述',
    members: '成员',
    memberCount: '成员数',
    role: '角色',
    settings: '设置',
    overview: '概览',
    permissions: '项目权限',
    projects: '项目',
    deleteConfirm: '确定要删除此团队吗？',
    deleteSuccess: '团队已删除',
    createSuccess: '团队创建成功',
    updateSuccess: '团队更新成功',
    slugHelper: '仅限小写字母、数字和连字符',
    roles: {
      MAINTAINER: '维护者',
      MEMBER: '成员',
    },
    addMember: '添加成员',
    removeMember: '移除成员',
    updateRole: '更新角色',
    selectMember: '选择成员',
    selectRole: '选择角色',
    noMembers: '暂无成员',
    assignPermission: '分配权限',
    revokePermission: '撤销权限',
    updatePermission: '更新权限',
    permissionLevels: {
      READ: '只读',
      WRITE: '读写',
      ADMIN: '管理员',
    },
  },
}
