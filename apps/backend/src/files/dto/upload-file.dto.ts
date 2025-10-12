import { IsString, IsOptional, IsEnum } from 'class-validator'

export enum FileType {
  CODE = 'code',
  IMAGE = 'image',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export class UploadFileDto {
  @IsString()
  projectId: string

  @IsString()
  path: string

  @IsOptional()
  @IsString()
  folder?: string

  @IsOptional()
  @IsEnum(FileType)
  type?: FileType
}
