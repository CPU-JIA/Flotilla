/**
 * Password Strength Validator - 自定义密码强度验证装饰器
 * ECP-C1: 防御性编程 - 强密码策略
 *
 * 🔒 SECURITY: CWE-521 - Weak Password Requirements
 *
 * 密码要求：
 * - 最小长度：12字符
 * - 必须包含：大写字母、小写字母、数字、特殊字符
 * - 不能包含常见弱密码模式
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 密码强度验证接口
 */
export interface PasswordStrengthOptions extends ValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}

/**
 * 密码强度验证结果
 */
export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证密码强度（核心逻辑）
 *
 * @param password 密码
 * @param options 验证选项
 * @returns 验证结果
 */
export function validatePasswordStrength(
  password: string,
  options: PasswordStrengthOptions = {},
): PasswordStrengthResult {
  const {
    minLength = 12,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecialChar = true,
  } = options;

  const errors: string[] = [];

  // 1. 检查最小长度
  if (!password || password.length < minLength) {
    errors.push(`密码至少需要${minLength}个字符`);
  }

  // 2. 检查大写字母
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  // 3. 检查小写字母
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  // 4. 检查数字
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  // 5. 检查特殊字符
  if (requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*等)');
  }

  // 6. 检查常见弱密码模式
  const weakPatterns = [
    { pattern: /^(.)\1+$/, message: '密码不能全是相同字符' },
    { pattern: /(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/, message: '密码不能包含连续数字' },
    { pattern: /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, message: '密码不能包含连续字母' },
    { pattern: /(password|passwd|pass123|admin|root|user|test|demo|qwerty|asdfgh|zxcvbn|111111|123456|654321)/i, message: '密码不能包含常见弱密码词汇' },
  ];

  for (const { pattern, message } of weakPatterns) {
    if (pattern.test(password)) {
      errors.push(message);
      break; // 只报告第一个匹配的弱模式
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 密码强度验证装饰器
 *
 * 使用示例：
 * ```typescript
 * @IsStrongPassword({
 *   minLength: 12,
 *   requireSpecialChar: true,
 *   message: '密码不符合安全要求'
 * })
 * password: string;
 * ```
 *
 * @param options 验证选项
 * @returns 装饰器函数
 */
export function IsStrongPassword(options?: PasswordStrengthOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const result = validatePasswordStrength(value, options);
          return result.valid;
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;
          if (typeof value !== 'string') {
            return '密码必须是字符串';
          }

          const result = validatePasswordStrength(value, options);
          if (!result.valid) {
            // 返回第一个错误，或者自定义消息
            const customMessage = options?.message;
            if (typeof customMessage === 'function') {
              return customMessage(args);
            }
            return customMessage || result.errors[0] || '密码不符合安全要求';
          }

          return '密码不符合安全要求';
        },
      },
    });
  };
}

/**
 * 获取密码强度描述（用于UI提示）
 *
 * @param password 密码
 * @returns 强度描述和建议
 */
export function getPasswordStrengthFeedback(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
  suggestions: string[];
} {
  const result = validatePasswordStrength(password);
  const suggestions: string[] = [];

  // 计算得分（每满足一项+20分）
  let score = 0;
  if (password && password.length >= 12) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

  // 额外加分项
  if (password && password.length >= 16) score += 10; // 长度超过16
  if ((password.match(/[A-Z]/g) || []).length >= 2) score += 5; // 多个大写
  if ((password.match(/[0-9]/g) || []).length >= 2) score += 5; // 多个数字
  if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length >= 2) score += 5; // 多个特殊字符

  // 根据验证结果生成建议
  if (!result.valid) {
    suggestions.push(...result.errors);
  } else {
    if (password.length < 16) {
      suggestions.push('建议：密码长度超过16字符会更安全');
    }
    if ((password.match(/[0-9]/g) || []).length < 2) {
      suggestions.push('建议：使用多个数字增强安全性');
    }
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < 2) {
      suggestions.push('建议：使用多个特殊字符增强安全性');
    }
  }

  // 确定强度等级
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 60) {
    strength = 'weak';
  } else if (score < 80) {
    strength = 'medium';
  } else if (score < 100) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return { strength, score, suggestions };
}
