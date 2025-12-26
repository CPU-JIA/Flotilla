-- Add email verification and password reset fields to users table
-- These fields were added to the Prisma schema but migration was missing

-- Email verification fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyToken" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3);

-- Password reset fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);

-- Token version for JWT invalidation
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Add unique constraints for tokens
CREATE UNIQUE INDEX IF NOT EXISTS "users_emailVerifyToken_key" ON "users"("emailVerifyToken");
CREATE UNIQUE INDEX IF NOT EXISTS "users_passwordResetToken_key" ON "users"("passwordResetToken");
