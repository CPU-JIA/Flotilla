import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
}

export class CreateExportRequestDto {
  @ApiProperty({
    enum: ExportFormat,
    default: ExportFormat.JSON,
    description: 'Export format (JSON or CSV)',
  })
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.JSON;
}
