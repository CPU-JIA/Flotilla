import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TeamRole } from '@prisma/client';

/**
 * DTO for updating a team member's role
 */
export class UpdateTeamMemberRoleDto {
  @ApiProperty({
    description: 'New role to assign to the team member',
    enum: TeamRole,
    example: 'MAINTAINER',
    enumName: 'TeamRole',
  })
  @IsEnum(TeamRole, {
    message: 'Role must be one of: MAINTAINER, MEMBER',
  })
  role: TeamRole;
}
