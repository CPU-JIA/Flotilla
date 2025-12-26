-- CreateTable: IssueAssignee (关联Issue和User的多对多关系表)
CREATE TABLE IF NOT EXISTS "issue_assignees" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PRAssignee (关联PullRequest和User的多对多关系表)
CREATE TABLE IF NOT EXISTS "pr_assignees" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PasswordHistory (密码历史记录，防止密码重用)
CREATE TABLE IF NOT EXISTS "password_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserSession (用户会话管理)
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "device" VARCHAR(100),
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "location" VARCHAR(200),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog (审计日志)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "username" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Webhook
CREATE TABLE IF NOT EXISTS "webhooks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebhookDelivery (Webhook投递记录)
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CollaborationSession (协作会话)
CREATE TABLE IF NOT EXISTS "collaboration_sessions" (
    "id" TEXT NOT NULL,
    "documentType" VARCHAR(50) NOT NULL,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CollaborationParticipant (协作参与者)
CREATE TABLE IF NOT EXISTS "collaboration_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "cursorPosition" JSONB,
    "selection" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "collaboration_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DataExportRequest (GDPR数据导出请求)
CREATE TABLE IF NOT EXISTS "data_export_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" VARCHAR(20) NOT NULL DEFAULT 'json',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "filePath" TEXT,
    "fileSize" BIGINT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NewsletterSubscriber (Newsletter订阅者)
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "source" VARCHAR(50),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: IssueAssignee
CREATE UNIQUE INDEX IF NOT EXISTS "issue_assignees_issueId_userId_key" ON "issue_assignees"("issueId", "userId");
CREATE INDEX IF NOT EXISTS "issue_assignees_issueId_idx" ON "issue_assignees"("issueId");
CREATE INDEX IF NOT EXISTS "issue_assignees_userId_idx" ON "issue_assignees"("userId");

-- CreateIndex: PRAssignee
CREATE UNIQUE INDEX IF NOT EXISTS "pr_assignees_pullRequestId_userId_key" ON "pr_assignees"("pullRequestId", "userId");
CREATE INDEX IF NOT EXISTS "pr_assignees_pullRequestId_idx" ON "pr_assignees"("pullRequestId");
CREATE INDEX IF NOT EXISTS "pr_assignees_userId_idx" ON "pr_assignees"("userId");

-- CreateIndex: PasswordHistory
CREATE INDEX IF NOT EXISTS "password_histories_userId_idx" ON "password_histories"("userId");
CREATE INDEX IF NOT EXISTS "password_histories_createdAt_idx" ON "password_histories"("createdAt" DESC);

-- CreateIndex: UserSession
CREATE INDEX IF NOT EXISTS "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE INDEX IF NOT EXISTS "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "user_sessions_isActive_idx" ON "user_sessions"("isActive");

-- CreateIndex: AuditLog
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex: Webhook
CREATE INDEX IF NOT EXISTS "webhooks_projectId_idx" ON "webhooks"("projectId");
CREATE INDEX IF NOT EXISTS "webhooks_createdById_idx" ON "webhooks"("createdById");

-- CreateIndex: WebhookDelivery
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhookId_idx" ON "webhook_deliveries"("webhookId");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt" DESC);

-- CreateIndex: CollaborationSession
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_sessions_documentType_documentId_key" ON "collaboration_sessions"("documentType", "documentId");
CREATE INDEX IF NOT EXISTS "collaboration_sessions_projectId_idx" ON "collaboration_sessions"("projectId");
CREATE INDEX IF NOT EXISTS "collaboration_sessions_isActive_idx" ON "collaboration_sessions"("isActive");

-- CreateIndex: CollaborationParticipant
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_participants_sessionId_userId_key" ON "collaboration_participants"("sessionId", "userId");
CREATE INDEX IF NOT EXISTS "collaboration_participants_sessionId_idx" ON "collaboration_participants"("sessionId");
CREATE INDEX IF NOT EXISTS "collaboration_participants_userId_idx" ON "collaboration_participants"("userId");

-- CreateIndex: DataExportRequest
CREATE INDEX IF NOT EXISTS "data_export_requests_userId_idx" ON "data_export_requests"("userId");
CREATE INDEX IF NOT EXISTS "data_export_requests_status_idx" ON "data_export_requests"("status");

-- CreateIndex: NewsletterSubscriber
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- AddForeignKey: IssueAssignee
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PRAssignee
ALTER TABLE "pr_assignees" ADD CONSTRAINT "pr_assignees_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pr_assignees" ADD CONSTRAINT "pr_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PasswordHistory
ALTER TABLE "password_histories" ADD CONSTRAINT "password_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserSession
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AuditLog
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Webhook
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: WebhookDelivery
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CollaborationSession
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CollaborationParticipant
ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "collaboration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: DataExportRequest
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix WikiPageHistory table name (rename if exists with wrong name)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wiki_page_histories') THEN
        ALTER TABLE "wiki_page_histories" RENAME TO "wiki_page_history";
    END IF;
END $$;

-- Add missing columns to wiki_pages if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'wiki_pages' AND column_name = 'lastEditedById') THEN
        ALTER TABLE "wiki_pages" ADD COLUMN "lastEditedById" TEXT;
        UPDATE "wiki_pages" SET "lastEditedById" = "createdById" WHERE "lastEditedById" IS NULL;
        ALTER TABLE "wiki_pages" ALTER COLUMN "lastEditedById" SET NOT NULL;
        ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add version column to wiki_page_history if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wiki_page_history') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'wiki_page_history' AND column_name = 'version') THEN
            ALTER TABLE "wiki_page_history" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
        END IF;
    END IF;
END $$;
