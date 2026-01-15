import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';

/**
 * OAuth Service
 * 处理 OAuth 账户关联、登录、用户创建等业务逻辑
 * ECP-A1: SOLID - Single Responsibility Principle
 * ECP-C1: Defensive Programming - 严格验证 OAuth 数据
 * ECP-C2: Systematic Error Handling - 统一错误处理
 */
@Injectable()
export class OAuthService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {
    // ECP-C1: 防御性编程 - 确保加密密钥已配置
    const key = process.env.OAUTH_ENCRYPTION_KEY;
    if (!key || key.length < 32) {
      throw new Error(
        'OAUTH_ENCRYPTION_KEY must be at least 32 characters long. Please set it in .env file.',
      );
    }
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  }

  /**
   * 加密数据
   * @param data 待加密数据
   * @returns 加密后的字符串（格式：iv:encryptedData:authTag）
   * ECP-C1: 防御性编程 - 使用 AES-256-GCM 加密存储敏感的 OAuth Token
   */
  private encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 格式：iv:encryptedData:authTag
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据（格式：iv:encryptedData:authTag）
   * @returns 解密后的字符串
   */
  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * 将 metadata 转换为 Prisma JsonValue 兼容格式
   * 过滤掉 undefined 值（Prisma JsonValue 不支持 undefined）
   * ECP-C1: 防御性编程 - 确保数据格式兼容
   */
  private sanitizeMetadata(
    metadata?: Record<string, string | number | boolean | null | undefined>,
  ): Prisma.InputJsonValue | undefined {
    if (!metadata) return undefined;
    const sanitized: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 使用 OAuth 登录或注册
   * 业务逻辑：
   * 1. 查找是否已有 OAuth 关联
   * 2. 如果有关联，直接登录
   * 3. 如果无关联但邮箱已存在，抛出错误（需要手动关联）
   * 4. 如果邮箱不存在，创建新用户并关联 OAuth
   *
   * ECP-C1: Defensive Programming - 防止邮箱冲突
   */
  async loginWithOAuth(profile: OAuthProfileDto) {
    // 1. 查找已有 OAuth 关联
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingOAuth) {
      // 更新 OAuth token
      await this.updateOAuthToken(existingOAuth.id, profile);
      return this.generateAuthTokens(existingOAuth.user);
    }

    // 2. 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Email ${profile.email} is already registered. Please link ${profile.provider} account from settings.`,
      );
    }

    // 3. 创建新用户并关联 OAuth
    const user = await this.createUserFromOAuth(profile);
    return this.generateAuthTokens(user);
  }

  /**
   * 将 OAuth 账户关联到现有用户
   * 用于已登录用户绑定第三方账户
   *
   * ECP-C1: Defensive Programming - 防止重复绑定
   */
  async linkOAuthToUser(userId: string, profile: OAuthProfileDto) {
    // 检查 OAuth 账户是否已被其他用户绑定
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existingOAuth) {
      throw new ConflictException(
        `This ${profile.provider} account is already linked to another user.`,
      );
    }

    // 检查用户是否已绑定同一提供商的账户
    const userOAuth = await this.prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider: profile.provider,
      },
    });

    if (userOAuth) {
      throw new ConflictException(
        `You have already linked a ${profile.provider} account.`,
      );
    }

    // 创建 OAuth 关联
    return this.prisma.oAuthAccount.create({
      data: {
        userId,
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        accessToken: this.encrypt(profile.accessToken),
        refreshToken: profile.refreshToken
          ? this.encrypt(profile.refreshToken)
          : null,
        expiresAt: profile.expiresAt,
        scope: profile.scope,
        metadata: this.sanitizeMetadata(profile.metadata),
      },
    });
  }

  /**
   * 解除 OAuth 账户关联
   * ECP-C1: Defensive Programming - 确保用户有其他登录方式
   */
  async unlinkOAuth(userId: string, provider: string) {
    const oauth = await this.prisma.oAuthAccount.findFirst({
      where: { userId, provider },
    });

    if (!oauth) {
      throw new NotFoundException(`No ${provider} account linked.`);
    }

    // 检查用户是否有密码（确保至少有一种登录方式）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    const hasPassword = user?.passwordHash && user.passwordHash.length > 0;
    const oauthCount = await this.prisma.oAuthAccount.count({
      where: { userId },
    });

    if (!hasPassword && oauthCount === 1) {
      throw new ConflictException(
        'Cannot unlink the last login method. Please set a password first.',
      );
    }

    return this.prisma.oAuthAccount.delete({
      where: { id: oauth.id },
    });
  }

  /**
   * 获取用户的所有 OAuth 关联
   */
  getUserOAuthAccounts(userId: string) {
    return this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        createdAt: true,
        // 安全考虑：不返回 token
      },
    });
  }

  /**
   * 私有方法：创建新用户（从 OAuth）
   * ECP-B1: DRY - 复用用户创建逻辑
   */
  private async createUserFromOAuth(profile: OAuthProfileDto) {
    // 生成唯一用户名
    const username = await this.generateUniqueUsername(
      profile.username || profile.displayName,
    );

    return this.prisma.user.create({
      data: {
        username,
        email: profile.email,
        passwordHash: '', // OAuth 用户无需密码
        avatar: profile.avatar,
        emailVerified: true, // OAuth 邮箱已验证
        oauthAccounts: {
          create: {
            provider: profile.provider,
            providerId: profile.providerId,
            email: profile.email,
            displayName: profile.displayName,
            accessToken: this.encrypt(profile.accessToken),
            refreshToken: profile.refreshToken
              ? this.encrypt(profile.refreshToken)
              : null,
            expiresAt: profile.expiresAt,
            scope: profile.scope,
            metadata: this.sanitizeMetadata(profile.metadata),
          },
        },
      },
    });
  }

  /**
   * 私有方法：生成唯一用户名
   * ECP-C1: Defensive Programming - 确保用户名唯一性
   */
  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    // 清理用户名（移除特殊字符）
    let username = baseUsername.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    // 确保用户名长度合法
    if (username.length < 3) {
      username = `user_${username}`;
    }
    if (username.length > 50) {
      username = username.substring(0, 50);
    }

    // 检查唯一性，如果冲突则添加数字后缀
    let counter = 0;
    let uniqueUsername = username;

    while (true) {
      const existing = await this.prisma.user.findUnique({
        where: { username: uniqueUsername },
      });

      if (!existing) {
        return uniqueUsername;
      }

      counter++;
      uniqueUsername = `${username}${counter}`;

      // 防止无限循环
      if (counter > 1000) {
        throw new Error('Failed to generate unique username');
      }
    }
  }

  /**
   * 私有方法：更新 OAuth Token
   * ECP-C1: 防御性编程 - 加密敏感的 OAuth Token
   */
  private updateOAuthToken(oauthId: string, profile: OAuthProfileDto) {
    return this.prisma.oAuthAccount.update({
      where: { id: oauthId },
      data: {
        accessToken: this.encrypt(profile.accessToken),
        refreshToken: profile.refreshToken
          ? this.encrypt(profile.refreshToken)
          : null,
        expiresAt: profile.expiresAt,
        scope: profile.scope,
      },
    });
  }

  /**
   * 私有方法：生成认证 Token
   */
  private async generateAuthTokens(user: User) {
    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }
}
