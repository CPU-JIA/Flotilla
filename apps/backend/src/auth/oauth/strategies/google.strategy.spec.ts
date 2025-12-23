import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GoogleStrategy } from './google.strategy'

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        GOOGLE_CLIENT_ID: 'test_client_id',
        GOOGLE_CLIENT_SECRET: 'test_client_secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:4000/auth/oauth/google/callback',
      }
      return config[key]
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    strategy = module.get<GoogleStrategy>(GoogleStrategy)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(strategy).toBeDefined()
  })

  it('should throw error if GOOGLE_CLIENT_ID is not set', () => {
    mockConfigService.get.mockReturnValueOnce(null)

    expect(() => {
      new GoogleStrategy(configService)
    }).toThrow('GOOGLE_CLIENT_ID must be set in environment variables')
  })

  it('should throw error if GOOGLE_CLIENT_SECRET is not set', () => {
    mockConfigService.get
      .mockReturnValueOnce('test_client_id')
      .mockReturnValueOnce(null)

    expect(() => {
      new GoogleStrategy(configService)
    }).toThrow('GOOGLE_CLIENT_SECRET must be set in environment variables')
  })

  describe('validate', () => {
    it('should return OAuthProfileDto with verified email', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'test@gmail.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        _json: {
          locale: 'en',
          verified_email: true,
        },
      }

      const done = jest.fn()
      const accessToken = 'google_access_token'
      const refreshToken = 'google_refresh_token'

      await strategy.validate(accessToken, refreshToken, mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(null, {
        provider: 'google',
        providerId: 'google123',
        email: 'test@gmail.com',
        displayName: 'Test User',
        username: 'test',
        avatar: 'https://avatar.url',
        accessToken,
        refreshToken,
        expiresAt: expect.any(Date),
        scope: 'email profile',
        metadata: {
          locale: 'en',
          verified_email: true,
        },
      })
    })

    it('should use first email when no verified email', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'first@gmail.com', verified: false }],
        photos: [{ value: 'https://avatar.url' }],
        _json: {},
      }

      const done = jest.fn()

      await strategy.validate('token', 'refresh', mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@gmail.com',
        }),
      )
    })

    it('should call done with error when no email found', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [],
        photos: [],
        _json: {},
      }

      const done = jest.fn()

      await strategy.validate('token', 'refresh', mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No verified email found in Google account',
        }),
        null,
      )
    })

    it('should set expiration time to 1 hour from now', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'test@gmail.com', verified: true }],
        photos: [],
        _json: {},
      }

      const done = jest.fn()
      const now = new Date()

      await strategy.validate('token', 'refresh', mockProfile as any, done)

      const callArgs = done.mock.calls[0][1]
      const expiresAt = callArgs.expiresAt

      // Check expiration is approximately 1 hour from now
      const diff = expiresAt.getTime() - now.getTime()
      expect(diff).toBeGreaterThan(3500000) // ~58 minutes
      expect(diff).toBeLessThan(3700000) // ~62 minutes
    })
  })
})
