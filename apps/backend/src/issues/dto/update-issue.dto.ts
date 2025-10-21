import { PartialType } from '@nestjs/swagger';
import { CreateIssueDto } from './create-issue.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIssueDto extends PartialType(CreateIssueDto) {
  @ApiProperty({
    description: 'Issue状态',
    enum: ['OPEN', 'CLOSED'],
    required: false,
  })
  @IsEnum(['OPEN', 'CLOSED'])
  @IsOptional()
  state?: 'OPEN' | 'CLOSED';
}
