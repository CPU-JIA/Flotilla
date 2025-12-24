import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 更新 Wiki 页面 DTO
 * ECP-A3: YAGNI - 只包含可更新的字段
 * ECP-C1: 防御性编程 - 所有字段都是可选的，但至少需要一个
 */
export class UpdateWikiPageDto {
  @ApiPropertyOptional({
    description: '新的 slug（URL 友好标识符）',
    example: 'getting-started-guide',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lowercase alphanumeric with hyphens (e.g., "getting-started")',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: '新的页面标题',
    example: 'Getting Started Guide',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: '新的 Markdown 内容',
    example: '# Getting Started Guide\n\nUpdated content here...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '新的父页面 ID（null 表示移动到根级别）',
    example: 'clxxx...',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: '新的排序顺序',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
