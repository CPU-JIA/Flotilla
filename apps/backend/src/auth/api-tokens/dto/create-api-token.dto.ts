import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsIn,
  IsOptional,
  IsDate,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建 API Token DTO
 * ECP-C1: 防御性编程 - 严格输入验证
 */
export class CreateApiTokenDto {
  @ApiProperty({
    description: '令牌名称（用户自定义）',
    example: 'CI/CD Pipeline',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: '令牌作用域',
    example: ['read', 'write'],
    type: [String],
    enum: ['read', 'write', 'admin'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要选择一个作用域' })
  @IsIn(['read', 'write', 'admin'], { each: true })
  scopes: string[];

  @ApiProperty({
    description: '令牌过期时间（可选）',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
