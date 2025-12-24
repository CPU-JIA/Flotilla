import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 2FA 登录验证 DTO
 */
export class Login2FADto {
  @ApiProperty({
    description: 'Pending token from initial login',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  pendingToken: string;

  @ApiProperty({
    description: 'TOTP verification code or recovery code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
