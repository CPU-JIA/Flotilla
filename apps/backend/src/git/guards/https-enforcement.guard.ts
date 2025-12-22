/**
 * HTTPS Enforcement Guard
 *
 * 🔒 SECURITY FIX: Enforces HTTPS for Git HTTP Basic Auth (CWE-319)
 * Prevents credentials from being transmitted in plain text over HTTP
 *
 * CWE-319: Cleartext Transmission of Sensitive Information
 * OWASP A02:2021 – Cryptographic Failures
 *
 * ECP-C1: Defensive Programming - Protect credentials in transit
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

@Injectable()
export class HttpsEnforcementGuard implements CanActivate {
  private readonly logger = new Logger(HttpsEnforcementGuard.name)

  constructor(private configService: ConfigService) {}

  /**
   * Check if request is using HTTPS
   *
   * @param request Express request object
   * @returns true if HTTPS, false if HTTP
   */
  private isHttps(request: Request): boolean {
    // Check request protocol
    if (request.protocol === 'https') {
      return true
    }

    // Check X-Forwarded-Proto header (for reverse proxies like nginx)
    const forwardedProto = request.get('x-forwarded-proto')
    if (forwardedProto === 'https') {
      return true
    }

    // Check if connection is encrypted (TLS)
    if (request.secure) {
      return true
    }

    return false
  }

  /**
   * Determine if HTTPS should be enforced
   *
   * HTTPS enforcement rules:
   * - Production: ALWAYS enforce
   * - Development: SKIP (for local testing)
   * - Test: SKIP
   * - Can be overridden via ENFORCE_HTTPS=true env var
   */
  private shouldEnforceHttps(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')
    const enforceHttps = this.configService.get<string>('ENFORCE_HTTPS')

    // Explicit override
    if (enforceHttps !== undefined) {
      return enforceHttps === 'true'
    }

    // Default: enforce in production only
    return nodeEnv === 'production'
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    // Skip HTTPS check if not enforced
    if (!this.shouldEnforceHttps()) {
      this.logger.debug('HTTPS enforcement disabled (development/test mode)')
      return true
    }

    // Check if request is HTTPS
    if (this.isHttps(request)) {
      this.logger.debug('✅ HTTPS request verified')
      return true
    }

    // Reject HTTP requests in production
    this.logger.warn(
      `🔒 HTTPS enforcement: Rejecting HTTP request to ${request.method} ${request.path}`,
    )

    throw new ForbiddenException({
      statusCode: 403,
      message: 'HTTPS required',
      error: 'Forbidden',
      details: 'Git HTTP operations require HTTPS in production to protect credentials. Please use: git clone https://...',
    })
  }
}
