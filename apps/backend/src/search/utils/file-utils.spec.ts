import {
  calculateContentHash,
  generateContentPreview,
  countLines,
  isBinaryContent,
  isFileTooLarge,
  truncateContent,
  sanitizeContent,
  MAX_FILE_SIZE,
  PREVIEW_MAX_LENGTH,
  MAX_INDEX_SIZE,
} from './file-utils';

/**
 * 文件工具类单元测试
 *
 * 测试范围：
 * - calculateContentHash(): SHA256哈希计算
 * - generateContentPreview(): 内容预览生成
 * - countLines(): 行数统计
 * - isBinaryContent(): 二进制检测
 * - isFileTooLarge(): 文件大小检查
 * - truncateContent(): 内容截断
 * - sanitizeContent(): 敏感信息清理
 *
 * ECP-D1 (可测试性): 纯函数，易于测试
 */
describe('file-utils', () => {
  describe('calculateContentHash', () => {
    it('should return consistent SHA256 hash for same content', () => {
      const content = 'Hello World';
      const hash1 = calculateContentHash(content);
      const hash2 = calculateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 is 64 hex chars
    });

    it('should return different hashes for different content', () => {
      const hash1 = calculateContentHash('Hello World');
      const hash2 = calculateContentHash('Hello World!');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = calculateContentHash('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle multi-line content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const hash = calculateContentHash(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle unicode characters', () => {
      const content = '你好世界 🌍';
      const hash = calculateContentHash(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateContentPreview', () => {
    it('should return full content if shorter than max length', () => {
      const content = 'Short content';
      const preview = generateContentPreview(content);

      expect(preview).toBe(content);
    });

    it('should truncate content longer than max length', () => {
      const longContent = 'a'.repeat(PREVIEW_MAX_LENGTH + 100);
      const preview = generateContentPreview(longContent);

      expect(preview.length).toBe(PREVIEW_MAX_LENGTH + 3); // +3 for '...'
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should preserve exactly PREVIEW_MAX_LENGTH characters before ellipsis', () => {
      const longContent = 'x'.repeat(PREVIEW_MAX_LENGTH + 50);
      const preview = generateContentPreview(longContent);

      const withoutEllipsis = preview.slice(0, -3);
      expect(withoutEllipsis.length).toBe(PREVIEW_MAX_LENGTH);
    });

    it('should handle empty string', () => {
      expect(generateContentPreview('')).toBe('');
    });

    it('should handle content exactly at max length', () => {
      const content = 'a'.repeat(PREVIEW_MAX_LENGTH);
      const preview = generateContentPreview(content);

      expect(preview).toBe(content);
      expect(preview).not.toContain('...');
    });
  });

  describe('countLines', () => {
    it('should count lines correctly', () => {
      expect(countLines('Line 1\nLine 2\nLine 3')).toBe(3);
    });

    it('should return 1 for single line', () => {
      expect(countLines('Single line')).toBe(1);
    });

    it('should return 0 for empty string', () => {
      expect(countLines('')).toBe(0);
    });

    it('should handle trailing newline', () => {
      expect(countLines('Line 1\nLine 2\n')).toBe(3); // Trailing \n creates empty line
    });

    it('should handle Windows line endings (CRLF)', () => {
      expect(countLines('Line 1\r\nLine 2\r\nLine 3')).toBe(3);
    });

    it('should handle mixed line endings', () => {
      expect(countLines('Line 1\nLine 2\r\nLine 3')).toBe(3);
    });

    it('should handle multiple consecutive newlines', () => {
      expect(countLines('Line 1\n\n\nLine 2')).toBe(4);
    });
  });

  describe('isBinaryContent', () => {
    it('should return false for text content', () => {
      expect(isBinaryContent('Hello World')).toBe(false);
      expect(isBinaryContent('const x = 1;')).toBe(false);
    });

    it('should return true for content with null byte', () => {
      const binaryContent = 'Hello\0World';
      expect(isBinaryContent(binaryContent)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isBinaryContent('')).toBe(false);
    });

    it('should return false for multi-line text', () => {
      const textContent = 'Line 1\nLine 2\nLine 3';
      expect(isBinaryContent(textContent)).toBe(false);
    });

    it('should return false for unicode text', () => {
      expect(isBinaryContent('你好世界 🌍')).toBe(false);
    });

    it('should return true for binary-like content', () => {
      const binaryContent = '\x00\x01\x02\x03';
      expect(isBinaryContent(binaryContent)).toBe(true);
    });
  });

  describe('isFileTooLarge', () => {
    it('should return false for files smaller than max size', () => {
      expect(isFileTooLarge(1024)).toBe(false); // 1KB
      expect(isFileTooLarge(512 * 1024)).toBe(false); // 512KB
    });

    it('should return true for files larger than max size', () => {
      expect(isFileTooLarge(MAX_FILE_SIZE + 1)).toBe(true);
      expect(isFileTooLarge(2 * MAX_FILE_SIZE)).toBe(true);
    });

    it('should return false for files exactly at max size', () => {
      expect(isFileTooLarge(MAX_FILE_SIZE)).toBe(false);
    });

    it('should handle zero size', () => {
      expect(isFileTooLarge(0)).toBe(false);
    });
  });

  describe('truncateContent', () => {
    it('should not truncate content shorter than max index size', () => {
      const content = 'Short content';
      expect(truncateContent(content)).toBe(content);
    });

    it('should truncate content longer than max index size', () => {
      const longContent = 'a'.repeat(MAX_INDEX_SIZE + 1000);
      const truncated = truncateContent(longContent);

      expect(truncated.length).toBe(MAX_INDEX_SIZE);
      expect(truncated).not.toContain('...'); // No ellipsis, just truncates
    });

    it('should not truncate content exactly at max index size', () => {
      const content = 'x'.repeat(MAX_INDEX_SIZE);
      expect(truncateContent(content)).toBe(content);
    });

    it('should handle empty string', () => {
      expect(truncateContent('')).toBe('');
    });

    it('should preserve content structure within limit', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      expect(truncateContent(content)).toBe(content);
    });
  });

  describe('sanitizeContent', () => {
    it('should redact password patterns', () => {
      const content = 'password: "secret123"';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('secret123');
    });

    it('should redact API key patterns', () => {
      const content = 'api_key: abc123xyz';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('abc123xyz');
    });

    it('should redact secret patterns', () => {
      const content = 'secret = "my-secret-value"';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('my-secret-value');
    });

    it('should redact token patterns', () => {
      const content = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toContain('[REDACTED]');
    });

    it('should not modify content without sensitive patterns', () => {
      const content = 'const user = { name: "John", age: 30 };';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toBe(content);
    });

    it('should handle multiple sensitive patterns', () => {
      const content = 'password: "secret" api_key: "key123"';
      const sanitized = sanitizeContent(content);

      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('secret');
      expect(sanitized).not.toContain('key123');
    });

    it('should handle empty string', () => {
      expect(sanitizeContent('')).toBe('');
    });
  });
});
