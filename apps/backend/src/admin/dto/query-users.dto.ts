import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

/**
 * 查询用户列表 DTO（管理员）
 * ECP-C1: 防御性编程 - 输入验证
 */
export class AdminQueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  pageSize?: number = 20;

  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '角色筛选必须是有效的用户角色' })
  role?: UserRole;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive 必须是布尔值' })
  isActive?: boolean;
}
