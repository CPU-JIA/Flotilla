/**
 * Log Sanitizer 单元测试
 * 验证日志脱敏功能的正确性
 */

import {
  maskEmail,
  maskUsername,
  maskToken,
  sanitizeObject,
} from './log-sanitizer';

describe('Log Sanitizer', () => {
  describe('maskEmail', () => {
    it('should mask standard email', () => {
      expect(maskEmail('user@example.com')).toBe('u***@example.com');
    });

    it('should mask short email', () => {
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('should mask long email', () => {
      expect(maskEmail('verylongemail@example.com')).toBe('v***@example.com');
    });

    it('should handle null', () => {
      expect(maskEmail(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(maskEmail(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(maskEmail('')).toBe('');
    });

    it('should handle invalid email (no @)', () => {
      expect(maskEmail('notanemail')).toBe('***');
    });

    it('should handle email starting with @', () => {
      expect(maskEmail('@example.com')).toBe('***');
    });
  });

  describe('maskUsername', () => {
    it('should mask standard username', () => {
      expect(maskUsername('johndoe')).toBe('joh***');
    });

    it('should mask short username (2 chars)', () => {
      expect(maskUsername('ab')).toBe('a***');
    });

    it('should mask single char username', () => {
      expect(maskUsername('a')).toBe('a***');
    });

    it('should mask long username', () => {
      expect(maskUsername('verylongusername')).toBe('ver***');
    });

    it('should handle null', () => {
      expect(maskUsername(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(maskUsername(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(maskUsername('')).toBe('');
    });
  });

  describe('maskToken', () => {
    it('should mask standard token', () => {
      expect(maskToken('abcdef1234567890')).toBe('abcdef***');
    });

    it('should mask short token', () => {
      expect(maskToken('short')).toBe('short***');
    });

    it('should mask very short token', () => {
      expect(maskToken('abc')).toBe('abc***');
    });

    it('should mask long token', () => {
      const longToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(maskToken(longToken)).toBe('eyJhbG***');
    });

    it('should handle null', () => {
      expect(maskToken(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(maskToken(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(maskToken('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize email field', () => {
      const obj = { email: 'user@example.com', name: 'John' };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.email).toBe('u***@example.com');
      expect(sanitized.name).toBe('John');
    });

    it('should sanitize multiple sensitive fields', () => {
      const obj = {
        email: 'user@example.com',
        username: 'johndoe',
        token: 'abcdef1234567890',
        name: 'John Doe',
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.email).toBe('u***@example.com');
      expect(sanitized.username).toBe('joh***'); // username should be masked
      expect(sanitized.token).toBe('abcdef***');
      expect(sanitized.name).toBe('John Doe');
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          email: 'user@example.com',
          name: 'John',
        },
        metadata: {
          token: 'secret123',
        },
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.user.email).toBe('u***@example.com');
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.metadata.token).toBe('secret***');
    });

    it('should sanitize arrays', () => {
      const obj = {
        users: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.users[0].email).toBe('u***@example.com');
      expect(sanitized.users[1].email).toBe('u***@example.com');
      expect(sanitized.users[0].name).toBe('User 1');
    });

    it('should sanitize password-related fields', () => {
      const obj = {
        password: 'mypassword123',
        passwordHash: 'hashedpassword',
        passwordResetToken: 'resettoken123',
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.password).toBe('mypass***');
      expect(sanitized.passwordHash).toBe('hashed***');
      expect(sanitized.passwordResetToken).toBe('resett***');
    });

    it('should sanitize JWT tokens', () => {
      const obj = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.accessToken).toBe('eyJhbG***');
      expect(sanitized.refreshToken).toBe('eyJhbG***');
    });

    it('should use custom sensitive fields', () => {
      const obj = {
        customSecret: 'mysecret',
        email: 'user@example.com',
      };
      const sanitized = sanitizeObject(obj, ['customSecret']);
      expect(sanitized.customSecret).toBe('mysecr***');
      expect(sanitized.email).toBe('user@example.com'); // Not masked
    });

    it('should not modify original object', () => {
      const obj = { email: 'user@example.com' };
      const sanitized = sanitizeObject(obj);
      expect(obj.email).toBe('user@example.com');
      expect(sanitized.email).toBe('u***@example.com');
    });

    it('should handle null input', () => {
      expect(sanitizeObject(null as any)).toBe(null);
    });

    it('should handle undefined input', () => {
      expect(sanitizeObject(undefined as any)).toBe(undefined);
    });

    it('should handle non-object input', () => {
      expect(sanitizeObject('string' as any)).toBe('string');
      expect(sanitizeObject(123 as any)).toBe(123);
    });
  });
});
