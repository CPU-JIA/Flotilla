import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { OAuthProfileDto } from '../dto/oauth-profile.dto';

/**
 * GitHub Profile Email 类型
 * ECP-C1: 类型安全 - 明确定义外部数据结构
 */
interface GitHubEmail {
  value: string;
  primary?: boolean;
  verified?: boolean;
}

/**
 * GitHub Profile 扩展属性
 */
interface GitHubProfileJson {
  company?: string;
  blog?: string;
  location?: string;
  bio?: string;
}

/**
 * 扩展的 GitHub Profile
 */
interface ExtendedGitHubProfile {
  profileUrl?: string;
  _json?: GitHubProfileJson;
}

/**
 * GitHub OAuth Strategy
 * 使用 Passport GitHub Strategy 实现 GitHub OAuth 登录
 * ECP-C1: Defensive Programming - 严格验证配置
 * ECP-C2: Systematic Error Handling - 统一错误处理
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID')!,
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL')!,
      scope: ['user:email'], // 请求用户邮箱权限
    });

    // 🔒 SECURITY: 验证必需的环境变量
    if (!this.configService.get<string>('GITHUB_CLIENT_ID')) {
      throw new Error('GITHUB_CLIENT_ID must be set in environment variables');
    }
    if (!this.configService.get<string>('GITHUB_CLIENT_SECRET')) {
      throw new Error(
        'GITHUB_CLIENT_SECRET must be set in environment variables',
      );
    }
    if (!this.configService.get<string>('GITHUB_CALLBACK_URL')) {
      throw new Error(
        'GITHUB_CALLBACK_URL must be set in environment variables',
      );
    }
  }

  /**
   * Passport 验证回调
   * 将 GitHub Profile 转换为标准化的 OAuthProfileDto
   *
   * @param accessToken OAuth access token
   * @param refreshToken OAuth refresh token (GitHub 不提供)
   * @param profile GitHub user profile
   * @param done Passport callback
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: OAuthProfileDto | null) => void,
  ): void {
    try {
      // 提取主要邮箱（已验证的邮箱）
      const emails = (profile.emails || []) as GitHubEmail[];
      const primaryEmail = emails.find(
        (e: GitHubEmail) => e.primary && e.verified,
      )?.value;
      const firstEmail = emails[0]?.value;

      if (!primaryEmail && !firstEmail) {
        throw new Error('No verified email found in GitHub account');
      }

      // 类型安全的扩展 profile 访问
      const extendedProfile = profile as ExtendedGitHubProfile;

      // 构造标准化 OAuth Profile
      const oauthProfile: OAuthProfileDto = {
        provider: 'github',
        providerId: profile.id,
        email: primaryEmail || firstEmail,
        displayName: profile.displayName || profile.username || 'Unknown',
        username: profile.username || undefined,
        avatar: profile.photos?.[0]?.value,
        accessToken,
        refreshToken: refreshToken || undefined,
        scope: 'user:email',
        metadata: {
          profileUrl: extendedProfile.profileUrl,
          company: extendedProfile._json?.company,
          blog: extendedProfile._json?.blog,
          location: extendedProfile._json?.location,
          bio: extendedProfile._json?.bio,
        },
      };

      done(null, oauthProfile);
    } catch (error) {
      done(error instanceof Error ? error : new Error(String(error)), null);
    }
  }
}
