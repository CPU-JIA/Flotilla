import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TokenService } from '../token.service';
import { PrismaModule } from '../../prisma/prisma.module';

const logger = new Logger('OAuthModule');

/**
 * 条件加载 OAuth 策略
 * 只有在配置了相应的 OAuth 凭证时才加载策略
 */
const conditionalProviders = [
  {
    provide: 'GITHUB_STRATEGY',
    useFactory: (configService: ConfigService) => {
      if (configService.get('GITHUB_CLIENT_ID')) {
        logger.log('✅ GitHub OAuth strategy enabled');
        return new GithubStrategy(configService);
      }
      logger.warn('⚠️ GitHub OAuth not configured, strategy disabled');
      return null;
    },
    inject: [ConfigService],
  },
  {
    provide: 'GOOGLE_STRATEGY',
    useFactory: (configService: ConfigService) => {
      if (configService.get('GOOGLE_CLIENT_ID')) {
        logger.log('✅ Google OAuth strategy enabled');
        return new GoogleStrategy(configService);
      }
      logger.warn('⚠️ Google OAuth not configured, strategy disabled');
      return null;
    },
    inject: [ConfigService],
  },
];

/**
 * OAuth Module
 * 封装 OAuth 认证相关功能
 * ECP-A1: SOLID - 模块化设计，职责清晰
 */
@Module({
  imports: [ConfigModule, PrismaModule, JwtModule.register({})],
  controllers: [OAuthController],
  providers: [OAuthService, TokenService, ...conditionalProviders],
  exports: [OAuthService],
})
export class OAuthModule {}
