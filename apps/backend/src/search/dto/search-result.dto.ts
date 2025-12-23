import { ApiProperty } from '@nestjs/swagger';
import { CodeDocument } from '../interfaces/code-document.interface';

/**
 * 搜索结果DTO
 *
 * 返回给前端的搜索结果数据结构
 *
 * ECP-B3 (命名清晰): 字段命名与MeiliSearch响应对应
 */
export class SearchResultDto {
  @ApiProperty({
    description: '搜索结果',
    type: [Object],
    example: [
      {
        id: 'file_cm123_cm456',
        fileName: 'user.service.ts',
        filePath: 'src/users/user.service.ts',
        content: 'export class UserService {...}',
        language: 'typescript',
      },
    ],
  })
  hits: CodeDocument[];

  @ApiProperty({
    description: '总命中数',
    example: 156,
  })
  totalHits: number;

  @ApiProperty({
    description: '偏移量',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: '限制数量',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: '处理时间(毫秒)',
    example: 23,
  })
  processingTimeMs: number;

  @ApiProperty({
    description: '搜索关键词',
    example: 'UserService',
  })
  query: string;
}

/**
 * 索引状态DTO
 *
 * 返回项目索引状态统计
 */
export class IndexStatusDto {
  @ApiProperty({
    description: '项目ID',
    example: 'cm2x3y4z5',
  })
  projectId: string;

  @ApiProperty({
    description: '总文件数',
    example: 1000,
  })
  totalFiles: number;

  @ApiProperty({
    description: '已索引文件数',
    example: 850,
  })
  indexedFiles: number;

  @ApiProperty({
    description: '待索引文件数',
    example: 100,
  })
  pendingFiles: number;

  @ApiProperty({
    description: '失败文件数',
    example: 50,
  })
  failedFiles: number;

  @ApiProperty({
    description: '索引进度百分比',
    example: 85.0,
  })
  progress: number;

  @ApiProperty({
    description: '最后索引时间',
    example: '2025-10-27T08:30:00.000Z',
    required: false,
  })
  lastIndexedAt?: Date;
}

/**
 * 删除索引响应DTO
 */
export class DeleteIndexResponseDto {
  @ApiProperty({
    description: '项目ID',
    example: 'cm2x3y4z5',
  })
  projectId: string;

  @ApiProperty({
    description: '删除的文档数',
    example: 1500,
  })
  deletedDocuments: number;

  @ApiProperty({
    description: 'MeiliSearch任务ID',
    example: 42,
  })
  taskUid: number;

  @ApiProperty({
    description: '消息',
    example: '项目索引删除成功',
  })
  message: string;
}

/**
 * 重索引响应DTO
 */
export class ReindexResponseDto {
  @ApiProperty({
    description: '任务ID',
    example: 'job_abc123',
  })
  jobId: string;

  @ApiProperty({
    description: '项目ID',
    example: 'cm2x3y4z5',
  })
  projectId: string;

  @ApiProperty({
    description: '任务状态',
    enum: ['queued', 'running', 'completed', 'failed'],
    example: 'queued',
  })
  status: string;

  @ApiProperty({
    description: '消息',
    example: '重索引任务已启动',
  })
  message: string;

  @ApiProperty({
    description: '预计文件数',
    example: 1000,
  })
  estimatedFiles: number;
}
