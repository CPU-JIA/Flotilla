import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new team
 */
export class CreateTeamDto {
  @ApiProperty({
    description: 'Team name',
    example: 'Frontend Team',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Team name must be between 2 and 50 characters' })
  name: string;

  @ApiProperty({
    description:
      'URL-friendly unique identifier for the team within the organization',
    example: 'frontend-team',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$',
  })
  @IsString()
  @Length(2, 50, { message: 'Slug must be between 2 and 50 characters' })
  @Matches(/^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/, {
    message:
      'Slug must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number',
  })
  slug: string;

  @ApiProperty({
    description: 'Team description',
    example: 'Team responsible for frontend development',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Organization slug to which this team belongs',
    example: 'my-organization',
  })
  @IsString()
  organizationSlug: string;
}
