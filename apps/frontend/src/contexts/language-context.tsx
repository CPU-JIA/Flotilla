'use client'

/**
 * LanguageContext - 国际化语言管理
 * ECP-A1: 单一职责 - 专注于语言切换和翻译
 * ECP-C1: 防御性编程 - localStorage持久化语言偏好
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

export type Language = 'zh' | 'en'

export interface Translations {
  // 通用
  appName: string
  loading: string
  error: string
  success: string
  confirm: string
  cancel: string
  save: string
  delete: string
  edit: string
  back: string

  // 导航
  nav: {
    dashboard: string
    projects: string
    organizations: string
    admin: string
    logout: string
  }

  // 仪表盘
  dashboard: {
    welcome: string
    loginSuccess: string
    username: string
    email: string
    role: string
    systemId: string
    projectManagement: string
    projectManagementDesc: string
    viewMyProjects: string
    codeRepository: string
    codeRepositoryDesc: string
    openCodeEditor: string
    personalSettings: string
    personalSettingsDesc: string
    modifyPersonalInfo: string
    systemStatus: string
    systemStatusDesc: string
    refreshNow: string
    checking: string
    backendApi: string
    database: string
    running: string
    error: string
    unknown: string
  }

  // 项目
  projects: {
    title: string
    createNew: string
    myProjects: string
    allProjects: string
    noProjects: string
    totalProjects: string
    searchPlaceholder: string
    search: string
    loadingProjects: string
    fetchError: string
    networkError: string
    noMatchingProjects: string
    noProjectsYet: string
    tryDifferentKeywords: string
    createFirstProject: string
    noDescription: string
    members: string
    owner: string
    unknown: string
    previousPage: string
    nextPage: string
    pageInfo: string
    visibility: {
      public: string
      private: string
    }
    detail: {
      loading: string
      fetchError: string
      networkError: string
      backToList: string
      backToProject: string
      memberCount: string
      createdAt: string
      owner: string
      projectMembers: string
      projectActions: string
      initRepository: string
      initializing: string
      repositoryReady: string
      initSuccess: string
      initFailed: string
      initFailedRetry: string
      projectSettings: string
      projectSettingsComingSoon: string
      browseFiles: string
      codeEditor: string
      versionHistory: string
    }
    files: {
      title: string
      loading: string
      loadingFiles: string
      loadProject: string
      loadFilesFailed: string
      networkError: string
      storage: string
      rootFolder: string
      backFolder: string
      uploadFile: string
      createFolder: string
      noFiles: string
      noFilesDesc: string
      fileName: string
      size: string
      modifiedAt: string
      download: string
      delete: string
      folder: string
      openEditor: string
      downloadFailed: string
      downloadFailedRetry: string
      deleteFailed: string
      deleteFailedRetry: string
      searchPlaceholder: string
      parentFolder: string
    }
    history: {
      title: string
      description: string
      selectBranch: string
      noBranchSelected: string
      noBranchDesc: string
      backToProject: string
      loading: string
      noCommits: string
      commitDetails: string
      loadingDetails: string
      noCommitSelected: string
      selectCommitDesc: string
      changedFiles: string
      additions: string
      deletions: string
      changes: string
      author: string
      date: string
      message: string
      selectDifferentBranch: string
      totalCommits: string
      commitHistory: string
      clickToView: string
      filesCount: string
      previousPage: string
      nextPage: string
      pageInfo: string
      all: string
      modified: string
      loadFailed: string
      selectCommit: string
    }
  }

  // 编辑器
  editor: {
    title: string
    selectFile: string
    saving: string
    saved: string
    unsaved: string
    versionHistory: string
    edit: string
    preview: string
    backToFiles: string
    codeEditor: string
    currentFile: string
    parentFolder: string
    rootFolder: string
    noFiles: string
    folder: string
    loading: string
    loadingFile: string
    selectFileToEdit: string
    languageSupport: string
    loadError: string
    networkError: string
  }

  // 认证
  auth: {
    login: string
    register: string
    username: string
    email: string
    password: string
    confirmPassword: string
    registerTitle: string
    registerSubtitle: string
    usernamePlaceholder: string
    usernameHelper: string
    emailPlaceholder: string
    passwordPlaceholder: string
    confirmPasswordPlaceholder: string
    registering: string
    registerButton: string
    alreadyHaveAccount: string
    loginNow: string
    allFieldsRequired: string
    usernameInvalid: string
    emailInvalid: string
    passwordTooShort: string
    passwordMismatch: string
    registerFailed: string
    networkError: string
  }

  // 组织
  organizations: {
    title: string
    createNew: string
    myOrganizations: string
    noOrganizations: string
    personal: string
    name: string
    slug: string
    description: string
    members: string
    memberCount: string
    role: string
    settings: string
    overview: string
    deleteConfirm: string
    deleteSuccess: string
    createSuccess: string
    updateSuccess: string
    slugHelper: string
    roles: {
      OWNER: string
      ADMIN: string
      MEMBER: string
    }
    addMember: string
    removeMember: string
    updateRole: string
    selectUser: string
    selectRole: string
    noMembers: string
  }

  // 团队
  teams: {
    title: string
    createNew: string
    myTeams: string
    noTeams: string
    name: string
    slug: string
    description: string
    noDescription: string
    backToList: string
    members: string
    memberCount: string
    role: string
    settings: string
    overview: string
    permissions: string
    projects: string
    deleteConfirm: string
    deleteSuccess: string
    createSuccess: string
    updateSuccess: string
    addMemberSuccess: string
    removeMemberSuccess: string
    confirmRemoveMember: string
    slugHelper: string
    roles: {
      MAINTAINER: string
      MEMBER: string
    }
    addMember: string
    removeMember: string
    updateRole: string
    selectMember: string
    selectRole: string
    noMembers: string
    assignPermission: string
    revokePermission: string
    updatePermission: string
    permissionLevels: {
      READ: string
      WRITE: string
      ADMIN: string
    }
  }

  // 设置
  settings: {
    title: string
    description: string
    basicInfo: string
    username: string
    usernameRequired: string
    usernamePlaceholder: string
    email: string
    emailCannotChange: string
    bio: string
    bioPlaceholder: string
    bioCharCount: string
    avatar: string
    avatarPlaceholder: string
    avatarHelper: string
    saving: string
    saveChanges: string
    profileUpdateSuccess: string
    profileUpdateError: string
    usernameMinLength: string
    bioMaxLength: string
    changePassword: string
    currentPassword: string
    currentPasswordPlaceholder: string
    newPassword: string
    newPasswordPlaceholder: string
    confirmPassword: string
    confirmPasswordPlaceholder: string
    passwordRequirements: string
    passwordMinLength: string
    passwordUppercase: string
    passwordLowercase: string
    passwordNumber: string
    changing: string
    changePasswordButton: string
    passwordChangeSuccess: string
    passwordChangeError: string
    passwordTooShort: string
    passwordMismatch: string
    passwordComplexity: string
    required: string
  }

  // Raft集群
  raft: {
    title: string
    description: string
    liveMonitoring: string
    term: string
    clusterTopology: string
    performanceMetrics: string
    controlPanel: string
    aboutRaft: string
    aboutRaftDescription: string
    failedToLoad: string
    ensureBackendRunning: string
    loadingVisualization: string
    management: {
      title: string
      description: string
      start: string
      stop: string
      restart: string
      clusterStatus: string
      leaderStatus: string
      clusterSize: string
      uptime: string
      unknown: string
      isLeader: string
      notLeader: string
      currentTerm: string
      nodeId: string
      nodes: string
      configuredNodes: string
      seconds: string
      clusterOverview: string
      topologyMap: string
      distributedCommands: string
      configInfo: string
      performanceDescription: string
      totalCommands: string
      commandsPerSecond: string
      averageResponseTime: string
      leaderElections: string
      nodeStatusDetails: string
      nodeStatusDescription: string
      logLength: string
      appliedLogs: string
      clusterConfig: string
      clusterConfigDescription: string
      basicConfig: string
      nodeList: string
      electionTimeout: string
      heartbeatInterval: string
      rpcTimeout: string
      portMapping: string
      configValidationFailed: string
    }
  }

  // 管理员
  admin: {
    dashboard: string
    systemOverview: string
    loading: string
    loadingStats: string
    retry: string
    total: string
    projects: string
    commits: string
    roles: string
    totalUsers: string
    active: string
    inactive: string
    totalProjects: string
    public: string
    private: string
    totalCommits: string
    allCodeCommits: string
    permissionDistribution: string
    superAdmins: string
    admins: string
    regularUsers: string
    userManagement: string
    userManagementDesc: string
    projectManagement: string
    projectManagementDesc: string
    raftClusterManagement: string
    raftClusterManagementDesc: string
    enterManagement: string
    recentUsers: string
    recentUsersDesc: string
    recentProjects: string
    recentProjectsDesc: string
    by: string

    // 用户管理
    users: {
      title: string
      totalUsers: string
      addUser: string
      searchPlaceholder: string
      search: string
      loadingUsersFailed: string
      userList: string
      createdAt: string
      ownsProjects: string
      participatesProjects: string
      ban: string
      unban: string
      confirmBan: string
      confirmUnban: string
      operationSuccess: string
      operationFailed: string
      banned: string
      updateRole: string
      confirmUpdateRole: string
      roleUpdateSuccess: string
      delete: string
      confirmDelete: string
      deleteSuccess: string
      deleteFailed: string
      roles: {
        SUPER_ADMIN: string
        ADMIN: string
        USER: string
      }
    }

    // 项目管理
    projectsPage: {
      title: string
      totalProjects: string
      searchPlaceholder: string
      search: string
      loadingProjectsFailed: string
      projectList: string
      noProjects: string
      noMatchingProjects: string
      tryDifferentKeywords: string
      noProjectsCreated: string
      public: string
      private: string
      noDescription: string
      owner: string
      unknown: string
      members: string
      people: string
      createdAt: string
      viewDetails: string
      delete: string
      confirmDelete: string
      deleteSuccess: string
      deleteFailed: string
    }
  }

  // 表单验证
  validation: {
    emailRequired: string
    invalidEmail: string
    fieldRequired: string
    passwordTooShort: string
    passwordMismatch: string
    usernameInvalid: string
    slugInvalid: string
    nameTooShort: string
    descriptionTooLong: string
  }
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  translations: Record<Language, Translations>
}

export function LanguageProvider({ children, translations }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh')

  // 从localStorage加载语言偏好
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language | null
      if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage)
      }
    }
  }, [])

  // 保存语言偏好到localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
      // 更新HTML lang属性
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    }
  }, [])

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
