import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  Matches,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new organization
 */
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name (2-50 characters, supports Chinese)',
    example: 'Alibaba Cloud',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Name must be between 2 and 50 characters' })
  name: string;

  @ApiProperty({
    description:
      'URL-friendly slug (2-50 characters, lowercase letters, numbers, hyphens only)',
    example: 'alibaba-cloud',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$',
  })
  @IsString()
  @Length(2, 50, { message: 'Slug must be between 2 and 50 characters' })
  @Matches(/^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/, {
    message:
      'Slug must be lowercase letters, numbers, and hyphens only, cannot start or end with hyphen',
  })
  slug: string;

  @ApiProperty({
    description: 'Organization description (optional)',
    example: 'Leading cloud computing platform',
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
    description: 'Organization website URL (optional)',
    example: 'https://www.alibabacloud.com',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;
}
