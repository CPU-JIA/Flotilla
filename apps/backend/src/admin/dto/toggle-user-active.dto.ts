import { IsBoolean, IsNotEmpty } from 'class-validator'

/**
 * 切换用户激活状态 DTO
 * ECP-C1: 防御性编程 - 输入验证
 */
export class ToggleUserActiveDto {
  @IsBoolean({ message: 'isActive 必须是布尔值' })
  @IsNotEmpty({ message: 'isActive 不能为空' })
  isActive: boolean
}
