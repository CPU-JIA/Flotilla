import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ProjectVisibility } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '项目名称至少3个字符' })
  @MaxLength(100, { message: '项目名称最多100个字符' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '项目描述最多500个字符' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectVisibility, { message: '无效的项目可见性' })
  visibility?: ProjectVisibility;

  // PR Approval Rules (Phase 2 - PR Review Enhancement)
  @IsOptional()
  @IsInt({ message: '需要批准数必须是整数' })
  @Min(0, { message: '需要批准数不能小于0' })
  @Max(10, { message: '需要批准数不能大于10' })
  requireApprovals?: number;

  @IsOptional()
  @IsBoolean({ message: '允许自合并必须是布尔值' })
  allowSelfMerge?: boolean;

  @IsOptional()
  @IsBoolean({ message: '需要所有者审查必须是布尔值' })
  requireReviewFromOwner?: boolean;
}
