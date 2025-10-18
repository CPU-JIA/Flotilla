import { IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole, { message: '无效的成员角色' })
  role: MemberRole;
}
