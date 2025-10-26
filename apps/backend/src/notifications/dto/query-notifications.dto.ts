import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 查询通知DTO
 *
 * 支持按已读状态过滤和分页
 *
 * ECP-C3: Performance Awareness - 分页查询，防止大量数据加载
 */
export class QueryNotificationsDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  read?: boolean; // 过滤条件：是否已读（可选）

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1; // 页码（默认第1页）

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20; // 每页条数（默认20，最多100）
}
