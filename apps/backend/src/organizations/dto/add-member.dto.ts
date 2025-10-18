import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString } from 'class-validator';
import { OrgRole } from '@prisma/client';

/**
 * DTO for adding a new member to an organization
 */
export class AddOrganizationMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'developer@example.com',
  })
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the member',
    enum: OrgRole,
    example: 'MEMBER',
    enumName: 'OrgRole',
  })
  @IsEnum(OrgRole, {
    message: 'Role must be one of: OWNER, ADMIN, MEMBER',
  })
  role: OrgRole;
}
