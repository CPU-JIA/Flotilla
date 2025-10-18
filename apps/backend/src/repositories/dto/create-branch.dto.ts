import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(1, { message: '分支名称不能为空' })
  @MaxLength(100, { message: '分支名称最多100个字符' })
  name: string;

  @IsOptional()
  @IsString()
  baseBranchId?: string;
}
