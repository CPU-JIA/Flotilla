'use client'

import { useMemo } from 'react'

/**
 * 密码强度计算
 * ECP-B2: KISS原则 - 简单有效的强度计算算法
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4 // 0=太弱, 1=弱, 2=中等, 3=强, 4=很强
  label: string
  color: string
  suggestions: string[]
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: 'bg-gray-200 dark:bg-gray-700',
      suggestions: [],
    }
  }

  let score = 0
  const suggestions: string[] = []

  // 基础长度检查
  if (password.length >= 8) score++
  else suggestions.push('至少8个字符')

  // 包含小写字母
  if (/[a-z]/.test(password)) score++
  else suggestions.push('包含小写字母')

  // 包含大写字母
  if (/[A-Z]/.test(password)) score++
  else suggestions.push('包含大写字母')

  // 包含数字
  if (/\d/.test(password)) score++
  else suggestions.push('包含数字')

  // 包含特殊字符（额外加分）
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  // 长度加分
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // 最终评分归一化到0-4
  const finalScore = Math.min(4, Math.max(0, Math.floor(score / 2))) as 0 | 1 | 2 | 3 | 4

  // 根据分数返回标签和颜色
  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: '太弱', color: 'bg-red-500' },
    1: { label: '弱', color: 'bg-orange-500' },
    2: { label: '中等', color: 'bg-yellow-500' },
    3: { label: '强', color: 'bg-green-500' },
    4: { label: '很强', color: 'bg-emerald-600' },
  }

  return {
    score: finalScore,
    ...strengthMap[finalScore],
    suggestions,
  }
}

interface PasswordStrengthIndicatorProps {
  password: string
  show?: boolean
}

/**
 * 密码强度指示器组件
 * ECP-D1: 设计易于测试和重用
 */
export default function PasswordStrengthIndicator({
  password,
  show = true,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!show || !password) {
    return null
  }

  // 计算进度条宽度（每个级别20%）
  const widthPercentage = (strength.score + 1) * 20

  return (
    <div className="space-y-2 mt-2">
      {/* 强度进度条 */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${strength.color}`}
          style={{ width: `${widthPercentage}%` }}
        />
      </div>

      {/* 强度标签和建议 */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          密码强度:{' '}
          <span
            className={`font-bold ${strength.score >= 3 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
          >
            {strength.label}
          </span>
        </span>
      </div>

      {/* 改进建议（仅在弱-中等时显示） */}
      {strength.score < 3 && strength.suggestions.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p className="font-medium">建议:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {strength.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 强密码鼓励 */}
      {strength.score === 4 && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ 非常安全的密码！</p>
      )}
    </div>
  )
}
