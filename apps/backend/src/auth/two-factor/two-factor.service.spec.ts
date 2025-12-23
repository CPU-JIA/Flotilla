import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { TwoFactorService } from './two-factor.service'
import { PrismaService } from '../../prisma/prisma.service'
import * as speakeasy from 'speakeasy'

describe('TwoFactorService', () => {
  let service: TwoFactorService
  let prisma: PrismaService

  // Mock data
  const mockUserId = 'user-123'
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
  }
  const mockSecret = 'JBSWY3DPEHPK3PXP'
  const mockToken = '123456'

  beforeAll(() => {
    // 设置测试环境变量
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!'
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            twoFactorAuth: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<TwoFactorService>(TwoFactorService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateSecret', () => {
    it('should generate TOTP secret successfully', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      const result = await service.generateSecret(mockUserId)

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('otpauthUrl')
      expect(result.secret).toMatch(/^[A-Z2-7]+$/) // Base32 format
      expect(result.otpauthUrl).toContain('otpauth://totp/')
    })

    it('should throw error if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      await expect(service.generateSecret(mockUserId)).rejects.toThrow(BadRequestException)
    })

    it('should throw error if userId is empty', async () => {
      await expect(service.generateSecret('')).rejects.toThrow(BadRequestException)
    })
  })

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const otpauthUrl = 'otpauth://totp/Flotilla (test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=Flotilla'

      const result = await service.generateQRCode(otpauthUrl)

      expect(result).toContain('data:image/png;base64,')
    })

    it('should throw error for invalid otpauth URL', async () => {
      await expect(service.generateQRCode('invalid-url')).rejects.toThrow(BadRequestException)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid TOTP token', () => {
      // Generate a valid token
      const token = speakeasy.totp({
        secret: mockSecret,
        encoding: 'base32',
      })

      const result = service.verifyToken(mockSecret, token)

      expect(result).toBe(true)
    })

    it('should reject invalid TOTP token', () => {
      const result = service.verifyToken(mockSecret, '000000')

      expect(result).toBe(false)
    })

    it('should reject non-numeric token', () => {
      const result = service.verifyToken(mockSecret, 'abcdef')

      expect(result).toBe(false)
    })

    it('should reject empty token', () => {
      const result = service.verifyToken(mockSecret, '')

      expect(result).toBe(false)
    })
  })

  describe('generateRecoveryCodes', () => {
    it('should generate 8 recovery codes', () => {
      const codes = service.generateRecoveryCodes()

      expect(codes).toHaveLength(8)
      codes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)
      })
    })

    it('should generate unique recovery codes', () => {
      const codes = service.generateRecoveryCodes()
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(8)
    })
  })

  describe('enable2FA', () => {
    it('should enable 2FA successfully', async () => {
      const validToken = speakeasy.totp({
        secret: mockSecret,
        encoding: 'base32',
      })

      jest.spyOn(prisma.twoFactorAuth, 'upsert').mockResolvedValue({
        id: '2fa-123',
        userId: mockUserId,
        secret: 'encrypted-secret',
        recoveryCodes: ['code1', 'code2'],
        enabled: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.enable2FA(mockUserId, mockSecret, validToken)

      expect(result).toHaveLength(8)
      expect(prisma.twoFactorAuth.upsert).toHaveBeenCalled()
    })

    it('should throw error for invalid verification code', async () => {
      await expect(service.enable2FA(mockUserId, mockSecret, '000000')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw error for missing parameters', async () => {
      await expect(service.enable2FA('', mockSecret, mockToken)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('verify2FA', () => {
    it('should verify 2FA token successfully', async () => {
      const validToken = speakeasy.totp({
        secret: mockSecret,
        encoding: 'base32',
      })

      // Encrypt the secret (mock encryption)
      const encryptedSecret = (service as any).encrypt(mockSecret)

      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue({
        id: '2fa-123',
        userId: mockUserId,
        secret: encryptedSecret,
        recoveryCodes: [],
        enabled: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.verify2FA(mockUserId, validToken)

      expect(result).toBe(true)
    })

    it('should throw error if 2FA is not enabled', async () => {
      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue(null)

      await expect(service.verify2FA(mockUserId, mockToken)).rejects.toThrow(BadRequestException)
    })

    it('should verify recovery code successfully', async () => {
      const recoveryCode = '1234-5678-9ABC-DEF0'
      const encryptedSecret = (service as any).encrypt(mockSecret)
      const encryptedCode = (service as any).encrypt(recoveryCode)

      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue({
        id: '2fa-123',
        userId: mockUserId,
        secret: encryptedSecret,
        recoveryCodes: [encryptedCode],
        enabled: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      jest.spyOn(prisma.twoFactorAuth, 'update').mockResolvedValue({} as any)

      const result = await service.verify2FA(mockUserId, recoveryCode)

      expect(result).toBe(true)
      expect(prisma.twoFactorAuth.update).toHaveBeenCalled()
    })
  })

  describe('disable2FA', () => {
    it('should disable 2FA successfully', async () => {
      const validToken = speakeasy.totp({
        secret: mockSecret,
        encoding: 'base32',
      })

      const encryptedSecret = (service as any).encrypt(mockSecret)

      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue({
        id: '2fa-123',
        userId: mockUserId,
        secret: encryptedSecret,
        recoveryCodes: [],
        enabled: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      jest.spyOn(prisma.twoFactorAuth, 'delete').mockResolvedValue({} as any)

      await service.disable2FA(mockUserId, validToken)

      expect(prisma.twoFactorAuth.delete).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      })
    })

    it('should throw error for invalid verification code', async () => {
      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue({
        id: '2fa-123',
        userId: mockUserId,
        secret: (service as any).encrypt(mockSecret),
        recoveryCodes: [],
        enabled: true,
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(service.disable2FA(mockUserId, '000000')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  describe('is2FAEnabled', () => {
    it('should return true if 2FA is enabled', async () => {
      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue({
        enabled: true,
      } as any)

      const result = await service.is2FAEnabled(mockUserId)

      expect(result).toBe(true)
    })

    it('should return false if 2FA is not enabled', async () => {
      jest.spyOn(prisma.twoFactorAuth, 'findUnique').mockResolvedValue(null)

      const result = await service.is2FAEnabled(mockUserId)

      expect(result).toBe(false)
    })
  })

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'test-secret-data'

      const encrypted = (service as any).encrypt(originalData)
      const decrypted = (service as any).decrypt(encrypted)

      expect(decrypted).toBe(originalData)
    })

    it('should throw error for invalid encrypted data format', () => {
      expect(() => (service as any).decrypt('invalid-format')).toThrow()
    })
  })
})
