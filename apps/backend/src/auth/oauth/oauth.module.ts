import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OAuthController } from './oauth.controller'
import { OAuthService } from './oauth.service'
import { GithubStrategy } from './strategies/github.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { TokenService } from '../token.service'
import { PrismaModule } from '../../prisma/prisma.module'

/**
 * OAuth Module
 * 封装 OAuth 认证相关功能
 * ECP-A1: SOLID - 模块化设计，职责清晰
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [OAuthController],
  providers: [OAuthService, GithubStrategy, GoogleStrategy, TokenService],
  exports: [OAuthService],
})
export class OAuthModule {}
