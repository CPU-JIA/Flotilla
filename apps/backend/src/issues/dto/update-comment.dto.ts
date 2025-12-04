import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: '评论内容(Markdown格式)',
    example: 'Updated comment with **bold** text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, {
    message: 'Comment body must be at most 10000 characters',
  })
  body: string;
}
