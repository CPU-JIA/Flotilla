import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * 创建分支保护规则DTO
 *
 * 用于为项目的特定分支配置保护策略
 */
export class CreateBranchProtectionDto {
  @ApiProperty({
    description: '保护的分支名称（精确匹配）',
    example: 'main',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  branchPattern: string;

  @ApiPropertyOptional({
    description: '是否要求通过PR修改（不能直接push）',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  requirePullRequest?: boolean;

  @ApiPropertyOptional({
    description: '最少批准审核数量',
    default: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredApprovingReviews?: number;

  @ApiPropertyOptional({
    description: '新提交后作废旧审查',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dismissStaleReviews?: boolean;

  @ApiPropertyOptional({
    description: '要求Code Owner审查',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireCodeOwnerReview?: boolean;

  @ApiPropertyOptional({
    description: '允许强制推送（危险操作）',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowForcePushes?: boolean;

  @ApiPropertyOptional({
    description: '允许删除保护分支',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDeletions?: boolean;

  @ApiPropertyOptional({
    description: '要求状态检查通过',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireStatusChecks?: boolean;

  @ApiPropertyOptional({
    description: '必须通过的检查项',
    example: ['ci', 'tests', 'build'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredStatusChecks?: string[];
}
