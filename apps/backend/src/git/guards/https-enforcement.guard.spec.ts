/**
 * HTTPS Enforcement Guard Tests
 *
 * 🔒 SECURITY: Test HTTPS enforcement for Git HTTP protocol
 */

import { HttpsEnforcementGuard } from './https-enforcement.guard'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

describe('HttpsEnforcementGuard', () => {
  let guard: HttpsEnforcementGuard
  let configService: ConfigService

  const createMockExecutionContext = (
    protocol: string,
    forwardedProto?: string,
    secure?: boolean,
  ): ExecutionContext => {
    const request = {
      protocol,
      secure: secure ?? (protocol === 'https'),
      get: (header: string) => {
        if (header === 'x-forwarded-proto') {
          return forwardedProto
        }
        return undefined
      },
      method: 'POST',
      path: '/repo/test-project/git-upload-pack',
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext
  }

  describe('Development Environment', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'development'
          if (key === 'ENFORCE_HTTPS') return undefined
          return defaultValue
        }),
      } as any

      guard = new HttpsEnforcementGuard(configService)
    })

    it('should allow HTTP requests in development', async () => {
      const context = createMockExecutionContext('http')
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should allow HTTPS requests in development', async () => {
      const context = createMockExecutionContext('https')
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })
  })

  describe('Production Environment', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production'
          if (key === 'ENFORCE_HTTPS') return undefined
          return defaultValue
        }),
      } as any

      guard = new HttpsEnforcementGuard(configService)
    })

    it('should allow HTTPS requests', async () => {
      const context = createMockExecutionContext('https')
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should reject HTTP requests', async () => {
      const context = createMockExecutionContext('http')

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should allow requests with X-Forwarded-Proto: https', async () => {
      const context = createMockExecutionContext('http', 'https')
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should reject requests with X-Forwarded-Proto: http', async () => {
      const context = createMockExecutionContext('http', 'http')

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should allow requests with secure flag', async () => {
      const context = createMockExecutionContext('http', undefined, true)
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })
  })

  describe('Explicit ENFORCE_HTTPS Override', () => {
    it('should enforce HTTPS when ENFORCE_HTTPS=true in development', async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'development'
          if (key === 'ENFORCE_HTTPS') return 'true'
          return defaultValue
        }),
      } as any

      guard = new HttpsEnforcementGuard(configService)

      const context = createMockExecutionContext('http')
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should not enforce HTTPS when ENFORCE_HTTPS=false in production', async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production'
          if (key === 'ENFORCE_HTTPS') return 'false'
          return defaultValue
        }),
      } as any

      guard = new HttpsEnforcementGuard(configService)

      const context = createMockExecutionContext('http')
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })
  })

  describe('Error Messages', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production'
          if (key === 'ENFORCE_HTTPS') return undefined
          return defaultValue
        }),
      } as any

      guard = new HttpsEnforcementGuard(configService)
    })

    it('should include helpful error message', async () => {
      const context = createMockExecutionContext('http')

      try {
        await guard.canActivate(context)
        fail('Should have thrown ForbiddenException')
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException)
        expect(error.message).toMatch(/HTTPS required/i)
      }
    })
  })
})
