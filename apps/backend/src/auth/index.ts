/**
 * Auth Module Exports
 * P1-2: SOLID - 职责分离后的清洁导出
 */

// Core Service
export { AuthService } from './auth.service';
export type { AuthResponse } from './auth.service';

// Specialized Services
export { TokenService } from './token.service';
export type { JwtPayload, TokenPair } from './token.service';
export { SessionService } from './session.service';
export type { SessionInfo, ParsedUserAgent } from './session.service';
export { PasswordService } from './password.service';
export type { TokenValidationResult } from './password.service';
export { EmailVerificationService } from './email-verification.service';
export type { VerificationResult } from './email-verification.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles } from './decorators/roles.decorator';
export { Public } from './decorators/public.decorator';

// Module
export { AuthModule } from './auth.module';
