import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString } from 'class-validator';
import { TeamRole } from '@prisma/client';

/**
 * DTO for adding a member to a team
 */
export class AddTeamMemberDto {
  @ApiProperty({
    description: 'Email address of the user to add to the team',
    example: 'developer@example.com',
  })
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the team member',
    enum: TeamRole,
    example: 'MEMBER',
    enumName: 'TeamRole',
  })
  @IsEnum(TeamRole, {
    message: 'Role must be one of: MAINTAINER, MEMBER',
  })
  role: TeamRole;
}
