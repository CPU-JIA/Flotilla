import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthProfileDto } from '../dto/oauth-profile.dto';

/**
 * Google OAuth Strategy
 * 使用 Passport Google Strategy 实现 Google OAuth 登录
 * ECP-C1: Defensive Programming - 严格验证配置
 * ECP-C2: Systematic Error Handling - 统一错误处理
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'], // 请求邮箱和基本资料
    });

    // 🔒 SECURITY: 验证必需的环境变量
    if (!this.configService.get<string>('GOOGLE_CLIENT_ID')) {
      throw new Error('GOOGLE_CLIENT_ID must be set in environment variables');
    }
    if (!this.configService.get<string>('GOOGLE_CLIENT_SECRET')) {
      throw new Error(
        'GOOGLE_CLIENT_SECRET must be set in environment variables',
      );
    }
    if (!this.configService.get<string>('GOOGLE_CALLBACK_URL')) {
      throw new Error(
        'GOOGLE_CALLBACK_URL must be set in environment variables',
      );
    }
  }

  /**
   * Passport 验证回调
   * 将 Google Profile 转换为标准化的 OAuthProfileDto
   *
   * @param accessToken OAuth access token
   * @param refreshToken OAuth refresh token
   * @param profile Google user profile
   * @param done Passport callback
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): any {
    try {
      // 提取主要邮箱
      const emails = profile.emails || [];
      const primaryEmail = emails.find((e) => e.verified)?.value;
      const firstEmail = emails[0]?.value;

      if (!primaryEmail && !firstEmail) {
        throw new Error('No verified email found in Google account');
      }

      // 计算 token 过期时间（Google access token 默认 1 小时）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // 构造标准化 OAuth Profile
      const oauthProfile: OAuthProfileDto = {
        provider: 'google',
        providerId: profile.id,
        email: primaryEmail || firstEmail,
        displayName: profile.displayName,
        username: profile.emails?.[0]?.value?.split('@')[0], // 从邮箱提取用户名
        avatar: profile.photos?.[0]?.value,
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
        scope: 'email profile',
        metadata: {
          locale: profile._json.locale,
          verified_email: profile._json.verified_email,
        },
      };

      done(null, oauthProfile);
    } catch (error) {
      done(error, null);
    }
  }
}
