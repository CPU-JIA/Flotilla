import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  projectId: string;

  @IsString()
  @MinLength(1, { message: '文件夹名称不能为空' })
  @MaxLength(100, { message: '文件夹名称最多100个字符' })
  @Matches(/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/, {
    message: '文件夹名称只能包含字母、数字、下划线、中划线和中文',
  })
  name: string;

  // 🔒 SECURITY FIX: 路径遍历防护（CWE-22: Path Traversal）
  // 禁止 ..、绝对路径、反斜杠等危险模式
  @IsString()
  @Matches(/^(?!\/)(?!.*\.\.)(?!.*\/\/)(?!.*\\)[a-zA-Z0-9_\-\/\.]*$/, {
    message: '父路径不合法：不能包含 ".."、不能以"/"开头、不能包含"\\"或"//"',
  })
  parentPath: string;
}
