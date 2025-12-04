import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePullRequestDto {
  @ApiProperty({
    description: 'PR标题',
    example: 'feat: Add user authentication (updated)',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiProperty({
    description: 'PR详细描述（支持Markdown）',
    example:
      '## 变更内容（更新）\n- 添加用户认证功能\n- 集成JWT\n- 添加密码加密',
    required: false,
  })
  @IsString()
  @IsOptional()
  body?: string;
}
