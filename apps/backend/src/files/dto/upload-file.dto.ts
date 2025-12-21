import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';

export enum FileType {
  CODE = 'code',
  IMAGE = 'image',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class UploadFileDto {
  @IsString()
  projectId: string;

  // 🔒 SECURITY FIX: 路径遍历防护（CWE-22: Path Traversal）
  // 禁止 ..、绝对路径、反斜杠等危险模式
  @IsString()
  @Matches(/^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\\)[a-zA-Z0-9_\-/.]+$/, {
    message: '文件路径不合法：不能包含 ".."、不能以"/"开头、不能包含"\\"或"//"',
  })
  path: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\\)[a-zA-Z0-9_\-/.]*$/, {
    message:
      '文件夹路径不合法：不能包含 ".."、不能以"/"开头、不能包含"\\"或"//"',
  })
  folder?: string;

  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;
}
