import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { FilesService } from './files.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateFolderDto, QueryFilesDto } from './dto'
import type { User } from '@prisma/client'

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('folder') folder: string = '/',
    @CurrentUser() currentUser: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    return this.filesService.uploadFile(projectId, file, folder, currentUser)
  }

  @Post('folder')
  async createFolder(@Body() createFolderDto: CreateFolderDto, @CurrentUser() currentUser: User) {
    return this.filesService.createFolder(createFolderDto, currentUser)
  }

  @Get()
  async listFiles(@Query() query: QueryFilesDto, @CurrentUser() currentUser: User) {
    return this.filesService.listFiles(query, currentUser)
  }

  @Get(':id/content')
  async getFileContent(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.filesService.getFileContent(id, currentUser)
  }

  @Put(':id/content')
  async updateFileContent(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.filesService.updateFileContent(id, content, currentUser)
  }

  @Get(':id')
  async getFileInfo(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.filesService.getFileInfo(id, currentUser)
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @Res() res: Response,
  ) {
    const buffer = await this.filesService.downloadFile(id, currentUser)
    const file = await this.filesService.getFileInfo(id, currentUser)

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Content-Length': buffer.length,
    })

    res.status(HttpStatus.OK).send(buffer)
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.filesService.deleteFile(id, currentUser)
  }
}
