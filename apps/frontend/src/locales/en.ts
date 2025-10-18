/**
 * English Translations
 * ECP-D3: No Magic Strings - Centralized text management
 */

import type { Translations } from '@/contexts/language-context'

export const en: Translations = {
  // Common
  appName: 'Cloud Dev Platform',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  confirm: 'Confirm',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  back: 'Back',

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    organizations: 'Organizations',
    admin: 'Admin',
    logout: 'Logout',
  },

  // Projects
  projects: {
    title: 'Projects',
    createNew: 'Create New Project',
    myProjects: 'My Projects',
    allProjects: 'All Projects',
    noProjects: 'No Projects',
    visibility: {
      public: 'Public',
      private: 'Private',
    },
  },

  // Editor
  editor: {
    title: 'Code Editor',
    selectFile: 'Select a file from the left to start editing',
    saving: 'Saving...',
    saved: 'Saved',
    unsaved: 'Unsaved',
    versionHistory: 'Version History',
    edit: 'Edit',
    preview: 'Preview',
    backToFiles: 'Back to Files',
    codeEditor: 'Code Editor',
    currentFile: 'Current File',
    parentFolder: 'Parent Folder',
    rootFolder: 'Root Directory',
    noFiles: 'No Files',
    folder: 'Folder',
    loading: 'Loading...',
    loadingFile: 'Loading file...',
    selectFileToEdit: 'Select a file from the left to start editing',
    languageSupport: 'Supports 30+ programming languages',
    loadError: 'Load failed',
    networkError: 'Network error, please try again later',
  },

  // Authentication
  auth: {
    login: 'Login',
    register: 'Register',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
  },

  // Organizations
  organizations: {
    title: 'Organizations',
    createNew: 'Create New Organization',
    myOrganizations: 'My Organizations',
    noOrganizations: 'No Organizations',
    personal: 'Personal Organization',
    name: 'Organization Name',
    slug: 'Organization Slug',
    description: 'Description',
    members: 'Members',
    memberCount: 'Member Count',
    role: 'Role',
    settings: 'Settings',
    overview: 'Overview',
    deleteConfirm: 'Are you sure you want to delete this organization?',
    deleteSuccess: 'Organization deleted',
    createSuccess: 'Organization created successfully',
    updateSuccess: 'Organization updated successfully',
    slugHelper: 'Lowercase letters, numbers, and hyphens only',
    roles: {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      MEMBER: 'Member',
    },
    addMember: 'Add Member',
    removeMember: 'Remove Member',
    updateRole: 'Update Role',
    selectUser: 'Select User',
    selectRole: 'Select Role',
    noMembers: 'No Members',
  },

  // Teams
  teams: {
    title: 'Teams',
    createNew: 'Create New Team',
    myTeams: 'My Teams',
    noTeams: 'No Teams',
    name: 'Team Name',
    slug: 'Team Slug',
    description: 'Description',
    members: 'Members',
    memberCount: 'Member Count',
    role: 'Role',
    settings: 'Settings',
    overview: 'Overview',
    permissions: 'Project Permissions',
    projects: 'Projects',
    deleteConfirm: 'Are you sure you want to delete this team?',
    deleteSuccess: 'Team deleted',
    createSuccess: 'Team created successfully',
    updateSuccess: 'Team updated successfully',
    slugHelper: 'Lowercase letters, numbers, and hyphens only',
    roles: {
      MAINTAINER: 'Maintainer',
      MEMBER: 'Member',
    },
    addMember: 'Add Member',
    removeMember: 'Remove Member',
    updateRole: 'Update Role',
    selectMember: 'Select Member',
    selectRole: 'Select Role',
    noMembers: 'No Members',
    assignPermission: 'Assign Permission',
    revokePermission: 'Revoke Permission',
    updatePermission: 'Update Permission',
    permissionLevels: {
      READ: 'Read',
      WRITE: 'Write',
      ADMIN: 'Admin',
    },
  },
}
