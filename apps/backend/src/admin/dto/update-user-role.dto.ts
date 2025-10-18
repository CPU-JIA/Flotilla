import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * 更新用户角色 DTO
 * ECP-C1: 防御性编程 - 输入验证
 */
export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: '角色必须是有效的用户角色' })
  @IsNotEmpty({ message: '角色不能为空' })
  role: UserRole;
}
