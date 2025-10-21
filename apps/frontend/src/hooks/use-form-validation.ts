/**
 * useFormValidation Hook - 统一表单验证
 * ECP-C1: 防御性编程 - 统一的输入验证
 * ECP-B1: DRY - 复用验证逻辑
 */

'use client'

import { useLanguage } from '@/contexts/language-context'

// 邮箱验证正则
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 用户名验证正则（字母、数字、下划线）
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

// Slug验证正则（小写字母、数字、连字符）
const SLUG_REGEX = /^[a-z0-9-]+$/

export function useFormValidation() {
  const { t } = useLanguage()

  /**
   * 验证邮箱
   */
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return t.validation.emailRequired
    }
    if (!EMAIL_REGEX.test(email)) {
      return t.validation.invalidEmail
    }
    return null
  }

  /**
   * 验证必填字段
   */
  const validateRequired = (value: string, fieldName?: string): string | null => {
    if (!value.trim()) {
      return fieldName ? `${fieldName} ${t.validation.fieldRequired}` : t.validation.fieldRequired
    }
    return null
  }

  /**
   * 验证密码
   */
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return t.validation.fieldRequired
    }
    if (password.length < 6) {
      return t.validation.passwordTooShort
    }
    return null
  }

  /**
   * 验证密码确认
   */
  const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
    if (password !== confirmPassword) {
      return t.validation.passwordMismatch
    }
    return null
  }

  /**
   * 验证用户名
   */
  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return t.validation.fieldRequired
    }
    if (!USERNAME_REGEX.test(username)) {
      return t.validation.usernameInvalid
    }
    return null
  }

  /**
   * 验证Slug
   */
  const validateSlug = (slug: string): string | null => {
    if (!slug.trim()) {
      return t.validation.fieldRequired
    }
    if (!SLUG_REGEX.test(slug)) {
      return t.validation.slugInvalid
    }
    return null
  }

  /**
   * 验证名称长度
   */
  const validateName = (name: string, minLength = 2): string | null => {
    if (!name.trim()) {
      return t.validation.fieldRequired
    }
    if (name.trim().length < minLength) {
      return t.validation.nameTooShort
    }
    return null
  }

  /**
   * 验证描述长度
   */
  const validateDescription = (description: string, maxLength = 500): string | null => {
    if (description.length > maxLength) {
      return t.validation.descriptionTooLong
    }
    return null
  }

  return {
    validateEmail,
    validateRequired,
    validatePassword,
    validatePasswordMatch,
    validateUsername,
    validateSlug,
    validateName,
    validateDescription,
    t,
  }
}
