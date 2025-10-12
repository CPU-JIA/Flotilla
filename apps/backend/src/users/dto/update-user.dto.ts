import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator'
import { UserRole } from '@prisma/client'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '头像URL最多500个字符' })
  avatar?: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '个人简介最多500个字符' })
  bio?: string

  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole
}
