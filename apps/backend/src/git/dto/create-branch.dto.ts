import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GitCreateBranchDto {
  @ApiProperty({ description: 'Branch name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Start point (commit SHA or branch name)',
  })
  @IsString()
  @IsOptional()
  startPoint?: string;
}
