import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FileChangeDto {
  @ApiProperty({
    description: 'File path relative to repository root',
    example: 'src/index.ts',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  path: string;

  @ApiProperty({
    description: 'File content (text)',
    example: 'console.log("Hello World");',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class GitCreateCommitDto {
  @ApiProperty({
    description: 'Branch name to commit to (will be created if not exists)',
    example: 'main',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  branch: string;

  @ApiProperty({
    description: 'Commit message',
    example: 'Add new feature',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiProperty({
    description: 'Files to add/modify in this commit',
    type: [FileChangeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileChangeDto)
  files: FileChangeDto[];

  @ApiProperty({
    description: 'Author name (optional, defaults to current user)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorName?: string;

  @ApiProperty({
    description: 'Author email (optional, defaults to current user)',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorEmail?: string;
}
