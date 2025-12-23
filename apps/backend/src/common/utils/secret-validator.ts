/**
 * Secret Validator - JWT密钥强度验证
 * ECP-C1: 防御性编程 - 启动时验证密钥强度
 * ECP-C3: 性能意识 - 一次性验证，避免运行时开销
 *
 * 🔒 SECURITY: CWE-326 - Inadequate Encryption Strength
 *
 * 功能：
 * - 验证HS256密钥强度（至少256位/43字符base64编码）
 * - 计算密钥熵值（Shannon entropy）
 * - 检测弱密钥并提供安全建议
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('SecretValidator');

/**
 * 密钥验证结果
 */
export interface SecretValidationResult {
  valid: boolean;
  message: string;
  entropy?: number;
  suggestions?: string[];
}

/**
 * 计算Shannon熵值
 * 熵值越高，密钥越随机，越难被破解
 *
 * @param str 输入字符串
 * @returns 熵值（bits per character）
 */
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequency: Record<string, number> = {};

  // 统计每个字符出现的频率
  for (const char of str) {
    frequency[char] = (frequency[char] || 0) + 1;
  }

  // 计算Shannon熵
  let entropy = 0;
  const length = str.length;

  for (const count of Object.values(frequency)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * 检查字符串是否为有效的Base64编码
 *
 * @param str 输入字符串
 * @returns 是否为Base64编码
 */
export function isBase64(str: string): boolean {
  if (!str || str.length === 0) return false;

  // Base64正则: 字母数字+/=，长度必须是4的倍数或有正确的padding
  const base64Regex = /^[A-Za-z0-9+/]+(==|=)?$/;

  if (!base64Regex.test(str)) return false;

  try {
    // 尝试解码Base64
    Buffer.from(str, 'base64').toString('base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证JWT密钥强度（HS256算法）
 *
 * 🔒 SECURITY REQUIREMENTS (CWE-326):
 * - HS256需要256位密钥（32字节）
 * - Base64编码后至少43字符（ceil(32 * 8 / 6) = 43）
 * - 熵值应 ≥ 4.0 bits/char（推荐 ≥ 4.5）
 *
 * @param secret JWT密钥
 * @param name 密钥名称（用于错误提示）
 * @returns 验证结果
 */
export function validateJwtSecret(
  secret: string | undefined,
  name: string = 'JWT_SECRET',
): SecretValidationResult {
  const suggestions: string[] = [];

  // 1. 检查密钥是否存在
  if (!secret) {
    return {
      valid: false,
      message: `SECURITY ERROR: ${name} is not configured. Please set ${name} in environment variables.`,
      suggestions: [
        `Generate a strong secret using: openssl rand -base64 43`,
        `Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
      ],
    };
  }

  // 2. 检查最小长度（HS256要求至少43字符）
  const MIN_LENGTH = 43;
  if (secret.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `SECURITY ERROR: ${name} is too weak (${secret.length} characters). HS256 requires at least 256 bits (${MIN_LENGTH} characters in Base64 encoding).`,
      suggestions: [
        `Current length: ${secret.length} characters`,
        `Required length: at least ${MIN_LENGTH} characters`,
        `Generate strong secret: openssl rand -base64 43`,
      ],
    };
  }

  // 3. 计算熵值
  const entropy = calculateEntropy(secret);
  const MIN_ENTROPY = 4.0; // 最低要求
  const RECOMMENDED_ENTROPY = 4.5; // 推荐值

  if (entropy < MIN_ENTROPY) {
    return {
      valid: false,
      message: `SECURITY ERROR: ${name} has insufficient entropy (${entropy.toFixed(2)} bits/char). Minimum ${MIN_ENTROPY} bits/char required.`,
      entropy,
      suggestions: [
        `Current entropy: ${entropy.toFixed(2)} bits/char`,
        `Minimum entropy: ${MIN_ENTROPY} bits/char`,
        `Your secret appears to be non-random or repetitive`,
        `Generate cryptographically secure secret: openssl rand -base64 43`,
      ],
    };
  }

  // 4. 检查是否为Base64编码（推荐但非强制）
  const isValidBase64 = isBase64(secret);
  if (!isValidBase64) {
    suggestions.push(
      `⚠️  WARNING: ${name} is not valid Base64. While not strictly required, Base64-encoded secrets are recommended for maximum entropy.`,
    );
  }

  // 5. 熵值低于推荐值时发出警告
  if (entropy < RECOMMENDED_ENTROPY) {
    suggestions.push(
      `⚠️  WARNING: ${name} entropy is ${entropy.toFixed(2)} bits/char (recommended: ≥ ${RECOMMENDED_ENTROPY}). Consider regenerating with: openssl rand -base64 43`,
    );
  }

  // 6. 检查常见弱密钥模式
  const weakPatterns = [
    { pattern: /^(.)\1+$/, name: 'repeated characters' },
    {
      pattern: /^(012|123|234|345|456|567|678|789|890)+$/,
      name: 'sequential numbers',
    },
    {
      pattern:
        /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i,
      name: 'sequential letters',
    },
    {
      pattern: /^(password|secret|admin|test|demo|default|changeme)/i,
      name: 'common weak words',
    },
  ];

  for (const { pattern, name: patternName } of weakPatterns) {
    if (pattern.test(secret)) {
      return {
        valid: false,
        message: `SECURITY ERROR: ${name} contains weak pattern (${patternName}). Use cryptographically secure random secret.`,
        entropy,
        suggestions: [
          `Detected weak pattern: ${patternName}`,
          `Generate strong secret: openssl rand -base64 43`,
        ],
      };
    }
  }

  // ✅ 验证通过
  return {
    valid: true,
    message: `✅ ${name} is valid (${secret.length} characters, ${entropy.toFixed(2)} bits/char entropy)`,
    entropy,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * 验证并在失败时抛出错误（用于启动时验证）
 *
 * @param secret JWT密钥
 * @param name 密钥名称
 * @throws Error 如果验证失败
 */
export function validateJwtSecretOrThrow(
  secret: string | undefined,
  name: string = 'JWT_SECRET',
): void {
  const result = validateJwtSecret(secret, name);

  if (!result.valid) {
    const errorMessage = [
      result.message,
      '',
      ...(result.suggestions || []),
    ].join('\n');
    throw new Error(errorMessage);
  }

  // 打印警告（如果有）
  if (result.suggestions && result.suggestions.length > 0) {
    logger.warn('🔐 JWT Security Warnings:');
    result.suggestions.forEach((s) => logger.warn(`   ${s}`));
  }
}
