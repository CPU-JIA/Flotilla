import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { MemberRole } from '@prisma/client';

/**
 * DTO for assigning project permission to a team
 */
export class AssignProjectPermissionDto {
  @ApiProperty({
    description: 'Project ID to assign permission for',
    example: 'clx1234567890',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Role level to grant to the team',
    enum: MemberRole,
    example: 'MEMBER',
    enumName: 'MemberRole',
  })
  @IsEnum(MemberRole, {
    message: 'Role must be one of: OWNER, MAINTAINER, MEMBER, VIEWER',
  })
  role: MemberRole;
}
