import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitRepositoryDto {
  @ApiPropertyOptional({
    description: 'Default branch name',
    default: 'main',
  })
  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @ApiProperty({ description: 'Author name' })
  @IsString()
  authorName: string;

  @ApiProperty({ description: 'Author email' })
  @IsEmail()
  authorEmail: string;
}
