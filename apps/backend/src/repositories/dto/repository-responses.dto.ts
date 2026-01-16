import { ApiProperty } from '@nestjs/swagger';

// 分支详情，包括提交计数
export class BranchWithCommitCountDto {
  @ApiProperty({ description: '分支ID' })
  id!: string;

  @ApiProperty({ description: '分支名称' })
  name!: string;

  @ApiProperty({ description: '仓库ID' })
  repositoryId!: string;

  @ApiProperty({
    description: '提交数计数',
    type: 'object',
    properties: { commits: { type: 'number' } },
  })
  _count!: {
    commits: number;
  };

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}

// 仓库详情响应 (getRepository)
export class RepositoryDetailDto {
  @ApiProperty({ description: '仓库ID' })
  id!: string;

  @ApiProperty({ description: '项目ID' })
  projectId!: string;

  @ApiProperty({
    description: '分支列表',
    type: [BranchWithCommitCountDto],
  })
  branches!: BranchWithCommitCountDto[];

  @ApiProperty({
    description: '文件计数',
    type: 'object',
    properties: { files: { type: 'number' } },
  })
  _count!: {
    files: number;
  };

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;
}

// 提交作者信息
export class CommitAuthorDto {
  @ApiProperty({ description: '用户ID' })
  id!: string;

  @ApiProperty({ description: '用户名' })
  username!: string;

  @ApiProperty({ description: '邮箱' })
  email!: string;

  @ApiProperty({ description: '头像', required: false })
  avatar!: string | null;
}

// 提交信息（简化版，用于列表）
export class CommitWithAuthorDto {
  @ApiProperty({ description: '提交ID' })
  id!: string;

  @ApiProperty({ description: '提交消息' })
  message!: string;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '作者信息', type: CommitAuthorDto })
  author!: CommitAuthorDto;
}

// 提交历史分页响应 (getCommits)
export class CommitsPageDto {
  @ApiProperty({
    description: '提交列表',
    type: [CommitWithAuthorDto],
  })
  commits!: CommitWithAuthorDto[];

  @ApiProperty({ description: '总数' })
  total!: number;

  @ApiProperty({ description: '当前页码' })
  page!: number;

  @ApiProperty({ description: '每页大小' })
  pageSize!: number;
}

// 文件摘要信息
export class FileDto {
  @ApiProperty({ description: '文件ID' })
  id!: string;

  @ApiProperty({ description: '文件路径' })
  path!: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size!: number;

  @ApiProperty({ description: '文件类型', required: false })
  mimeType?: string;

  @ApiProperty({ description: '创建时间', required: false })
  createdAt?: Date;

  @ApiProperty({ description: '更新时间', required: false })
  updatedAt?: Date;
}

// 提交详情响应 (getCommit)
export class CommitDetailDto {
  @ApiProperty({ description: '提交ID' })
  id!: string;

  @ApiProperty({ description: '提交消息' })
  message!: string;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '分支ID' })
  branchId!: string;

  @ApiProperty({ description: '仓库ID' })
  repositoryId!: string;

  @ApiProperty({ description: '作者ID' })
  authorId!: string;

  @ApiProperty({ description: '作者信息', type: CommitAuthorDto })
  author!: CommitAuthorDto;

  @ApiProperty({ description: '此提交涉及的文件数' })
  filesCount!: number;

  @ApiProperty({
    description: '此提交时的文件列表',
    type: [FileDto],
  })
  files!: FileDto[];
}

// Diff统计信息
export class CommitDiffStatsDto {
  @ApiProperty({ description: '新增文件数' })
  added!: number;

  @ApiProperty({ description: '修改文件数' })
  modified!: number;

  @ApiProperty({ description: '删除文件数' })
  deleted!: number;

  @ApiProperty({ description: '变化总数' })
  total!: number;
}

// Diff变化详情
export class CommitDiffChangesDto {
  @ApiProperty({
    description: '新增文件列表',
    type: [FileDto],
  })
  added!: FileDto[];

  @ApiProperty({
    description: '修改文件列表',
    type: [FileDto],
  })
  modified!: FileDto[];

  @ApiProperty({
    description: '删除文件列表',
    type: [FileDto],
  })
  deleted!: FileDto[];
}

// 提交Diff响应 (getCommitDiff)
export class CommitDiffDto {
  @ApiProperty({
    description: '提交信息',
    type: 'object',
    properties: {
      id: { type: 'string' },
      message: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  })
  commit!: {
    id: string;
    message: string;
    createdAt: Date;
  };

  @ApiProperty({ description: '统计信息', type: CommitDiffStatsDto })
  stats!: CommitDiffStatsDto;

  @ApiProperty({ description: '变化详情', type: CommitDiffChangesDto })
  changes!: CommitDiffChangesDto;
}

// 单个文件内容响应
export class CommitFileContentDto {
  @ApiProperty({
    description: '文件信息',
    type: 'object',
    properties: {
      id: { type: 'string' },
      path: { type: 'string' },
      size: { type: 'number' },
      mimeType: { type: 'string' },
    },
  })
  file!: {
    id: string;
    path: string;
    size: number;
    mimeType: string;
  };

  @ApiProperty({ description: '文件内容（字符串）' })
  content!: string;
}

// 提交的文件列表响应
export class CommitFilesListDto {
  @ApiProperty({
    description: '提交信息',
    type: 'object',
    properties: {
      id: { type: 'string' },
      message: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  })
  commit!: {
    id: string;
    message: string;
    createdAt: Date;
  };

  @ApiProperty({
    description: '文件列表',
    type: [FileDto],
  })
  files!: FileDto[];
}

// 联合类型：getCommitFiles可能返回两种响应
export type CommitFilesResponseDto = CommitFileContentDto | CommitFilesListDto;
