import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsOptional,
  IsUrl,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

/**
 * DTO for updating an organization
 * All fields are optional - only provided fields will be updated
 */
export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Alibaba Cloud DevOps',
    required: false,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: 'Name must be between 2 and 50 characters' })
  name?: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Updated description for the organization',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  description?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://www.alibabacloud.com',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiProperty({
    description: 'Organization avatar URL',
    example: 'https://cdn.example.com/avatar.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  avatar?: string;

  // Quota fields - only SUPER_ADMIN can update these
  @ApiProperty({
    description:
      'Maximum number of projects (SUPER_ADMIN only)',
    example: 1000,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxProjects must be at least 1' })
  maxProjects?: number;

  @ApiProperty({
    description:
      'Maximum number of members (SUPER_ADMIN only)',
    example: 1000,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxMembers must be at least 1' })
  maxMembers?: number;

  @ApiProperty({
    description:
      'Storage quota in bytes (SUPER_ADMIN only)',
    example: 107374182400,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'storageQuota must be non-negative' })
  storageQuota?: number;
}
