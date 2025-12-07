'use client'

/**
 * 密码强度指示器组件
 * 🔒 Phase 3 FIX: 实时密码强度反馈，帮助用户创建安全的密码
 * ECP-B2: KISS原则 - 简单清晰的强度评估算法
 */

import { useMemo } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface PasswordStrengthProps {
  password: string
  showRequirements?: boolean
}

interface StrengthResult {
  score: number // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong'
  color: string
  label: string
  checks: {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
  }
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const strength: StrengthResult = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        level: 'weak',
        color: 'bg-gray-300',
        label: '',
        checks: {
          minLength: false,
          hasUpperCase: false,
          hasLowerCase: false,
          hasNumber: false,
          hasSpecialChar: false,
        },
      }
    }

    // 检查各项要求
    const checks = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }

    // 计算得分
    let score = 0
    if (checks.minLength) score += 20
    if (checks.hasUpperCase) score += 20
    if (checks.hasLowerCase) score += 20
    if (checks.hasNumber) score += 20
    if (checks.hasSpecialChar) score += 20

    // 额外分数：长度奖励
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10

    // 确保分数在0-100之间
    score = Math.min(100, Math.max(0, score))

    // 确定强度等级
    let level: StrengthResult['level']
    let color: string
    let label: string

    if (score < 40) {
      level = 'weak'
      color = 'bg-red-500'
      label = '弱'
    } else if (score < 60) {
      level = 'fair'
      color = 'bg-orange-500'
      label = '一般'
    } else if (score < 80) {
      level = 'good'
      color = 'bg-yellow-500'
      label = '良好'
    } else {
      level = 'strong'
      color = 'bg-green-500'
      label = '强'
    }

    return { score, level, color, label, checks }
  }, [password])

  if (!password) return null

  return (
    <div className="space-y-3 mt-2">
      {/* 进度条 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">密码强度</span>
          <span className={`font-medium ${
            strength.level === 'weak' ? 'text-red-600 dark:text-red-400' :
            strength.level === 'fair' ? 'text-orange-600 dark:text-orange-400' :
            strength.level === 'good' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-green-600 dark:text-green-400'
          }`}>
            {strength.label}
          </span>
        </div>
        <Progress
          value={strength.score}
          className="h-2"
          indicatorClassName={strength.color}
        />
      </div>

      {/* 要求检查列表 */}
      {showRequirements && (
        <div className="space-y-1.5 text-xs">
          <RequirementItem
            met={strength.checks.minLength}
            text="至少8个字符"
          />
          <RequirementItem
            met={strength.checks.hasUpperCase}
            text="包含大写字母 (A-Z)"
          />
          <RequirementItem
            met={strength.checks.hasLowerCase}
            text="包含小写字母 (a-z)"
          />
          <RequirementItem
            met={strength.checks.hasNumber}
            text="包含数字 (0-9)"
          />
          <RequirementItem
            met={strength.checks.hasSpecialChar}
            text="包含特殊字符 (!@#$%^&*...)"
          />
        </div>
      )}

      {/* 强度建议 */}
      {strength.level === 'weak' && (
        <div className="flex gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">
            密码太弱，请满足更多安全要求
          </p>
        </div>
      )}
      {strength.level === 'fair' && (
        <div className="flex gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700 dark:text-orange-300">
            可以更安全，建议添加特殊字符或增加长度
          </p>
        </div>
      )}
    </div>
  )
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  )
}
