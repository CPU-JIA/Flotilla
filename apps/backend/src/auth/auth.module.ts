import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { EmailVerificationService } from './email-verification.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { RedisModule } from '../redis/redis.module';
import { OAuthModule } from './oauth/oauth.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { ApiTokenModule } from './api-tokens/api-token.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        // 🔒 SECURITY FIX: 强制要求JWT_SECRET和JWT_REFRESH_SECRET环境变量
        // CWE-798: Use of Hard-coded Credentials
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const jwtRefreshSecret =
          configService.get<string>('JWT_REFRESH_SECRET');

        // 验证JWT_SECRET
        if (
          !jwtSecret ||
          jwtSecret === 'default-secret-key' ||
          jwtSecret.length < 32
        ) {
          throw new Error(
            'CRITICAL SECURITY ERROR: JWT_SECRET must be set in environment variables ' +
              'and must be at least 32 characters long. Never use default values in production!',
          );
        }

        // 验证JWT_REFRESH_SECRET
        if (
          !jwtRefreshSecret ||
          jwtRefreshSecret === 'default-secret-key' ||
          jwtRefreshSecret.length < 32
        ) {
          throw new Error(
            'CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET must be set in environment variables ' +
              'and must be at least 32 characters long. Never use default values in production!',
          );
        }

        // 确保两个密钥不同
        if (jwtSecret === jwtRefreshSecret) {
          throw new Error(
            'CRITICAL SECURITY ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different!',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
              '7d') as any,
          },
        };
      },
    }),
    UsersModule,
    EmailModule,
    RedisModule,
    OAuthModule, // OAuth 单点登录模块
    TwoFactorModule, // 双因素认证模块
    ApiTokenModule, // API令牌模块
  ],
  controllers: [AuthController],
  providers: [
    // Core Services (P1-2: SOLID - 职责分离)
    AuthService,
    TokenService,
    TokenBlacklistService, // 🔒 SECURITY: Token黑名单服务（细粒度Token撤销）
    SessionService,
    PasswordService,
    EmailVerificationService,
    // Strategies & Guards
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    RolesGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    TokenBlacklistService,
    SessionService,
    PasswordService,
    EmailVerificationService,
    JwtStrategy,
  ],
})
export class AuthModule {}
