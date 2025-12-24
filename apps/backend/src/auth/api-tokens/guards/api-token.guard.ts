import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiTokenService } from '../api-token.service';

/**
 * API Token 作用域元数据键
 */
export const API_TOKEN_SCOPES_KEY = 'apiTokenScopes';

/**
 * 装饰器：要求特定的API Token作用域
 * 使用示例: @ApiTokenScopes('read', 'write')
 */
export const ApiTokenScopes = (...scopes: string[]) =>
  SetMetadata(API_TOKEN_SCOPES_KEY, scopes);

/**
 * API Token 认证守卫
 * ECP-C1: 防御性编程 - 验证令牌格式、有效性、作用域
 * ECP-C2: 系统化错误处理 - 统一错误响应
 *
 * 使用方式：
 * 1. @UseGuards(ApiTokenGuard) - 验证令牌有效性
 * 2. @ApiTokenScopes('read', 'write') - 额外验证作用域
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(
    private apiTokenService: ApiTokenService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 从 Authorization header 提取令牌
    // 格式: Authorization: Bearer flo_xxxxx
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少或无效的Authorization header');
    }

    const token = authHeader.substring(7); // 移除 'Bearer '

    // 验证令牌
    const validationResult = await this.apiTokenService.validateToken(token);
    if (!validationResult) {
      throw new UnauthorizedException('无效或已过期的API Token');
    }

    // 检查作用域（如果控制器/方法指定了）
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      API_TOKEN_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredScopes && requiredScopes.length > 0) {
      const hasScope = requiredScopes.some((scope) =>
        validationResult.scopes.includes(scope),
      );

      if (!hasScope) {
        throw new UnauthorizedException(
          `需要以下作用域之一: ${requiredScopes.join(', ')}`,
        );
      }
    }

    // 将用户ID和作用域附加到请求对象
    request.user = {
      id: validationResult.userId,
      apiTokenScopes: validationResult.scopes,
    };

    return true;
  }
}
