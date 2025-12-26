import { ConfigService } from '@nestjs/config';
import { GithubStrategy } from './github.strategy';

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;
  let mockConfigService: ConfigService;

  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const config: Record<string, string> = {
      GITHUB_CLIENT_ID: 'test_client_id',
      GITHUB_CLIENT_SECRET: 'test_client_secret',
      GITHUB_CALLBACK_URL: 'http://localhost:4000/auth/oauth/github/callback',
      ...overrides,
    };
    return {
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;
  };

  beforeEach(() => {
    mockConfigService = createMockConfigService();
    strategy = new GithubStrategy(mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw error if GITHUB_CLIENT_ID is not set', () => {
    const configWithoutClientId = createMockConfigService({
      GITHUB_CLIENT_ID: undefined,
    });

    // Passport OAuth2Strategy validates clientID before our custom validation
    expect(() => {
      new GithubStrategy(configWithoutClientId);
    }).toThrow('OAuth2Strategy requires a clientID option');
  });

  it('should throw error if GITHUB_CLIENT_SECRET is not set', () => {
    const configWithoutClientSecret = createMockConfigService({
      GITHUB_CLIENT_SECRET: undefined,
    });

    // Our custom validation throws this error after super() succeeds
    expect(() => {
      new GithubStrategy(configWithoutClientSecret);
    }).toThrow('GITHUB_CLIENT_SECRET must be set in environment variables');
  });

  describe('validate', () => {
    it('should return OAuthProfileDto with primary email', () => {
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
      };

      const done = jest.fn();
      const accessToken = 'github_access_token';
      const refreshToken = 'github_refresh_token';

      strategy.validate(accessToken, refreshToken, mockProfile as any, done);

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
      });
    });

    it('should use first email when no primary email', () => {
      const mockProfile = {
        id: 'github123',
        displayName: 'Test User',
        username: 'testuser',
        emails: [
          { value: 'first@example.com', primary: false, verified: true },
        ],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser',
        _json: {},
      };

      const done = jest.fn();

      strategy.validate('token', 'refresh', mockProfile as any, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@example.com',
        }),
      );
    });

    it('should call done with error when no email found', () => {
      const mockProfile = {
        id: 'github123',
        displayName: 'Test User',
        username: 'testuser',
        emails: [],
        photos: [],
        profileUrl: 'https://github.com/testuser',
        _json: {},
      };

      const done = jest.fn();

      strategy.validate('token', 'refresh', mockProfile as any, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No verified email found in GitHub account',
        }),
        null,
      );
    });
  });
});
