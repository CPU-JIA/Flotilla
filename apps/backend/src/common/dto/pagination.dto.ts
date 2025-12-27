import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base class for pagination DTOs
 * ECP-A1: DRY - Eliminates duplicated pagination logic across different entities
 * ECP-A1: SOLID - Single Responsibility - handles only pagination concerns
 *
 * Usage:
 * ```typescript
 * export class ListProjectsDto extends PaginationDto {
 *   @ApiPropertyOptional()
 *   @IsOptional()
 *   @IsString()
 *   organizationId?: string;
 * }
 * ```
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: 'Search keyword to filter results',
    example: 'user query',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Calculate skip value for Prisma queries
   * @returns Number of items to skip based on current page and page size
   */
  getSkip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 10);
  }

  /**
   * Get take value for Prisma queries
   * @returns Number of items to take (alias for pageSize)
   */
  getTake(): number {
    return this.pageSize ?? 10;
  }
}
