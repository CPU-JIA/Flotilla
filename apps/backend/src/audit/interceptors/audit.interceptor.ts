import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../decorators/audit.decorator';

/**
 * 审计日志拦截器
 *
 * Phase 4: 自动记录审计日志
 *
 * 功能：
 * - 自动从装饰器获取审计元数据
 * - 从请求中提取用户信息、IP、User-Agent
 * - 记录操作结果（成功/失败）
 * - 异步写入审计日志（不阻塞业务）
 *
 * ECP-C2: 系统化错误处理 - 审计日志写入失败不影响业务
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 获取审计元数据
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // 如果没有审计装饰器，直接跳过
    if (!auditMetadata) {
      return next.handle();
    }

    // 获取 HTTP 请求信息
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 从 JWT Auth Guard 注入的用户信息
    const ipAddress = this.getClientIp(request);
    const userAgent = request.get('user-agent') || '';

    // 获取实体 ID（从请求参数中提取）
    const entityId = request.params?.id || request.body?.id || undefined;

    return next.handle().pipe(
      // 操作成功时记录
      tap(() => {
        this.auditService.log({
          action: auditMetadata.action,
          entityType: auditMetadata.entityType,
          entityId,
          userId: user?.id,
          username: user?.username,
          ipAddress,
          userAgent,
          description: auditMetadata.description,
          success: true,
        });
      }),
      // 操作失败时记录
      catchError((error) => {
        this.auditService.log({
          action: auditMetadata.action,
          entityType: auditMetadata.entityType,
          entityId,
          userId: user?.id,
          username: user?.username,
          ipAddress,
          userAgent,
          description: `${auditMetadata.description} (失败)`,
          success: false,
          errorMsg: error.message || error.toString(),
        });

        // 重新抛出异常，不影响错误处理流程
        throw error;
      }),
    );
  }

  /**
   * 获取客户端真实 IP 地址
   *
   * 支持：
   * - X-Forwarded-For (标准 header)
   * - X-Real-IP (Nginx)
   * - CF-Connecting-IP (CloudFlare)
   * - req.socket.remoteAddress (直连)
   *
   * @param request Express Request
   */
  private getClientIp(request: any): string {
    const xForwardedFor = request.get('x-forwarded-for');
    if (xForwardedFor) {
      // X-Forwarded-For 可能是逗号分隔的列表，取第一个
      return xForwardedFor.split(',')[0].trim();
    }

    return (
      request.get('x-real-ip') ||
      request.get('cf-connecting-ip') ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
