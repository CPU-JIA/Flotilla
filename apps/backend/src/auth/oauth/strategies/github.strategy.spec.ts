import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GithubStrategy } from './github.strategy'

describe('GithubStrategy', () => {
  let strategy: GithubStrategy
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        GITHUB_CLIENT_ID: 'test_client_id',
        GITHUB_CLIENT_SECRET: 'test_client_secret',
        GITHUB_CALLBACK_URL: 'http://localhost:4000/auth/oauth/github/callback',
      }
      return config[key]
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    strategy = module.get<GithubStrategy>(GithubStrategy)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(strategy).toBeDefined()
  })

  it('should throw error if GITHUB_CLIENT_ID is not set', () => {
    mockConfigService.get.mockReturnValueOnce(null)

    expect(() => {
      new GithubStrategy(configService)
    }).toThrow('GITHUB_CLIENT_ID must be set in environment variables')
  })

  it('should throw error if GITHUB_CLIENT_SECRET is not set', () => {
    mockConfigService.get
      .mockReturnValueOnce('test_client_id')
      .mockReturnValueOnce(null)

    expect(() => {
      new GithubStrategy(configService)
    }).toThrow('GITHUB_CLIENT_SECRET must be set in environment variables')
  })

  describe('validate', () => {
    it('should return OAuthProfileDto with primary email', async () => {
      const mockProfile = {
        id: 'github123',
        displayName: 'Test User',
        username: 'testuser',
        emails: [
          { value: 'primary@example.com', primary: true, verified: true },
          { value: 'secondary@example.com', primary: false, verified: true },
        ],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser',
        _json: {
          company: 'Test Company',
          blog: 'https://blog.example.com',
          location: 'San Francisco',
          bio: 'Test bio',
        },
      }

      const done = jest.fn()
      const accessToken = 'github_access_token'
      const refreshToken = 'github_refresh_token'

      await strategy.validate(accessToken, refreshToken, mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(null, {
        provider: 'github',
        providerId: 'github123',
        email: 'primary@example.com',
        displayName: 'Test User',
        username: 'testuser',
        avatar: 'https://avatar.url',
        accessToken,
        refreshToken,
        scope: 'user:email',
        metadata: {
          profileUrl: 'https://github.com/testuser',
          company: 'Test Company',
          blog: 'https://blog.example.com',
          location: 'San Francisco',
          bio: 'Test bio',
        },
      })
    })

    it('should use first email when no primary email', async () => {
      const mockProfile = {
        id: 'github123',
        displayName: 'Test User',
        username: 'testuser',
        emails: [{ value: 'first@example.com', primary: false, verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser',
        _json: {},
      }

      const done = jest.fn()

      await strategy.validate('token', 'refresh', mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@example.com',
        }),
      )
    })

    it('should call done with error when no email found', async () => {
      const mockProfile = {
        id: 'github123',
        displayName: 'Test User',
        username: 'testuser',
        emails: [],
        photos: [],
        profileUrl: 'https://github.com/testuser',
        _json: {},
      }

      const done = jest.fn()

      await strategy.validate('token', 'refresh', mockProfile as any, done)

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No verified email found in GitHub account',
        }),
        null,
      )
    })
  })
})
