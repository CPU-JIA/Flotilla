/**
 * Environment Variable Validator Tests
 *
 * 🔒 SECURITY: Test environment variable validation against injection attacks
 */

import {
  validatePath,
  validateHome,
  validateApiBaseUrl,
  validateGitEnvironment,
  validateProjectId,
  validateQueryString,
} from './env-validator.util';

describe('EnvValidator', () => {
  describe('validatePath', () => {
    it('should return default path for undefined', () => {
      const result = validatePath(undefined);
      expect(result).toMatch(/\/usr\/bin|C:\\Program Files\\Git/);
    });

    it('should allow whitelisted paths', () => {
      const originalPlatform = process.platform;

      // Test Unix paths
      if (originalPlatform !== 'win32') {
        const validPath = '/usr/bin:/usr/local/bin';
        const result = validatePath(validPath);
        expect(result).toBe(validPath);
      } else {
        // On Windows, Unix paths won't be whitelisted, so expect default
        const validPath = '/usr/bin:/usr/local/bin';
        const result = validatePath(validPath);
        expect(result).toMatch(/C:\\Program Files\\Git/);
      }
    });

    it('should filter out non-whitelisted paths', () => {
      const originalPlatform = process.platform;

      if (originalPlatform !== 'win32') {
        const maliciousPath = '/usr/bin:/tmp/malicious:/usr/local/bin';
        const result = validatePath(maliciousPath);
        expect(result).toBe('/usr/bin:/usr/local/bin');
        expect(result).not.toContain('/tmp/malicious');
      } else {
        // On Windows, these Unix paths won't pass, expect default
        const maliciousPath = '/usr/bin:/tmp/malicious:/usr/local/bin';
        const result = validatePath(maliciousPath);
        expect(result).toMatch(/C:\\Program Files\\Git/);
        expect(result).not.toContain('/tmp/malicious');
      }
    });

    it('should handle empty PATH gracefully', () => {
      const result = validatePath('');
      expect(result).toMatch(/\/usr\/bin|C:\\Program Files\\Git/);
    });

    it('should handle Windows paths', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const winPath = 'C:\\Program Files\\Git\\cmd;C:\\Windows\\System32';
      const result = validatePath(winPath);
      expect(result).toContain('Git\\cmd');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('validateHome', () => {
    it('should return default for undefined', () => {
      const result = validateHome(undefined);
      expect(result).toMatch(/\/tmp|C:\\temp/);
    });

    it('should reject paths with shell metacharacters', () => {
      const maliciousPaths = [
        '/home/user;rm -rf /',
        '/home/user|cat /etc/passwd',
        '/home/user`whoami`',
        '/home/user$(whoami)',
      ];

      maliciousPaths.forEach((path) => {
        const result = validateHome(path);
        expect(result).toMatch(/\/tmp|C:\\temp/);
      });
    });

    it('should reject path traversal attempts', () => {
      const result = validateHome('/home/../../../etc');
      expect(result).toMatch(/\/tmp|C:\\temp/);
    });

    it('should reject argument injection', () => {
      const result = validateHome('-rf /home/user');
      expect(result).toMatch(/\/tmp|C:\\temp/);
    });

    it('should accept valid absolute paths', () => {
      const originalPlatform = process.platform;

      if (originalPlatform !== 'win32') {
        const validPath = '/home/user';
        const result = validateHome(validPath);
        expect(result).toBe(validPath);
      } else {
        // Windows test
        const validPath = 'C:\\Users\\test';
        const result = validateHome(validPath);
        expect(result).toBe(validPath);
      }
    });

    it('should reject relative paths', () => {
      const result = validateHome('home/user');
      expect(result).toMatch(/\/tmp|C:\\temp/);
    });
  });

  describe('validateApiBaseUrl', () => {
    it('should return default for undefined', () => {
      const result = validateApiBaseUrl(undefined);
      expect(result).toBe('http://localhost:4000/api');
    });

    it('should allow localhost URLs', () => {
      const urls = [
        'http://localhost:4000/api',
        'https://localhost:3000',
        'http://127.0.0.1:4000/api',
      ];

      urls.forEach((url) => {
        const result = validateApiBaseUrl(url);
        expect(result).toBe(url);
      });
    });

    it('should allow private IP ranges', () => {
      const privateIps = [
        'http://10.0.0.1/api',
        'http://172.16.0.1/api',
        'http://192.168.1.1/api',
      ];

      privateIps.forEach((url) => {
        const result = validateApiBaseUrl(url);
        expect(result).toBe(url);
      });
    });

    it('should reject public IPs (SSRF prevention)', () => {
      const publicIps = [
        'http://8.8.8.8/api',
        'http://1.1.1.1/api',
        'https://example.com/api',
      ];

      publicIps.forEach((url) => {
        const result = validateApiBaseUrl(url);
        expect(result).toBe('http://localhost:4000/api');
      });
    });

    it('should reject invalid protocols', () => {
      const invalidProtocols = [
        'file:///etc/passwd',
        'ftp://localhost/api',
        'javascript:alert(1)',
      ];

      invalidProtocols.forEach((url) => {
        const result = validateApiBaseUrl(url);
        expect(result).toBe('http://localhost:4000/api');
      });
    });

    it('should reject malformed URLs', () => {
      const malformed = ['not-a-url', 'http://', '://localhost'];

      malformed.forEach((url) => {
        const result = validateApiBaseUrl(url);
        expect(result).toBe('http://localhost:4000/api');
      });
    });
  });

  describe('validateGitEnvironment', () => {
    it('should return sanitized environment object', () => {
      const mockEnv = {
        PATH: '/usr/bin:/usr/local/bin',
        HOME: '/home/user',
        NODE_ENV: 'production',
      };

      const result = validateGitEnvironment(mockEnv);

      expect(result).toHaveProperty('PATH');
      expect(result).toHaveProperty('HOME');
      expect(result).toHaveProperty('NODE_ENV');
      expect(result.NODE_ENV).toBe('production');
    });

    it('should sanitize malicious environment', () => {
      const maliciousEnv = {
        PATH: '/usr/bin:/tmp/malicious',
        HOME: '/home/user;rm -rf /',
        NODE_ENV: 'production',
      };

      const result = validateGitEnvironment(maliciousEnv);

      expect(result.PATH).not.toContain('/tmp/malicious');
      expect(result.HOME).toMatch(/\/tmp|C:\\temp/);
    });
  });

  describe('validateProjectId', () => {
    it('should accept valid cuid format', () => {
      const validIds = [
        'cmhfopcmt000dxbu8rvmjvtse',
        'abc123-def456',
        'PROJECT-123',
      ];

      validIds.forEach((id) => {
        expect(validateProjectId(id)).toBe(true);
      });
    });

    it('should reject IDs with special characters', () => {
      const invalidIds = [
        '../../../etc/passwd',
        'project;rm -rf /',
        'project|whoami',
        'project`ls`',
        'project$(ls)',
      ];

      invalidIds.forEach((id) => {
        expect(validateProjectId(id)).toBe(false);
      });
    });

    it('should reject empty string', () => {
      expect(validateProjectId('')).toBe(false);
    });
  });

  describe('validateQueryString', () => {
    it('should accept valid query strings', () => {
      const validQueries = [
        'service=git-upload-pack',
        'a=1&b=2',
        'key=value-123',
      ];

      validQueries.forEach((query) => {
        expect(validateQueryString(query)).toBe(true);
      });
    });

    it('should reject query strings with special characters', () => {
      const invalidQueries = [
        'service=git-upload-pack;rm -rf /',
        'a=1|whoami',
        'key=`ls`',
        'value=$(cat /etc/passwd)',
      ];

      invalidQueries.forEach((query) => {
        expect(validateQueryString(query)).toBe(false);
      });
    });
  });
});
