import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

/**
 * DTO for updating project permission
 */
export class UpdateProjectPermissionDto {
  @ApiProperty({
    description: 'New role level for the team',
    enum: MemberRole,
    example: 'MAINTAINER',
    enumName: 'MemberRole',
  })
  @IsEnum(MemberRole, {
    message: 'Role must be one of: OWNER, MAINTAINER, MEMBER, VIEWER',
  })
  role: MemberRole;
}
