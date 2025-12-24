import {
  Controller,
  Get,
  Delete,
  UseGuards,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OAuthService } from './oauth.service';
import { OAuthProfileDto } from './dto/oauth-profile.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

/**
 * OAuth Controller
 * 处理 OAuth 登录、回调、账户关联等 HTTP 请求
 * ECP-A1: SOLID - 职责清晰，仅处理 HTTP 层逻辑
 * ECP-C2: Systematic Error Handling - 统一错误响应
 */
@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // ============================================
  // GitHub OAuth
  // ============================================

  /**
   * GitHub OAuth 登录入口
   * 重定向到 GitHub 授权页面
   */
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to GitHub authorization page',
  })
  githubLogin() {
    // Passport 自动处理重定向
  }

  /**
   * GitHub OAuth 回调
   * GitHub 授权后回调此端点
   */
  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as OAuthProfileDto;

    try {
      const result = await this.oauthService.loginWithOAuth(profile);

      // 重定向到前端，携带 token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/oauth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // 错误重定向到前端错误页面
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/oauth/error?message=${encodeURIComponent(error.message)}`;
      return res.redirect(errorUrl);
    }
  }

  // ============================================
  // Google OAuth
  // ============================================

  /**
   * Google OAuth 登录入口
   * 重定向到 Google 授权页面
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google authorization page',
  })
  googleLogin() {
    // Passport 自动处理重定向
  }

  /**
   * Google OAuth 回调
   * Google 授权后回调此端点
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as OAuthProfileDto;

    try {
      const result = await this.oauthService.loginWithOAuth(profile);

      // 重定向到前端，携带 token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/oauth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // 错误重定向到前端错误页面
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/oauth/error?message=${encodeURIComponent(error.message)}`;
      return res.redirect(errorUrl);
    }
  }

  // ============================================
  // 账户关联管理（需要登录）
  // ============================================

  /**
   * 获取当前用户的所有 OAuth 关联
   */
  @Get('accounts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user OAuth accounts' })
  @ApiResponse({ status: 200, description: 'List of OAuth accounts' })
  getOAuthAccounts(@CurrentUser('userId') userId: string) {
    return this.oauthService.getUserOAuthAccounts(userId);
  }

  /**
   * GitHub 账户关联（已登录用户）
   */
  @Get('github/link')
  @UseGuards(AuthGuard('github'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link GitHub account to existing user' })
  @ApiResponse({
    status: 200,
    description: 'GitHub account linked successfully',
  })
  githubLink() {
    // Passport 自动处理重定向
  }

  /**
   * GitHub 账户关联回调
   */
  @Get('github/link/callback')
  @UseGuards(AuthGuard('github'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GitHub link callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend settings page',
  })
  async githubLinkCallback(
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const profile = req.user as OAuthProfileDto;

    try {
      await this.oauthService.linkOAuthToUser(userId, profile);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/settings/accounts?linked=github`;
      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/settings/accounts?error=${encodeURIComponent(error.message)}`;
      return res.redirect(errorUrl);
    }
  }

  /**
   * Google 账户关联（已登录用户）
   */
  @Get('google/link')
  @UseGuards(AuthGuard('google'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link Google account to existing user' })
  @ApiResponse({
    status: 200,
    description: 'Google account linked successfully',
  })
  googleLink() {
    // Passport 自动处理重定向
  }

  /**
   * Google 账户关联回调
   */
  @Get('google/link/callback')
  @UseGuards(AuthGuard('google'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Google link callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend settings page',
  })
  async googleLinkCallback(
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const profile = req.user as OAuthProfileDto;

    try {
      await this.oauthService.linkOAuthToUser(userId, profile);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/settings/accounts?linked=google`;
      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/settings/accounts?error=${encodeURIComponent(error.message)}`;
      return res.redirect(errorUrl);
    }
  }

  /**
   * 解除 OAuth 账户关联
   */
  @Delete('unlink/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink OAuth account' })
  @ApiResponse({
    status: 204,
    description: 'OAuth account unlinked successfully',
  })
  @ApiResponse({ status: 404, description: 'OAuth account not found' })
  @ApiResponse({ status: 409, description: 'Cannot unlink last login method' })
  async unlinkOAuth(
    @CurrentUser('userId') userId: string,
    @Param('provider') provider: string,
  ) {
    await this.oauthService.unlinkOAuth(userId, provider);
  }
}
