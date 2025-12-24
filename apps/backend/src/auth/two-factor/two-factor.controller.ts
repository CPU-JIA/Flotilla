import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import {
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
} from './dto/two-factor.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

/**
 * 双因素认证控制器
 * ECP-A1: SOLID 原则 - 单一职责（仅处理2FA相关HTTP请求）
 * ECP-C1: 防御性编程 - 所有端点都需要JWT认证
 */
@ApiTags('2FA')
@ApiBearerAuth()
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * 生成 2FA 密钥和二维码
   * 用户扫描二维码后，使用 TOTP 应用（如 Google Authenticator）生成验证码
   */
  @Post('setup')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({
    status: 200,
    description: '2FA setup data',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'Base32 encoded secret' },
        qrCode: { type: 'string', description: 'Base64 encoded QR code image' },
      },
    },
  })
  async setup(@CurrentUser('id') userId: string) {
    // 1. 生成 TOTP 密钥
    const { secret, otpauthUrl } =
      await this.twoFactorService.generateSecret(userId);

    // 2. 生成二维码
    const qrCode = await this.twoFactorService.generateQRCode(otpauthUrl);

    return {
      secret,
      qrCode,
    };
  }

  /**
   * 启用 2FA
   * 用户输入验证码以确认设置成功
   */
  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA with verification code' })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        recoveryCodes: {
          type: 'array',
          items: { type: 'string' },
          description: '8 recovery codes (show only once)',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enable(@CurrentUser('id') userId: string, @Body() dto: Enable2FADto) {
    const recoveryCodes = await this.twoFactorService.enable2FA(
      userId,
      dto.secret,
      dto.token,
    );

    return {
      message:
        '2FA enabled successfully. Please save your recovery codes in a safe place.',
      recoveryCodes,
    };
  }

  /**
   * 验证 2FA 令牌
   * 用于登录时的二次验证
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA token' })
  @ApiResponse({ status: 200, description: 'Token verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async verify(@CurrentUser('id') userId: string, @Body() dto: Verify2FADto) {
    const isValid = await this.twoFactorService.verify2FA(userId, dto.token);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    return {
      message: 'Token verified successfully',
      verified: true,
    };
  }

  /**
   * 禁用 2FA
   * 需要输入验证码以确认操作
   */
  @Delete('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async disable(@CurrentUser('id') userId: string, @Body() dto: Disable2FADto) {
    await this.twoFactorService.disable2FA(userId, dto.token);

    return {
      message: '2FA disabled successfully',
    };
  }

  /**
   * 获取恢复码
   * 需要输入验证码以确认身份
   */
  @Post('recovery-codes')
  @ApiOperation({ summary: 'Get recovery codes' })
  @ApiResponse({
    status: 200,
    description: 'Recovery codes retrieved',
    schema: {
      type: 'object',
      properties: {
        recoveryCodes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async getRecoveryCodes(
    @CurrentUser('id') userId: string,
    @Body() dto: Verify2FADto,
  ) {
    const recoveryCodes = await this.twoFactorService.getRecoveryCodes(
      userId,
      dto.token,
    );

    return {
      recoveryCodes,
    };
  }

  /**
   * 检查 2FA 状态
   */
  @Get('status')
  @ApiOperation({ summary: 'Check 2FA status' })
  @ApiResponse({
    status: 200,
    description: '2FA status',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  })
  async getStatus(@CurrentUser('id') userId: string) {
    const enabled = await this.twoFactorService.is2FAEnabled(userId);

    return {
      enabled,
    };
  }
}
