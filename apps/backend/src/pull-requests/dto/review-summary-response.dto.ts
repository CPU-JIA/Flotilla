import { ApiProperty } from '@nestjs/swagger';
import { ReviewState } from '@prisma/client';

/**
 * Reviewer Summary
 * 单个reviewer的最新review状态
 */
export class ReviewerSummary {
  @ApiProperty({
    description: 'Reviewer user ID',
    example: 'clxxx123',
  })
  id: string;

  @ApiProperty({
    description: 'Reviewer username',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'Reviewer avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatar: string | null;

  @ApiProperty({
    description: 'Latest review state',
    enum: ReviewState,
    example: ReviewState.APPROVED,
  })
  state: ReviewState;

  @ApiProperty({
    description: 'Review creation timestamp',
    example: '2025-10-25T12:00:00Z',
  })
  createdAt: Date;
}

/**
 * Review Summary Response DTO
 * 返回PR的review聚合摘要
 */
export class ReviewSummaryResponseDto {
  @ApiProperty({
    description: 'Number of APPROVED reviews',
    example: 2,
  })
  approved: number;

  @ApiProperty({
    description: 'Number of CHANGES_REQUESTED reviews',
    example: 0,
  })
  changesRequested: number;

  @ApiProperty({
    description: 'Number of COMMENTED reviews',
    example: 1,
  })
  commented: number;

  @ApiProperty({
    description: 'Total number of reviewers',
    example: 3,
  })
  totalReviewers: number;

  @ApiProperty({
    description: 'List of reviewers with their latest review state',
    type: [ReviewerSummary],
  })
  reviewers: ReviewerSummary[];
}
