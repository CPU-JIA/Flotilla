import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  MaxLength,
} from 'class-validator'

/**
 * 创建流水线配置 DTO
 * ECP-C1: Defensive Programming - 严格验证所有输入字段
 */
export class CreatePipelineDto {
  @ApiProperty({ description: '流水线名称', example: 'Build and Test' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @ApiProperty({
    description: '流水线配置（YAML转JSON）',
    example: {
      steps: [
        { name: 'Checkout', run: 'git checkout' },
        { name: 'Build', run: 'npm run build' },
        { name: 'Test', run: 'npm test' },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>

  @ApiProperty({
    description: '触发条件',
    example: ['push', 'pull_request'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  triggers: string[]

  @ApiPropertyOptional({
    description: '是否激活',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean
}
