import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length, MaxLength } from 'class-validator';

/**
 * DTO for updating team information
 */
export class UpdateTeamDto {
  @ApiProperty({
    description: 'Team name',
    example: 'Frontend Development Team',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: 'Team name must be between 2 and 50 characters' })
  name?: string;

  @ApiProperty({
    description: 'Team description',
    example: 'Responsible for all frontend development tasks',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
