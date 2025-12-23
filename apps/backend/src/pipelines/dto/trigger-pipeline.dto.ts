import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsObject,
  IsOptional,
} from 'class-validator'

/**
 * 触发流水线运行 DTO
 * ECP-C1: Defensive Programming - 验证commit信息和分支
 */
export class TriggerPipelineDto {
  @ApiProperty({
    description: 'Commit SHA',
    example: 'a1b2c3d4e5f6789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  commitSha: string

  @ApiProperty({
    description: '分支名称',
    example: 'main',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  branch: string

  @ApiProperty({
    description: '额外元数据',
    example: { triggeredBy: 'user123', environment: 'production' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}
