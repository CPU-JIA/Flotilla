import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as speakeasy from 'speakeasy'
import * as qrcode from 'qrcode'
import * as crypto from 'crypto'

/**
 * 双因素认证服务
 * ECP-C1: Defensive Programming - 所有输入严格验证
 * ECP-C2: Systematic Error Handling - 全面的错误处理机制
 * 基于 TOTP (Time-based One-Time Password) 标准实现
 */
@Injectable()
export class TwoFactorService {
  // 加密密钥（从环境变量读取，用于加密存储TOTP密钥和恢复码）
  private readonly encryptionKey: Buffer
  private readonly algorithm = 'aes-256-gcm'

  constructor(private readonly prisma: PrismaService) {
    // ECP-C1: 防御性编程 - 确保加密密钥已配置
    const key = process.env.TWO_FACTOR_ENCRYPTION_KEY
    if (!key || key.length < 32) {
      throw new Error(
        'TWO_FACTOR_ENCRYPTION_KEY must be at least 32 characters long. Please set it in .env file.',
      )
    }
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32))
  }

  /**
   * 生成 TOTP 密钥
   * @param userId 用户ID
   * @returns TOTP密钥和Base32编码
   */
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    // ECP-C1: 输入验证
    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

    // 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    // 生成 TOTP 密钥
    const secret = speakeasy.generateSecret({
      name: `Flotilla (${user.email})`,
      issuer: 'Flotilla',
      length: 32,
    })

    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret')
    }

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || '',
    }
  }

  /**
   * 生成二维码
   * @param otpauthUrl TOTP URL
   * @returns Base64编码的二维码图片
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    // ECP-C1: 输入验证
    if (!otpauthUrl || !otpauthUrl.startsWith('otpauth://')) {
      throw new BadRequestException('Invalid otpauth URL')
    }

    try {
      // 生成二维码（Base64格式）
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl)
      return qrCodeDataUrl
    } catch (error) {
      // ECP-C2: 系统化错误处理
      throw new Error(`Failed to generate QR code: ${error.message}`)
    }
  }

  /**
   * 验证 TOTP 令牌
   * @param secret TOTP密钥
   * @param token 用户输入的6位数字码
   * @returns 是否验证通过
   */
  verifyToken(secret: string, token: string): boolean {
    // ECP-C1: 输入验证
    if (!secret || !token) {
      return false
    }

    // 验证token格式（6位数字）
    if (!/^\d{6}$/.test(token)) {
      return false
    }

    try {
      // 使用 speakeasy 验证 TOTP
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // 允许±2个时间窗口（容错60秒）
      })

      return verified
    } catch (error) {
      // ECP-C2: 错误处理 - 验证失败不抛出异常，返回false
      return false
    }
  }

  /**
   * 生成恢复码
   * @returns 8个恢复码数组
   * ECP-B1: DRY - 恢复码生成逻辑统一封装
   */
  generateRecoveryCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 8; i++) {
      // 生成16位随机恢复码（格式：XXXX-XXXX-XXXX-XXXX）
      const code = crypto.randomBytes(8).toString('hex').toUpperCase()
      const formatted = code.match(/.{1,4}/g)?.join('-') || code
      codes.push(formatted)
    }
    return codes
  }

  /**
   * 加密数据
   * @param data 待加密数据
   * @returns 加密后的字符串（格式：iv:encryptedData:authTag）
   * ECP-C1: 防御性编程 - 使用 AES-256-GCM 加密存储敏感数据
   */
  private encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv)

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // 格式：iv:encryptedData:authTag
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据（格式：iv:encryptedData:authTag）
   * @returns 解密后的字符串
   */
  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      const authTag = Buffer.from(parts[2], 'hex')

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
  }

  /**
   * 启用 2FA
   * @param userId 用户ID
   * @param secret TOTP密钥
   * @param token 验证码
   * @returns 恢复码数组
   */
  async enable2FA(userId: string, secret: string, token: string): Promise<string[]> {
    // ECP-C1: 输入验证
    if (!userId || !secret || !token) {
      throw new BadRequestException('Missing required parameters')
    }

    // 1. 验证 TOTP 令牌
    const isValid = this.verifyToken(secret, token)
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code')
    }

    // 2. 生成恢复码
    const recoveryCodes = this.generateRecoveryCodes()

    // 3. 加密密钥和恢复码
    const encryptedSecret = this.encrypt(secret)
    const encryptedCodes = recoveryCodes.map((code) => this.encrypt(code))

    // 4. 保存到数据库（使用 upsert 处理创建或更新）
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        recoveryCodes: encryptedCodes,
        enabled: true,
        verifiedAt: new Date(),
      },
      update: {
        secret: encryptedSecret,
        recoveryCodes: encryptedCodes,
        enabled: true,
        verifiedAt: new Date(),
      },
    })

    // 5. 返回明文恢复码（仅此一次显示）
    return recoveryCodes
  }

  /**
   * 验证用户的 2FA 令牌
   * @param userId 用户ID
   * @param token 用户输入的验证码
   * @returns 是否验证通过
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    // ECP-C1: 输入验证
    if (!userId || !token) {
      return false
    }

    // 1. 获取用户的 2FA 配置
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    })

    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      throw new BadRequestException('2FA is not enabled for this user')
    }

    // 2. 解密密钥
    const secret = this.decrypt(twoFactorAuth.secret)

    // 3. 验证 TOTP 令牌
    const isValidToken = this.verifyToken(secret, token)
    if (isValidToken) {
      return true
    }

    // 4. 如果TOTP验证失败，尝试验证恢复码
    const isValidRecoveryCode = await this.verifyRecoveryCode(userId, token)
    return isValidRecoveryCode
  }

  /**
   * 验证恢复码
   * @param userId 用户ID
   * @param code 恢复码
   * @returns 是否验证通过
   */
  private async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    // 获取用户的 2FA 配置
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    })

    if (!twoFactorAuth) {
      return false
    }

    // 解密所有恢复码并比对
    const recoveryCodes = twoFactorAuth.recoveryCodes.map((encrypted) => this.decrypt(encrypted))

    const index = recoveryCodes.findIndex((recoveryCode) => recoveryCode === code)
    if (index === -1) {
      return false
    }

    // 使用后移除该恢复码（一次性使用）
    const updatedCodes = [...twoFactorAuth.recoveryCodes]
    updatedCodes.splice(index, 1)

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { recoveryCodes: updatedCodes },
    })

    return true
  }

  /**
   * 禁用 2FA
   * @param userId 用户ID
   * @param token 验证码（确认操作）
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    // ECP-C1: 输入验证
    if (!userId || !token) {
      throw new BadRequestException('Missing required parameters')
    }

    // 1. 验证 2FA 令牌
    const isValid = await this.verify2FA(userId, token)
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code')
    }

    // 2. 删除 2FA 配置
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    })
  }

  /**
   * 获取恢复码（需要验证身份）
   * @param userId 用户ID
   * @param token 验证码
   * @returns 恢复码数组
   */
  async getRecoveryCodes(userId: string, token: string): Promise<string[]> {
    // ECP-C1: 输入验证
    if (!userId || !token) {
      throw new BadRequestException('Missing required parameters')
    }

    // 1. 验证 2FA 令牌
    const isValid = await this.verify2FA(userId, token)
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code')
    }

    // 2. 获取恢复码
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    })

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA is not enabled')
    }

    // 3. 解密恢复码
    const recoveryCodes = twoFactorAuth.recoveryCodes.map((encrypted) => this.decrypt(encrypted))

    return recoveryCodes
  }

  /**
   * 检查用户是否启用了 2FA
   * @param userId 用户ID
   * @returns 是否启用
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { enabled: true },
    })

    return twoFactorAuth?.enabled || false
  }
}
