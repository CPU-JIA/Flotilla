import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator'
import { PipelineStatus } from '@prisma/client'

/**
 * 更新流水线运行状态 DTO
 * ECP-C1: Defensive Programming - 验证状态枚举和执行时长
 */
export class UpdatePipelineStatusDto {
  @ApiProperty({
    description: '流水线状态',
    enum: PipelineStatus,
    example: 'SUCCESS',
  })
  @IsEnum(PipelineStatus)
  status: PipelineStatus

  @ApiPropertyOptional({
    description: '执行时长（秒）',
    example: 120,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number

  @ApiPropertyOptional({
    description: '构建日志',
    example: 'Build successful\nTests passed',
  })
  @IsString()
  @IsOptional()
  logs?: string
}
