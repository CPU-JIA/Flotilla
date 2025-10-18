import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * 创建用户DTO
 * ECP-C1: 防御性编程 - 输入验证
 */
export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: '用户名至少需要3个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  username: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少需要6个字符' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: string;
}
