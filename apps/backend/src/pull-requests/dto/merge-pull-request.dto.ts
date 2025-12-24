import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MergeStrategy } from '@prisma/client';

// 导出MergeStrategy供测试文件使用
export { MergeStrategy };

export class MergePullRequestDto {
  @ApiProperty({
    description: '合并策略',
    enum: MergeStrategy,
    example: MergeStrategy.MERGE,
    default: MergeStrategy.MERGE,
  })
  @IsEnum(MergeStrategy)
  @IsOptional()
  strategy?: MergeStrategy = MergeStrategy.MERGE;

  @ApiProperty({
    description: '合并提交消息（可选）',
    example: 'Merge pull request #42 from feature/user-auth',
    required: false,
  })
  @IsString()
  @IsOptional()
  commitMessage?: string;
}
