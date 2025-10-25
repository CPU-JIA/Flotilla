-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "allowSelfMerge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireApprovals" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requireReviewFromOwner" BOOLEAN NOT NULL DEFAULT false;
