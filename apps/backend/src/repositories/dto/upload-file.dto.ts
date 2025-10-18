import { IsString, MinLength } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @MinLength(1, { message: '文件路径不能为空' })
  path: string;

  @IsString()
  branchId: string;
}
