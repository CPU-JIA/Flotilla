import * as crypto from 'crypto';

/**
 * 文件工具类
 *
 * 提供文件内容处理相关的工具函数
 *
 * ECP-B1 (DRY): 集中管理文件处理逻辑
 * ECP-C3 (性能): 文件大小限制和内容截断
 */

/**
 * 最大文件大小（1MB）
 *
 * ECP-D3 (无魔法值): 定义为常量
 */
export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * 内容预览最大长度（500字符）
 */
export const PREVIEW_MAX_LENGTH = 500;

/**
 * 最大索引内容大小（1MB）
 * 超过此大小的文件只索引前100KB
 */
export const MAX_INDEX_SIZE = 100 * 1024; // 100KB

/**
 * 计算文件内容的SHA256哈希
 *
 * @param content - 文件内容
 * @returns SHA256哈希值（十六进制）
 *
 * ECP-B2 (KISS): 使用Node.js内置crypto模块
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * 生成内容预览
 *
 * 提取前500字符作为预览
 *
 * @param content - 完整内容
 * @returns 预览字符串
 *
 * ECP-C3 (性能): 限制预览长度减少传输量
 */
export function generateContentPreview(content: string): string {
  if (content.length <= PREVIEW_MAX_LENGTH) {
    return content;
  }
  return content.substring(0, PREVIEW_MAX_LENGTH) + '...';
}

/**
 * 计算文件行数
 *
 * @param content - 文件内容
 * @returns 总行数
 */
export function countLines(content: string): number {
  if (!content) {
    return 0;
  }
  return content.split('\n').length;
}

/**
 * 检查内容是否为二进制文件
 *
 * 通过检测空字节（\0）判断是否为二进制
 *
 * @param content - 文件内容
 * @returns 是否为二进制
 *
 * ECP-B2 (KISS): 简单的空字节检测
 */
export function isBinaryContent(content: string): boolean {
  return content.includes('\0');
}

/**
 * 检查文件大小是否超过限制
 *
 * @param size - 文件大小（字节）
 * @returns 是否超过限制
 */
export function isFileTooLarge(size: number): boolean {
  return size > MAX_FILE_SIZE;
}

/**
 * 截断大文件内容
 *
 * 对于超过1MB的文件，只保留前100KB用于索引
 *
 * @param content - 完整内容
 * @returns 截断后的内容
 *
 * ECP-C3 (性能): 避免索引超大文件导致内存问题
 */
export function truncateContent(content: string): string {
  if (content.length <= MAX_INDEX_SIZE) {
    return content;
  }
  return content.substring(0, MAX_INDEX_SIZE);
}

/**
 * 清理内容中的敏感信息
 *
 * 检测并替换常见的敏感模式
 *
 * @param content - 原始内容
 * @returns 清理后的内容
 *
 * ECP-C1 (数据安全): 防止敏感信息泄露
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;

  // 敏感模式列表
  const SENSITIVE_PATTERNS = [
    /password\s*[:=]\s*['"]?[\w\d@#$%^&*()_+=[\]{};':"\\|,.<>/?-]+/gi,
    /api[_-]?key\s*[:=]\s*['"]?[\w\d-]+/gi,
    /secret\s*[:=]\s*['"]?[\w\d-]+/gi,
    /token\s*[:=]\s*['"]?[\w\d.-]+/gi,
  ];

  // 替换敏感信息为[REDACTED]
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * 验证内容是否为有效UTF-8文本
 *
 * @param buffer - 文件Buffer
 * @returns 是否为有效UTF-8
 */
export function isValidUtf8(buffer: Buffer): boolean {
  try {
    buffer.toString('utf8');
    return true;
  } catch {
    return false;
  }
}
