import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiTokenGuard, API_TOKEN_SCOPES_KEY } from './api-token.guard';
import { ApiTokenService } from '../api-token.service';

describe('ApiTokenGuard', () => {
  let guard: ApiTokenGuard;
  let apiTokenService: ApiTokenService;
  let reflector: Reflector;

  const mockApiTokenService = {
    validateToken: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokenGuard,
        { provide: ApiTokenService, useValue: mockApiTokenService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<ApiTokenGuard>(ApiTokenGuard);
    apiTokenService = module.get<ApiTokenService>(ApiTokenService);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access with valid token', async () => {
      const context = createMockExecutionContext(
        'Bearer flo_' + '0'.repeat(56),
      );
      mockApiTokenService.validateToken.mockResolvedValue({
        userId: 'user123',
        scopes: ['read', 'write'],
      });
      mockReflector.getAllAndOverride.mockReturnValue(undefined); // 无作用域要求

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(apiTokenService.validateToken).toHaveBeenCalled();
    });

    it('should throw error if Authorization header is missing', async () => {
      const context = createMockExecutionContext(); // 无header

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        '缺少或无效的Authorization header',
      );
    });

    it('should throw error if Authorization header does not start with Bearer', async () => {
      const context = createMockExecutionContext('Basic sometoken');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        '缺少或无效的Authorization header',
      );
    });

    it('should throw error if token is invalid', async () => {
      const context = createMockExecutionContext('Bearer invalid_token');
      mockApiTokenService.validateToken.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        '无效或已过期的API Token',
      );
    });

    it('should allow access when token has required scope', async () => {
      const context = createMockExecutionContext(
        'Bearer flo_' + '0'.repeat(56),
      );
      mockApiTokenService.validateToken.mockResolvedValue({
        userId: 'user123',
        scopes: ['read', 'write', 'admin'],
      });
      mockReflector.getAllAndOverride.mockReturnValue(['write']); // 需要write作用域

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        API_TOKEN_SCOPES_KEY,
        expect.any(Array),
      );
    });

    it('should throw error when token lacks required scope', async () => {
      const context = createMockExecutionContext(
        'Bearer flo_' + '0'.repeat(56),
      );
      mockApiTokenService.validateToken.mockResolvedValue({
        userId: 'user123',
        scopes: ['read'], // 只有read
      });
      mockReflector.getAllAndOverride.mockReturnValue(['write', 'admin']); // 需要write或admin

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        '需要以下作用域之一: write, admin',
      );
    });

    it('should attach user info to request object', async () => {
      const mockRequest = {
        headers: { authorization: 'Bearer flo_' + '0'.repeat(56) },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      mockApiTokenService.validateToken.mockResolvedValue({
        userId: 'user123',
        scopes: ['read'],
      });
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(mockRequest).toHaveProperty('user');
      expect((mockRequest as any).user).toEqual({
        id: 'user123',
        apiTokenScopes: ['read'],
      });
    });

    it('should allow access when token has any of the required scopes', async () => {
      const context = createMockExecutionContext(
        'Bearer flo_' + '0'.repeat(56),
      );
      mockApiTokenService.validateToken.mockResolvedValue({
        userId: 'user123',
        scopes: ['admin'], // 有admin作用域
      });
      mockReflector.getAllAndOverride.mockReturnValue(['write', 'admin']); // 需要write或admin

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
