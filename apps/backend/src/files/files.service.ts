import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MinioService } from '../minio/minio.service'
import { CreateFolderDto, QueryFilesDto } from './dto'
import type { User } from '@prisma/client'
import type { FileEntity, FilesListResponse } from './entities/file.entity'
import { UserRole } from '@prisma/client'
import * as path from 'path'
import * as crypto from 'crypto'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_PROJECT_SIZE = 1024 * 1024 * 1024 // 1GB

const CODE_FILE_EXTENSIONS = [
  '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.sh',
  '.html', '.css', '.scss', '.sass', '.less', '.vue', '.json', '.xml',
  '.yaml', '.yml', '.md', '.txt', '.sql', '.proto',
]

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name)

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  /**
   * 检查项目访问权限
   * ECP-C1: 防御性编程 - 权限验证
   */
  private async checkProjectAccess(projectId: string, currentUser: User): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: currentUser.id },
        },
      },
    })

    if (!project) {
      throw new NotFoundException(`项目 ID ${projectId} 不存在`)
    }

    const isOwner = project.ownerId === currentUser.id
    const isMember = project.members.length > 0
    const isAdmin = currentUser.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isMember && !isAdmin) {
      throw new ForbiddenException('无权限访问该项目')
    }
  }

  /**
   * 获取项目总存储大小
   */
  private async getProjectTotalSize(projectId: string): Promise<number> {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      select: { size: true },
    })

    return files.reduce((sum, file) => sum + file.size, 0)
  }

  /**
   * 生成唯一的文件名(MinIO对象名)
   * ECP-C1: 防御性编程 - 避免文件名编码问题
   *
   * MinIO对象名只使用ASCII安全字符（时间戳+随机字符串+扩展名）
   * 原始文件名保存在数据库name字段和MinIO metadata中
   */
  private generateObjectName(projectId: string, filename: string, folder?: string): string {
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(filename)
    // 只使用时间戳和随机字符串，避免中文等特殊字符的编码问题
    const sanitizedName = `${timestamp}_${randomStr}${ext}`

    if (folder && folder !== '/') {
      // 移除开头和结尾的斜杠，避免双斜杠问题
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '')
      return `projects/${projectId}/${cleanFolder}/${sanitizedName}`
    }

    return `projects/${projectId}/${sanitizedName}`
  }

  /**
   * 判断文件类型
   */
  private getFileType(filename: string, mimeType: string): 'file' | 'folder' {
    return 'file' // 默认返回文件类型
  }

  /**
   * 上传文件
   * ECP-C1: 防御性编程 - 文件大小和项目容量限制
   * ECP-C2: 系统化错误处理
   */
  async uploadFile(
    projectId: string,
    file: Express.Multer.File,
    folder: string = '/',
    currentUser: User,
  ): Promise<FileEntity> {
    // 修复文件名编码 - Multer默认使用Latin1解析，需转换为UTF-8
    // ECP-C1: 防御性编程 - 正确处理非ASCII文件名
    const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8')

    // 权限验证
    await this.checkProjectAccess(projectId, currentUser)

    // 文件大小验证
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(`文件大小超过限制 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // 项目总容量验证
    const currentProjectSize = await this.getProjectTotalSize(projectId)
    if (currentProjectSize + file.size > MAX_PROJECT_SIZE) {
      throw new PayloadTooLargeException(
        `项目存储空间超过限制 ${MAX_PROJECT_SIZE / 1024 / 1024 / 1024}GB`,
      )
    }

    // 生成唯一文件名
    const objectName = this.generateObjectName(projectId, originalFilename, folder)

    // 上传到MinIO
    try {
      await this.minioService.uploadFile(
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'Original-Filename': Buffer.from(originalFilename, 'utf8').toString('base64'),
        },
      )
    } catch (error) {
      this.logger.error(`MinIO upload failed: ${error.message}`)
      throw new BadRequestException('文件上传失败')
    }

    // 保存文件记录到数据库
    const fileRecord = await this.prisma.projectFile.create({
      data: {
        name: originalFilename,
        path: objectName,
        size: file.size,
        mimeType: file.mimetype,
        type: 'file',
        projectId,
        uploadedBy: currentUser.id,
        folder: folder === '/' ? null : folder,
      },
      include: {
        uploader: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    this.logger.log(
      `File uploaded: ${originalFilename} (${file.size} bytes) to project ${projectId}`,
    )

    return {
      id: fileRecord.id,
      name: fileRecord.name,
      path: fileRecord.path,
      size: fileRecord.size,
      mimeType: fileRecord.mimeType,
      type: fileRecord.type as 'file' | 'folder',
      projectId: fileRecord.projectId,
      uploadedBy: fileRecord.uploadedBy,
      createdAt: fileRecord.createdAt,
      updatedAt: fileRecord.updatedAt,
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    createFolderDto: CreateFolderDto,
    currentUser: User,
  ): Promise<FileEntity> {
    const { projectId, name, parentPath } = createFolderDto

    // 权限验证
    await this.checkProjectAccess(projectId, currentUser)

    // 构建文件夹路径
    const folderPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`

    // 检查文件夹是否已存在
    const existingFolder = await this.prisma.projectFile.findFirst({
      where: {
        projectId,
        folder: parentPath === '/' ? null : parentPath,
        name,
        type: 'folder',
      },
    })

    if (existingFolder) {
      throw new BadRequestException('文件夹已存在')
    }

    // 创建文件夹记录
    const folder = await this.prisma.projectFile.create({
      data: {
        name,
        path: folderPath,
        size: 0,
        mimeType: 'application/x-directory',
        type: 'folder',
        projectId,
        uploadedBy: currentUser.id,
        folder: parentPath === '/' ? null : parentPath,
      },
    })

    this.logger.log(`Folder created: ${folderPath} in project ${projectId}`)

    return {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      size: folder.size,
      mimeType: folder.mimeType,
      type: folder.type as 'file' | 'folder',
      projectId: folder.projectId,
      uploadedBy: folder.uploadedBy,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }
  }

  /**
   * 获取文件列表
   * ECP-C3: 性能意识 - 分页加载
   */
  async listFiles(query: QueryFilesDto, currentUser: User): Promise<FilesListResponse> {
    const { projectId, folder = '/', search, page = 1, pageSize = 50 } = query

    // 权限验证
    await this.checkProjectAccess(projectId, currentUser)

    const skip = (page - 1) * pageSize

    const where: any = {
      projectId,
      folder: folder === '/' ? null : folder,
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    const [files, total, totalSize] = await Promise.all([
      this.prisma.projectFile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ type: 'desc' }, { createdAt: 'desc' }], // 文件夹优先
        include: {
          uploader: {
            select: { id: true, username: true },
          },
        },
      }),
      this.prisma.projectFile.count({ where }),
      this.getProjectTotalSize(projectId),
    ])

    this.logger.log(`Retrieved ${files.length} files from project ${projectId}`)

    return {
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType: file.mimeType,
        type: file.type as 'file' | 'folder',
        projectId: file.projectId,
        uploadedBy: file.uploadedBy,
        folder: file.folder,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalSize,
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string, currentUser: User): Promise<Buffer> {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      throw new NotFoundException('文件不存在')
    }

    if (file.type === 'folder') {
      throw new BadRequestException('无法下载文件夹')
    }

    // 权限验证
    await this.checkProjectAccess(file.projectId, currentUser)

    try {
      const buffer = await this.minioService.downloadFile(file.path)
      this.logger.log(`File downloaded: ${file.name}`)
      return buffer
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`)
      throw new BadRequestException('文件下载失败')
    }
  }

  /**
   * 删除文件
   * ECP-A1: 单一职责原则
   */
  async deleteFile(fileId: string, currentUser: User): Promise<{ message: string }> {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: fileId },
      include: {
        project: true,
      },
    })

    if (!file) {
      throw new NotFoundException('文件不存在')
    }

    // 权限验证：项目所有者或文件上传者或管理员才能删除
    const isOwner = file.project.ownerId === currentUser.id
    const isUploader = file.uploadedBy === currentUser.id
    const isAdmin = currentUser.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isUploader && !isAdmin) {
      throw new ForbiddenException('无权限删除该文件')
    }

    // 如果是文件夹，检查是否为空
    if (file.type === 'folder') {
      const childCount = await this.prisma.projectFile.count({
        where: {
          projectId: file.projectId,
          folder: file.path,
        },
      })

      if (childCount > 0) {
        throw new BadRequestException('文件夹不为空，无法删除')
      }
    }

    // 从MinIO删除文件（文件夹不需要删除，因为MinIO中不存在）
    if (file.type === 'file') {
      try {
        await this.minioService.deleteFile(file.path)
      } catch (error) {
        this.logger.warn(`MinIO delete warning: ${error.message}`)
        // 继续删除数据库记录
      }
    }

    // 删除数据库记录
    await this.prisma.projectFile.delete({
      where: { id: fileId },
    })

    this.logger.log(`File deleted: ${file.name}`)

    return { message: '文件已删除' }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId: string, currentUser: User): Promise<FileEntity> {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    if (!file) {
      throw new NotFoundException('文件不存在')
    }

    // 权限验证
    await this.checkProjectAccess(file.projectId, currentUser)

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mimeType,
      type: file.type as 'file' | 'folder',
      projectId: file.projectId,
      uploadedBy: file.uploadedBy,
      folder: file.folder,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }
  }
}
