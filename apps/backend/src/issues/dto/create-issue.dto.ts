import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIssueDto {
  @ApiProperty({
    description: 'Issue标题',
    example: 'Fix login bug',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Issue详细描述（支持Markdown）',
    example: '## 问题描述\n登录时出现500错误\n\n## 复现步骤\n1. 打开登录页面\n2. 输入用户名密码\n3. 点击登录',
    required: false,
  })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiProperty({
    description: '分配给的用户ID数组',
    example: ['user-id-1', 'user-id-2'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  assigneeIds?: string[];

  @ApiProperty({
    description: '标签ID数组',
    example: ['label-id-1', 'label-id-2'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  labelIds?: string[];

  @ApiProperty({
    description: '里程碑ID',
    example: 'milestone-id-1',
    required: false,
  })
  @IsString()
  @IsOptional()
  milestoneId?: string;
}
