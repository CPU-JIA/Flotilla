import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let mockConfigService: ConfigService;

  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test_client_id',
      GOOGLE_CLIENT_SECRET: 'test_client_secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:4000/auth/oauth/google/callback',
      ...overrides,
    };
    return {
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;
  };

  beforeEach(() => {
    mockConfigService = createMockConfigService();
    strategy = new GoogleStrategy(mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw error if GOOGLE_CLIENT_ID is not set', () => {
    const configWithoutClientId = createMockConfigService({
      GOOGLE_CLIENT_ID: undefined,
    });

    // Passport OAuth2Strategy validates clientID before our custom validation
    expect(() => {
      new GoogleStrategy(configWithoutClientId);
    }).toThrow('OAuth2Strategy requires a clientID option');
  });

  it('should throw error if GOOGLE_CLIENT_SECRET is not set', () => {
    const configWithoutClientSecret = createMockConfigService({
      GOOGLE_CLIENT_SECRET: undefined,
    });

    // Our custom validation throws this error after super() succeeds
    expect(() => {
      new GoogleStrategy(configWithoutClientSecret);
    }).toThrow('GOOGLE_CLIENT_SECRET must be set in environment variables');
  });

  describe('validate', () => {
    it('should return OAuthProfileDto with verified email', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'test@gmail.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        _json: {
          locale: 'en',
          email_verified: true,
        },
      };

      const done = jest.fn();
      const accessToken = 'google_access_token';
      const refreshToken = 'google_refresh_token';

      strategy.validate(
        accessToken,
        refreshToken,
        mockProfile as any,
        done,
      );

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
          email_verified: true,
        },
      });
    });

    it('should use first email when no verified email', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'first@gmail.com', verified: false }],
        photos: [{ value: 'https://avatar.url' }],
        _json: {},
      };

      const done = jest.fn();

      strategy.validate('token', 'refresh', mockProfile as any, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'first@gmail.com',
        }),
      );
    });

    it('should call done with error when no email found', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [],
        photos: [],
        _json: {},
      };

      const done = jest.fn();

      strategy.validate('token', 'refresh', mockProfile as any, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No verified email found in Google account',
        }),
        false,
      );
    });

    it('should set expiration time to 1 hour from now', async () => {
      const mockProfile = {
        id: 'google123',
        displayName: 'Test User',
        emails: [{ value: 'test@gmail.com', verified: true }],
        photos: [],
        _json: {},
      };

      const done = jest.fn();
      const now = new Date();

      strategy.validate('token', 'refresh', mockProfile as any, done);

      const callArgs = done.mock.calls[0][1];
      const expiresAt = callArgs.expiresAt;

      // Check expiration is approximately 1 hour from now
      const diff = expiresAt.getTime() - now.getTime();
      expect(diff).toBeGreaterThan(3500000); // ~58 minutes
      expect(diff).toBeLessThan(3700000); // ~62 minutes
    });
  });
});
