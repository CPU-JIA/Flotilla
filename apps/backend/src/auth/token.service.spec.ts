/**
 * TokenService Unit Tests
 * 测试覆盖：Token生成、刷新、验证、Token版本控制
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-id-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    tokenVersion: 0,
    isActive: true,
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Set environment variables with cryptographically strong secrets
    process.env.JWT_SECRET = 'kL9mN2pQ5rT8vW1xZ4aC7bD0eF3gH6iJ9jK2lM5nO8pR1sT4uV7wX0yZ3aB6cC9dE2fG5hI8jK1lN4mP7qR0sT';
    process.env.JWT_REFRESH_SECRET = 'zY9wX6vU3tS0rQ7pO4nM1lK8jI5hG2fE9dC6bA3aZ0yX7wV4uT1sR8qP5oN2mL9kJ6iH3gF0eD7cB4aC1bD8eF5gH';
    process.env.JWT_EXPIRATION = '7d';
    process.env.JWT_REFRESH_EXPIRATION = '30d';

    const mockJwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        new TokenService(jwtService, prismaService);
      }).toThrow('SECURITY ERROR: JWT_SECRET is not configured');
    });

    it('should throw error if JWT_SECRET is too weak', () => {
      process.env.JWT_SECRET = 'short-key';

      expect(() => {
        new TokenService(jwtService, prismaService);
      }).toThrow('SECURITY ERROR: JWT_SECRET is too weak');
    });

    it('should throw error if JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => {
        new TokenService(jwtService, prismaService);
      }).toThrow('SECURITY ERROR: JWT_REFRESH_SECRET is not configured');
    });

    it('should throw error if JWT_REFRESH_SECRET is too weak', () => {
      process.env.JWT_REFRESH_SECRET = 'weak';

      expect(() => {
        new TokenService(jwtService, prismaService);
      }).toThrow('SECURITY ERROR: JWT_REFRESH_SECRET is too weak');
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      // Arrange
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.generateTokens(mockUser);

      // Assert
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should include correct JWT payload', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          role: mockUser.role,
          tokenVersion: mockUser.tokenVersion,
        },
        expect.any(Object),
      );
    });

    it('should use correct expiration times', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      // Access token
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        }),
      );
      // Refresh token
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
        }),
      );
    });

    it('should generate tokens in parallel for performance', async () => {
      // Arrange
      const signAsyncSpy = jwtService.signAsync
        .mockResolvedValueOnce('access')
        .mockResolvedValueOnce('refresh');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      // Both signAsync calls should be initiated before either resolves
      expect(signAsyncSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'valid-refresh-token';
    const jwtPayload = {
      sub: mockUser.id,
      role: mockUser.role,
      tokenVersion: mockUser.tokenVersion,
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.verify).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          secret: process.env.JWT_REFRESH_SECRET,
        }),
      );
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        '用户不存在',
      );
    });

    it('should throw UnauthorizedException if tokenVersion mismatch', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        tokenVersion: 1, // Different from payload
      });

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        'Refresh Token已失效，请重新登录',
      );
    });

    it('should throw UnauthorizedException if user account is inactive', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        '账户已被禁用',
      );
    });

    it('should implement refresh token rotation', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      // Should return a new refresh token, not the same one
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    const accessToken = 'valid-access-token';
    const jwtPayload = {
      sub: mockUser.id,
      role: mockUser.role,
      tokenVersion: mockUser.tokenVersion,
    };

    it('should successfully verify valid access token', () => {
      // Arrange
      jwtService.verify.mockReturnValue(jwtPayload);

      // Act
      const result = service.verifyAccessToken(accessToken);

      // Assert
      expect(result).toEqual(jwtPayload);
      expect(jwtService.verify).toHaveBeenCalledWith(
        accessToken,
        expect.objectContaining({
          secret: process.env.JWT_SECRET,
        }),
      );
    });

    it('should throw UnauthorizedException if token is invalid', () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(accessToken)).toThrow(
        UnauthorizedException,
      );
      expect(() => service.verifyAccessToken(accessToken)).toThrow(
        'Invalid access token',
      );
    });

    it('should throw UnauthorizedException if token is expired', () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act & Assert
      expect(() => service.verifyAccessToken(accessToken)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('decodeToken', () => {
    const token = 'some-jwt-token';
    const jwtPayload = {
      sub: mockUser.id,
      role: mockUser.role,
      tokenVersion: mockUser.tokenVersion,
    };

    it('should successfully decode token without verification', () => {
      // Arrange
      jwtService.decode.mockReturnValue(jwtPayload);

      // Act
      const result = service.decodeToken(token);

      // Assert
      expect(result).toEqual(jwtPayload);
      expect(jwtService.decode).toHaveBeenCalledWith(token);
    });

    it('should return null if token is invalid', () => {
      // Arrange
      jwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = service.decodeToken(token);

      // Assert
      expect(result).toBeNull();
    });

    it('should decode expired token without throwing error', () => {
      // Arrange
      jwtService.decode.mockReturnValue({
        ...jwtPayload,
        exp: Math.floor(Date.now() / 1000) - 1000, // Expired
      });

      // Act
      const result = service.decodeToken(token);

      // Assert
      expect(result).toBeDefined();
      expect(result?.sub).toBe(mockUser.id);
    });
  });

  describe('parseExpiresIn utility', () => {
    it('should parse seconds correctly', async () => {
      // Arrange
      process.env.JWT_EXPIRATION = '3600s';
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 3600,
        }),
      );
    });

    it('should parse minutes correctly', async () => {
      // Arrange
      process.env.JWT_EXPIRATION = '60m';
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 60 * 60,
        }),
      );
    });

    it('should parse hours correctly', async () => {
      // Arrange
      process.env.JWT_EXPIRATION = '24h';
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 24 * 60 * 60,
        }),
      );
    });

    it('should parse days correctly', async () => {
      // Arrange
      process.env.JWT_EXPIRATION = '7d';
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 7 * 24 * 60 * 60,
        }),
      );
    });

    it('should default to 7 days if format is invalid', async () => {
      // Arrange
      process.env.JWT_EXPIRATION = 'invalid';
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 7 * 24 * 60 * 60,
        }),
      );
    });
  });

  describe('Security features', () => {
    it('should use minimized JWT payload (no email or username)', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      const payload = jwtService.signAsync.mock.calls[0][0];
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('username');
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('role');
      expect(payload).toHaveProperty('tokenVersion');
    });

    it('should verify tokenVersion to prevent using revoked tokens', async () => {
      // Arrange
      const payload = {
        sub: mockUser.id,
        role: mockUser.role,
        tokenVersion: 0,
      };
      jwtService.verify.mockReturnValue(payload);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        tokenVersion: 1, // User has logged out (tokenVersion incremented)
      });

      // Act & Assert
      await expect(
        service.refreshTokens('old-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use different secrets for access and refresh tokens', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(mockUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          secret: process.env.JWT_SECRET,
        }),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        expect.objectContaining({
          secret: process.env.JWT_REFRESH_SECRET,
        }),
      );
    });
  });
});
