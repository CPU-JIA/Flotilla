import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    })
  }

  async onModuleInit() {
    try {
      await this.$connect()
      this.logger.log('✅ Database connected successfully')
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error)
      throw error
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('Database disconnected')
  }

  // 清理数据库（仅用于测试环境）
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production')
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && typeof key === 'string',
    )

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as string]
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany()
        }
      }),
    )
  }
}
