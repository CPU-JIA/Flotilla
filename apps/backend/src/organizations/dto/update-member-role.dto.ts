import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrgRole } from '@prisma/client';

/**
 * DTO for updating a member's role in an organization
 */
export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({
    description: 'New role to assign to the member',
    enum: OrgRole,
    example: 'ADMIN',
    enumName: 'OrgRole',
  })
  @IsEnum(OrgRole, {
    message: 'Role must be one of: OWNER, ADMIN, MEMBER',
  })
  role: OrgRole;
}
