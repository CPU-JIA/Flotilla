-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'INDEXING', 'INDEXED', 'FAILED', 'OUTDATED');

-- CreateTable
CREATE TABLE "search_metadata" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" "IndexStatus" NOT NULL DEFAULT 'PENDING',
    "indexedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastCommitId" VARCHAR(64),
    "contentHash" VARCHAR(64),
    "symbolCount" INTEGER NOT NULL DEFAULT 0,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_metadata_fileId_key" ON "search_metadata"("fileId");

-- CreateIndex
CREATE INDEX "search_metadata_projectId_idx" ON "search_metadata"("projectId");

-- CreateIndex
CREATE INDEX "search_metadata_repositoryId_idx" ON "search_metadata"("repositoryId");

-- CreateIndex
CREATE INDEX "search_metadata_status_idx" ON "search_metadata"("status");

-- CreateIndex
CREATE INDEX "search_metadata_indexedAt_idx" ON "search_metadata"("indexedAt");

-- AddForeignKey
ALTER TABLE "search_metadata" ADD CONSTRAINT "search_metadata_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_metadata" ADD CONSTRAINT "search_metadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_metadata" ADD CONSTRAINT "search_metadata_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
