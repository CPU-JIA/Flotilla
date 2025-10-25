import { ApiProperty } from '@nestjs/swagger';

/**
 * Merge Status Response DTO
 * 返回PR是否可以合并及相关状态信息
 */
export class MergeStatusResponseDto {
  @ApiProperty({
    description: 'Whether the PR can be merged',
    example: true,
  })
  allowed: boolean;

  @ApiProperty({
    description: 'Reason if merge is not allowed',
    example: 'Need 1 more approval(s)',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Current number of approvals',
    example: 2,
  })
  approvalCount: number;

  @ApiProperty({
    description: 'Required number of approvals',
    example: 1,
  })
  requiredApprovals: number;

  @ApiProperty({
    description: 'Whether there are active change requests',
    example: false,
  })
  hasChangeRequests: boolean;
}
