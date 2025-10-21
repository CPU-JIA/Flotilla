import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryIssueDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Issue状态筛选',
    enum: ['OPEN', 'CLOSED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED'])
  state?: 'OPEN' | 'CLOSED';

  @ApiProperty({
    description: '按分配人筛选（用户ID）',
    example: 'user-id-1',
    required: false,
  })
  @IsOptional()
  assignee?: string;

  @ApiProperty({
    description: '按标签筛选（标签ID，逗号分隔）',
    example: 'label-1,label-2',
    required: false,
  })
  @IsOptional()
  labels?: string;

  @ApiProperty({
    description: '按里程碑筛选（里程碑ID）',
    example: 'milestone-id-1',
    required: false,
  })
  @IsOptional()
  milestone?: string;

  @ApiProperty({
    description: '搜索关键词（标题和内容）',
    example: 'login bug',
    required: false,
  })
  @IsOptional()
  search?: string;
}
