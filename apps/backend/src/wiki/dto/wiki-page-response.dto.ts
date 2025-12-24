import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Wiki 页面响应 DTO
 * ECP-A1: SOLID - 清晰的数据传输对象
 */
export class WikiPageResponseDto {
  @ApiProperty({ description: '页面 ID', example: 'clxxx...' })
  id: string;

  @ApiProperty({ description: '项目 ID', example: 'clxxx...' })
  projectId: string;

  @ApiProperty({ description: 'URL 友好的 slug', example: 'getting-started' })
  slug: string;

  @ApiProperty({ description: '页面标题', example: 'Getting Started' })
  title: string;

  @ApiProperty({
    description: 'Markdown 内容',
    example: '# Getting Started\n\nWelcome!',
  })
  content: string;

  @ApiPropertyOptional({
    description: '父页面 ID',
    example: 'clxxx...',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({ description: '排序顺序', example: 0 })
  order: number;

  @ApiProperty({ description: '创建者 ID', example: 'clxxx...' })
  createdById: string;

  @ApiProperty({
    description: '创建者信息',
    example: { id: 'clxxx...', username: 'john', email: 'john@example.com' },
  })
  createdBy: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Wiki 页面树节点 DTO
 * 用于展示层级结构
 */
export class WikiTreeNodeDto {
  @ApiProperty({ description: '页面 ID', example: 'clxxx...' })
  id: string;

  @ApiProperty({ description: 'URL slug', example: 'getting-started' })
  slug: string;

  @ApiProperty({ description: '页面标题', example: 'Getting Started' })
  title: string;

  @ApiPropertyOptional({
    description: '父页面 ID',
    example: 'clxxx...',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({ description: '排序顺序', example: 0 })
  order: number;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-02T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: '子页面',
    type: [WikiTreeNodeDto],
    isArray: true,
  })
  children: WikiTreeNodeDto[];
}

/**
 * Wiki 页面历史记录响应 DTO
 */
export class WikiPageHistoryResponseDto {
  @ApiProperty({ description: '历史记录 ID', example: 'clxxx...' })
  id: string;

  @ApiProperty({ description: '页面 ID', example: 'clxxx...' })
  pageId: string;

  @ApiProperty({ description: '历史标题', example: 'Getting Started' })
  title: string;

  @ApiProperty({
    description: '历史内容快照',
    example: '# Getting Started\n\nOld content...',
  })
  content: string;

  @ApiProperty({ description: '编辑者 ID', example: 'clxxx...' })
  editedById: string;

  @ApiProperty({
    description: '编辑者信息',
    example: { id: 'clxxx...', username: 'john' },
  })
  editedBy: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };

  @ApiProperty({
    description: '编辑时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  editedAt: Date;

  @ApiProperty({
    description: '版本号',
    example: 1,
  })
  version: number;
}
