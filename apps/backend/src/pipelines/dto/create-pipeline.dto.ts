import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 流水线步骤配置
 * ECP-C1: 类型安全 - 强类型配置替代 any
 */
export class PipelineStep {
  @ApiProperty({ description: '步骤名称', example: 'Build' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '执行命令', example: 'npm run build' })
  @IsString()
  @IsNotEmpty()
  run: string;

  @ApiPropertyOptional({
    description: '环境变量',
    example: { NODE_ENV: 'production' },
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @ApiPropertyOptional({ description: '工作目录', example: './apps/backend' })
  @IsOptional()
  @IsString()
  workingDirectory?: string;

  @ApiPropertyOptional({ description: '超时时间（秒）', example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeout?: number;

  @ApiPropertyOptional({ description: '失败时继续执行', example: false })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}

/**
 * 流水线配置
 * ECP-C1: 类型安全 - 强类型配置结构
 */
export class PipelineConfig {
  @ApiProperty({
    description: '执行步骤',
    type: [PipelineStep],
    example: [
      { name: 'Checkout', run: 'git checkout' },
      { name: 'Build', run: 'npm run build' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStep)
  steps: PipelineStep[];

  @ApiPropertyOptional({ description: '全局超时时间（秒）', example: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeout?: number;

  @ApiPropertyOptional({ description: '全局环境变量', example: { CI: 'true' } })
  @IsOptional()
  @IsObject()
  environment?: Record<string, string>;

  @ApiPropertyOptional({ description: '并发执行的最大步骤数', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrency?: number;
}

/**
 * 创建流水线配置 DTO
 * ECP-C1: Defensive Programming - 严格验证所有输入字段
 */
export class CreatePipelineDto {
  @ApiProperty({ description: '流水线名称', example: 'Build and Test' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: '流水线配置',
    type: PipelineConfig,
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
  @ValidateNested()
  @Type(() => PipelineConfig)
  config: PipelineConfig;

  @ApiProperty({
    description: '触发条件',
    example: ['push', 'pull_request'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  triggers: string[];

  @ApiPropertyOptional({
    description: '是否激活',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
