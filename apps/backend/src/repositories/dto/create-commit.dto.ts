import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCommitDto {
  @IsString()
  @MinLength(1, { message: '提交信息不能为空' })
  @MaxLength(500, { message: '提交信息最多500个字符' })
  message: string;

  @IsString()
  branchId: string;
}
