/**
 * Password Strength Validator - 测试套件
 * 验证密码强度验证功能
 */

import {
  validatePasswordStrength,
  getPasswordStrengthFeedback,
  PasswordStrengthResult,
} from './password-strength.validator';

describe('Password Strength Validator', () => {
  describe('validatePasswordStrength', () => {
    describe('Basic requirements', () => {
      it('should reject passwords shorter than 12 characters', () => {
        const result = validatePasswordStrength('Short1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('密码至少需要12个字符');
      });

      it('should reject passwords without uppercase letters', () => {
        const result = validatePasswordStrength('lowercase123!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('密码必须包含至少一个大写字母');
      });

      it('should reject passwords without lowercase letters', () => {
        const result = validatePasswordStrength('UPPERCASE123!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('密码必须包含至少一个小写字母');
      });

      it('should reject passwords without numbers', () => {
        const result = validatePasswordStrength('NoNumbersHere!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('密码必须包含至少一个数字');
      });

      it('should reject passwords without special characters', () => {
        const result = validatePasswordStrength('NoSpecialChar123');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('密码必须包含至少一个特殊字符 (!@#$%^&*等)');
      });
    });

    describe('Weak patterns detection', () => {
      it('should reject passwords with all same characters', () => {
        const result = validatePasswordStrength('aaaaaaaaaaaa');
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('相同字符'))).toBe(true);
      });

      it('should reject passwords with sequential numbers', () => {
        const weakPasswords = [
          'Abc123456789!',
          'Test0123456789!',
          'Pass987654321!',
        ];

        weakPasswords.forEach(password => {
          const result = validatePasswordStrength(password);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('连续数字'))).toBe(true);
        });
      });

      it('should reject passwords with sequential letters', () => {
        const result = validatePasswordStrength('abcdefghijk123!');
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('连续字母'))).toBe(true);
      });

      it('should reject passwords with common weak words', () => {
        const weakPasswords = [
          'Password123!@#',
          'Admin123456!@#',
          'Qwerty123456!@',
          'Test123456789!',
        ];

        weakPasswords.forEach(password => {
          const result = validatePasswordStrength(password);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('常见弱密码'))).toBe(true);
        });
      });
    });

    describe('Valid strong passwords', () => {
      it('should accept strong passwords with all requirements', () => {
        const strongPasswords = [
          'MyStr0ng!Pass',
          'SecureP@ssw0rd123',
          'C0mplex!Passw0rd',
          'Un!que$Pass123',
          'V3ry$ecure!2024',
        ];

        strongPasswords.forEach(password => {
          const result = validatePasswordStrength(password);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should accept passwords with various special characters', () => {
        const specialChars = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
        for (const char of specialChars) {
          const password = `StrongPass123${char}`;
          const result = validatePasswordStrength(password);
          expect(result.valid).toBe(true);
        }
      });
    });

    describe('Custom options', () => {
      it('should respect custom minLength', () => {
        const password = 'Short1!Aa';
        const resultDefault = validatePasswordStrength(password);
        const resultCustom = validatePasswordStrength(password, { minLength: 8 });

        expect(resultDefault.valid).toBe(false); // 默认12字符
        expect(resultCustom.valid).toBe(true);   // 自定义8字符
      });

      it('should respect requireUppercase option', () => {
        const password = 'lowercase123!@#';
        const resultDefault = validatePasswordStrength(password);
        const resultCustom = validatePasswordStrength(password, {
          requireUppercase: false,
        });

        expect(resultDefault.valid).toBe(false);
        expect(resultCustom.valid).toBe(true);
      });

      it('should respect requireSpecialChar option', () => {
        const password = 'NoSpecialChar123Aa';
        const resultDefault = validatePasswordStrength(password);
        const resultCustom = validatePasswordStrength(password, {
          requireSpecialChar: false,
        });

        expect(resultDefault.valid).toBe(false);
        expect(resultCustom.valid).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle null or undefined password', () => {
        const resultNull = validatePasswordStrength(null as any);
        const resultUndefined = validatePasswordStrength(undefined as any);

        expect(resultNull.valid).toBe(false);
        expect(resultUndefined.valid).toBe(false);
      });

      it('should handle empty string', () => {
        const result = validatePasswordStrength('');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle very long passwords', () => {
        const longPassword = 'A'.repeat(100) + 'a1!';
        const result = validatePasswordStrength(longPassword);
        // 即使很长，也需要满足所有要求
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getPasswordStrengthFeedback', () => {
    it('should rate weak passwords correctly', () => {
      const feedback = getPasswordStrengthFeedback('weak');
      expect(feedback.strength).toBe('weak');
      expect(feedback.score).toBeLessThan(60);
      expect(feedback.suggestions.length).toBeGreaterThan(0);
    });

    it('should rate medium passwords correctly', () => {
      const feedback = getPasswordStrengthFeedback('Medium1!Pass');
      expect(feedback.strength).toBe('medium');
      expect(feedback.score).toBeGreaterThanOrEqual(60);
      expect(feedback.score).toBeLessThan(80);
    });

    it('should rate strong passwords correctly', () => {
      const feedback = getPasswordStrengthFeedback('Str0ng!Passw0rd');
      expect(feedback.strength).toBe('strong');
      expect(feedback.score).toBeGreaterThanOrEqual(80);
      expect(feedback.score).toBeLessThan(100);
    });

    it('should rate very strong passwords correctly', () => {
      const feedback = getPasswordStrengthFeedback('V3ry$tr0ng!!Passw0rd2024');
      expect(feedback.strength).toBe('very-strong');
      expect(feedback.score).toBeGreaterThanOrEqual(100);
    });

    it('should provide helpful suggestions', () => {
      const weakFeedback = getPasswordStrengthFeedback('short');
      expect(weakFeedback.suggestions.length).toBeGreaterThan(0);

      const strongFeedback = getPasswordStrengthFeedback('V3ryStr0ng!Pass');
      // 强密码可能也有改进建议
      expect(strongFeedback.suggestions).toBeDefined();
    });

    it('should give bonus points for extra security features', () => {
      const basicStrong = getPasswordStrengthFeedback('Str0ng!Pass1');
      const extraStrong = getPasswordStrengthFeedback('V3ry!!Str0ng@@Pass123456');

      expect(extraStrong.score).toBeGreaterThan(basicStrong.score);
    });
  });

  describe('Real-world scenarios', () => {
    it('should accept realistic strong passwords', () => {
      const realPasswords = [
        'MyC0mpany!2024',
        'SecurePlatform@123',
        'Fl0tilla#Passw0rd',
        'GitHub$ecure!99',
        'Enterprise@Pass123',
      ];

      realPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject commonly used weak passwords', () => {
      const commonWeak = [
        'Password123!',
        'Welcome123!',
        'Admin123456!',
        'User12345678!',
        'Test123456!@',
      ];

      commonWeak.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(false);
      });
    });

    it('should provide clear error messages for each violation', () => {
      const weakPassword = 'short';
      const result = validatePasswordStrength(weakPassword);

      expect(result.errors).toContain('密码至少需要12个字符');
      expect(result.errors).toContain('密码必须包含至少一个大写字母');
      expect(result.errors).toContain('密码必须包含至少一个数字');
      expect(result.errors).toContain('密码必须包含至少一个特殊字符 (!@#$%^&*等)');
    });
  });
});
