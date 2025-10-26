import { PartialType } from '@nestjs/swagger';
import { CreateBranchProtectionDto } from './create-branch-protection.dto';

/**
 * 更新分支保护规则DTO
 *
 * 继承自CreateBranchProtectionDto，所有字段可选
 */
export class UpdateBranchProtectionDto extends PartialType(
  CreateBranchProtectionDto,
) {}
