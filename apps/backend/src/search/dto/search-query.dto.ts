import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 搜索查询DTO
 *
 * 用于验证和文档化搜索请求参数
 *
 * ECP-C1 (输入验证): 使用class-validator装饰器严格验证
 * ECP-B3 (命名清晰): 字段命名语义明确
 */
export class SearchQueryDto {
  @ApiProperty({
    description: '搜索关键词',
    example: 'UserService',
    minLength: 1,
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: '项目ID（过滤）',
    example: 'cm2x3y4z5',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: '编程语言（过滤）',
    example: ['typescript', 'javascript'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @ApiPropertyOptional({
    description: '分支名称（过滤）',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({
    description: '文件扩展名（过滤）',
    example: ['.ts', '.tsx'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extension?: string[];

  @ApiPropertyOptional({
    description: '偏移量（分页）',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: '限制数量（分页）',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '排序方式',
    enum: ['relevance', 'date', 'size'],
    default: 'relevance',
  })
  @IsOptional()
  @IsEnum(['relevance', 'date', 'size'])
  sort?: 'relevance' | 'date' | 'size' = 'relevance';
}
