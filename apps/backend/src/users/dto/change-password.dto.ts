import { IsString, MinLength, Matches } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: '请输入当前密码' })
  currentPassword: string

  @IsString()
  @MinLength(8, { message: '新密码至少8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '新密码必须包含大小写字母和数字',
  })
  newPassword: string
}
