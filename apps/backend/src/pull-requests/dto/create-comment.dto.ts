import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PullRequestCreateCommentDto {
  @ApiProperty({
    description: '评论内容（支持Markdown）',
    example: '这里的逻辑可以简化一下。',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: '文件路径（用于line-level评论）',
    example: 'src/auth/auth.service.ts',
    required: false,
  })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiProperty({
    description: '行号（用于line-level评论）',
    example: 42,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  lineNumber?: number;

  @ApiProperty({
    description: 'Commit Hash（锁定到特定commit）',
    example: 'abc123def456',
    required: false,
  })
  @IsString()
  @IsOptional()
  commitHash?: string;
}
