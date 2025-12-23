/**
 * HTTPS Enforcement Guard Tests
 *
 * 🔒 SECURITY: Test HTTPS enforcement for Git HTTP protocol
 */

import { HttpsEnforcementGuard } from './https-enforcement.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('HttpsEnforcementGuard', () => {
  let guard: HttpsEnforcementGuard;
  let configService: ConfigService;

  const createMockExecutionContext = (
    protocol: string,
    forwardedProto?: string,
    secure?: boolean,
  ): ExecutionContext => {
    const request = {
      protocol,
      secure: secure ?? protocol === 'https',
      get: (header: string) => {
        if (header === 'x-forwarded-proto') {
          return forwardedProto;
        }
        return undefined;
      },
      method: 'POST',
      path: '/repo/test-project/git-upload-pack',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('Development Environment', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'ENFORCE_HTTPS') return undefined;
          return defaultValue;
        }),
      } as unknown as ConfigService;

      guard = new HttpsEnforcementGuard(configService);
    });

    it('should allow HTTP requests in development', () => {
      const context = createMockExecutionContext('http');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow HTTPS requests in development', () => {
      const context = createMockExecutionContext('https');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'ENFORCE_HTTPS') return undefined;
          return defaultValue;
        }),
      } as unknown as ConfigService;

      guard = new HttpsEnforcementGuard(configService);
    });

    it('should allow HTTPS requests', () => {
      const context = createMockExecutionContext('https');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject HTTP requests', () => {
      const context = createMockExecutionContext('http');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow requests with X-Forwarded-Proto: https', () => {
      const context = createMockExecutionContext('http', 'https');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject requests with X-Forwarded-Proto: http', () => {
      const context = createMockExecutionContext('http', 'http');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow requests with secure flag', () => {
      const context = createMockExecutionContext('http', undefined, true);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Explicit ENFORCE_HTTPS Override', () => {
    it('should enforce HTTPS when ENFORCE_HTTPS=true in development', () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'ENFORCE_HTTPS') return 'true';
          return defaultValue;
        }),
      } as unknown as ConfigService;

      guard = new HttpsEnforcementGuard(configService);

      const context = createMockExecutionContext('http');
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should not enforce HTTPS when ENFORCE_HTTPS=false in production', () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'ENFORCE_HTTPS') return 'false';
          return defaultValue;
        }),
      } as unknown as ConfigService;

      guard = new HttpsEnforcementGuard(configService);

      const context = createMockExecutionContext('http');
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Error Messages', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'ENFORCE_HTTPS') return undefined;
          return defaultValue;
        }),
      } as unknown as ConfigService;

      guard = new HttpsEnforcementGuard(configService);
    });

    it('should include helpful error message', () => {
      const context = createMockExecutionContext('http');

      try {
        guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toMatch(
          /HTTPS required/i,
        );
      }
    });
  });
});
