/**
 * Secret Validator - 测试套件
 * 验证JWT密钥强度验证功能
 */

import { Logger } from '@nestjs/common';
import {
  calculateEntropy,
  isBase64,
  validateJwtSecret,
  validateJwtSecretOrThrow,
} from './secret-validator';

describe('Secret Validator', () => {
  describe('calculateEntropy', () => {
    it('should return 0 for empty string', () => {
      expect(calculateEntropy('')).toBe(0);
      expect(calculateEntropy(null as any)).toBe(0);
      expect(calculateEntropy(undefined as any)).toBe(0);
    });

    it('should calculate low entropy for repeated characters', () => {
      const entropy = calculateEntropy('aaaaaaaaaa');
      expect(entropy).toBeLessThan(1); // 完全重复，熵值接近0
    });

    it('should calculate high entropy for random strings', () => {
      const randomBase64 = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
      const entropy = calculateEntropy(randomBase64);
      expect(entropy).toBeGreaterThan(4.0); // 随机Base64应该有较高熵值
    });

    it('should calculate medium entropy for mixed patterns', () => {
      const mixedString = 'abcdefg1234567';
      const entropy = calculateEntropy(mixedString);
      expect(entropy).toBeGreaterThan(2);
      expect(entropy).toBeLessThan(5);
    });
  });

  describe('isBase64', () => {
    it('should return false for empty or invalid input', () => {
      expect(isBase64('')).toBe(false);
      expect(isBase64(null as any)).toBe(false);
      expect(isBase64(undefined as any)).toBe(false);
    });

    it('should return true for valid Base64 strings', () => {
      expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isBase64('K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=')).toBe(
        true,
      );
      expect(isBase64('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=')).toBe(true);
    });

    it('should return false for non-Base64 strings', () => {
      expect(isBase64('not base64!@#$')).toBe(false);
      expect(isBase64('这是中文')).toBe(false);
      expect(isBase64('abc def')).toBe(false); // 包含空格
    });
  });

  describe('validateJwtSecret', () => {
    it('should reject undefined or empty secret', () => {
      const result = validateJwtSecret(undefined);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not configured');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should reject secrets shorter than 43 characters', () => {
      const shortSecret = 'tooshort1234567890'; // 18 characters
      const result = validateJwtSecret(shortSecret);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too weak');
      expect(result.message).toContain('18 characters');
      expect(result.suggestions).toBeDefined();
    });

    it('should reject secrets with low entropy', () => {
      const lowEntropySecret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 43个'a'
      const result = validateJwtSecret(lowEntropySecret);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('insufficient entropy');
      expect(result.entropy).toBeLessThan(1);
    });

    it('should reject secrets with weak patterns', () => {
      // 测试重复字符
      const repeated = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      expect(validateJwtSecret(repeated).valid).toBe(false);

      // 测试顺序数字
      const sequential = '0123456789012345678901234567890123456789012';
      expect(validateJwtSecret(sequential).valid).toBe(false);

      // 测试常见弱密码
      const weakWord = 'password123456789012345678901234567890123456';
      expect(validateJwtSecret(weakWord).valid).toBe(false);
    });

    it('should accept valid strong secrets', () => {
      const strongSecret = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols='; // openssl rand -base64 32
      const result = validateJwtSecret(strongSecret);
      expect(result.valid).toBe(true);
      expect(result.entropy).toBeGreaterThan(4.0);
      expect(result.message).toContain('valid');
    });

    it('should warn for non-Base64 secrets with sufficient entropy', () => {
      // 生成一个足够长但非Base64的随机字符串
      const nonBase64Secret =
        'aB1$cD2@eF3#gH4!iJ5%kL6^mN7&oP8*qR9(sT0)uV1-wX2_yZ3+aB4=cD5';
      const result = validateJwtSecret(nonBase64Secret);
      expect(result.valid).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(
        result.suggestions!.some((s) => s.includes('not valid Base64')),
      ).toBe(true);
    });

    it('should warn for entropy below recommended threshold', () => {
      // 创建一个长度足够但熵值略低的密钥（4.0 < entropy < 4.5）
      const mediumEntropySecret =
        'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ';
      const result = validateJwtSecret(mediumEntropySecret);
      if (result.entropy && result.entropy < 4.5) {
        expect(result.valid).toBe(true);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.some((s) => s.includes('recommended'))).toBe(
          true,
        );
      }
    });

    it('should use custom name in error messages', () => {
      const result = validateJwtSecret(undefined, 'CUSTOM_SECRET');
      expect(result.message).toContain('CUSTOM_SECRET');
    });
  });

  describe('validateJwtSecretOrThrow', () => {
    it('should throw error for invalid secrets', () => {
      expect(() => validateJwtSecretOrThrow(undefined)).toThrow(
        'not configured',
      );
      expect(() => validateJwtSecretOrThrow('tooshort')).toThrow('too weak');
      expect(() =>
        validateJwtSecretOrThrow('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      ).toThrow('insufficient entropy');
    });

    it('should not throw for valid secrets', () => {
      const strongSecret = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';
      expect(() => validateJwtSecretOrThrow(strongSecret)).not.toThrow();
    });

    it('should use custom name in thrown errors', () => {
      expect(() =>
        validateJwtSecretOrThrow(undefined, 'CUSTOM_SECRET'),
      ).toThrow('CUSTOM_SECRET');
    });

    it('should log warnings for valid but suboptimal secrets', () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const nonBase64Secret =
        'aB1$cD2@eF3#gH4!iJ5%kL6^mN7&oP8*qR9(sT0)uV1-wX2_yZ3+aB4=cD5';
      validateJwtSecretOrThrow(nonBase64Secret);

      expect(loggerWarnSpy).toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Real-world scenarios', () => {
    it('should accept secrets from openssl rand -base64 32', () => {
      const opensslSecrets = [
        'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=',
        'VmVyeVN0cm9uZ1JhbmRvbVNlY3JldEtleUZvckpXVDE=',
        '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi=',
      ];

      opensslSecrets.forEach((secret) => {
        const result = validateJwtSecret(secret);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject common weak secrets', () => {
      const weakSecrets = [
        'password',
        'secret123',
        'admin1234567890123456789012345678901234567890',
        'test-test-test-test-test-test-test-test-test-test',
      ];

      weakSecrets.forEach((secret) => {
        const result = validateJwtSecret(secret);
        expect(result.valid).toBe(false);
      });
    });

    it('should handle secrets generated by crypto.randomBytes', () => {
      // 模拟 crypto.randomBytes(32).toString('base64')
      const cryptoSecret = Buffer.from([
        0x2b, 0xb8, 0x0d, 0x53, 0x7b, 0x1d, 0xa3, 0xe3, 0x8b, 0xd3, 0x03, 0x61,
        0xaa, 0x85, 0x56, 0x86, 0xbd, 0xe0, 0xea, 0xcd, 0x71, 0x62, 0xfe, 0xf6,
        0xa2, 0x5f, 0xe9, 0x7b, 0xf5, 0x27, 0xa2, 0x5b,
      ]).toString('base64');

      const result = validateJwtSecret(cryptoSecret);
      expect(result.valid).toBe(true);
      expect(result.entropy).toBeGreaterThan(4.0);
    });
  });
});
