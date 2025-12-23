import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * 启用 2FA DTO
 */
export class Enable2FADto {
  @ApiProperty({
    description: 'TOTP secret (Base32 encoded)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsString()
  @IsNotEmpty()
  secret: string

  @ApiProperty({
    description: 'TOTP verification code (6 digits)',
    example: '123456',
    pattern: '^\\d{6}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Token must be a 6-digit number' })
  token: string
}

/**
 * 验证 2FA DTO
 */
export class Verify2FADto {
  @ApiProperty({
    description: 'TOTP verification code or recovery code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token: string
}

/**
 * 禁用 2FA DTO
 */
export class Disable2FADto {
  @ApiProperty({
    description: 'TOTP verification code or recovery code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token: string
}
