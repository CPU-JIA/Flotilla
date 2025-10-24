-- CreateEnum
CREATE TYPE "MergeStrategy" AS ENUM ('MERGE', 'SQUASH', 'REBASE');

-- AlterTable
ALTER TABLE "pull_requests" ADD COLUMN     "mergeStrategy" "MergeStrategy";
