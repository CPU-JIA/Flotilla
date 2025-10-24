import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePullRequestDto {
  @ApiProperty({
    description: 'PR标题',
    example: 'feat: Add user authentication',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'PR详细描述（支持Markdown）',
    example: '## 变更内容\n- 添加用户认证功能\n- 集成JWT\n\n## 测试\n- ✅ 单元测试通过\n- ✅ E2E测试通过',
    required: false,
  })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiProperty({
    description: '源分支名称',
    example: 'feature/user-auth',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sourceBranch: string;

  @ApiProperty({
    description: '目标分支名称',
    example: 'main',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  targetBranch: string;

  @ApiProperty({
    description: '项目ID',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
