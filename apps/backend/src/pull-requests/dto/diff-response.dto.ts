import { ApiProperty } from '@nestjs/swagger';

/**
 * File Diff
 * 单个文件的diff信息
 */
export class FileDiff {
  @ApiProperty({
    description: 'File path',
    example: 'src/auth/auth.service.ts',
  })
  path: string;

  @ApiProperty({
    description: 'File change status',
    enum: ['added', 'modified', 'deleted'],
    example: 'modified',
  })
  status: 'added' | 'modified' | 'deleted';

  @ApiProperty({
    description: 'Number of lines added',
    example: 15,
  })
  additions: number;

  @ApiProperty({
    description: 'Number of lines deleted',
    example: 5,
  })
  deletions: number;

  @ApiProperty({
    description: 'Unified diff patch',
    example: '@@ -1,5 +1,10 @@\n-old line\n+new line',
    required: false,
  })
  patch?: string;
}

/**
 * Diff Summary
 * diff统计摘要
 */
export class DiffSummary {
  @ApiProperty({
    description: 'Total number of changed files',
    example: 3,
  })
  totalFiles: number;

  @ApiProperty({
    description: 'Total lines added',
    example: 50,
  })
  totalAdditions: number;

  @ApiProperty({
    description: 'Total lines deleted',
    example: 20,
  })
  totalDeletions: number;
}

/**
 * Comment Author
 * 评论作者信息
 */
class CommentAuthor {
  @ApiProperty({
    description: 'Author user ID',
    example: 'clxxx789',
  })
  id: string;

  @ApiProperty({
    description: 'Author username',
    example: 'janedoe',
  })
  username: string;

  @ApiProperty({
    description: 'Author avatar URL',
    example: 'https://example.com/avatar2.jpg',
    required: false,
  })
  avatar: string | null;
}

/**
 * PR Comment with Author
 * Line-level comment with author info
 */
export class PRCommentWithAuthor {
  @ApiProperty({
    description: 'Comment ID',
    example: 'clxxx456',
  })
  id: string;

  @ApiProperty({
    description: 'Comment body (Markdown)',
    example: 'Consider refactoring this method.',
  })
  body: string;

  @ApiProperty({
    description: 'File path (for line-level comments)',
    example: 'src/auth/auth.service.ts',
    required: false,
  })
  filePath?: string | null;

  @ApiProperty({
    description: 'Line number (for line-level comments)',
    example: 42,
    required: false,
  })
  lineNumber?: number | null;

  @ApiProperty({
    description: 'Commit hash (version lock)',
    example: 'abc123def456',
    required: false,
  })
  commitHash?: string | null;

  @ApiProperty({
    description: 'Comment creation timestamp',
    example: '2025-10-25T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Comment author',
    type: CommentAuthor,
  })
  author: CommentAuthor;
}

/**
 * Diff Response DTO
 * 返回PR的完整diff和line-level comments
 */
export class DiffResponseDto {
  @ApiProperty({
    description: 'List of changed files with diffs',
    type: [FileDiff],
  })
  files: FileDiff[];

  @ApiProperty({
    description: 'Diff summary statistics',
    type: DiffSummary,
  })
  summary: DiffSummary;

  @ApiProperty({
    description: 'Line-level comments on this PR',
    type: [PRCommentWithAuthor],
  })
  comments: PRCommentWithAuthor[];
}
