/**
 * Stream Size Limit Interceptor
 *
 * 🔒 SECURITY: Prevents DoS attacks by limiting request body size
 * Uses streaming approach to avoid loading entire body into memory
 *
 * ECP-C1: Defensive Programming - Validate all external inputs
 * ECP-C2: Systematic Error Handling - Graceful failure with proper cleanup
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export interface StreamSizeLimitOptions {
  maxSize: number; // Maximum size in bytes
  operationName: string; // For logging purposes
}

@Injectable()
export class StreamSizeLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StreamSizeLimitInterceptor.name);

  constructor(private readonly options: StreamSizeLimitOptions) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check Content-Length header first (fast path)
    const contentLength = request.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > this.options.maxSize) {
        this.logger.warn(
          `${this.options.operationName}: Request rejected - Content-Length ${size} bytes exceeds limit ${this.options.maxSize} bytes`,
        );
        throw new PayloadTooLargeException(
          `Request body too large. Maximum size is ${this.formatBytes(this.options.maxSize)}`,
        );
      }
    }

    // Note: Actual streaming size validation happens in the controller/service
    // This interceptor provides early rejection based on Content-Length header
    return next.handle();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
