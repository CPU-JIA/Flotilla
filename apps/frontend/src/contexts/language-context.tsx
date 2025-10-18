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

  // 项目
  projects: {
    title: string
    createNew: string
    myProjects: string
    allProjects: string
    noProjects: string
    visibility: {
      public: string
      private: string
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
