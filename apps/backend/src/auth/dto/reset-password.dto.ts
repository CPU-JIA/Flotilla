import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '../validators/password-strength.validator';

/**
 * 密码重置DTO
 * 🔒 SECURITY: CWE-521 - 强密码要求
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsStrongPassword({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    message: '新密码必须至少12个字符，包含大写字母、小写字母、数字和特殊字符',
  })
  newPassword: string;
}
