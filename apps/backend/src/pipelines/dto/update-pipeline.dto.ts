import { PartialType } from '@nestjs/swagger'
import { CreatePipelineDto } from './create-pipeline.dto'

/**
 * 更新流水线配置 DTO
 * ECP-B1: DRY - 复用 CreatePipelineDto，所有字段变为可选
 */
export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}
