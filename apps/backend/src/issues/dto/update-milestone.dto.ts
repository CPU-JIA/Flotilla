import { PartialType } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiProperty({
    description: '里程碑状态',
    enum: ['OPEN', 'CLOSED'],
    required: false,
  })
  @IsEnum(['OPEN', 'CLOSED'])
  @IsOptional()
  state?: 'OPEN' | 'CLOSED';
}
