import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateApiTokenDto } from './dto/create-api-token.dto'
import {
  ApiTokenListDto,
  CreateApiTokenResponseDto,
} from './dto/api-token-response.dto'
import * as crypto from 'crypto'

/**
 * API Token Service
 * ECP-C1: 防御性编程 - SHA256哈希存储,令牌只显示一次
 * ECP-C2: 系统化错误处理 - 过期验证、作用域验证
 * ECP-B1: DRY原则 - 提取通用令牌生成和验证逻辑
 */
@Injectable()
export class ApiTokenService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成随机令牌
   * 格式: flo_<56字符随机hex> (总共60字符)
   * ECP-B2: KISS原则 - 使用标准crypto库
   */
  private generateToken(): string {
    const randomBytes = crypto.randomBytes(28) // 28 bytes = 56 hex chars
    return `flo_${randomBytes.toString('hex')}`
  }

  /**
   * 计算令牌的SHA256哈希
   * ECP-C1: 防御性编程 - 不可逆哈希存储
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * 创建API令牌
   * ECP-C2: 系统化错误处理 - 验证用户存在,验证过期时间
   */
  async createToken(
    userId: string,
    dto: CreateApiTokenDto,
  ): Promise<CreateApiTokenResponseDto> {
    // 生成令牌
    const token = this.generateToken()
    const tokenHash = this.hashToken(token)
    const tokenPrefix = token.substring(0, 8) // 'flo_1234'

    // 验证过期时间（如果设置）
    if (dto.expiresAt && dto.expiresAt <= new Date()) {
      throw new UnauthorizedException('过期时间必须在未来')
    }

    // 创建数据库记录
    const apiToken = await this.prisma.apiToken.create({
      data: {
        userId,
        name: dto.name,
        tokenHash,
        tokenPrefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
      },
    })

    // 返回响应（包含完整令牌，只显示一次）
    return {
      id: apiToken.id,
      name: apiToken.name,
      tokenPrefix: apiToken.tokenPrefix,
      scopes: apiToken.scopes,
      expiresAt: apiToken.expiresAt,
      lastUsedAt: apiToken.lastUsedAt,
      createdAt: apiToken.createdAt,
      token, // 完整令牌只在创建时返回
    }
  }

  /**
   * 验证API令牌
   * ECP-C1: 防御性编程 - 验证令牌格式、哈希、过期时间
   * ECP-C3: Performance Awareness - 使用tokenHash索引快速查询
   */
  async validateToken(token: string): Promise<{ userId: string; scopes: string[] } | null> {
    // 验证令牌格式
    if (!token || !token.startsWith('flo_') || token.length !== 60) {
      return null
    }

    const tokenHash = this.hashToken(token)

    // 查询令牌
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        scopes: true,
        expiresAt: true,
      },
    })

    if (!apiToken) {
      return null
    }

    // 验证过期时间
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return null
    }

    // 更新最后使用时间（异步，不阻塞）
    this.prisma.apiToken
      .update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.error('Failed to update lastUsedAt:', err)
      })

    return {
      userId: apiToken.userId,
      scopes: apiToken.scopes,
    }
  }

  /**
   * 列出用户的所有令牌
   * ECP-C3: Performance Awareness - 只返回必要字段
   */
  async listTokens(userId: string): Promise<ApiTokenListDto[]> {
    const tokens = await this.prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    return tokens
  }

  /**
   * 撤销（删除）令牌
   * ECP-C2: 系统化错误处理 - 验证令牌所有权
   */
  async revokeToken(userId: string, tokenId: string): Promise<void> {
    // 验证令牌存在且属于当前用户
    const token = await this.prisma.apiToken.findFirst({
      where: { id: tokenId, userId },
    })

    if (!token) {
      throw new NotFoundException('令牌不存在或无权访问')
    }

    // 删除令牌
    await this.prisma.apiToken.delete({
      where: { id: tokenId },
    })
  }
}
