import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ProjectVisibility } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: '项目名称至少3个字符' })
  @MaxLength(100, { message: '项目名称最多100个字符' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '项目描述最多500个字符' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectVisibility, { message: '无效的项目可见性' })
  visibility?: ProjectVisibility = ProjectVisibility.PRIVATE;

  @IsOptional()
  @IsInt({ message: 'requireApprovals必须是整数' })
  @Min(0, { message: 'requireApprovals不能小于0' })
  requireApprovals?: number;

  @IsOptional()
  @IsBoolean({ message: 'allowSelfMerge必须是布尔值' })
  allowSelfMerge?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'requireReviewFromOwner必须是布尔值' })
  requireReviewFromOwner?: boolean;
}
