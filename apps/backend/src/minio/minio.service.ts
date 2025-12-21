import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') || 'flotilla-storage';

    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey:
        this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey:
        this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin123',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`📦 MinIO bucket "${this.bucketName}" created`);
      } else {
        this.logger.log(`📦 MinIO bucket "${this.bucketName}" already exists`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to initialize MinIO: ${error.message}`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    objectName: string,
    buffer: Buffer,
    size: number,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        size,
        metadata,
      );
      this.logger.log(`📤 File uploaded: ${objectName}`);
      return objectName;
    } catch (error) {
      this.logger.error(`❌ Upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(
        this.bucketName,
        objectName,
      );
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`❌ Download failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`🗑️ File deleted: ${objectName}`);
    } catch (error) {
      this.logger.error(`❌ Delete failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取文件URL
   */
  async getFileUrl(
    objectName: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(`❌ Get URL failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 列出文件
   */
  async listFiles(prefix: string = ''): Promise<Minio.BucketItem[]> {
    return new Promise((resolve, reject) => {
      const files: Minio.BucketItem[] = [];
      const stream = this.minioClient.listObjectsV2(
        this.bucketName,
        prefix,
        true,
      );

      stream.on('data', (obj) => files.push(obj));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  /**
   * 获取文件元数据
   */
  async statObject(objectName: string): Promise<Minio.BucketItemStat> {
    try {
      const stat = await this.minioClient.statObject(
        this.bucketName,
        objectName,
      );
      return stat;
    } catch (error) {
      this.logger.error(`❌ Stat object failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取文件流（用于大文件下载）
   */
  async getObject(objectName: string): Promise<any> {
    try {
      const stream = await this.minioClient.getObject(
        this.bucketName,
        objectName,
      );
      return stream;
    } catch (error) {
      this.logger.error(`❌ Get object stream failed: ${error.message}`);
      throw error;
    }
  }
}
