-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "defaultBranch" VARCHAR(100) DEFAULT 'main',
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
