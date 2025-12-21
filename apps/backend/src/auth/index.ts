/**
 * Auth Module Exports
 * P1-2: SOLID - 职责分离后的清洁导出
 */

// Core Service
export { AuthService, AuthResponse } from './auth.service';

// Specialized Services
export { TokenService, JwtPayload, TokenPair } from './token.service';
export { SessionService, SessionInfo, ParsedUserAgent } from './session.service';
export { PasswordService, TokenValidationResult } from './password.service';
export { EmailVerificationService, VerificationResult } from './email-verification.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles } from './decorators/roles.decorator';
export { Public } from './decorators/public.decorator';

// Module
export { AuthModule } from './auth.module';
