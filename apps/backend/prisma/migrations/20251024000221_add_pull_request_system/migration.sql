-- CreateEnum
CREATE TYPE "PRState" AS ENUM ('OPEN', 'MERGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED');

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "sourceBranch" VARCHAR(100) NOT NULL,
    "targetBranch" VARCHAR(100) NOT NULL,
    "state" "PRState" NOT NULL DEFAULT 'OPEN',
    "authorId" TEXT NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "mergedBy" TEXT,
    "mergeCommit" VARCHAR(64),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_reviews" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "state" "ReviewState" NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_comments" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "filePath" VARCHAR(500),
    "lineNumber" INTEGER,
    "commitHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_events" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pull_requests_projectId_idx" ON "pull_requests"("projectId");

-- CreateIndex
CREATE INDEX "pull_requests_authorId_idx" ON "pull_requests"("authorId");

-- CreateIndex
CREATE INDEX "pull_requests_state_idx" ON "pull_requests"("state");

-- CreateIndex
CREATE INDEX "pull_requests_createdAt_idx" ON "pull_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_projectId_number_key" ON "pull_requests"("projectId", "number");

-- CreateIndex
CREATE INDEX "pr_reviews_pullRequestId_idx" ON "pr_reviews"("pullRequestId");

-- CreateIndex
CREATE INDEX "pr_reviews_reviewerId_idx" ON "pr_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "pr_reviews_state_idx" ON "pr_reviews"("state");

-- CreateIndex
CREATE INDEX "pr_comments_pullRequestId_idx" ON "pr_comments"("pullRequestId");

-- CreateIndex
CREATE INDEX "pr_comments_authorId_idx" ON "pr_comments"("authorId");

-- CreateIndex
CREATE INDEX "pr_comments_createdAt_idx" ON "pr_comments"("createdAt");

-- CreateIndex
CREATE INDEX "pr_events_pullRequestId_idx" ON "pr_events"("pullRequestId");

-- CreateIndex
CREATE INDEX "pr_events_actorId_idx" ON "pr_events"("actorId");

-- CreateIndex
CREATE INDEX "pr_events_event_idx" ON "pr_events"("event");

-- CreateIndex
CREATE INDEX "pr_events_createdAt_idx" ON "pr_events"("createdAt");

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_mergedBy_fkey" FOREIGN KEY ("mergedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_reviews" ADD CONSTRAINT "pr_reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_reviews" ADD CONSTRAINT "pr_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_comments" ADD CONSTRAINT "pr_comments_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_comments" ADD CONSTRAINT "pr_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_events" ADD CONSTRAINT "pr_events_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_events" ADD CONSTRAINT "pr_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
