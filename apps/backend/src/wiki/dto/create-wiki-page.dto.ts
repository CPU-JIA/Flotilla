import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 创建 Wiki 页面 DTO
 * ECP-C1: 防御性编程 - 验证所有输入字段
 * ECP-B3: 命名规范 - 清晰的字段命名
 */
export class CreateWikiPageDto {
  @ApiProperty({
    description: 'Wiki 页面 slug（URL 友好标识符）',
    example: 'getting-started',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be lowercase alphanumeric with hyphens (e.g., "getting-started")',
  })
  slug: string;

  @ApiProperty({
    description: '页面标题',
    example: 'Getting Started',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Markdown 格式的页面内容',
    example: '# Getting Started\n\nWelcome to our wiki!',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: '父页面 ID（用于创建子页面）',
    example: 'clxxx...',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: '同级页面排序顺序',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
