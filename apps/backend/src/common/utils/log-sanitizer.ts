/**
 * Log Sanitizer - 日志脱敏工具
 * ECP-C1: 防御性编程 - 防止敏感信息泄露
 * ECP-C2: 系统性错误处理 - 防御性地处理异常输入
 *
 * 用途：在日志输出前对敏感信息进行脱敏处理
 * - Email: user@example.com -> u***@example.com
 * - Username: johndoe -> joh***
 * - Token: abcdef1234567890 -> abcdef***
 */

/**
 * 脱敏邮箱地址
 * @param email 邮箱地址
 * @returns 脱敏后的邮箱地址，如 u***@example.com
 * @example
 * maskEmail('user@example.com') // => 'u***@example.com'
 * maskEmail('a@b.com') // => 'a***@b.com'
 * maskEmail('') // => ''
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // 验证基本邮箱格式
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return '***';
  }

  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex);

  // 保留本地部分第一个字符
  const maskedLocal = localPart.charAt(0) + '***';

  return maskedLocal + domainPart;
}

/**
 * 脱敏用户名
 * @param username 用户名
 * @returns 脱敏后的用户名，如 joh***
 * @example
 * maskUsername('johndoe') // => 'joh***'
 * maskUsername('ab') // => 'a***'
 * maskUsername('') // => ''
 */
export function maskUsername(username: string | null | undefined): string {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // 用户名太短时保留第一个字符
  if (username.length <= 2) {
    return username.charAt(0) + '***';
  }

  // 保留前三个字符
  return username.substring(0, 3) + '***';
}

/**
 * 脱敏Token（JWT、重置Token等）
 * @param token Token字符串
 * @returns 脱敏后的Token，只显示前6位，如 abcdef***
 * @example
 * maskToken('abcdef1234567890') // => 'abcdef***'
 * maskToken('short') // => 'short***'
 * maskToken('') // => ''
 */
export function maskToken(token: string | null | undefined): string {
  if (!token || typeof token !== 'string') {
    return '';
  }

  // 显示前6个字符（如果长度不足则显示全部）
  const visibleLength = Math.min(6, token.length);
  return token.substring(0, visibleLength) + '***';
}

/**
 * 递归脱敏对象中的敏感字段
 * @param obj 待脱敏的对象
 * @param sensitiveFields 敏感字段名列表（可选，默认为常见敏感字段）
 * @returns 脱敏后的对象副本
 * @example
 * sanitizeObject({ email: 'user@example.com', name: 'John' })
 * // => { email: 'u***@example.com', name: 'John' }
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: string[] = [
    'email',
    'username',
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'passwordResetToken',
    'emailVerifyToken',
    'secret',
    'apiKey',
  ],
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // 创建浅拷贝以避免修改原对象
  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    // 处理嵌套对象
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(
        value,
        sensitiveFields,
      ) as T[keyof T];
      continue;
    }

    // 处理数组
    if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item, sensitiveFields)
          : item,
      ) as T[keyof T];
      continue;
    }

    // 脱敏敏感字段
    if (typeof value === 'string' && sensitiveFields.includes(key)) {
      if (key === 'email') {
        sanitized[key as keyof T] = maskEmail(value) as T[keyof T];
      } else if (key === 'username') {
        sanitized[key as keyof T] = maskUsername(value) as T[keyof T];
      } else {
        // 默认使用 maskToken 处理其他敏感字段
        sanitized[key as keyof T] = maskToken(value) as T[keyof T];
      }
    }
  }

  return sanitized;
}
