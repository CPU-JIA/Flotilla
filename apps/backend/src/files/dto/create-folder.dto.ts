import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateFolderDto {
  @IsString()
  projectId: string

  @IsString()
  @MinLength(1, { message: '文件夹名称不能为空' })
  @MaxLength(100, { message: '文件夹名称最多100个字符' })
  @Matches(/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/, {
    message: '文件夹名称只能包含字母、数字、下划线、中划线和中文',
  })
  name: string

  @IsString()
  parentPath: string
}
