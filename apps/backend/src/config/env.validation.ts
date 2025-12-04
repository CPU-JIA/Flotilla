/**
 * Environment Variables Validation Schema
 *
 * Validates all required environment variables at application startup.
 * ECP-C1: Defensive Programming - Fail fast if configuration is invalid.
 * ECP-C2: Systematic Error Handling - Clear error messages for missing/invalid variables.
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

export interface EnvironmentVariables {
  // Database
  DATABASE_URL: string;
  DATABASE_REPLICA_URL?: string;

  // Redis
  REDIS_URL: string;

  // MinIO (S3)
  MINIO_ENDPOINT: string;
  MINIO_PORT: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_USE_SSL: string;
  MINIO_BUCKET_NAME: string;

  // MeiliSearch
  MEILI_HOST: string;
  MEILI_MASTER_KEY: string;
  MEILI_INDEX_PREFIX?: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRATION?: string;
  JWT_REFRESH_EXPIRATION?: string;

  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: string;
  FRONTEND_URL?: string;
  WEBSITE_URL?: string;
  CORS_ALLOWED_ORIGINS?: string; // Comma-separated list for multi-domain support

  // Git Storage
  GIT_STORAGE_PATH?: string;

  // Raft
  RAFT_NODE_ID?: string;
  RAFT_CLUSTER_NODES?: string;
  RAFT_ELECTION_TIMEOUT_MIN?: string;
  RAFT_ELECTION_TIMEOUT_MAX?: string;
  RAFT_HEARTBEAT_INTERVAL?: string;

  // Bootstrap Admin
  INITIAL_ADMIN_EMAIL?: string;

  // SMTP
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM_EMAIL?: string;
  SMTP_FROM_NAME?: string;
}

interface ValidationRule {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  errorMessage?: string;
  minLength?: number;
  pattern?: RegExp;
}

const VALIDATION_RULES: ValidationRule[] = [
  // ========== DATABASE ==========
  {
    name: 'DATABASE_URL',
    required: true,
    pattern: /^postgresql:\/\/.+/,
    errorMessage: 'DATABASE_URL must be a valid PostgreSQL connection string',
  },

  // ========== REDIS ==========
  {
    name: 'REDIS_URL',
    required: true,
    pattern: /^redis:\/\/.+/,
    errorMessage: 'REDIS_URL must be a valid Redis connection string',
  },

  // ========== MINIO ==========
  {
    name: 'MINIO_ENDPOINT',
    required: true,
  },
  {
    name: 'MINIO_PORT',
    required: true,
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    errorMessage: 'MINIO_PORT must be a valid port number',
  },
  {
    name: 'MINIO_ACCESS_KEY',
    required: true,
    minLength: 3,
  },
  {
    name: 'MINIO_SECRET_KEY',
    required: true,
    minLength: 8,
    errorMessage: 'MINIO_SECRET_KEY must be at least 8 characters',
  },
  {
    name: 'MINIO_USE_SSL',
    required: true,
    validator: (value) => ['true', 'false'].includes(value),
    errorMessage: 'MINIO_USE_SSL must be "true" or "false"',
  },
  {
    name: 'MINIO_BUCKET_NAME',
    required: true,
  },

  // ========== MEILISEARCH ==========
  {
    name: 'MEILI_HOST',
    required: true,
    pattern: /^https?:\/\/.+/,
    errorMessage: 'MEILI_HOST must be a valid URL',
  },
  {
    name: 'MEILI_MASTER_KEY',
    required: true,
    minLength: 16,
    errorMessage: 'MEILI_MASTER_KEY must be at least 16 characters',
  },

  // ========== JWT ==========
  {
    name: 'JWT_SECRET',
    required: true,
    minLength: 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters for security',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: true,
    minLength: 32,
    errorMessage: 'JWT_REFRESH_SECRET must be at least 32 characters',
  },

  // ========== APPLICATION ==========
  {
    name: 'NODE_ENV',
    required: true,
    validator: (value) => ['development', 'production', 'test'].includes(value),
    errorMessage: 'NODE_ENV must be one of: development, production, test',
  },

  // ========== PRODUCTION-SPECIFIC VALIDATIONS ==========
  {
    name: 'INITIAL_ADMIN_EMAIL',
    required: false, // Checked separately for production
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: 'INITIAL_ADMIN_EMAIL must be a valid email address',
  },
];

/**
 * Validates environment variables at application startup
 * Throws an error if validation fails
 */
export function validateEnvironmentVariables(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeEnv = config.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Validate each rule
  for (const rule of VALIDATION_RULES) {
    const value = config[rule.name] as string | undefined;

    // Check if required
    if (rule.required && !value) {
      errors.push(`❌ ${rule.name} is required but not set`);
      continue;
    }

    if (!value) continue; // Skip optional empty values

    // Check minimum length
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(
        `❌ ${rule.name} must be at least ${rule.minLength} characters (current: ${value.length})`,
      );
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(rule.errorMessage || `❌ ${rule.name} has invalid format`);
    }

    // Check custom validator
    if (rule.validator && !rule.validator(value)) {
      errors.push(rule.errorMessage || `❌ ${rule.name} failed validation`);
    }
  }

  // ========== PRODUCTION-SPECIFIC CHECKS ==========
  if (isProduction) {
    // Must have INITIAL_ADMIN_EMAIL in production
    if (!config.INITIAL_ADMIN_EMAIL) {
      errors.push(
        '❌ INITIAL_ADMIN_EMAIL is required in production environment to prevent unauthorized admin creation',
      );
    }

    // Must have GIT_STORAGE_PATH in production
    if (!config.GIT_STORAGE_PATH) {
      errors.push(
        '❌ GIT_STORAGE_PATH must be set in production (e.g., /var/lib/flotilla/repos) to prevent data loss',
      );
    }

    // Check for weak secrets
    const weakSecrets = [
      'your-super-secret-jwt-key',
      'default-secret-key',
      'change-in-production',
      'minioadmin',
      'redis123',
    ];

    for (const secret of weakSecrets) {
      if (
        (config.JWT_SECRET as string)?.includes(secret) ||
        (config.JWT_REFRESH_SECRET as string)?.includes(secret) ||
        (config.MINIO_SECRET_KEY as string)?.includes(secret) ||
        (config.REDIS_URL as string)?.includes(secret)
      ) {
        errors.push(
          `❌ Detected weak or default secret containing "${secret}". This is not allowed in production.`,
        );
      }
    }
  }

  // ========== WARNINGS (non-blocking) ==========
  if (!config.FRONTEND_URL) {
    warnings.push(
      '⚠️  FRONTEND_URL not set, using default: http://localhost:3000',
    );
  }

  if (!config.PORT) {
    warnings.push('⚠️  PORT not set, using default: 4000');
  }

  if (!isProduction && !config.GIT_STORAGE_PATH) {
    warnings.push(
      '⚠️  GIT_STORAGE_PATH not set in development, using default: ./repos',
    );
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment Variable Warnings:');
    warnings.forEach((warning) => logger.warn(warning));
  }

  // Throw if errors exist
  if (errors.length > 0) {
    const errorMessage = [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '❌ ENVIRONMENT VARIABLE VALIDATION FAILED',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      ...errors,
      '',
      '📝 How to fix:',
      '  1. Copy .env.example to .env',
      '  2. Fill in all required values',
      '  3. Generate strong secrets: openssl rand -base64 32',
      '  4. Restart the application',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
    ].join('\n');

    throw new Error(errorMessage);
  }

  logger.log('✅ Environment variables validated successfully');
  return config as unknown as EnvironmentVariables;
}
