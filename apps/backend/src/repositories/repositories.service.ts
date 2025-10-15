import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MinioService } from '../minio/minio.service'
import { CreateBranchDto, CreateCommitDto } from './dto'
import type { User, Repository, Branch, Commit, File } from '@prisma/client'
import { MemberRole, UserRole } from '@prisma/client'

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name)

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  /**
   * 创建仓库（可被ProjectService和Controller调用）
   * ECP-A1: 单一职责
   */
  async createRepository(projectId: string, currentUser?: User): Promise<Repository> {
    // 如果提供了currentUser，则检查权限
    if (currentUser) {
      await this.checkProjectPermission(projectId, currentUser, true)
    }

    // 检查Repository是否已存在
    const existingRepo = await this.prisma.repository.findUnique({
      where: { projectId },
    })

    if (existingRepo) {
      throw new ConflictException('仓库已存在')
    }

    const repository = await this.prisma.repository.create({
      data: {
        projectId,
      },
    })

    // 创建默认的main分支
    await this.prisma.branch.create({
      data: {
        name: 'main',
        repositoryId: repository.id,
      },
    })

    this.logger.log(`📂 Repository created for project ${projectId}`)
    return repository
  }

  /**
   * 获取仓库信息
   */
  async getRepository(projectId: string, currentUser: User): Promise<any> {
    // 检查项目权限
    await this.checkProjectPermission(projectId, currentUser)

    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
      include: {
        branches: {
          include: {
            _count: {
              select: { commits: true },
            },
          },
        },
        _count: {
          select: { files: true },
        },
      },
    })

    if (!repository) {
      throw new NotFoundException('仓库不存在')
    }

    return repository
  }

  /**
   * 创建分支
   * ECP-C1: 防御性编程 - 检查唯一性
   */
  async createBranch(
    projectId: string,
    createBranchDto: CreateBranchDto,
    currentUser: User,
  ): Promise<Branch> {
    await this.checkProjectPermission(projectId, currentUser, true)

    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    })

    if (!repository) {
      throw new NotFoundException('仓库不存在')
    }

    // 检查分支名是否已存在
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        repositoryId: repository.id,
        name: createBranchDto.name,
      },
    })

    if (existingBranch) {
      throw new ConflictException('分支名已存在')
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: createBranchDto.name,
        repositoryId: repository.id,
      },
    })

    this.logger.log(`🌿 Branch "${branch.name}" created in project ${projectId}`)
    return branch
  }

  /**
   * 获取分支列表
   */
  async getBranches(projectId: string, currentUser: User): Promise<Branch[]> {
    await this.checkProjectPermission(projectId, currentUser)

    const repository = await this.prisma.repository.findUnique({
      where: { projectId },
    })

    if (!repository) {
      throw new NotFoundException('仓库不存在')
    }

    return this.prisma.branch.findMany({
      where: { repositoryId: repository.id },
      include: {
        _count: {
          select: { commits: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 上传文件
   * ECP-C3: 性能意识 - 使用MinIO存储
   */
  async uploadFile(
    projectId: string,
    branchId: string,
    filePath: string,
    fileBuffer: Buffer,
    currentUser: User,
  ): Promise<File> {
    await this.checkProjectPermission(projectId, currentUser, true)

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { repository: true },
    })

    if (!branch || branch.repository.projectId !== projectId) {
      throw new NotFoundException('分支不存在')
    }

    // 生成MinIO对象名称
    const objectName = `projects/${projectId}/branches/${branchId}/${filePath}`

    // 上传到MinIO
    await this.minioService.uploadFile(objectName, fileBuffer, fileBuffer.length, {
      'Content-Type': this.getContentType(filePath),
      'Upload-User': currentUser.username,
      'Upload-Time': new Date().toISOString(),
    })

    // 创建或更新文件记录
    const file = await this.prisma.file.upsert({
      where: {
        repositoryId_branchId_path: {
          repositoryId: branch.repositoryId,
          branchId: branchId,
          path: filePath,
        },
      },
      create: {
        repositoryId: branch.repositoryId,
        branchId: branchId,
        path: filePath,
        objectName: objectName,
        size: fileBuffer.length,
        mimeType: this.getContentType(filePath),
      },
      update: {
        objectName: objectName,
        size: fileBuffer.length,
        updatedAt: new Date(),
      },
    })

    this.logger.log(`📄 File uploaded: ${filePath} to branch ${branch.name}`)
    return file
  }

  /**
   * 下载文件
   */
  async downloadFile(
    projectId: string,
    branchId: string,
    filePath: string,
    currentUser: User,
  ): Promise<Buffer> {
    await this.checkProjectPermission(projectId, currentUser)

    const file = await this.prisma.file.findFirst({
      where: {
        branchId: branchId,
        path: filePath,
        repository: {
          projectId: projectId,
        },
      },
    })

    if (!file) {
      throw new NotFoundException('文件不存在')
    }

    return this.minioService.downloadFile(file.objectName)
  }

  /**
   * 创建提交
   * ECP-A1: SOLID原则
   */
  async createCommit(
    projectId: string,
    createCommitDto: CreateCommitDto,
    currentUser: User,
  ): Promise<Commit> {
    await this.checkProjectPermission(projectId, currentUser, true)

    const branch = await this.prisma.branch.findUnique({
      where: { id: createCommitDto.branchId },
      include: { repository: true },
    })

    if (!branch || branch.repository.projectId !== projectId) {
      throw new NotFoundException('分支不存在')
    }

    const commit = await this.prisma.commit.create({
      data: {
        message: createCommitDto.message,
        repositoryId: branch.repositoryId,
        branchId: createCommitDto.branchId,
        authorId: currentUser.id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    })

    this.logger.log(`📝 Commit created: ${commit.message.substring(0, 50)}...`)
    return commit
  }

  /**
   * 获取提交历史
   * ECP-C3: 性能意识 - 分页查询
   */
  async getCommits(
    projectId: string,
    branchId: string,
    currentUser: User,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<any> {
    await this.checkProjectPermission(projectId, currentUser)

    const skip = (page - 1) * pageSize

    const [commits, total] = await Promise.all([
      this.prisma.commit.findMany({
        where: { branchId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.commit.count({ where: { branchId } }),
    ])

    return {
      commits,
      total,
      page,
      pageSize,
    }
  }

  /**
   * 获取文件列表
   */
  async getFiles(projectId: string, branchId: string, currentUser: User): Promise<File[]> {
    await this.checkProjectPermission(projectId, currentUser)

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { repository: true },
    })

    if (!branch || branch.repository.projectId !== projectId) {
      throw new NotFoundException('分支不存在')
    }

    return this.prisma.file.findMany({
      where: { branchId },
      orderBy: { path: 'asc' },
    })
  }

  /**
   * 检查项目权限
   * ECP-C1: 防御性编程
   */
  private async checkProjectPermission(
    projectId: string,
    currentUser: User,
    requireWrite: boolean = false,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: currentUser.id },
        },
      },
    })

    if (!project) {
      throw new NotFoundException('项目不存在')
    }

    const isOwner = project.ownerId === currentUser.id
    const member = project.members[0]
    const isMember = !!member
    const isAdmin = currentUser.role === UserRole.SUPER_ADMIN

    // 超级管理员拥有所有权限
    if (isAdmin) {
      return
    }

    if (!isOwner && !isMember) {
      throw new ForbiddenException('您没有权限访问此项目')
    }

    if (requireWrite && !isOwner && member?.role === MemberRole.VIEWER) {
      throw new ForbiddenException('您没有写入权限')
    }
  }

  /**
   * 获取文件Content-Type
   * ECP-B1: DRY原则 - 统一处理
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      js: 'application/javascript',
      ts: 'application/typescript',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      md: 'text/markdown',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
    }

    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}

