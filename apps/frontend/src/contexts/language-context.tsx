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
  yes: string
  no: string

  // 导航
  nav: {
    dashboard: string
    projects: string
    organizations: string
    admin: string
    profile: string
    settings: string
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
    settings: {
      title: string
      backToProject: string
      general: string
      members: string
      dangerZone: string
      projectName: string
      projectNamePlaceholder: string
      projectDescription: string
      projectDescriptionPlaceholder: string
      visibility: string
      visibilityPublic: string
      visibilityPrivate: string
      defaultBranch: string
      saveChanges: string
      saving: string
      saveSuccess: string
      saveFailed: string
      archiveProject: string
      archiveDesc: string
      archiveButton: string
      archiving: string
      archiveSuccess: string
      archiveFailed: string
      unarchiveButton: string
      unarchiving: string
      unarchiveSuccess: string
      unarchiveFailed: string
      deleteProject: string
      deleteDesc: string
      deleteWarning: string
      deleteConfirmPrompt: string
      deleteButton: string
      deleting: string
      deleteSuccess: string
      deleteFailed: string
      deleteNameMismatch: string
      membersList: string
      addMember: string
      noMembers: string
      noMembersDesc: string
      memberName: string
      memberRole: string
      memberJoinedAt: string
      memberActions: string
      roleOwner: string
      roleMaintainer: string
      roleMember: string
      roleViewer: string
      changeRole: string
      removeMember: string
      removeMemberConfirm: string
      removing: string
      removeSuccess: string
      removeFailed: string
      addMemberTitle: string
      addMemberDesc: string
      userId: string
      userIdPlaceholder: string
      selectRole: string
      addButton: string
      adding: string
      addSuccess: string
      addFailed: string
      cancel: string
      pullRequests: string
      prApproval: {
        title: string
        description: string
        requireApprovals: string
        requireApprovalsDesc: string
        requireApprovalsValidation: string
        allowSelfMerge: string
        allowSelfMergeDesc: string
        requireReviewFromOwner: string
        requireReviewFromOwnerDesc: string
        policySummary: string
      }
      branchProtection: string
      branchProtectionRules: {
        title: string
        description: string
        noBranchRules: string
        noBranchRulesDesc: string
        createRule: string
        editRule: string
        deleteRule: string
        branchPattern: string
        requirePullRequest: string
        requiredApprovals: string
        actions: string
        createRuleTitle: string
        editRuleTitle: string
        branchPatternLabel: string
        branchPatternPlaceholder: string
        branchPatternHelper: string
        requirePullRequestLabel: string
        requirePullRequestDesc: string
        requiredApprovalsLabel: string
        requiredApprovalsDesc: string
        dismissStaleReviewsLabel: string
        dismissStaleReviewsDesc: string
        requireCodeOwnerReviewLabel: string
        requireCodeOwnerReviewDesc: string
        allowForcePushesLabel: string
        allowForcePushesDesc: string
        allowDeletionsLabel: string
        allowDeletionsDesc: string
        requireStatusChecksLabel: string
        requireStatusChecksDesc: string
        requiredStatusChecksLabel: string
        requiredStatusChecksPlaceholder: string
        creating: string
        updating: string
        createButton: string
        updateButton: string
        createSuccess: string
        updateSuccess: string
        createFailed: string
        updateFailed: string
        deleteSuccess: string
        deleteFailed: string
        confirmDelete: string
        deleting: string
        protected: string
        unprotected: string
      }
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
    passwordStrengthRequirement: string
    passwordMismatch: string
    registerFailed: string
    networkError: string
    emailVerificationTitle: string
    verifying: string
    verifyingMessage: string
    verificationSuccess: string
    verificationSuccessMessage: string
    verificationFailed: string
    verificationFailedMessage: string
    verifyAgain: string
    goToLogin: string
    backToLogin: string
    forgotPasswordTitle: string
    forgotPasswordSubtitle: string
    emailAddress: string
    emailPlaceholderGeneric: string
    sendResetEmail: string
    sending: string
    emailSent: string
    emailSentMessage: string
    checkInbox: string
    resendEmail: string
    rememberPassword: string
    requestFailed: string
    resetPasswordTitle: string
    resetPasswordSubtitle: string
    newPassword: string
    confirmNewPassword: string
    newPasswordPlaceholder: string
    confirmNewPasswordPlaceholder: string
    resetPasswordButton: string
    resetting: string
    resetSuccess: string
    resetFailed: string
    invalidResetLink: string
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
    avatarUpload: string
    avatarUploading: string
    avatarRemove: string
    avatarDefault: string
    avatarCustom: string
    avatarHelper: string
    avatarUploadSuccess: string
    avatarUploadError: string
    avatarInvalidType: string
    avatarTooLarge: string
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

  // Issue追踪系统
  issues: {
    title: string
    createNew: string
    noIssues: string
    totalIssues: string
    searchPlaceholder: string
    backToIssues: string
    list: {
      title: string
      openIssues: string
      closedIssues: string
      allIssues: string
      number: string
      titleColumn: string
      state: string
      author: string
      comments: string
      noIssuesFound: string
      noIssuesDesc: string
      loading: string
      previousPage: string
      nextPage: string
      pageInfo: string
    }
    create: {
      title: string
      titleLabel: string
      titlePlaceholder: string
      titleRequired: string
      bodyLabel: string
      bodyPlaceholder: string
      bodyHelper: string
      labelsLabel: string
      labelsPlaceholder: string
      milestoneLabel: string
      milestonePlaceholder: string
      assigneesLabel: string
      assigneesPlaceholder: string
      noMembers: string
      creating: string
      createButton: string
      cancelButton: string
      createSuccess: string
      createFailed: string
    }
    detail: {
      loading: string
      notFound: string
      goBack: string
      openedBy: string
      noDescription: string
      closeIssue: string
      reopenIssue: string
      deleteIssue: string
      editIssue: string
      confirmDelete: string
      closeSuccess: string
      closeFailed: string
      reopenSuccess: string
      reopenFailed: string
      deleteSuccess: string
      deleteFailed: string
      metadata: string
      milestone: string
      labels: string
      assignees: string
      noMilestone: string
      noLabels: string
      noAssignees: string
    }
    state: {
      open: string
      closed: string
    }
    labels: {
      title: string
      createNew: string
      name: string
      namePlaceholder: string
      color: string
      colorHelper: string
      description: string
      descriptionPlaceholder: string
      createButton: string
      updateButton: string
      deleteButton: string
      cancelButton: string
      noLabels: string
      noLabelsDesc: string
      confirmDelete: string
      createSuccess: string
      createFailed: string
      updateSuccess: string
      updateFailed: string
      deleteSuccess: string
      deleteFailed: string
      usedBy: string
    }
    milestones: {
      title: string
      loading: string
      createNew: string
      name: string
      namePlaceholder: string
      description: string
      descriptionPlaceholder: string
      dueDate: string
      dueDatePlaceholder: string
      state: string
      stateOpen: string
      stateClosed: string
      openState: string
      closedState: string
      createButton: string
      updateButton: string
      deleteButton: string
      cancelButton: string
      closeButton: string
      reopenButton: string
      editButton: string
      openMilestones: string
      closedMilestones: string
      allMilestones: string
      noMilestones: string
      noMilestonesDesc: string
      noOpenMilestones: string
      noClosedMilestones: string
      confirmDelete: string
      createSuccess: string
      createFailed: string
      updateSuccess: string
      updateFailed: string
      deleteSuccess: string
      deleteFailed: string
      usedBy: string
      closeSuccess: string
      closeFailed: string
      reopenSuccess: string
      reopenFailed: string
      progress: string
      due: string
      closed: string
      openIssues: string
      closedIssues: string
      dueBy: string
      overdue: string
      noDueDate: string
    }
    comments: {
      title: string
      loading: string
      addComment: string
      writeTab: string
      previewTab: string
      commentPlaceholder: string
      emptyComment: string
      supportsMarkdown: string
      submitting: string
      submitButton: string
      updateButton: string
      cancelButton: string
      editButton: string
      deleteButton: string
      noComments: string
      noCommentsDesc: string
      beFirst: string
      confirmDelete: string
      createSuccess: string
      createFailed: string
      updateSuccess: string
      updateFailed: string
      deleteSuccess: string
      deleteFailed: string
      edited: string
      commentedAt: string
      justNow: string
    }
  }

  // Pull Requests
  pullRequests: {
    title: string
    createNew: string
    noPullRequests: string
    totalPullRequests: string
    searchPlaceholder: string
    backToPullRequests: string
    backToPRs: string

    list: {
      title: string
      openPullRequests: string
      closedPullRequests: string
      mergedPullRequests: string
      allPullRequests: string
      number: string
      titleColumn: string
      state: string
      author: string
      sourceBranch: string
      targetBranch: string
      noPullRequestsFound: string
      noPullRequestsDesc: string
      loading: string
      previousPage: string
      nextPage: string
      pageInfo: string
    }

    create: {
      title: string
      titleLabel: string
      titlePlaceholder: string
      titleRequired: string
      bodyLabel: string
      bodyPlaceholder: string
      bodyHelper: string
      sourceBranchLabel: string
      sourceBranchPlaceholder: string
      targetBranchLabel: string
      targetBranchPlaceholder: string
      noBranches: string
      creating: string
      createButton: string
      cancelButton: string
      createSuccess: string
      createFailed: string
      sameBranchError: string
    }

    detail: {
      loading: string
      notFound: string
      goBack: string
      openedBy: string
      mergedBy: string
      closedAt: string
      noDescription: string
      mergePullRequest: string
      mergePR: string
      closePullRequest: string
      closePR: string
      reopenPullRequest: string
      deletePullRequest: string
      deletePR: string
      editPullRequest: string
      editPR: string
      confirmDelete: string
      confirmMerge: string
      closeSuccess: string
      closeFailed: string
      reopenSuccess: string
      reopenFailed: string
      deleteSuccess: string
      deleteFailed: string
      mergeSuccess: string
      mergeFailed: string
      metadata: string
      branches: string
      commits: string
      filesChanged: string
      additions: string
      deletions: string
      conversation: string
      changesTab: string
      commitsTab: string
      mergedThisPullRequest: string
    }

    state: {
      open: string
      closed: string
      merged: string
    }

    mergeStrategy: {
      title: string
      merge: string
      mergeDesc: string
      squash: string
      squashDesc: string
      rebase: string
      rebaseDesc: string
    }

    merge: {
      title: string
      selectStrategy: string
      mergeCommit: string
      mergeCommitDesc: string
      mergeDesc: string
      squash: string
      squashDesc: string
      rebase: string
      rebaseDesc: string
      commitMessageLabel: string
      commitMessagePlaceholder: string
      confirmButton: string
      cancelButton: string
      merging: string
    }

    diff: {
      title: string
      loading: string
      noChanges: string
      filesChanged: string
      additions: string
      deletions: string
      binaryFile: string
      fileAdded: string
      fileModified: string
      fileDeleted: string
      expandAll: string
      collapseAll: string
    }

    comments: {
      title: string
      addComment: string
      commentPlaceholder: string
      submitComment: string
      submitting: string
      submitButton: string
      editComment: string
      deleteComment: string
      noComments: string
      createSuccess: string
      createFailed: string
    }

    reviews: {
      title: string
      addReview: string
      approve: string
      approveLabel: string
      requestChanges: string
      changesRequestedLabel: string
      comment: string
      commentLabel: string
      reviewCommentPlaceholder: string
      reviewPlaceholder: string
      submitReview: string
      submitting: string
      submitButton: string
      cancelButton: string
      noReviews: string
      createSuccess: string
      createFailed: string
    }

    reviewSummary: {
      title: string
      approved: string
      changesRequested: string
      commented: string
      reviewers: string
      refresh: string
      loading: string
      error: string
      noReviewers: string
    }

    mergeStatus: {
      canMerge: string
      cannotMerge: string
      mergeBlocked: string
      checking: string
      activeChangeRequests: string
      insufficientApprovals: string
      cannotMergeOwnPR: string
      ownerApprovalRequired: string
    }
  }

  // Code Search
  search: {
    title: string
    globalSearch: string
    projectSearch: string
    searchCode: string
    searchPlaceholder: string
    searchCodePlaceholder: string
    searchInProject: string
    loading: string
    noResults: string
    noResultsDesc: string
    resultsFound: string
    processingTime: string
    loadMore: string
    loadingMore: string

    emptyState: {
      title: string
      description: string
      noQueryTitle: string
      noQueryDesc: string
      noResultsTitle: string
      noResultsDesc: string
    }

    filters: {
      title: string
      clear: string
      sortBy: string
      languages: string
      extensions: string
      branches: string
      sort: {
        relevance: string
        date: string
        size: string
        lastModified: string
        fileSize: string
      }
      extensionGroups: {
        webFrontend: string
        backend: string
        config: string
        documentation: string
        database: string
        system: string
      }
    }

    result: {
      fileName: string
      filePath: string
      preview: string
      symbols: string
      branch: string
      lastModified: string
      size: string
      lines: string
      moreSymbols: string
      openFile: string
      viewInProject: string
      today: string
      yesterday: string
      daysAgo: string
      weeksAgo: string
    }

    index: {
      status: string
      indexing: string
      indexed: string
      failed: string
      notIndexed: string
      totalFiles: string
      indexedFiles: string
      failedFiles: string
      lastIndexed: string
      reindex: string
      reindexing: string
      reindexSuccess: string
      reindexFailed: string
      deleteIndex: string
      deleteSuccess: string
      deleteFailed: string
      confirmDelete: string
    }

    errors: {
      searchFailed: string
      networkError: string
      accessDenied: string
      indexNotReady: string
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

  git: {
    cloneUrl: {
      title: string
      copy: string
      copied: string
      copyFailed: string
      showGuide: string
      hideGuide: string
      guide: string
      cloneCommand: string
      pushCommand: string
      pullCommand: string
    }
    branch: {
      title: string
      select: string
      loading: string
      error: string
      noBranches: string
      default: string
      create: string
      createNew: string
      creating: string
      createSuccess: string
      createFailed: string
      createDescription: string
      branchName: string
      branchNamePlaceholder: string
      baseBranch: string
      selectBaseBranch: string
      baseBranchHint: string
      nameRequired: string
      nameInvalid: string
      nameInvalidSlash: string
      nameInvalidDoubleSlash: string
    }
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
