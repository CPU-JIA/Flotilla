import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewState } from '@prisma/client';

export class CreateReviewDto {
  @ApiProperty({
    description: '审查状态',
    enum: ReviewState,
    example: ReviewState.APPROVED,
  })
  @IsEnum(ReviewState)
  state: ReviewState;

  @ApiProperty({
    description: '审查意见（支持Markdown）',
    example: '代码质量很好，同意合并。',
    required: false,
  })
  @IsString()
  @IsOptional()
  body?: string;
}
